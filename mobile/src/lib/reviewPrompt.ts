// Smart review prompt (BUILD_PROMPT §16, PLAYBOOK 4.4): expo-store-review exactly once,
// right after the user's FIRST FLIP verdict with >=$50 estimated profit — the peak-
// happiness moment. A persisted flag guarantees "exactly once" across app restarts.
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from '@/lib/analytics';

const SHOWN_KEY = 'flipscan.review_prompt_shown';

export const REVIEW_PROMPT_MIN_PROFIT = 50;

export async function maybePromptForReview(netProfit: number, verdict: string): Promise<void> {
  if (verdict !== 'flip' || netProfit < REVIEW_PROMPT_MIN_PROFIT) return;

  const alreadyShown = await AsyncStorage.getItem(SHOWN_KEY);
  if (alreadyShown) return;

  // Mark first so a crash mid-prompt can't loop this on every future ≥$50 flip.
  await AsyncStorage.setItem(SHOWN_KEY, '1');

  const available = await StoreReview.isAvailableAsync();
  if (!available) return;

  track('review_prompt_shown', { net_profit: netProfit });
  await StoreReview.requestReview();
}

// Test-only escape hatch (mirrors resetMeteringForTests pattern in scanStore).
export async function resetReviewPromptForTests(): Promise<void> {
  await AsyncStorage.removeItem(SHOWN_KEY);
}
