// Public app config. Only EXPO_PUBLIC_* values live here (they ship in the bundle and
// MUST be non-secret). Secrets (Anthropic, eBay, service role) live ONLY in edge-function
// secrets — never referenced from the app. Every integration degrades to a mock/no-op
// when its key is absent so the app always runs; absences are logged under NEEDS HUMAN.

// Each EXPO_PUBLIC_* reference below MUST be a static, literal `process.env.X` access —
// Expo's build-time replacer (and eslint-plugin-expo's no-dynamic-env-var rule) only
// inlines statically-analyzable accesses into the bundle. A helper that indexes
// `process.env[key]` dynamically silently fails to inline in production builds.
function nonEmpty(v: string | undefined): string | undefined {
  return v && v.length > 0 ? v : undefined;
}

export const ENV = {
  supabaseUrl: nonEmpty(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: nonEmpty(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  posthogKey: nonEmpty(process.env.EXPO_PUBLIC_POSTHOG_KEY),
  posthogHost: nonEmpty(process.env.EXPO_PUBLIC_POSTHOG_HOST) ?? 'https://us.i.posthog.com',
  sentryDsn: nonEmpty(process.env.EXPO_PUBLIC_SENTRY_DSN),
  revenueCatIosKey: nonEmpty(process.env.EXPO_PUBLIC_RC_IOS_KEY),
  revenueCatAndroidKey: nonEmpty(process.env.EXPO_PUBLIC_RC_ANDROID_KEY),
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
