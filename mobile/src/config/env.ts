// Public app config. Only EXPO_PUBLIC_* values live here (they ship in the bundle and
// MUST be non-secret). Secrets (Anthropic, eBay, service role) live ONLY in edge-function
// secrets — never referenced from the app. Every integration degrades to a mock/no-op
// when its key is absent so the app always runs; absences are logged under NEEDS HUMAN.

function pub(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export const ENV = {
  supabaseUrl: pub('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: pub('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  posthogKey: pub('EXPO_PUBLIC_POSTHOG_KEY'),
  posthogHost: pub('EXPO_PUBLIC_POSTHOG_HOST') ?? 'https://us.i.posthog.com',
  sentryDsn: pub('EXPO_PUBLIC_SENTRY_DSN'),
  revenueCatIosKey: pub('EXPO_PUBLIC_RC_IOS_KEY'),
  revenueCatAndroidKey: pub('EXPO_PUBLIC_RC_ANDROID_KEY'),
} as const;

// True when a given integration is fully configured; drives mock fallbacks + dev banner.
export const CONFIGURED = {
  supabase: Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey),
  posthog: Boolean(ENV.posthogKey),
  sentry: Boolean(ENV.sentryDsn),
  revenueCat: Boolean(ENV.revenueCatIosKey || ENV.revenueCatAndroidKey),
} as const;

// Human-readable list of what's still on mocks (surfaced in a dev-only banner).
export function missingIntegrations(): string[] {
  const out: string[] = [];
  if (!CONFIGURED.supabase) out.push('Supabase');
  if (!CONFIGURED.posthog) out.push('PostHog');
  if (!CONFIGURED.sentry) out.push('Sentry');
  if (!CONFIGURED.revenueCat) out.push('RevenueCat');
  return out;
}
