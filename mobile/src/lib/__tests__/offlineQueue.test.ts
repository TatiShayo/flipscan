// Unit & State Machine Tests for the Offline Queue Subsystem.
// Tests queue state transitions, exponential backoff, retry handling, mutex locking,
// and network integration.
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  enqueueCapture,
  processQueue,
  calculateBackoff,
  isQueueProcessing,
  getQueuedItems,
  getFailedItems,
  retryFailedItem,
  isOffline,
} from '@/lib/offlineQueue';
import { useScanStore } from '@/store/scanStore';
import { useSettingsStore } from '@/store/settingsStore';
import * as scanApi from '@/lib/scanApi';
import * as Network from 'expo-network';

jest.mock('@/config/env', () => ({
  CONFIGURED: { supabase: false, posthog: false, sentry: false, revenueCat: false },
  ENV: { supabaseUrl: undefined, supabaseAnonKey: undefined },
}));

jest.mock('@/lib/monitoring', () => ({
  captureError: jest.fn(),
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

describe('calculateBackoff', () => {
  it('computes exponential backoff for attempt 0', () => {
    const delay = calculateBackoff(0, 400, 5000);
    // Base 400 + up to 10% jitter (400 - 440)
    expect(delay).toBeGreaterThanOrEqual(400);
    expect(delay).toBeLessThanOrEqual(440);
  });

  it('computes exponential growth for successive attempts', () => {
    const d1 = calculateBackoff(1, 400, 5000); // 800 + jitter
    const d2 = calculateBackoff(2, 400, 5000); // 1600 + jitter
    const d3 = calculateBackoff(3, 400, 5000); // 3200 + jitter

    expect(d1).toBeGreaterThanOrEqual(800);
    expect(d2).toBeGreaterThanOrEqual(1600);
    expect(d3).toBeGreaterThanOrEqual(3200);
  });

  it('caps backoff at the configured cap', () => {
    const capped = calculateBackoff(10, 400, 5000);
    expect(capped).toBeLessThanOrEqual(5500); // 5000 + 10% jitter
  });

  it('handles negative attempts safely', () => {
    const delay = calculateBackoff(-1, 400, 5000);
    expect(delay).toBeGreaterThanOrEqual(400);
  });
});

describe('enqueueCapture', () => {
  beforeEach(() => {
    useScanStore.setState({ history: [], watchlist: [], freeScansUsed: 0, topupRemaining: 0 });
    useSettingsStore.setState({ defaultPlatform: 'poshmark' });
  });

  it('enqueues a photo capture with status queued and attempt count 0', () => {
    const id = enqueueCapture({
      images: [{ uri: 'file:///photo1.jpg', base64: 'b64img1' }],
      mode: 'photo',
    });

    expect(id).toMatch(/^queued-/);
    const queued = getQueuedItems();
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe(id);
    expect(queued[0].status).toBe('queued');
    expect(queued[0].attempts).toBe(0);
    expect(queued[0].platform).toBe('poshmark');
    expect(queued[0].imageUri).toBe('file:///photo1.jpg');
    expect(queued[0].queuedPayload?.images).toEqual(['b64img1']);
    expect(queued[0].queuedPayload?.mode).toBe('photo');
  });

  it('enqueues a barcode capture with barcode payload', () => {
    const id = enqueueCapture({
      images: [],
      mode: 'barcode',
      barcode: '9780135957059',
    });

    const queued = getQueuedItems();
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe(id);
    expect(queued[0].queuedPayload?.barcode).toBe('9780135957059');
    expect(queued[0].queuedPayload?.mode).toBe('barcode');
  });
});

describe('processQueue State Machine & Resolution', () => {
  beforeEach(() => {
    useScanStore.setState({ history: [], watchlist: [], freeScansUsed: 0, topupRemaining: 0 });
    jest.restoreAllMocks();
  });

  it('returns zeroes when no queued items exist', async () => {
    const result = await processQueue();
    expect(result).toEqual({ resolved: 0, failed: 0, retrying: 0 });
    expect(isQueueProcessing()).toBe(false);
  });

  it('resolves queued items on successful scan and updates scan_id and status to complete', async () => {
    enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    const mockResult: scanApi.ScanOutcome = {
      ok: true,
      result: {
        scan_id: '11111111-2222-3333-4444-555555555555',
        identified: {
          name: 'Vintage Silk Scarf',
          brand: 'Hermes',
          model_or_era: '1980s',
          category: 'accessories',
          condition_notes: 'Mint condition',
          confidence: 0.92,
          ebay_search_keywords: ['hermes silk scarf'],
          needs_better_photo: false,
          photo_tip: null,
        },
        comps: {
          median: 250,
          low: 180,
          high: 320,
          count: 42,
          estimated_sold: 187.5,
          is_estimate: true,
          currency: 'USD',
          source: 'mock',
          sample_listings: [],
        },
        verdict: 'flip',
        free_scans_used: 1,
        free_limit: 3,
        topup_remaining: 0,
      },
    };

    jest.spyOn(scanApi, 'requestScan').mockResolvedValueOnce(mockResult);

    const outcome = await processQueue();
    expect(outcome.resolved).toBe(1);
    expect(outcome.failed).toBe(0);
    expect(outcome.retrying).toBe(0);

    const history = useScanStore.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('11111111-2222-3333-4444-555555555555');
    expect(history[0].status).toBe('complete');
    expect(history[0].identified?.name).toBe('Vintage Silk Scarf');
    expect(history[0].netProfit).toBeGreaterThan(0);
    expect(getQueuedItems()).toHaveLength(0);
  });

  it('handles transient errors by incrementing attempts and keeping item queued', async () => {
    const id = enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    jest.spyOn(scanApi, 'requestScan').mockResolvedValueOnce({
      ok: false,
      error: {
        error: 'rate_limited',
        message: 'Rate limit exceeded',
      },
    });

    const outcome = await processQueue();
    expect(outcome.resolved).toBe(0);
    expect(outcome.failed).toBe(0);
    expect(outcome.retrying).toBe(1);

    const queued = getQueuedItems();
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe(id);
    expect(queued[0].status).toBe('queued');
    expect(queued[0].attempts).toBe(1);
  });

  it('fails permanently on non-retryable error (e.g. quota_exhausted / bad_request)', async () => {
    const id = enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    jest.spyOn(scanApi, 'requestScan').mockResolvedValueOnce({
      ok: false,
      error: {
        error: 'quota_exhausted',
        message: 'Quota exceeded',
      },
    });

    const outcome = await processQueue();
    expect(outcome.resolved).toBe(0);
    expect(outcome.failed).toBe(1);
    expect(outcome.retrying).toBe(0);

    const history = useScanStore.getState().history;
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe(id);
    expect(history[0].status).toBe('failed');
    expect(getQueuedItems()).toHaveLength(0);
  });

  it('transitions to failed when max attempts (3) are exceeded', async () => {
    const id = enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    // Set existing attempts to 2
    useScanStore.getState().updateHistoryItem(id, { attempts: 2 });

    jest.spyOn(scanApi, 'requestScan').mockResolvedValueOnce({
      ok: false,
      error: {
        error: 'internal',
        message: 'Server error',
      },
    });

    const outcome = await processQueue();
    expect(outcome.resolved).toBe(0);
    expect(outcome.failed).toBe(1);

    const history = useScanStore.getState().history;
    expect(history[0].status).toBe('failed');
    expect(history[0].attempts).toBe(3);
  });

  it('handles thrown exceptions during scan as retryable faults', async () => {
    enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    jest.spyOn(scanApi, 'requestScan').mockRejectedValueOnce(new Error('Network reset'));

    const outcome = await processQueue();
    expect(outcome.retrying).toBe(1);

    const queued = getQueuedItems();
    expect(queued[0].status).toBe('queued');
    expect(queued[0].attempts).toBe(1);
  });

  it('allows manual retry of failed items via retryFailedItem', () => {
    const id = enqueueCapture({
      images: [{ uri: 'file:///photo.jpg', base64: 'b64' }],
      mode: 'photo',
    });

    useScanStore.getState().updateHistoryItem(id, { status: 'failed', attempts: 3 });
    expect(getFailedItems()).toHaveLength(1);

    const retried = retryFailedItem(id);
    expect(retried).toBe(true);
    expect(getFailedItems()).toHaveLength(0);
    expect(getQueuedItems()).toHaveLength(1);
    expect(getQueuedItems()[0].attempts).toBe(0);
  });
});

describe('isOffline Network Check', () => {
  it('returns true when isConnected is false', async () => {
    jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
      type: Network.NetworkStateType.NONE,
    });
    expect(await isOffline()).toBe(true);
  });

  it('returns false when isConnected is true', async () => {
    jest.spyOn(Network, 'getNetworkStateAsync').mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
      type: Network.NetworkStateType.WIFI,
    });
    expect(await isOffline()).toBe(false);
  });

  it('falls back safely to false when network module throws', async () => {
    jest.spyOn(Network, 'getNetworkStateAsync').mockRejectedValueOnce(new Error('Module error'));
    expect(await isOffline()).toBe(false);
  });
});
