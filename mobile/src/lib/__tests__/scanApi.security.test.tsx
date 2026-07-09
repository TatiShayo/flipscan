// SECURITY TEST — metering cannot be bypassed by clearing local storage.
//
// Threat model (BUILD_PROMPT security §, PROJECT_STATE NEEDS HUMAN): a user who wants more
// free scans might clear app storage / reinstall, resetting the local zustand-persisted
// `freeScansUsed` counter back to 0. The real edge function's authority is server-side
// (consume_scan_credit, keyed on device_hash + user id — see
// supabase/functions/_shared/__tests__/rls_invariants.test.ts for that server-side
// invariant). This test asserts the CLIENT half of that contract: when a real backend is
// configured, requestScan() never consults or trusts the local counter to grant a scan —
// it relays whatever the server decides, even when local state has been reset to zero.
//
// Imports jest/describe/it/expect explicitly from '@jest/globals' rather than relying on
// ambient global typing (this repo's @types/jest install doesn't ship the `declare var
// jest` global, only the `jest` namespace) — the explicit-import form is also the form
// Jest's own docs recommend.
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useScanStore } from '@/store/scanStore';
import { requestScan } from '@/lib/scanApi';
import { runMockScan } from '@/lib/mockBackend';

jest.mock('@/config/env', () => ({
  CONFIGURED: { supabase: true },
  ENV: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key' },
}));

jest.mock('@/lib/supabase', () => ({
  accessToken: jest.fn(async () => 'fake-jwt'),
}));

// The offline/local mock pipeline is the ONLY code path that trusts local free-scan state.
// If it ever ran while a real backend is configured, that would be the actual bypass this
// test guards against — so we mock it out and assert it's never invoked below.
// (babel-plugin-jest-hoist hoists these jest.mock() calls above the imports above at
// compile time, so source order here doesn't matter to Jest — only to import/first lint.)
jest.mock('@/lib/mockBackend', () => ({
  runMockScan: jest.fn(),
}));

type FetchMock = jest.Mock<(...args: unknown[]) => Promise<{ ok: boolean; json: () => Promise<unknown> }>>;

describe('metering-bypass: clearing local storage does not grant extra scans', () => {
  beforeEach(() => {
    // Simulate "AsyncStorage cleared" / fresh reinstall: the persisted counter is back at 0.
    useScanStore.getState().resetMeteringForTests();
    (globalThis as unknown as { fetch: FetchMock }).fetch = jest.fn() as unknown as FetchMock;
    (runMockScan as jest.Mock).mockClear();
  });

  it('relays the server paywall verdict even though the local free-scan counter reads 0', async () => {
    expect(useScanStore.getState().freeScansUsed).toBe(0);

    // The server (keyed on device_hash, which survives a plain AsyncStorage clear better
    // than the local counter — see src/lib/device.ts) knows this device already burned its
    // free scans, and returns the paywall error regardless of what the client believes.
    const fetchMock = globalThis.fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'paywall',
        message: "You've used your 3 free scans.",
        free_scans_used: 3,
        free_limit: 3,
      }),
    });

    const outcome = await requestScan({
      images: ['aGVsbG8='],
      deviceHash: 'server-knows-this-device-abc123',
      mode: 'photo',
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.error).toBe('paywall');
      expect(outcome.error.free_scans_used).toBe(3);
    }

    // The local (reset) counter was never consulted to grant the scan -- it's still 0
    // because requestScan doesn't touch it at all on the real-backend path.
    expect(useScanStore.getState().freeScansUsed).toBe(0);
    // And the local mock pipeline -- the only code that DOES trust local state -- never ran.
    expect(runMockScan).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never short-circuits on local state before asking the server (no client-side pre-gate)', async () => {
    // Even with local freeScansUsed at 0 (looks "free" to the client), requestScan must
    // still make the network call rather than assuming it's allowed.
    const fetchMock = globalThis.fetch as unknown as FetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        scan_id: '00000000-0000-4000-8000-000000000000',
        identified: {
          name: 'Test item',
          brand: null,
          model_or_era: null,
          category: 'other',
          condition_notes: '',
          confidence: 0.5,
          ebay_search_keywords: ['test item'],
          needs_better_photo: false,
          photo_tip: null,
        },
        comps: {
          median: 1,
          low: 1,
          high: 1,
          count: 1,
          estimated_sold: 1,
          is_estimate: true,
          currency: 'USD',
          source: 'mock',
          sample_listings: [],
        },
        verdict: 'skip',
        // Server says this device is past the free limit but has top-up credits -- only the
        // server can know this; the client has no local concept of top-up balance to check.
        free_scans_used: 4,
        free_limit: 3,
        topup_remaining: 2,
      }),
    });

    const outcome = await requestScan({
      images: ['aGVsbG8='],
      deviceHash: 'abc123',
      mode: 'photo',
    });

    expect(outcome.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(runMockScan).not.toHaveBeenCalled();
  });
});
