# PROJECT_STATE — FlipScan — Thrift Resale Value Scanner (Expo RN + Supabase Edge Functions)

> Single source of truth for build continuity. Update after every milestone.
> A fresh session with zero memory must resume from this file alone.
> Binding spec: repo-root `BUILD_PROMPT.md` + `PLAYBOOK.md` (prompt wins on conflict).

## Status: MILESTONE 1 IN PROGRESS — 2026-07-07

## Repo layout
- `mobile/` — Expo RN app (expo-router). Was bare Expo template; being built out.
- `supabase/migrations/` — Postgres schema, RLS, metering, purges (DONE, see below).
- `supabase/functions/` — Deno edge functions (API layer). Being built.
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

## In progress
- Milestone 1 scaffold: full toolchain install, expo-router structure, zustand+AsyncStorage
  stores, "appraiser's field tool" theme, PostHog+Sentry wiring, provider interfaces + mocks,
  edge-functions project layout.

## Next (milestone order from BUILD_PROMPT.md)
1. Scaffold (in progress)
2. Scan pipeline: camera → edge fn → Claude vision (mock) → eBay comps (mock, isolated
   behind one comps-provider interface) → result card + verdict reveal.
3. Monetization: free-scan metering (server-side, done in DB; wire client+fn) + RevenueCat paywall (mock).
4. Features: history+watchlist, barcode, multi-photo, condition adjuster, offline queue,
   profit settings, share card, CSV export, trending tab content.
5. Polish (verdict-reveal signature interaction).
6. Security tests: RLS deny-test, metering-bypass test, budget-cap, bundle secret-scan.
7. QA: jest — profit math, zod schemas, comps mock, edge-fn fixtures.
8. Release prep: eas.json, ASO copy, eBay dev-account guide.

## Verification gate (no simulators on this Windows machine)
- `node node_modules/typescript/bin/tsc --noEmit` (mobile) — passes
- eslint — passes
- jest — passes
- `npx expo export` — succeeds
(Simulator/EAS/eBay/store steps are NEEDS HUMAN, documented below.)

## NEEDS HUMAN (blocking keys / accounts / device steps)
All third-party integrations run on typed provider mocks until keys land.
- **ANTHROPIC_API_KEY** — edge-function secret. Claude vision ID. Mock returns fixture ID.
- **EBAY_CLIENT_ID / EBAY_CLIENT_SECRET** — edge-function secret. eBay Browse API comps.
  Mock returns fixture listings. Requires eBay developer account (guide in README, milestone 8).
- **EPN (eBay Partner Network) campaign id** — outbound affiliate link wrapping. Behind config
  flag; plain-link fallback until approved.
- **RevenueCat API keys** (`EXPO_PUBLIC_RC_IOS_KEY` / `_ANDROID_KEY`) + Offerings/products
  configured in RC dashboard. Paywall runs on mock entitlement until then.
- **EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY** — Supabase project. App uses
  a no-op/mock supabase client with in-memory fixtures until set.
- **SUPABASE_SERVICE_ROLE_KEY** — edge-function secret (server-side metering/usage writes).
- **PostHog** (`EXPO_PUBLIC_POSTHOG_KEY` / `_HOST`) — analytics. No-op logger until set.
- **Sentry** (`EXPO_PUBLIC_SENTRY_DSN` + edge `SENTRY_DSN`) — error monitoring. No-op until set.
- **Device / store steps (cannot run here):** iOS/Android simulator runs, EAS builds,
  App Store / Play Console accounts + certs, RevenueCat sandbox purchase test, EPN account.
- **AI_KILL_SWITCH** env flag (edge fn) — set to disable AI pipeline instantly.
