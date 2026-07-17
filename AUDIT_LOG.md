# FlipScan — Audit Log

Protocol: `.agents/upgrade.txt` Phases 2–3, 7 + PLAYBOOK.md Part 2. Appended per pass.
Full findings detail lives in `REVIEW_FINDINGS.md`; this log is the phase-by-phase trail.

---

## Phase 2 — Deep audit (architecture / security / performance / reliability)

**Architecture (2.1).** Mapped the full system; wrote `ARCHITECTURE.md`. Client never holds
AI/eBay keys — all spend is behind the `scan` edge function. No dead code or unused deps of
note; provider interfaces have real + mock impls sharing one contract.

**Security (2.2) — found & fixed (see REVIEW_FINDINGS H1–H4, M1–M4):**
- H1 RevenueCat webhook fail-open when `RC_WEBHOOK_AUTH` unset → **fixed:** fail-closed 503,
  constant-time compare.
- H2 no credit refund on late pipeline failure → **fixed:** `creditConsumed`/`refunded`
  flags, refund in top-level catch.
- H3 cross-user credit drain via client `device_hash` → **fixed (0004):** ownership guard.
- H4 refund restored wrong bucket → **fixed (0004):** `used_topup` bucket-correct refund.
- M1 `grant_topup_scans` double-grant across devices → **fixed (0004):** single-row grant.

**Verified-good (no change needed):** JWT validated server-side before any work; server-side
image-size recheck; `consume_scan_credit` runs BEFORE the AI call (atomic, top-up first);
LLM output zod-validated with one retry then fail-closed; eBay URLs host-checked server- AND
client-side; RLS owner-only on scans/watchlist, service-role-only on credits/usage/cache
(guarded by `rls_invariants.test.ts`); RevenueCat idempotent via `rc_events`; kill-switch +
daily rate + monthly budget enforced server-side; client downscales to 1024px; generic error
envelopes; no secrets in the exported bundle.

**Performance (2.3):** 1024px JPEG downscale before upload (`image.ts`); FlatList windowing
(`windowSize`/`maxToRenderPerBatch`) + `memo`'d rows on history/watchlist/trending; 24h
image-hash cache skips repeat Claude calls; provider backoff prevents retry storms.

**Reliability (2.4):** M2 offline queue was one-shot (payload dropped on first blip) →
**fixed:** per-item `attempts`, retry cap (3) + exponential inter-item backoff, permanent
failure only on non-retryable verdicts or cap. M3 providers were single-shot →
**fixed:** shared `fetchWithBackoff` (2 retries, exp + jitter, 429/5xx/network only).

## Phase 3 — Adversarial review & reduction

**3.1 Chain-of-exploit — metering-bypass chain (proven + fixed).**
- Chain A (client): clear AsyncStorage / reinstall → local `freeScansUsed` resets to 0 →
  attacker expects free scans. **Reality:** `requestScan()` never consults the local counter
  on the real-backend path; the server decides. Proven by
  `mobile/src/lib/__tests__/scanApi.security.test.tsx` (relays server paywall verdict with
  local counter at 0; the only local-trusting path — `runMockScan` — is asserted never
  called).
- Chain B (server, the serious one): authenticated attacker replays another device's
  `device_hash` → `consume_scan_credit` (pre-0004) upserted/consumed keyed only on the hash →
  drains the victim's purchased top-ups. **Fixed (0004):** ownership guard refuses when the
  row's `user_id` is set and ≠ caller; refund scoped to the caller's row. This is the
  CONFIRMED metering-bypass; fix + regression coverage committed.

**3.4 Cost review.** Redundant identical paid calls collapsed by the 24h image-hash cache
(refunds the credit on a hit). Retry logic bounded (cap + jitter + overall timeout) so an
outage can't multiply Claude/eBay cost.

**3.2 Reduction.** No risky rewrites; simplifications limited to test hygiene. Net LOC roughly
flat in touched files.

## Phase 7 — Remediation & closure

- **Bucket A (fixed now):** all HIGH + M1/M2/M3 above; stale `vision_provider.test.ts` 429
  case rewritten to match the committed backoff behavior (persistent 429 → fail-closed
  `IdentificationError`; single-shot mock had been retried into a `TypeError`).
- **Bucket B/C (safe default, documented):** M4 24h `scan_cache` is global by image hash —
  accepted as by-design cost control (a "leak" requires the identical image bytes, which
  already reveal the item; hits still pass auth + rate limit + metering). L2 `ebayimg.com` in
  the open allowlist (https-only CDN). L3 CORS `*` (endpoints JWT-gated, native app). L4
  `record_ai_usage` counts before cache check (fails safe — limits refund-loop abuse).
- **Root cause (7.3):** the recurring class was *authorization-not-just-authentication* on the
  metering RPCs (trusting a client-supplied key). Closed structurally by moving the ownership
  check inside the `security definer` functions themselves, so every call site inherits it.

## Verification gate (this pass — 2026-07-16, Windows dev machine)
- `tsc --noEmit` (mobile) — PASS, 0 errors.
- `eslint . --ext .ts,.tsx` (mobile) — PASS, 0 errors / 0 warnings.
- `jest` (mobile) — PASS, 99 tests / 9 suites (after the vision-provider test fix).
- `expo export` + dist secret-grep — see PROJECT_STATE.md gate section.

## Final verification pass (2026-07-17)

**Gap found & fixed:** `rls_invariants.test.ts` asserted the metering RPC shapes against
`0003_metering.sql` only — i.e. the SUPERSEDED definitions. The 0004 hardening (H3
ownership guard, H4 bucket-correct refund, M1 single-row grant — the actual metering-bypass
fix) had no regression coverage; reverting 0004 would not have failed CI. Fixed: tests now
resolve each RPC to its *effective* migration and add explicit H3/H4/M1 assertions
(ownership pre-check + ownership-scoped atomic UPDATE, caller-scoped bucket-aware refund,
`limit 1` grant). Commit `b775e81`.

**Spot-verified in code (this pass):** scan fn JWT before any work (`scan/index.ts:40`);
`consume_scan_credit` before the vision call with refund in cache-hit, identify-fail, and
top-level catch paths; RC webhook fail-closed 503 + constant-time compare + `rc_events`
dedupe; `sanitizeEbayUrl` (https + eBay host suffix) gates `WebBrowser.openBrowserAsync`
in `result/[scanId].tsx:127`; RLS owner-only on scans/watchlist, no client policies on
scan_credits/ai_usage/scan_cache/rc_events.

**Gate (all foreground, this machine):** tsc 0 errors · eslint 0 problems ·
jest 103/103, 9 suites · `expo export` + dist grep for
ANTHROPIC_API_KEY / EBAY_CLIENT / sk-ant = zero matches. **GATE GREEN.**

## Still unresolved (explicit)
- Global scan_cache over-counts budget on a hit (fails safe; documented, no change).
- Live-key / device deployment steps remain NEEDS HUMAN (Supabase, Anthropic, eBay, EPN,
  RevenueCat, PostHog, Sentry, EAS/store accounts) — see PROJECT_STATE.md.
