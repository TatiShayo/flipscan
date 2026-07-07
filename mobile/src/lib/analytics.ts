// Analytics facade (PostHog). No-op logger until EXPO_PUBLIC_POSTHOG_KEY is set, so the
// rest of the app calls `track('scan_completed', {...})` unconditionally. Event names use
// object_action (documented in analytics.md). NEVER put PII in event properties.
import { CONFIGURED, ENV } from '@/config/env';

// Documented event catalog — keep in sync with analytics.md. Typo-proofs call sites.
export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'verdict_shown'
  | 'free_scans_exhausted'
  | 'paywall_viewed'
  | 'trial_started'
  | 'purchase_completed'
  | 'topup_purchased'
  | 'restore_completed'
  | 'share_card_exported'
  | 'watchlist_added'
  | 'csv_exported'
  | 'trending_opened'
  | 'review_prompt_shown';

type Props = Record<string, string | number | boolean | null | undefined>;

interface AnalyticsClient {
  capture(event: string, props?: Props): void;
  identify(id: string): void;
}

let client: AnalyticsClient | null = null;

// Lazy real client install. PostHog RN SDK is only imported when configured, so the
// no-op path has zero cost and the bundle doesn't require the key to exist.
export async function initAnalytics(): Promise<void> {
  if (!CONFIGURED.posthog || client) return;
  try {
    const { PostHog } = await import('posthog-react-native');
    const ph = new PostHog(ENV.posthogKey as string, { host: ENV.posthogHost });
    client = {
      capture: (e, p) => ph.capture(e, stripUndefined(p)),
      identify: (id) => ph.identify(id),
    };
  } catch {
    // SDK not installed / failed — stay on no-op.
  }
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (client) client.capture(event, props);
  else if (__DEV__) console.log(`[analytics] ${event}`, props ?? {});
}

export function identify(anonId: string): void {
  client?.identify(anonId);
}

// PostHog's JsonType doesn't accept `undefined` values; drop them (rather than sending
// nulls that weren't intended) so callers can pass optional props without casting.
function stripUndefined(props?: Props): Record<string, string | number | boolean | null> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
