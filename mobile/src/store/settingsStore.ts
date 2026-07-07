// User-configurable settings (BUILD_PROMPT §5 fee/profit calculator) + onboarding state.
// Persisted locally — these are preferences, not entitlements, so client-side storage is
// fine here (contrast with scanStore metering, which the server treats as authoritative).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Platform } from '@/constants/profit';

interface SettingsState {
  defaultPlatform: Platform;
  onboardingCompleted: boolean;
  thriftFrequency: string | null; // "How much do you thrift per month?" answer, for personalization
  hasSeenReviewPrompt: boolean;
  setDefaultPlatform: (p: Platform) => void;
  setThriftFrequency: (thriftFrequency: string | null) => void;
  completeOnboarding: () => void;
  markReviewPromptShown: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultPlatform: 'ebay',
      onboardingCompleted: false,
      thriftFrequency: null,
      hasSeenReviewPrompt: false,
      setDefaultPlatform: (p) => set({ defaultPlatform: p }),
      setThriftFrequency: (thriftFrequency) => set({ thriftFrequency }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markReviewPromptShown: () => set({ hasSeenReviewPrompt: true }),
    }),
    {
      name: 'flipscan.settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
