// Error monitoring facade (Sentry). No-op until EXPO_PUBLIC_SENTRY_DSN is set. Request
// bodies / PII are never attached. Alerting on scan-pipeline failures is configured in
// the Sentry project (documented in README).
import { CONFIGURED, ENV } from '@/config/env';

let installed = false;
// deno-lint-ignore no-explicit-any
let sentry: any = null;

export async function initMonitoring(): Promise<void> {
  if (!CONFIGURED.sentry || installed) return;
  try {
    const Sentry = await import('@sentry/react-native');
    Sentry.init({
      dsn: ENV.sentryDsn,
      // scrub: don't send default PII; sample conservatively
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
    });
    sentry = Sentry;
    installed = true;
  } catch {
    // SDK not installed — stay on no-op.
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) sentry.captureException(error, context ? { extra: context } : undefined);
  else if (__DEV__) console.warn('[monitoring]', error, context ?? {});
}
