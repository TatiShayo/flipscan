# analytics.md — FlipScan event catalog

> PLAYBOOK Part 5: "Document every event in `analytics.md` at repo root; no orphan events."
> The typed source of truth for event NAMES is `mobile/src/lib/analytics.ts`'s
> `AnalyticsEvent` union — `track()` only accepts events from that list, so a typo or a new
> ad-hoc event fails `tsc`. This file documents WHEN each event fires and what it means.
>
> No PII in event properties (photos, names, emails never appear here) — see
> `docs/privacy-policy.md` and PLAYBOOK 2.7.
>
> Facade: `mobile/src/lib/analytics.ts`. No-op (dev console log only) until
> `EXPO_PUBLIC_POSTHOG_KEY` is set; real events flow via the PostHog React Native SDK once
> configured.

## Funnel: acquisition → activation → paywall → trial → paid → retained

| Event | Fires when | Properties | File |
|---|---|---|---|
| `app_opened` | App root layout mounts (cold start / foreground-from-background via the router root) | — | `mobile/app/_layout.tsx` |
| `onboarding_step_viewed` | Each of the 4 onboarding screens renders | `step` (1-4), `platform` (screen 2), `frequency` (screen 3, optional) | `mobile/app/onboarding/{welcome,platforms,frequency}.tsx` |
| `onboarding_completed` | User grants/declines camera permission on the last onboarding screen | — | `mobile/app/onboarding/permission.tsx` |
| `scan_started` | Camera shutter tapped (photo/barcode capture kicked off, incl. tag-photo rescan and queued-while-offline captures) | `mode` (`'photo'`), `retake` (`'tag_photo'` when applicable), `queued` (`true` when captured offline) | `mobile/app/(tabs)/scan.tsx`, `mobile/app/result/[scanId].tsx`, `mobile/src/lib/offlineQueue.ts` |
| `scan_completed` | The scan pipeline returns a result (real backend or mock; includes queued scans resolved on reconnect) | `verdict`, `confidence` (ID confidence distribution), `category`, `queued_resolved` (offline-queue path) | `mobile/app/scanning.tsx`, `mobile/src/lib/offlineQueue.ts` |
| `scan_failed` | The scan pipeline returns an error (any `ScanError` code, including the offline-queued case) | `error` (error code, e.g. `'paywall'`, `'rate_limited'`, `'offline_queued'`) | `mobile/app/scanning.tsx`, `mobile/app/camera.tsx` |
| `verdict_shown` | The verdict-reveal animation plays on the result card | `verdict` | `mobile/app/scanning.tsx` |
| `free_scans_exhausted` | The scan pipeline returns the `paywall` error specifically (i.e. metering, not a generic failure, blocked the scan) — the moment a user hits the free-scan wall | `free_scans_used` | `mobile/app/scanning.tsx` |
| `paywall_viewed` | The paywall screen mounts (whether reached via `free_scans_exhausted` or manually) | `potential_profit_found` (the personalized pitch number), `history_count` | `mobile/app/paywall.tsx` |
| `trial_started` | User taps "Start free trial" on the paywall (before the purchase sheet resolves) | `plan` (`'weekly'` \| `'annual'`) | `mobile/app/paywall.tsx` |
| `purchase_completed` | RevenueCat purchase resolves successfully for a subscription | `plan` | `mobile/app/paywall.tsx` |
| `topup_purchased` | RevenueCat purchase resolves successfully for the consumable top-up | `scans` (count granted) | `mobile/app/paywall.tsx` |
| `restore_completed` | "Restore purchases" resolves successfully (paywall or settings) | — | `mobile/app/paywall.tsx`, `mobile/app/(tabs)/settings.tsx` |

## Retention & stored-value

| Event | Fires when | Properties | File |
|---|---|---|---|
| `watchlist_added` | User adds a scan to the watchlist from the result card | `scan_id` | `mobile/app/result/[scanId].tsx` |
| `share_card_exported` | User successfully generates/shares the branded share card | `scan_id`, `verdict` | `mobile/app/result/[scanId].tsx`, `mobile/app/share/[scanId].tsx` |
| `csv_exported` | User exports scan history to CSV | `count` (rows exported) | `mobile/app/(tabs)/history.tsx` |
| `trending_opened` | User opens the Trending tab | — | `mobile/app/(tabs)/trending.tsx` |
| `review_prompt_shown` | The one-time smart review prompt fires (first FLIP verdict ≥$50 net profit) | `net_profit` | `mobile/src/lib/reviewPrompt.ts` |

## Cost tracking (server-side, not PostHog)

AI cost per scan is tracked server-side via `record_ai_usage` (Postgres RPC,
`supabase/migrations/0003_metering.sql`) against `EST_COST_PER_SCAN_USD`
(`supabase/functions/_shared/anthropic_vision.ts`) and the per-user monthly budget cap
(`MONTHLY_BUDGET_USD`, `supabase/functions/_shared/providers.ts`) — this is a cost-control
ledger, not a PostHog event, since it must be server-authoritative (client-side analytics
can be dropped/delayed and must never gate spend). See
`supabase/functions/_shared/__tests__/providers.test.ts` for the budget-cap test.

## Adding a new event

1. Add the event name to `AnalyticsEvent` in `mobile/src/lib/analytics.ts`.
2. Add a row to this file (name, trigger, properties, file).
3. Call `track('your_event', { ...props })` — never put photo content, names, emails, or
   free-text user input in `props`.
