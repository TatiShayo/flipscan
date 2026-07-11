# Store listing copy — FlipScan

> ASO copy + screenshot narrative for the App Store / Google Play listing. Placeholder
> honesty per PLAYBOOK 1.5: nothing below is final marketing copy until a human reviews it
> against the live build; testimonials/ratings referenced anywhere in-app are marked
> placeholder until real (see `mobile/app/paywall.tsx`).

## Title & subtitle (ASO — ranked keyword placement)

**Title (30 char cap):** `FlipScan: Thrift Flip Finder`
(29 chars — fits iOS's 30-char limit; Android allows more but keep it consistent.)

**Subtitle / short description (30 char cap, iOS):** `Scan. Price. Flip for profit.`

**Android short description (80 char cap):**
`Point your camera at any thrift find — instant resale value & profit verdict.`

## Keyword field (iOS, 100 char cap, comma-separated, no spaces after commas needed)

```
thrift,reseller,flip,vintage,resell,poshmark,depop,mercari,ebay,garage sale,barcode,scanner,appraiser,secondhand
```

Primary target keywords (per BUILD_PROMPT ASO targets): **thrift, reseller, flip, vintage**.
Secondary: platform names resellers already search for (Poshmark, Depop, Mercari, eBay) and
category terms (garage sale, secondhand, barcode scanner, appraiser).

## Full description (App Store / Play long description)

```
Walk into any thrift store, garage sale, or estate sale and know INSTANTLY what's
worth buying.

FlipScan points your camera at an item and tells you:
  • What it is (brand, model, era — even from a worn tag)
  • What it's actually selling for on eBay right now
  • Whether it's a FLIP, a MAYBE, or a SKIP — before you buy it

HOW IT WORKS
1. Snap a photo (or scan a barcode for books, media, and electronics)
2. FlipScan identifies the item and checks real eBay listings
3. Get a verdict in seconds — median price, listing count, and your profit
   after fees and shipping

BUILT FOR RESELLERS
• Condition adjuster — New w/ tags, Excellent, Good, Fair — adjusts your estimate live
• Fee calculator for eBay, Poshmark, Depop, Mercari, and Facebook Marketplace
• Scan history with CSV export for bookkeeping and taxes (annual plan)
• Watchlist for items you want to think over before buying
• Works offline — dead zones in thrift stores won't lose your scan; it
  processes automatically when you're back online
• Trending categories updated weekly — know what's hot before you shop

Your first 3 scans are free, no account required. FlipScan is not affiliated with eBay,
Poshmark, Depop, Mercari, or Facebook Marketplace; price estimates are estimates only,
not guarantees of sale price.
```

## Screenshot narrative (PLAYBOOK 4.4 — pain → magic → proof → offer)

Six-screenshot sequence (first screenshot wins or loses the install — lead with the pain,
land on the magic moment second):

1. **Pain** — a person crouched at a thrift rack, phone raised, headline overlay: *"Is
   this worth buying?"* — the universal thrift-flip moment of hesitation.
2. **Magic** — the verdict-reveal screen mid-animation: price-range bar filled, FLIP stamp
   mid-slam, confetti burst. Overlay: *"Point. Scan. Know in seconds."*
3. **Proof** — the completed result card: item name, "$4 → $85", listing count, FLIP
   badge. Overlay: *"Real eBay listings. Real math."*
4. **Proof (breadth)** — the barcode-mode screen scanning a book/media barcode. Overlay:
   *"Books, electronics, collectibles — scan the barcode for instant accuracy."*
5. **Stored value** — the history tab (receipt-roll aesthetic) with a running total.
   Overlay: *"Your eye is worth $2,140 so far."*
6. **Offer** — the paywall, personalized pitch visible ("Your 3 free scans found $112 in
   potential profit"). Overlay: *"3 free scans. No account needed."*

Video preview (App Store, optional fast-follow): 15–20s capture of the full scan →
verdict-reveal flow start to finish — this IS the demo, no voiceover needed.

## Category & rating

- Primary category: **Shopping** (iOS) / **Shopping** (Android)
- Secondary: **Lifestyle**
- Content rating: 4+ / Everyone (no user-generated content shown to other users; camera
  photos stay private to the scanning user per the privacy policy)

## NEEDS HUMAN before submission

- Real screenshots captured on-device per the narrative above (this repo has no simulator
  access — see PROJECT_STATE.md).
- App Store Connect / Google Play Console listing accounts.
- Final legal review of the description's platform-name usage (eBay, Poshmark, Depop,
  Mercari, Facebook Marketplace) — nominative fair use is standard for comparison/utility
  apps, but confirm with counsel before submission if trademark concerns arise.
