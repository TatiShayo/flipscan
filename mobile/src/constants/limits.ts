// Client-side mirrors of server-authoritative limits (supabase/functions/_shared/providers.ts).
// These constants only drive LOCAL/mock-mode UX and copy; the real edge function is the
// only place that can actually grant or deny a scan. Keep numbers in sync by hand.
export const FREE_SCAN_LIMIT = 3;
export const DAILY_SCAN_LIMIT = 20;
export const TOPUP_SCANS_PER_PURCHASE = 20;
