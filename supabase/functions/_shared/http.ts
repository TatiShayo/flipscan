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
