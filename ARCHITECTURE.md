# FlipScan — Architecture

Thrift-resale value scanner. Point the camera at an item; the app identifies it (Claude
vision), pulls live eBay comps, computes fee-adjusted profit, and returns a flip/skip
verdict. Free-scan metered with a hard paywall and consumable top-ups.

## System shape

```
┌─────────────────────────┐        ┌──────────────────────────────┐        ┌───────────────┐
│  mobile/  (Expo RN)      │  JWT   │  supabase/functions (Deno)   │  svc   │  Postgres      │
│  expo-router, zustand    │──────▶ │  scan/  revenuecat-webhook/  │──────▶ │  RLS + RPCs    │
│  camera → scanning →     │  HTTPS │  _shared/ (providers, schema)│  role  │  scan_cache    │
│  result/verdict          │        │                              │        │  storage bucket│
└─────────────────────────┘        └──────────────┬───────────────┘        └───────────────┘
                                                   │ server-only secrets
                                      ┌────────────┴────────────┐
                                      │ Claude vision (identify)│
                                      │ eBay Browse API (comps) │
                                      └─────────────────────────┘
```

The app **never** calls Claude or eBay directly and never holds those keys. All AI/comps
spend, metering, and persistence happen behind the `scan` edge function. Client secrets are
limited to the Supabase URL + anon key (`EXPO_PUBLIC_*`), which are safe to ship.

## Modules

### mobile/ (Expo SDK 57, expo-router)
- `app/` — routed screens: onboarding (4), `(tabs)` shell (scan/history/watchlist/trending/
  settings), `camera.tsx` (photo + barcode), `scanning.tsx` (staged progress), `result/
  [scanId].tsx` (verdict reveal, condition adjuster, eBay-link open), `paywall.tsx`,
  `share/[scanId].tsx`.
- `src/lib/` — `scanApi.ts` (edge-fn client + mock fallback), `supabase.ts`, `device.ts`
  (reinstall-resistant metering hint), `image.ts` (≤1024px JPEG downscale, EXIF strip),
  `offlineQueue.ts` (queue + retry cap/backoff), `url.ts` (client-side eBay host allowlist),
  `purchases.ts` (RevenueCat facade), `csvExport.ts`, `analytics.ts`/`monitoring.ts`
  (PostHog/Sentry no-op facades until keys land).
- `src/store/` — zustand + AsyncStorage: `scanStore` (history, metering display),
  `captureStore` (photo hand-off), `settingsStore`.
- `src/constants/profit.ts` — client mirror of condition multipliers for live recompute.

### supabase/functions/ (Deno)
- `scan/index.ts` — the wallet-guarding core. Gate order: JWT auth → zod + server image-size
  recheck → AI kill-switch → daily-rate/monthly-budget (`record_ai_usage`) → **consume a
  credit atomically (`consume_scan_credit`) BEFORE any AI spend** → 24h image-hash cache →
  vision → comps → profit/verdict → persist. Any post-consume failure refunds the exact
  bucket consumed.
- `revenuecat-webhook/index.ts` — server-to-server, shared-secret auth (fail-closed),
  idempotent top-up grants via `rc_events` event-id dedupe.
- `_shared/` — `schema.ts` (zod request/response + `IdentifiedSchema`/`CompsSchema`),
  `providers.ts` (kill-switch, limits, provider factories), `anthropic_vision.ts` +
  `ebay_comps.ts` (real impls) with mock counterparts, `http.ts` (`fetchWithBackoff`,
  generic error envelopes, CORS), `url.ts` (eBay host allowlist + EPN wrapper), `profit.ts`,
  `hash.ts`, `supabase_admin.ts` (JWT extraction + service-role client).

### supabase/migrations/
- `0001_init.sql` — enums, `scans`/`watchlist` (owner-only RLS, no client insert on scans),
  `scan_credits`/`ai_usage`/`scan_cache` (RLS-on, zero client policies = service-role only),
  private `scan-photos` bucket, `delete_my_data()`.
- `0002_purge.sql` — pg_cron purges: scan_cache 24h, photos 90d, ai_usage 13mo.
- `0003_metering.sql` — atomic `consume_scan_credit` (top-up before free, single-statement
  conditional = no check-then-act race), `refund_scan_credit`, `record_ai_usage`,
  idempotent `grant_topup_scans`.
- `0004_metering_hardening.sql` — H3 ownership guard (a credit row owned by another user is
  never consumed/refunded), H4 bucket-correct refund (`used_topup`), M1 single-row grant.
  All metering RPCs `security definer` + pinned `search_path` + revoked from public.

## Data flow — a scan
1. Client downscales photo → base64, gets JWT, POSTs `{images, device_hash, mode}` to `scan`.
2. Edge fn validates JWT server-side (`auth.getUser`), never trusts client user id.
3. zod parse + server-side byte-size recheck (≤3 MB, matches bucket cap).
4. kill-switch, then `record_ai_usage` (rate + budget), then `consume_scan_credit` — **credit
   is spent before any paid API call**; paywall verdict if none.
5. 24h `scan_cache` lookup by SHA-256 of the primary image; a hit refunds the credit (no
   Claude call) and returns the cached identity.
6. On miss: Claude vision → zod-validated identity (retry once, fail closed) → cache upsert.
7. eBay comps (`fetchWithBackoff`), sample links host-checked + EPN-wrapped (bad URLs dropped).
8. Profit + verdict computed server-side; `scans` row inserted (service role); result returned.
9. Any failure after step 4 refunds the exact bucket consumed. Errors to client are generic;
   details logged for Sentry.

## Trust boundaries
- **Client → edge fn:** JWT-authenticated; no client-supplied user id or entitlement trusted;
  metering is server-authoritative (clearing local storage grants nothing — regression test:
  `mobile/src/lib/__tests__/scanApi.security.test.tsx`).
- **Edge fn → Postgres:** service-role, but metering/usage tables have no client RLS policies;
  ownership guards inside the RPCs prevent cross-user credit drain.
- **Edge fn → Claude/eBay:** untrusted image/web content wrapped as data; LLM output zod-gated;
  outbound eBay URLs host-checked before EPN wrap and again client-side before `openBrowser`.
- **RevenueCat → webhook:** shared-secret (fail-closed, constant-time compare), event dedupe.

## External services
Claude vision (identify), eBay Browse API (comps), Supabase (Postgres/Auth/Storage/Edge),
RevenueCat (IAP top-ups + subscription entitlement), PostHog (analytics), Sentry (errors).
Every one runs against a typed mock until its key lands, so the app + test suite run fully
offline. See PROJECT_STATE.md "NEEDS HUMAN" for the key/account checklist.
