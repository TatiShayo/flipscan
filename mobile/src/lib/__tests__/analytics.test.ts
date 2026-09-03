// Unit tests for Analytics Facade & Event Logging.
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { track, identify, initAnalytics } from '@/lib/analytics';

describe('Analytics Facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs track safely in no-op mode without throwing', () => {
    expect(() => {
      track('app_opened');
      track('scan_started', { mode: 'photo' });
      track('scan_completed', { verdict: 'flip', confidence: 0.95 });
      track('trial_started', { plan: 'annual' });
      track('watchlist_added', { scan_id: '123' });
    }).not.toThrow();
  });

  it('runs identify safely in no-op mode without throwing', () => {
    expect(() => {
      identify('anon-12345');
    }).not.toThrow();
  });

  it('initializes gracefully when posthog is not configured', async () => {
    await expect(initAnalytics()).resolves.toBeUndefined();
  });
});
