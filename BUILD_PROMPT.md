# BUILD: FlipScan — Thrift Resale Value Scanner (Expo React Native + API backend)

## Your role
Lead engineer-orchestrator. Build from scratch to store-submittable completion (EAS-ready). All decisions are here; don't ask, build.

**BINDING COMPANION DOCUMENT**: a universal `PLAYBOOK.md` is supplied alongside this prompt (premium design standards, full security checklist, retention systems, monetization doctrine). Copy it into the repo root and comply with ALL of it — its Definition-of-Done addendum applies to this project.

## Product overview & business model
FlipScan: point your camera at any thrift-store/garage-sale item → AI identifies it → shows what it's selling for on eBay → tells you if it's a profitable flip. Target user: casual resellers and #thriftflip TikTok audience. Modeled on the "identifier app" category (CoinSnap et al., proven $1M+/mo apps on weekly subs).
- Monetization via RevenueCat: 3 free scans (no signup), then hard paywall: $7.99/week with 3-day trial, or $49.99/year. Scans feel expensive → perceived value.
- The scan-result screen must be screenshot-shareable (TikTok growth loop: "this $4 jacket is worth $85").

## Tech stack (fixed)
- Expo + TypeScript + expo-router, expo-camera, zustand + AsyncStorage
- RevenueCat for subscriptions
- Backend: Supabase (auth anon, scan history, Postgres) + Supabase Edge Functions (Deno) as the API layer — the app NEVER calls AI/eBay APIs directly
- AI vision: Anthropic `claude-sonnet-5` with image input for item identification (brand, model, category, era, condition cues, search keywords) — structured JSON output
- Comps: eBay Browse API (free tier) for active listings; estimate sold price as 0.75 × median active ask (label clearly as "estimate"). Architecture must isolate the comps provider behind one interface so Marketplace Insights API or another source can swap in later. Barcode path: eBay Browse by GTIN.
- Landing page: one static Next.js page on Vercel (links, privacy, support).

## Data model
Supabase: `scans` (id, user_id, image_path, identified jsonb{name,brand,category,keywords[],confidence}, comps jsonb{median,low,high,count,sample_listings[{title,price,url,img}]}, buy_price numeric nullable, verdict enum[flip,skip,maybe], created_at), `watchlist` (user_id, scan_id), `scan_credits` (user_id, free_scans_used int).
Local: onboarding state, settings, cached last results.

## Features & implementation
1. **Scan flow (the core — make it feel magical)**: camera screen with framing guide → snap → upload to edge function → parallel: Claude vision ID + (once keywords return) eBay comps → animated 3-stage progress ("Identifying… Checking 214 listings… Calculating profit…") → RESULT CARD: item name + confidence, price range (low/median/high), # of listings, verdict badge (FLIP 🔥 / MAYBE / SKIP), and a "What'd you pay?" input → live profit calc (median − buy price − platform fees ~13% − shipping estimate by category). Total flow target <8 seconds.
2. **Barcode mode**: toggle on camera; expo-camera barcode scanning → GTIN → eBay lookup directly (books/media/games/electronics). Much higher accuracy; highlight in onboarding.
3. **Scan history**: reverse-chron list with thumbnails, verdicts, profit; filterable; tap to reopen result.
4. **Watchlist**: save items you left in store; note + store-name field.
5. **Fee/profit calculator settings**: platform picker (eBay/Poshmark/Depop/Mercari/FB), each with fee % constants; user default platform.
6. **Free-scan gating + paywall**: 3 scans free without account (device-keyed), then RevenueCat paywall: "You found $X in potential profit already" (sum their 3 scans' spreads — personalized!), weekly-trial default + annual option, testimonial cards, restore.
7. **Onboarding (4 screens pre-camera)**: what it does (demo gif) → pick your platforms → "How much do you thrift per month?" → camera permission w/ explainer. Fast — get to first scan <30s.
8. **Share card**: from result screen, generate branded image (view-shot): item photo, "Paid $4 → Worth $85", FlipScan logo. IG-story sized.
9. **Trending tab (editorial v1)**: static JSON list you author of 20 "hot flip" categories right now (e.g., vintage Pyrex, 90s band tees, Lego sets) with typical price ranges and what to look for. Updated via app config, not backend.
10. **Anti-abuse & cost control**: edge function rate limit 20 scans/day/user (soft cap with friendly message), image downscaled to 1024px client-side before upload, Claude responses cached by image hash for 24h.

11. **Multi-photo scan (accuracy multiplier)**: optional "Add tag/label photo" second shot sent in the same Claude call — tags, maker's marks, and labels massively improve brand/model ID. When confidence <0.7, the result card proactively suggests "Snap the tag for a better match" with one-tap rescan.
12. **Condition adjuster**: segmented control on the result card (New w/ tags / Excellent / Good / Fair) applying category-specific price multipliers (e.g., clothing 1.3/1.0/0.7/0.45) to the estimate; persists per scan.
13. **Offline queue (critical real-world UX)**: thrift stores have dead zones. If offline, save photo locally with "Queued" state in history; auto-process when connectivity returns (expo-network listener); notify when the result lands.
14. **eBay Partner Network affiliate links**: wrap all outbound listing links with EPN tracking (extra revenue at zero UX cost); behind a config flag until the EPN account is approved (provider interface + plain-link fallback).
15. **CSV export**: scan history with dates, items, estimates, buy prices — annual-plan perk (resellers need it for bookkeeping/taxes); share via expo-sharing.
16. **Smart review prompt**: expo-store-review exactly once, right after the user's first FLIP verdict with ≥$50 estimated profit (peak-happiness moment).

## AI prompt (implement in edge function)
System: expert reseller and appraiser. Given one photo, return strict JSON {name, brand, model_or_era, category(one of enum matching fee table), condition_notes, confidence 0-1, ebay_search_keywords: 2-4 strings ordered specific→broad}. If confidence <0.4, set needs_better_photo=true with a one-line tip ("show the tag"). Validate with zod; retry once on parse failure. Run eBay search with keywords[0]; if <5 results fall back to keywords[1], etc.

## Premium UI & motion direction (follow PLAYBOOK Part 1 + this art direction)
**Concept: "the appraiser's field tool"** — the tactile confidence of an auction house in your pocket; energetic but credible.
- Palette: cream #FBF7F0, deep forest #1F6F4A (FLIP), clay red (SKIP), ink text; receipt-paper texture on history lists. Type: Space Grotesk (display) + Inter (body) + JetBrains Mono for every price (monospace = precision).
- **Signature interaction — the verdict reveal**: shutter haptic on capture → 3-stage staged progress with real copy ("Identifying… Checking 214 sold listings… Calculating your profit…") → result card springs up, the price-range bar fills left-to-right, then the verdict stamps down like a rubber stamp — slight rotation, scale-settle, heavy haptic thunk. FLIP verdicts ≥$50 get one brief, tasteful confetti burst (the only confetti in the app). This reveal is the TikTok moment; polish it obsessively.
- Camera screen: minimal chrome, elegant framing corners that pulse gently when a subject is centered; barcode mode slides in as a segmented toggle.
- Prices count up with odometer motion; the condition adjuster slides the whole range bar live as you tap segments.
- Share card: styled like a premium auction tag — kraft-paper texture, mono numerals, "Paid $4 → Worth $85".
- History: receipt-roll aesthetic with perforated-edge dividers; pull-to-refresh with a price-tag spinner.

## Security (project-specific threat model — PLAYBOOK Part 2 applies in full)
- Edge functions are the wallet: JWT auth required on every call; per-user rate limits (20/day) AND monthly AI budget caps enforced server-side; image size cap re-checked server-side; kill-switch env flag for the AI pipeline.
- Free-scan metering must survive reinstalls: server-side count keyed on device fingerprint + anon user id — never trust client storage alone.
- Anthropic/eBay/EPN keys live only in edge-function secrets; the app binary contains zero secrets (verify by inspecting the built bundle).
- Scans/watchlist RLS per user with deny-test; uploaded photos in private bucket, signed URLs, 90-day purge.
- LLM output is zod-validated data only — never rendered as markup, never executed; eBay URLs sanitized before opening (https + ebay.com host check, prevents link injection via model output).

## Retention engine (PLAYBOOK Part 3 applies)
- Activation event: first completed scan with a verdict. Onboarding→first scan <30s; ship a "try it on this" sample image in onboarding for users not in a store right now.
- Habit anchor: **Saturday 9am push** — "Weekend racks are freshest. 3 stores near you restock Fridays." (thrifting is a weekend ritual; own it.)
- Weekly trending drop (push + tab badge): "This week: vintage Pyrex up 23%" — reason to open without shopping.
- Monthly recap: "Your October: 31 scans, $840 potential profit found" as a share card.
- Stored value surfaced: history + watchlist totals on home ("Your eye is worth $2,140 so far").
- Win-back: lapsed 14 days → "The racks changed 14 times since your last scan" push; churned subs get a RevenueCat win-back offer.

## Revenue maximization (PLAYBOOK Part 4 applies)
- Pricing via RevenueCat Offerings: $7.99/wk (3-day trial, default) / $49.99/yr anchor. Paywall shows THEIR number: "Your 3 free scans found $112 in potential profit."
- **Consumable top-up**: 20 extra scans $4.99 for capped/lapsed users (hybrid monetization — buyers who won't subscribe still pay).
- eBay Partner Network on every outbound listing link (specced) — second revenue layer at zero UX cost.
- Annual perk stack: CSV export + higher caps + "Pro comps" when sold-data API lands (fast-follow).
- Review prompt after first ≥$50 FLIP (specced); screenshots-as-sales-narrative for ASO: pain (walked past a $200 jacket) → magic (verdict reveal) → proof (share cards) → offer.

## Cross-cutting requirements (non-negotiable)
- **Analytics**: PostHog React Native SDK. Instrument: onboarding steps, scans started/completed, ID confidence distribution, free-scan exhaustion, paywall view, trial start, purchase, share-card exports, verdict distribution. Track AI cost per scan.
- **Error monitoring**: sentry-expo in the app, Sentry in edge functions; alert on scan-pipeline failures.
- **RevenueCat hygiene**: entitlement re-check on foreground; restore tested in sandbox; pricing/copy via RevenueCat Offerings (remote-configurable, Experiments-ready).
- **Cost guards**: per-user monthly AI budget cap in the edge function (soft-block with friendly message at cap); image downscale + 24h cache already specified — enforce both.
- **Privacy & store compliance**: camera-usage privacy strings; privacy policy in-app; "delete my data" action; App Privacy questionnaire documented in README.
- **Build continuity**: maintain `PROJECT_STATE.md` at repo root — done / next / NEEDS HUMAN (eBay dev approval, EPN approval, RevenueCat products, store certs) after every milestone. Assume resume in a fresh session with zero memory.
- **Never stall on missing keys**: Claude, eBay, EPN, RevenueCat all behind typed provider interfaces with mocks (mock comps return fixture listings); missing key → mock + NEEDS HUMAN note, keep building.
- **Placeholder honesty**: paywall testimonials clearly marked placeholder until real.

## Agent orchestration
1. **Scaffold agent**: Expo app + edge functions project + Supabase schema + PostHog/Sentry wiring + PROJECT_STATE.md + CI.
2. **Scan-pipeline agent**: camera → edge function → Claude → eBay → result card, end-to-end with real APIs FIRST (this is the product; everything else is chrome). Include the provider-interface abstraction for comps.
3. **Monetization agent**: free-scan metering + RevenueCat paywall + gating (sandbox-tested).
4. **Feature agents (parallel)**: history+watchlist; barcode mode; multi-photo scan; condition adjuster; offline queue; profit settings; share card; CSV export; trending tab (write the content).
5. **Polish agent**: motion pass (verdict-reveal signature interaction first), haptics map, empty/error states, PLAYBOOK screenshot test on every screen — redo failures.
6. **Security agent**: PLAYBOOK Part 2 + threat model above as a checklist; RLS deny-test, metering-bypass test (reinstall simulation), budget-cap test, bundle secret-scan.
7. **QA agent**: jest tests for profit math + zod schemas + comps-provider mock; fixture-based tests of the edge function (recorded Claude/eBay responses); simulator runs both platforms.
8. **Release agent**: icons/splash, privacy policy (camera usage!), store listing copy + ASO keywords (thrift, reseller, flip, coin, vintage), eas.json, README with API-key setup (eBay dev account steps included).
Env (edge function secrets): ANTHROPIC_API_KEY, EBAY_CLIENT_ID/SECRET; app: EXPO_PUBLIC_SUPABASE_URL/ANON_KEY, RevenueCat keys.

## Definition of done
- On-device demo: scan a real object photo → correct-ballpark ID → live eBay comps → profit verdict, in <10s
- 3-free-scans metering works across app restarts; sandbox purchase unlocks unlimited; restore works
- All tests green; EAS build configs ready; README covers eBay + RevenueCat + Supabase setup end-to-end

## Out of scope v1
Auto-listing to marketplaces, price alerts, sold-comps premium data, web app, Android widgets, user accounts beyond anonymous.

