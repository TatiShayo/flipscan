# PROJECT_STATE — FlipScan — Thrift Resale Value Scanner (Expo RN + Supabase Edge Functions)

> Single source of truth for build continuity. Update after every milestone.
> A fresh session with zero memory must resume from this file alone.
> Binding spec: repo-root `BUILD_PROMPT.md` + `PLAYBOOK.md` (prompt wins on conflict).

## Status: MILESTONES 1-4 DONE, MILESTONE 5+ IN PROGRESS — 2026-07-07

Prior state of this file said "Milestone 1 in progress" — that was stale. `git log`
and an on-disk audit confirm Milestones 1-4 (scaffold, scan pipeline, monetization,
5-tab feature shell) are essentially complete, including several Milestone-4 items
(barcode/GTIN, condition adjuster, EPN link wrapping) that were built ahead of plan.

## Repo layout
- `mobile/` — Expo RN app (expo-router, Expo SDK 57). Full app: onboarding, camera,
  scan pipeline, result/verdict-reveal, paywall, 5-tab shell (scan/history/watchlist/
  trending/settings).
- `supabase/migrations/` — Postgres schema, RLS, metering, purges (DONE, do not rewrite).
- `supabase/functions/` — Deno edge functions: `scan` (pipeline), `revenuecat-webhook`,
  `_shared/` (schema, profit math, URL sanitizer, vision + comps provider interfaces
  w/ real+mock impls, fixtures, hashing, http helpers).
- `landing/` — static Next.js page (NOT started; NEEDS HUMAN / later milestone).

## Done (verified on disk)

### Supabase migrations (complete, high quality — do not rewrite)
- `0001_init.sql` — enums, `scans`, `watchlist`, `scan_credits`, `ai_usage`, `scan_cache`
  tables; RLS default-deny + owner-only policies; private `scan-photos` bucket;
  `delete_my_data()` self-serve deletion. Metering/usage tables have NO client policies
  (service-role only).
- `0002_purge.sql` — pg_cron scheduled purges: scan_cache 24h, photos 90d, ai_usage 13mo.
- `0003_metering.sql` — atomic `consume_scan_credit` (race-safe, top-up before free),
  `refund_scan_credit`, `record_ai_usage` (daily rate + monthly budget), idempotent
  `grant_topup_scans` (RevenueCat top-ups via `rc_events` event-id dedupe).

### Edge functions (Milestone 2 — scan pipeline)
- `_shared/schema.ts` — zod request/response schemas incl. `mode: photo|barcode`.
- `_shared/profit.ts` — profit math (fees, shipping estimate, condition multiplier).
- `_shared/url.ts` — eBay URL sanitizer (https + ebay.com host check) + EPN campid
  wrapper (behind config flag, plain-link fallback until EPN account approved).
- `_shared/vision_provider.ts` + `anthropic_vision.ts` — Claude vision interface,
  real impl + deterministic mock (fixture selection incl. low-confidence + barcode
  variants).
- `_shared/comps_provider.ts` + `ebay_comps.ts` — eBay Browse API interface, real impl
  (incl. GTIN search for barcode path) + mock.
- `_shared/fixtures.ts`, `hash.ts`, `http.ts`, `providers.ts`, `supabase_admin.ts` —
  supporting infra.
- `scan/index.ts` — full pipeline: auth, zod validation, image-hash cache lookup,
  metering (`consume_scan_credit`), parallel vision+comps calls, profit calc, persist,
  refund-on-failure.
- `revenuecat-webhook/index.ts` — signature-verified, idempotent top-up grants.

### Mobile app (Milestones 1, 3, 4)
- Scaffold: expo-router root layout, entry gate, UI primitives (Button, Icon w/
  hand-rolled Lucide-style set), theme tokens ("appraiser's field tool": cream/forest/
  clay, Space Grotesk + Inter + JetBrains Mono), env config, zustand + AsyncStorage
  stores, PostHog + Sentry facades (no-op until keys land).
- Onboarding: 4 screens (welcome, platforms, frequency, camera permission).
- Bottom tabs shell: scan / history / watchlist / trending / settings (all 5 real,
  not stubs).
- Scan flow: `camera.tsx` (photo + **barcode mode already implemented** — segmented
  toggle, `expo-camera` `onBarcodeScanned`, pulsing framing corners, shutter haptic),
  `captureStore.ts` (hand-off store), `scanning.tsx` (3-stage staged-copy progress),
  `scanApi.ts` (calls edge fn, mock fallback via `mockBackend.ts` when Supabase env
  unset).
- Result/verdict reveal: `result/[scanId].tsx`, `PriceRangeBar.tsx` (fills left-to-
  right), `VerdictStamp.tsx` (rubber-stamp motion), `ConfettiBurst.tsx` (Skia-based,
  reveal-agent still needs to gate it to ≥$50 FLIP only — verify), `PriceText.tsx`
  (odometer-style mono digits). **Condition adjuster is real**: segmented control
  (New w/ tags/Excellent/Good/Fair) in `result/[scanId].tsx`, multiplier table in
  `constants/profit.ts`, persists per scan.
- Monetization (Milestone 3): `paywall.tsx` (hard paywall) + `lib/purchases.ts`
  (RevenueCat provider interface, mock entitlement until keys land).
- History tab + CSV export (`lib/csvExport.ts`, expo-sharing).
- Watchlist, trending (static authored JSON in `content/trending.ts`), settings tabs.
- Device fingerprinting (`lib/device.ts`) for reinstall-resistant metering hint
  (server-side count is authoritative, per PLAYBOOK 2.2).

## Gaps found vs BUILD_PROMPT.md features #1-16 (audited against disk 2026-07-07)
Cross-referenced every numbered feature in BUILD_PROMPT.md against actual files:
1. Scan flow — DONE. 2. Barcode mode — DONE (camera + GTIN eBay lookup end-to-end,
ahead of schedule). 3. History — DONE. 4. Watchlist — DONE. 5. Fee/profit settings —
DONE (`constants/profit.ts`, platform picker). 6. Free-scan gating + paywall — DONE.
7. Onboarding — DONE. 8. Share card — **MISSING** (no view-shot share-card component
found). 9. Trending tab — DONE (authored content). 10. Anti-abuse — DONE (rate limit +
downscale + 24h cache, server-side). 11. **Multi-photo/tag-photo scan — MISSING**:
`needs_better_photo`/`photo_tip` surfaces in the result card but there is no "Snap the
tag" one-tap rescan action, and no second-photo capture UI in `camera.tsx`/
`captureStore.ts` (schema supports an `images[]` array so the edge fn is ready; the
client never sends more than one). 12. Condition adjuster — DONE. 13. **Offline queue
— MISSING**: no `expo-network` listener anywhere in `mobile/src`, no "Queued" state in
history, no auto-process-on-reconnect. 14. EPN affiliate links — DONE (server-side
wrapper + flag). 15. CSV export — DONE. 16. Smart review prompt — **MISSING**: no
`expo-store-review` usage found in the app; needs the ≥$50-FLIP-triggered one-time
prompt.

These gaps (share card, multi-photo rescan, offline queue, review prompt) are the
priority build targets before polish/security/QA/release milestones.

## Verification gate (2026-07-07, no simulators on this Windows machine)
- `node node_modules/typescript/bin/tsc --noEmit` (mobile) — **PASS**, zero errors.
- `npx eslint . --ext .ts,.tsx` (mobile) — **PASS**, 0 errors / 1 warning
  (`monitoring.ts:8` `no-explicit-any`).
- `npx jest` (mobile) — **FAIL**: zero test files exist yet anywhere (`__tests__`
  dirs absent under `mobile/src` and `supabase/functions/_shared`). This is expected —
  Milestone 7 (QA) has not started. Not a regression; tracked as the Milestone 7
  deliverable.
- `npx expo export --platform web` (mobile) — **PASS**, bundles + 21 static routes
  exported to `mobile/dist`.

## Next (milestone order from BUILD_PROMPT.md)
5. **Polish** (in progress this session): verdict-reveal motion tuning to 60fps-
   premium, haptics map, empty/error states, PLAYBOOK screenshot-test read-through
   (banned: purple/blue gradients, glassmorphism, emoji-as-UI).
6. **Security tests**: RLS deny-test, metering-bypass (reinstall simulation), budget-
   cap test, bundle secret-scan.
7. **QA**: jest tests for profit math + zod schemas + comps-provider mock + edge-fn
   fixtures (recorded Claude/eBay responses). Currently zero tests exist — this is
   the jest gate failure above.
8. **Release prep**: eas.json, privacy policy, store listing copy + ASO keywords,
   README with eBay dev-account setup.

Plus the 4 real feature gaps above (share card, multi-photo rescan, offline queue,
review prompt) — building these alongside Milestone 5 since they're BUILD_PROMPT
features #8/#11/#13/#16, not polish.

## NEEDS HUMAN (blocking keys / accounts / device steps)
All third-party integrations run on typed provider mocks until keys land.
- **ANTHROPIC_API_KEY** — edge-function secret. Claude vision ID. Mock returns fixture ID.
- **EBAY_CLIENT_ID / EBAY_CLIENT_SECRET** — edge-function secret. eBay Browse API comps.
  Mock returns fixture listings. Requires eBay developer account (guide in README, milestone 8).
- **EPN (eBay Partner Network) campaign id** — outbound affiliate link wrapping. Code
  is done and behind a config flag; plain-link fallback until approved.
- **RevenueCat API keys** (`EXPO_PUBLIC_RC_IOS_KEY` / `_ANDROID_KEY`) + Offerings/products
  configured in RC dashboard. Paywall runs on mock entitlement until then.
- **EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY** — Supabase project. App uses
  a no-op/mock supabase client with in-memory fixtures until set.
- **SUPABASE_SERVICE_ROLE_KEY** — edge-function secret (server-side metering/usage writes).
- **PostHog** (`EXPO_PUBLIC_POSTHOG_KEY` / `_HOST`) — analytics. No-op logger until set.
- **Sentry** (`EXPO_PUBLIC_SENTRY_DSN` + edge `SENTRY_DSN`) — error monitoring. No-op until set.
- **Device / store steps (cannot run here):** iOS/Android simulator runs, EAS builds,
  App Store / Play Console accounts + certs, RevenueCat sandbox purchase test, EPN account.
- **AI_KILL_SWITCH** env flag (edge fn) — set to disable AI pipeline instantly (verify
  it's implemented — audit during Milestone 6 security pass).
