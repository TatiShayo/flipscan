// Unit tests for Store Review Prompting Logic.
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { maybePromptForReview, REVIEW_PROMPT_MIN_PROFIT } from '@/lib/reviewPrompt';
import { useSettingsStore } from '@/store/settingsStore';
import * as StoreReview from 'expo-store-review';
import * as analytics from '@/lib/analytics';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn(async () => true),
  requestReview: jest.fn(async () => {}),
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
}));

describe('Smart Review Prompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.setState({ hasSeenReviewPrompt: false });
  });

  it('prompts for review on first FLIP with profit >= $50', async () => {
    await maybePromptForReview(55, 'flip');

    expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(true);
    expect(StoreReview.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(analytics.track).toHaveBeenCalledWith('review_prompt_shown', { net_profit: 55 });
  });

  it('does NOT prompt when verdict is skip even with profit >= $50', async () => {
    await maybePromptForReview(60, 'skip');

    expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does NOT prompt when verdict is maybe even with profit >= $50', async () => {
    await maybePromptForReview(60, 'maybe');

    expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('does NOT prompt when profit is less than threshold ($50)', async () => {
    await maybePromptForReview(REVIEW_PROMPT_MIN_PROFIT - 0.01, 'flip');

    expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('fires exactly once and does NOT prompt again on subsequent flips', async () => {
    // First flip
    await maybePromptForReview(75, 'flip');
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);

    // Second flip
    await maybePromptForReview(120, 'flip');
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does not crash if StoreReview is unavailable on the device', async () => {
    (StoreReview.isAvailableAsync as unknown as jest.Mock<() => Promise<boolean>>).mockResolvedValueOnce(false);

    await maybePromptForReview(100, 'flip');

    expect(useSettingsStore.getState().hasSeenReviewPrompt).toBe(true);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });
});
