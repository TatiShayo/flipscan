// Scan API client. Prefers the real edge function (POST {supabaseUrl}/functions/v1/scan);
// falls back to a fully local mock pipeline when Supabase isn't configured, so the whole
// scan flow is demoable offline on fixtures. Same ScanResult shape either way.
import { ScanResultSchema, type ScanResult, type ScanError } from '@/types/scan';
import { ENV, CONFIGURED } from '@/config/env';
import { accessToken } from '@/lib/supabase';
import { runMockScan } from '@/lib/mockBackend';

export type ScanOutcome =
  | { ok: true; result: ScanResult }
  | { ok: false; error: ScanError };

export interface ScanArgs {
  images: string[]; // base64 JPEGs
  deviceHash: string;
  mode: 'photo' | 'barcode';
  barcode?: string;
  mockVariant?: 'low_conf' | 'barcode'; // demo-only steering of the mock
}

export async function requestScan(args: ScanArgs): Promise<ScanOutcome> {
  if (!CONFIGURED.supabase) {
    return runMockScan(args);
  }
  const token = await accessToken();
  if (!token) return { ok: false, error: { error: 'unauthorized', message: 'Sign-in required.' } };

  try {
    const res = await fetch(`${ENV.supabaseUrl}/functions/v1/scan`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        images: args.images,
        device_hash: args.deviceHash,
        mode: args.mode,
        barcode: args.barcode,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, error: normalizeError(body) };
    }
    const parsed = ScanResultSchema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, error: { error: 'internal', message: 'Unexpected response.' } };
    }
    return { ok: true, result: parsed.data };
  } catch {
    return { ok: false, error: { error: 'internal', message: 'Network error. Check your connection.' } };
  }
}

function normalizeError(body: unknown): ScanError {
  const b = body as Partial<ScanError>;
  if (b && typeof b.error === 'string') {
    return {
      error: b.error,
      message: b.message ?? 'Something went wrong.',
      free_scans_used: b.free_scans_used,
      free_limit: b.free_limit,
    };
  }
  return { error: 'internal', message: 'Something went wrong.' };
}
