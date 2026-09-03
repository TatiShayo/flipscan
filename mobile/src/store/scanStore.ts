// Local scan state: mock-mode free-scan metering, scan history, and the watchlist.
// AUTHORITATIVE metering always lives server-side (consume_scan_credit in Postgres) —
// this local counter only powers the mock pipeline (src/lib/mockBackend.ts) when no
// Supabase project is configured, and it drives the "$X found" paywall pitch copy either
// way (BUILD_PROMPT §6). Persisted so it survives app restarts (not reinstalls, by design
// in mock mode — reinstall-proof metering requires the real server, see NEEDS HUMAN).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_SCAN_LIMIT } from '@/constants/limits';
import type { ConditionGrade, ScanHistoryItem } from '@/types/scan';

interface ScanState {
  freeScansUsed: number;
  topupRemaining: number;
  isSubscribed: boolean;
  history: ScanHistoryItem[];
  watchlist: string[]; // scan ids

  recordScanUsed: () => { freeUsed: number; topupRemaining: number; isSubscribed: boolean };
  setSubscribed: (subscribed: boolean) => void;
  addHistoryItem: (item: ScanHistoryItem) => void;
  updateHistoryItem: (id: string, patch: Partial<ScanHistoryItem>) => void;
  removeHistoryItem: (id: string) => void;
  toggleWatchlist: (scanId: string) => void;
  isWatchlisted: (scanId: string) => boolean;
  grantTopup: (scans: number) => void;
  potentialProfitFound: () => number;
  resetMeteringForTests: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      freeScansUsed: 0,
      topupRemaining: 0,
      isSubscribed: false,
      history: [],
      watchlist: [],

      recordScanUsed: () => {
        const { freeScansUsed, topupRemaining, isSubscribed } = get();
        if (isSubscribed) {
          return { freeUsed: freeScansUsed, topupRemaining, isSubscribed: true };
        }
        let nextFree = freeScansUsed;
        let nextTopup = topupRemaining;
        if (freeScansUsed < FREE_SCAN_LIMIT) {
          nextFree = freeScansUsed + 1;
        } else if (topupRemaining > 0) {
          nextTopup = topupRemaining - 1;
        }
        set({ freeScansUsed: nextFree, topupRemaining: nextTopup });
        return { freeUsed: nextFree, topupRemaining: nextTopup, isSubscribed: false };
      },

      setSubscribed: (isSubscribed) => set({ isSubscribed }),

      addHistoryItem: (item) => set((s) => ({ history: [item, ...s.history] })),

      updateHistoryItem: (id, patch) =>
        set((s) => ({
          history: s.history.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),

      removeHistoryItem: (id) =>
        set((s) => ({
          history: s.history.filter((h) => h.id !== id),
          watchlist: s.watchlist.filter((w) => w !== id),
        })),

      toggleWatchlist: (scanId) =>
        set((s) => ({
          watchlist: s.watchlist.includes(scanId)
            ? s.watchlist.filter((w) => w !== scanId)
            : [...s.watchlist, scanId],
        })),

      isWatchlisted: (scanId) => get().watchlist.includes(scanId),

      grantTopup: (scans) => set((s) => ({ topupRemaining: s.topupRemaining + scans })),

      // Sum of net profit across history — the personalized paywall pitch ("found $X").
      potentialProfitFound: () =>
        get().history.reduce((sum, h) => sum + Math.max(0, h.netProfit ?? 0), 0),

      resetMeteringForTests: () => set({ freeScansUsed: 0, topupRemaining: 0, isSubscribed: false }),
    }),
    {
      name: 'flipscan.scan-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        freeScansUsed: s.freeScansUsed,
        topupRemaining: s.topupRemaining,
        isSubscribed: s.isSubscribed,
        history: s.history,
        watchlist: s.watchlist,
      }),
    },
  ),
);


export type { ConditionGrade };
