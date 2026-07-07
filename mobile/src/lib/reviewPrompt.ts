// Smart review prompt (BUILD_PROMPT §16, PLAYBOOK 4.4): expo-store-review exactly once,
// right after the user's FIRST FLIP verdict with >=$50 estimated profit — the peak-
// happiness moment. Guarded by settingsStore's persisted `hasSeenReviewPrompt` flag so it
// survives app restarts and stays "exactly once" without a second storage mechanism.
import * as StoreReview from 'expo-store-review';
import { track } from '@/lib/analytics';
import { useSettingsStore } from '@/store/settingsStore';

export const REVIEW_PROMPT_MIN_PROFIT = 50;

export async function maybePromptForReview(netProfit: number, verdict: string): Promise<void> {
  if (verdict !== 'flip' || netProfit < REVIEW_PROMPT_MIN_PROFIT) return;

  const { hasSeenReviewPrompt, markReviewPromptShown } = useSettingsStore.getState();
  if (hasSeenReviewPrompt) return;

  // Mark first so a crash mid-prompt can't loop this on every future ≥$50 flip.
  markReviewPromptShown();

  const available = await StoreReview.isAvailableAsync();
  if (!available) return;

  track('review_prompt_shown', { net_profit: netProfit });
  await StoreReview.requestReview();
}
