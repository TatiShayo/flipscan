// Offline queue (BUILD_PROMPT §13): thrift stores have dead zones. If the device is
// offline at capture time, the photo is saved locally as a "Queued" history row instead
// of blocking on a network call; an expo-network listener (mounted once in the root
// layout via useOfflineQueueProcessor) drains the queue automatically the moment
// connectivity returns, resolving each item through the same requestScan() the live path
// uses. No push infra exists yet (NEEDS HUMAN), so "notify when the result lands" is an
// in-app toast — see QueueToast in the (tabs) layout.
import { useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { requestScan } from '@/lib/scanApi';
import { deviceHash } from '@/lib/device';
import { computeProfit } from '@/constants/profit';
import { useScanStore } from '@/store/scanStore';
import { useSettingsStore } from '@/store/settingsStore';
import { track } from '@/lib/analytics';
import { captureError } from '@/lib/monitoring';
import type { PendingCapture } from '@/store/captureStore';
import type { ScanError } from '@/types/scan';

// A queued item is retried on TRANSIENT failures (network blip, 5xx, rate limit) up to this
// many times before it's marked permanently 'failed'. A single dropped wifi packet during a
// drain must not burn the capture (REVIEW_FINDINGS.md M2).
const MAX_ATTEMPTS = 3;

// Server verdicts that will NEVER succeed on replay — retrying wastes the user's credit path
// and spams the rate limit. These fail the item immediately regardless of attempt count.
const NON_RETRYABLE: ReadonlySet<ScanError['error']> = new Set([
  'paywall',
  'budget_capped',
  'quota_exhausted',
  'bad_request',
  'identification_failed',
  'ai_disabled',
]);

// Exponential inter-item backoff during a drain pass: after coming back online we don't want
// to fire the whole queue at the rate limit in one burst. Grows per item, capped.
const BACKOFF_BASE_MS = 400;
const BACKOFF_CAP_MS = 5_000;
const backoffMs = (attempt: number) =>
  Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function isOffline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    // Treat "connected but reachability unknown" as online — isInternetReachable is
    // frequently undefined on some Android configurations even when the network is fine.
    return state.isConnected === false;
  } catch {
    // If the network module itself fails, don't block the scan on a queue guess.
    return false;
  }
}

// Enqueues a capture as a 'queued' history row so it's visible immediately (receipt-style,
// same list as completed scans) and returns the local id it was stored under.
export function enqueueCapture(capture: PendingCapture): string {
  const { addHistoryItem } = useScanStore.getState();
  const id = `queued-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  addHistoryItem({
    id,
    createdAt: new Date().toISOString(),
    imageUri: capture.images[0]?.uri ?? null,
    identified: null,
    comps: null,
    verdict: null,
    condition: 'good',
    buyPrice: null,
    platform: useSettingsStore.getState().defaultPlatform,
    netProfit: null,
    status: 'queued',
    queuedPayload: {
      images: capture.images.map((i) => i.base64),
      mode: capture.mode,
      barcode: capture.barcode,
      mockVariant: capture.mockVariant,
    },
  });
  track('scan_started', { queued: true });
  return id;
}

// Drains every 'queued' history row through the real scan pipeline, one at a time (avoids
// bursting the rate limit the moment wifi comes back after a long store trip).
export async function processQueue(): Promise<{ resolved: number; failed: number; retrying: number }> {
  const { history, updateHistoryItem, removeHistoryItem, addHistoryItem } = useScanStore.getState();
  const queued = history.filter((h) => h.status === 'queued' && h.queuedPayload);
  let resolved = 0;
  let failed = 0;
  let retrying = 0;

  for (let i = 0; i < queued.length; i++) {
    const item = queued[i];
    const payload = item.queuedPayload;
    if (!payload) continue;
    // Exponential inter-item spacing so a queue that built up over a long offline trip
    // drains gently instead of bursting the server-side rate limit the instant wifi returns.
    if (i > 0) await sleep(backoffMs(i - 1));
    const priorAttempts = item.attempts ?? 0;
    try {
      const hash = await deviceHash();
      const outcome = await requestScan({
        images: payload.images,
        deviceHash: hash,
        mode: payload.mode,
        barcode: payload.barcode,
        mockVariant: payload.mockVariant,
      });
      if (!outcome.ok) {
        const attempts = priorAttempts + 1;
        const permanent = NON_RETRYABLE.has(outcome.error.error) || attempts >= MAX_ATTEMPTS;
        if (permanent) {
          failed += 1;
          updateHistoryItem(item.id, { status: 'failed', queuedPayload: undefined, attempts });
        } else {
          // Transient failure — keep the payload, bump the counter, retry on the next drain.
          retrying += 1;
          updateHistoryItem(item.id, { attempts });
        }
        continue;
      }
      const { result } = outcome;
      const breakdown = computeProfit({
        estimatedSold: result.comps.estimated_sold,
        category: result.identified.category,
        condition: item.condition,
        buyPrice: item.buyPrice,
        platform: item.platform as Parameters<typeof computeProfit>[0]['platform'],
      });
      // The server minted a fresh scan_id; replace the local queued row with the real one
      // so result/[scanId] and watchlist references line up with server-authoritative data.
      removeHistoryItem(item.id);
      addHistoryItem({
        id: result.scan_id,
        createdAt: item.createdAt,
        imageUri: item.imageUri,
        identified: result.identified,
        comps: result.comps,
        verdict: result.verdict,
        condition: item.condition,
        buyPrice: item.buyPrice,
        netProfit: breakdown.netProfit,
        platform: item.platform,
        status: 'complete',
      });
      resolved += 1;
      track('scan_completed', { verdict: result.verdict, queued_resolved: true });
    } catch (e) {
      // A thrown error here is a transient fault (network reset mid-request, DNS blip,
      // JSON parse of a truncated response) — the same class M2 says must not burn the
      // capture. Treat it exactly like a transient !ok: bump attempts, keep the payload,
      // retry on the next drain until MAX_ATTEMPTS.
      const attempts = priorAttempts + 1;
      captureError(e as Error, { context: 'offline_queue_process', attempts });
      if (attempts >= MAX_ATTEMPTS) {
        failed += 1;
        updateHistoryItem(item.id, { status: 'failed', queuedPayload: undefined, attempts });
      } else {
        retrying += 1;
        updateHistoryItem(item.id, { attempts });
      }
    }
  }

  return { resolved, failed, retrying };
}

// Mount once (root layout): listens for connectivity changes and auto-drains the queue the
// moment the device comes back online. Exposes `justResolved` for a one-shot in-app toast.
export function useOfflineQueueProcessor() {
  const [justResolved, setJustResolved] = useState(0);
  const draining = useRef(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const drainIfNeeded = async () => {
      if (draining.current) return;
      const hasQueued = useScanStore.getState().history.some((h) => h.status === 'queued');
      if (!hasQueued) return;
      draining.current = true;
      try {
        const { resolved } = await processQueue();
        if (!cancelled && resolved > 0) setJustResolved((n) => n + resolved);
      } finally {
        draining.current = false;
      }
    };

    // Check once on mount (covers "app was force-quit while offline, relaunched on wifi").
    isOffline().then((offline) => {
      wasOffline.current = offline;
      if (!offline) void drainIfNeeded();
    });

    const sub = Network.addNetworkStateListener((state) => {
      const nowOffline = state.isConnected === false;
      if (wasOffline.current && !nowOffline) {
        void drainIfNeeded();
      }
      wasOffline.current = nowOffline;
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return { justResolved };
}
