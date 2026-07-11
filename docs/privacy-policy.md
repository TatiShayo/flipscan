# FlipScan Privacy Policy

_Last updated: 2026-07-10_

This policy explains what FlipScan ("we", "the app") collects, why, and how you can delete
it. FlipScan is built to collect the minimum needed to identify an item and estimate its
resale value (PLAYBOOK 2.7 data-minimization principle) — we do not sell your data.

## What we collect

| Data | Why | Retention |
|---|---|---|
| Photos you take to scan an item | Sent to our AI vision provider to identify the item (brand, category, condition cues) | Stored in a private bucket for 90 days, then automatically purged |
| Scan results (item name, category, price estimate, verdict) | So your history, watchlist, and CSV export work | Kept until you delete the scan or your account |
| Barcode values you scan | Looked up against eBay listings to find comps | Not stored separately from the scan result |
| Device fingerprint (hashed) | Prevents free-scan abuse (e.g. reinstalling to get unlimited free scans) | Tied to your anonymous account; deleted with your account |
| Purchase/subscription status | Unlocks paid features via RevenueCat | Kept while your account is active |
| App usage events (screens viewed, scans started/completed, paywall views) | Understand what's working so we can improve the app | Aggregated, no photo content included |
| Crash/error reports | Fix bugs | Scrubbed of request bodies and personal data before leaving the device |

We do **not** require you to create an account with an email or phone number to use your
3 free scans. An anonymous, device-scoped identity is created automatically.

## Camera usage

FlipScan's core feature requires camera access to photograph items and scan barcodes.
Camera access is requested only when you first try to scan, with an explanation, and you
can decline — the app remains usable to browse your existing history and settings without
granting camera access, though scanning obviously requires it. We never access your camera
roll/photo library directly; you always take a fresh photo (or the app uses a photo you
just took) and every photo is only used to identify the specific item in it.

Photos are transmitted over an encrypted (HTTPS) connection to our backend, which sends
the image to our AI vision provider (Anthropic) for identification. Photos are not shared
with, or visible to, any other FlipScan user.

## Third-party subprocessors

FlipScan uses the following services to operate. Each only receives the minimum data it
needs to perform its function:

| Subprocessor | Purpose | Data shared |
|---|---|---|
| **Supabase** | Database, authentication, file storage, backend functions | Scan photos, scan results, account identifiers |
| **Anthropic** (Claude) | AI item identification from your photo | The scan photo(s) only — not stored by us alongside any other personal identifier beyond the scan record |
| **eBay** (Browse API) | Looking up comparable listings to estimate resale value | Search keywords derived from the AI identification (e.g. "Patagonia Snap-T fleece") or a scanned barcode/GTIN — never your photo |
| **RevenueCat** | Subscription and purchase management | Purchase/entitlement status, device/app identifiers |
| **PostHog** | Product analytics | Anonymized usage events — no photo content, no PII in event properties |
| **Sentry** | Crash and error monitoring | Error reports with request bodies scrubbed |

We do not sell your data to anyone, including these subprocessors, for their own
marketing purposes.

## Your controls

- **Delete your data**: Settings → "Delete my data" removes your scans, watchlist, photos,
  and metering record permanently. This cannot be undone.
- **Camera permission**: revocable at any time in your device's system settings; scanning
  simply won't work until re-granted.
- **Data export**: your scan history is exportable as a CSV at any time from the History
  tab (annual-plan feature) so you retain your own records independent of the app.

## Children

FlipScan is not directed at children under 13 and we do not knowingly collect data from
them.

## Changes to this policy

We'll update the "last updated" date above when this policy changes and, for material
changes, surface an in-app notice.

## Contact

Questions or deletion requests that the in-app "Delete my data" action doesn't cover:
`privacy@flipscan.app` (NEEDS HUMAN: stand up this mailbox before submission — currently a
placeholder address; see PROJECT_STATE.md for account setup status).
