// Small HTTP helpers for edge functions: generic (non-leaking) JSON responses, CORS,
// and auth-context extraction. Client-facing errors are generic; details go to Sentry.
import type { ScanError } from './schema.ts';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS },
  });
}

export function errorResponse(err: ScanError, status: number): Response {
  return json(err, status);
}

// fetch with bounded exponential backoff + jitter (REVIEW_FINDINGS.md M3). A single
// transient 429/5xx or network blip to Anthropic/eBay would otherwise fail a scan the user
// already paid a credit for (refunded by H2, but still a bad scan). Retries ONLY on
// retryable conditions; 4xx (other than 429) fail fast — they won't get better on replay.
// The caller's own AbortSignal.timeout still bounds each attempt.
export async function fetchWithBackoff(
  input: string | URL | Request,
  init?: RequestInit,
  opts: { retries?: number; baseMs?: number } = {},
): Promise<Response> {
  const retries = opts.retries ?? 2;
  const baseMs = opts.baseMs ?? 300;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      // 429 + 5xx are transient; retry if we have budget left.
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        await sleep(backoff(baseMs, attempt));
        continue;
      }
      return res;
    } catch (e) {
      // Network-level failure (DNS, reset, per-attempt timeout). Retry if budget remains.
      lastErr = e;
      if (attempt < retries) {
        await sleep(backoff(baseMs, attempt));
        continue;
      }
      throw e;
    }
  }
  // Unreachable in practice (loop returns/throws), but satisfies the type checker.
  throw lastErr ?? new Error('fetchWithBackoff exhausted');
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// exponential + full jitter, capped at ~4s so a slow outage can't stall the request budget.
const backoff = (baseMs: number, attempt: number) =>
  Math.round(Math.random() * Math.min(4_000, baseMs * 2 ** attempt));

// HTTP status per error code.
export const ERROR_STATUS: Record<ScanError['error'], number> = {
  unauthorized: 401,
  rate_limited: 429,
  quota_exhausted: 402,
  budget_capped: 402,
  paywall: 402,
  ai_disabled: 503,
  bad_request: 400,
  identification_failed: 422,
  internal: 500,
};
