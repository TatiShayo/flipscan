# FlipScan Security & Reliability Review — 2026-07-12

Scope: `supabase/functions/**`, `supabase/migrations/**`, `mobile/src/**`, `mobile/app/**`.
Severity: HIGH = exploitable money/credit/auth impact. MEDIUM = abuse or correctness hole with
limited blast radius. LOW = hardening / hygiene.

## HIGH

### H1 — RevenueCat webhook auth is fail-open (FIXED)
`supabase/functions/revenuecat-webhook/index.ts` checked
`if (expected && header !== expected)` — when `RC_WEBHOOK_AUTH` is unset (the default
until keys land), **any unauthenticated POST could mint 20 top-up scans** for an arbitrary
user id. Also used a non-constant-time string compare.
**Fix:** fail closed when the secret is unset (503, logged), constant-time comparison.

### H2 — No credit refund on late pipeline failure (FIXED)
`scan/index.ts` refunds on vision failure, but a comps failure, cache read error, or
`scans` insert failure lands in the generic `catch` which did **not** refund — users lose a
free/paid scan for a server-side outage (contradicts the file's own header contract).
**Fix:** track `creditConsumed`/`refunded` flags; refund inside the top-level catch.

### H3 — Cross-user credit drain via client-supplied device_hash (FIXED)
`consume_scan_credit(p_device_hash, p_user_id)` upserted/consumed keyed **only** on the
client-supplied `device_hash`. An authenticated attacker replaying another device's hash
(guessable if leaked; also spendable via scripted requests) consumes the victim's purchased
top-up credits. Refund had the same shape.
**Fix (migration 0004):** consume refuses when the row is owned by a different user
(`user_id` set and ≠ caller); refund is scoped `where device_hash = X and user_id = caller`.

### H4 — Refund restores the wrong bucket (FIXED)
`refund_scan_credit` always decremented `free_scans_used`, even when the consumed credit
came from `topup_scans_remaining`. A paying user whose scan failed permanently loses a paid
credit (and may "gain" a free one they already had).
**Fix (migration 0004):** `consume_scan_credit` now returns `used_topup`; refund takes
`p_used_topup` and restores the same bucket it consumed from.

## MEDIUM

### M1 — grant_topup_scans could double-grant across devices (FIXED)
`update scan_credits set topup = topup + N where user_id = X` updates **every** row for the
user — a user with 2 devices got 2×N credits per purchase.
**Fix (migration 0004):** grant lands on exactly one row (most recently active).

### M2 — Offline queue: one-shot, no retry cap/backoff (FIXED)
`mobile/src/lib/offlineQueue.ts` marked a queued capture permanently `failed` (payload
dropped) on the first error — even a transient network blip during drain. Requirement is a
retry cap + backoff.
**Fix:** per-item `attempts` counter, kept `queued` with payload until `MAX_ATTEMPTS` (3);
exponential inter-item backoff during a drain pass; permanent failure only for
non-retryable server verdicts (paywall/budget/bad_request/identification_failed) or cap.

### M3 — No provider retry/backoff (FIXED, reliability)
Anthropic + eBay fetches were single-shot; a transient 429/5xx burned the user's credit
path (mitigated by H2 refund, but still a failed scan).
**Fix:** shared `fetchWithBackoff` (2 retries, exponential + jitter, retries only on
429/5xx/network, honors overall timeout).

### M4 — 24h scan_cache is global (ACCEPTED, documented)
`scan_cache` is keyed by image hash only, shared across users. This is by-design cost
control; a cross-user "leak" requires possessing the identical image bytes, which already
reveal the item. Cache hits still pass auth + rate limit + metering (refunded), so no
metering bypass. Residual: cache-hit scans still book `EST_COST_PER_SCAN_USD` against the
monthly budget (over-counts, fails safe). No change.

## LOW

### L1 — Webhook compare not constant-time — fixed with H1.
### L2 — `ebayimg.com` allowed in outbound-open allowlist (`mobile/src/lib/url.ts`); harmless
(https-only CDN) and needed if thumbnails ever open. No change.
### L3 — CORS `Access-Control-Allow-Origin: *` on edge fns — endpoints are JWT-gated and
called from a native app; acceptable. No change.
### L4 — `record_ai_usage` increments before the cache check, so cache hits count toward the
daily rate limit — fails safe (limits abuse of the refund loop). Intentional; documented.

## Verified-good (no findings)
- Scan edge fn validates the JWT server-side (`auth.getUser(token)`) before any work; never
  trusts client user ids.
- Image size re-checked server-side (`base64ByteLength` vs 3 MB bucket cap) after zod parse.
- `consume_scan_credit` runs BEFORE the AI call; atomic single-statement conditional update
  (no check-then-act race); top-up before free.
- LLM output zod-validated (`IdentifiedSchema`) with one retry then fail-closed; comps
  response shape typed + summarized through `CompsSchema`.
- eBay URLs host-checked (https + ebay.* suffix allowlist) server-side in `withEpn` AND
  re-checked client-side in `mobile/src/lib/url.ts` before `openBrowserAsync`. EPN wrapper
  only ever decorates an already-sanitized eBay URL.
- RLS: `scans`/`watchlist` owner-only (`auth.uid() = user_id`), no client insert on scans;
  `scan_credits`/`ai_usage`/`scan_cache` RLS-on with zero client policies (service-role
  only); all metering RPCs `security definer` + pinned search_path + revoked from public.
  Guarded by `rls_invariants.test.ts`.
- RevenueCat grants idempotent via `rc_events` PK insert before grant.
- Kill switch (`AI_KILL_SWITCH`) checked before spend; daily rate limit + monthly budget cap
  enforced server-side; client downscales to 1024px JPEG q0.7 before upload.
- Errors to clients are generic envelopes; details logged server-side only. No secrets in
  the exported client bundle (re-verified this pass).
