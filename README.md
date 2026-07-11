# FlipScan

Point your camera at a thrift-store item; FlipScan identifies it, checks live eBay comps,
and tells you if it's a profitable flip. See `BUILD_PROMPT.md` for the full product spec,
`PLAYBOOK.md` for the design/security/retention/monetization standards this build follows,
and `PROJECT_STATE.md` for current build status + the authoritative NEEDS HUMAN list.

```
mobile/    Expo React Native app (expo-router)
supabase/  Postgres migrations + Deno edge functions (the API layer — the app never calls
           AI/eBay APIs directly)
docs/      Store listing copy, privacy policy source
```

## Local development

```bash
cd mobile
npm install
npm start          # expo start
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # jest (edge-fn pure-logic tests + app logic/security tests)
```

The app runs fully offline on deterministic fixtures until the environment variables below
are set — every third-party integration degrades to a typed mock so nothing ever stalls
for a missing key (see `mobile/src/config/env.ts` and `supabase/functions/_shared/providers.ts`).

---

## eBay developer account setup (comps provider)

FlipScan's price estimates come from the eBay Browse API (active listings; sold price is
estimated as 0.75× median active ask, always labeled an estimate).

1. Create an eBay developer account: https://developer.ebay.com/join
2. In the developer portal, create an application ("FlipScan") under **My Account →
   Application Keys**. eBay issues sandbox keys immediately; production keys require
   eBay's app review (can take a few business days — start this early).
3. Note the **Client ID** and **Client Secret** for the **production** keyset (the Browse
   API's `client_credentials` OAuth flow only needs these two, no user login required).
4. Set them as edge-function secrets (never in the app):
   ```bash
   supabase secrets set EBAY_CLIENT_ID=your_client_id
   supabase secrets set EBAY_CLIENT_SECRET=your_client_secret
   ```
5. (Optional, for affiliate revenue) Apply for the **eBay Partner Network**:
   https://partnernetwork.ebay.com — once approved, set
   `supabase secrets set EPN_CAMPAIGN_ID=your_campaign_id`. Outbound listing links are
   wrapped with EPN tracking automatically when this is set (`supabase/functions/_shared/url.ts`
   `withEpn()`); until then, links work as plain eBay URLs (no functionality lost).
6. Until keys are set, `supabase/functions/_shared/ebay_comps.ts`'s real provider is never
   constructed — `makeCompsProvider()` falls back to `MockCompsProvider`, which returns
   fixture listings so the app is fully demoable.

## RevenueCat product setup (monetization)

1. Create a RevenueCat account and project: https://app.revenuecat.com
2. Connect your App Store Connect and/or Google Play Console app (RevenueCat needs these
   to validate receipts) — this requires the store developer accounts to exist first.
3. In each store's console, create the actual subscription/consumable products:
   - Weekly subscription, 3-day free trial — **$7.99/week** (default-selected on the
     paywall)
   - Annual subscription — **$49.99/year** (anchor option)
   - Consumable — **20 extra scans, $4.99** (top-up for capped/lapsed users)
4. In RevenueCat, create matching **Products**, group them into an **Entitlement** (e.g.
   `pro`), and build an **Offering** that presents both subscription packages (this is what
   `mobile/app/paywall.tsx` renders — pricing/copy stays remotely configurable via
   Offerings rather than hardcoded, per PLAYBOOK 4.1).
5. Get the RevenueCat **public SDK keys** (Project → API Keys → Public app-specific keys,
   one per platform) and set them as app env vars (these are safe to ship — RevenueCat
   public keys are not secrets, same class as `EXPO_PUBLIC_*`):
   ```
   EXPO_PUBLIC_RC_IOS_KEY=appl_xxx
   EXPO_PUBLIC_RC_ANDROID_KEY=goog_xxx
   ```
6. Set up the **RevenueCat → Supabase webhook** (RevenueCat project → Integrations →
   Webhooks) pointing at your deployed `revenuecat-webhook` edge function URL, with the
   shared secret matching `RC_WEBHOOK_AUTH` (edge-function secret — see below). This is
   what grants top-up scan credits idempotently (`supabase/functions/revenuecat-webhook/`).
7. Until `EXPO_PUBLIC_RC_IOS_KEY`/`_ANDROID_KEY` are set, `mobile/src/lib/purchases.ts`
   runs on a mock entitlement (paywall renders, purchase button simulates success) so the
   flow is demoable before RC is wired up.
8. **Sandbox-test the purchase flow and restore-purchases path on a real device/simulator
   before submitting to either store** — this cannot be verified in this headless
   environment (see PROJECT_STATE.md NEEDS HUMAN).

## Supabase deploy steps (backend)

1. Create a Supabase project: https://supabase.com/dashboard → New Project.
2. Install the Supabase CLI and log in: `npm i -g supabase` then `supabase login`.
3. Link this repo to your project: `supabase link --project-ref <your-project-ref>`.
4. Apply the migrations (schema, RLS, metering, scheduled purges):
   ```bash
   supabase db push
   ```
5. Set edge-function secrets (server-only; never referenced from the app):
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set EBAY_CLIENT_ID=...
   supabase secrets set EBAY_CLIENT_SECRET=...
   supabase secrets set EPN_CAMPAIGN_ID=...            # optional, see eBay section above
   supabase secrets set RC_WEBHOOK_AUTH=...             # shared secret for the RC webhook
   supabase secrets set SENTRY_DSN=...                  # optional
   supabase secrets set AI_KILL_SWITCH=false            # set to "true" to instantly disable AI scanning
   ```
6. Deploy the edge functions:
   ```bash
   supabase functions deploy scan
   supabase functions deploy revenuecat-webhook
   ```
7. Confirm `pg_cron` purge jobs from `0002_purge.sql` are active (Database → Cron in the
   dashboard) — they purge `scan_cache` (24h), photos (90d), and `ai_usage` (13mo)
   automatically; this is a hard privacy-retention requirement (PLAYBOOK 2.7), not optional
   polish.
8. Set the app's env vars to point at your project:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
   ```
9. Until these are set, the app runs on `mobile/src/lib/mockBackend.ts` — a fully local
   mock pipeline on deterministic fixtures, so the whole scan flow is demoable offline.

---

## Release builds (EAS)

`mobile/eas.json` defines three profiles: `development` (dev client, internal), `preview`
(internal distribution for testers), `production` (store submission — app bundle/IPA,
auto-incrementing build number). Set app-level env vars as **EAS environment variables**
per profile rather than hardcoding them in `eas.json`:

```bash
cd mobile
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value ...
# ...repeat for each EXPO_PUBLIC_* value and environment
eas build --profile production --platform all
```

`eas.json`'s `submit.production` block has placeholder Apple Team ID / App Store Connect
app ID / Google service-account path — fill these in once the store developer accounts and
app listings exist (see `docs/store-listing.md`, `docs/privacy-policy.md`).

## Analytics & error monitoring

Every tracked event is documented in `analytics.md` (repo root) — no orphan events, per
PLAYBOOK Part 5. Set `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_SENTRY_DSN` to activate; both
are no-ops until set.

## Privacy & compliance

- Privacy policy source: `docs/privacy-policy.md` (deploy to the landing page referenced
  by `mobile/app/(tabs)/settings.tsx`'s `PRIVACY_URL` before submission).
- Camera usage strings are set in `mobile/app.json` (`NSCameraUsageDescription`, Android
  `CAMERA` permission + `expo-camera` plugin config).
- Self-serve "Delete my data" ships in Settings, backed by the `delete_my_data()` Postgres
  function (`supabase/migrations/0001_init.sql`).
- App Store "App Privacy" questionnaire / Google Play "Data safety" form: answer based on
  the subprocessor table in `docs/privacy-policy.md` — collects photos (camera, linked to
  user, not shared with third parties for their own purposes), usage data (analytics,
  not linked to identity), purchase history (via RevenueCat).

## NEEDS HUMAN

See `PROJECT_STATE.md` for the authoritative, up-to-date list (keys, accounts, device/store
steps that cannot be completed in this environment).
