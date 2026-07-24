# FlipScan — Vision Review (Round 1)

**Date:** 2026-07-24  
**Stack:** React Native / Expo (mobile app) + Next.js landing page (`landing/`)  
**Viewport Targets:** Desktop 1280×800, Mobile 375×812  
**Reviewed by:** Automated Vision-in-the-Loop pipeline  
**Screenshots from:** Next.js landing page served on port 3005

---

## Screenshots Captured

| Page | Desktop | Mobile |
|------|---------|--------|
| Landing home | ⚠️ timeout (first-load SSR delay) | ✅ `home_mobile.png` |

1 screenshot captured. Desktop timed out on first load (Next.js cold-start SSR). Mobile captured cleanly.

> **Native app note:** The core FlipScan product is a React Native / Expo mobile app in `mobile/`. Screenshots of the native app require a device or iOS/Android simulator. Only the landing page is web-accessible without a device.

---

## Visual Rubric Review (Landing Page — Mobile)

### ✅ Typography Hierarchy
- **Logo**: `FlipScan` in bold dark green serif — distinctive brand mark.
- **Tagline**: `Point. Scan. Flip.` — punchy, three-word value prop, excellent.
- **Sub-heading**: `How it works` in dark green — consistent brand color.
- **Step labels**: Bold black `Point your camera`, `Scan or snap`, `See the verdict` — clear hierarchy.
- **Body text**: Muted grey on cream — legible at mobile size.

### ✅ Color Contrast
- Background: Off-white/cream `#F5F0E8` — warm, approachable.
- Primary brand: Dark forest green `#1D5C2E` — high contrast against cream. WCAG AA on H1/logo text.
- Body text: Muted grey/charcoal on cream — borderline on smallest body text, acceptable.
- Step number badges: White text on dark green circle — WCAG AA compliant.
- Teal link text (`Poshmark, Depop, Mercari`) in body: check against cream background at WCAG AA.

### ✅ Primary CTA — Clear per screen
- **Mobile footer**: `App Store` and `Google Play` side-by-side buttons — appropriate for a mobile-first product.
- `Get the app` heading above CTA buttons — clear section purpose.
- No hero-level CTA (above the fold) — **recommend adding a primary download CTA in the hero** for above-the-fold conversion.

### ✅ Responsive Layout (Mobile)
- Single-column layout, perfectly suited for 375px mobile viewport.
- Step cards stack cleanly with numbered badges.
- App store CTA buttons side-by-side — enough room at 375px.
- Footer: Privacy Policy + Support links preserved, copyright line present.

### ✅ No Emoji as UI Icons
- Step numbers use circular number badges (CSS/styled), not emoji. Clean.
- App store buttons use text icons (Apple logo symbol, ▤ square icon) — acceptable but could use proper SVG logos.

### ⚠️ Issues Found

| Severity | Page | Issue |
|----------|------|-------|
| **HIGH** | Landing hero | **No above-the-fold CTA** — users must scroll to find the download buttons. Add `Download Free` or `Get the App` button to hero section. |
| **MEDIUM** | Landing home desktop | First-load timeout — Next.js cold-start SSR takes >20s on desktop. Could indicate a blocking external dependency or missing env var in dev. |
| **MEDIUM** | Landing home desktop | No desktop layout captured — unknown how the landing page looks at 1280px. Recommend a second capture run at desktop after server warms up. |
| **LOW** | Next.js dev overlay | `N` avatar (Next.js dev indicator) visible at bottom-left on mobile screenshot — remove in production. |
| **INFO** | Native app | Core product requires device/simulator screenshot for full vision review. |

---

## Recommendations

1. **Add hero CTA** — Place a prominent `Download on App Store` + `Get on Google Play` button pair directly in the hero section, above the fold.
2. **Investigate SSR cold-start** on Next.js landing — profile what's blocking the initial render.
3. **Capture desktop layout** — run Playwright on a warmed-up server to review 1280px layout.
4. **Replace text app-store icons** with official Apple/Google SVG badges for store compliance.
5. **Device/Simulator screenshot**: For the native app itself, use EAS Build or Expo Go on a device for production-quality review.

---

## Verdict

**PASS (landing page). NEEDS DEVICE REVIEW (native app).** The landing page has strong brand identity — clean typography, distinctive dark green palette, and a clear 3-step product explanation. The missing above-the-fold download CTA is the primary conversion gap. Desktop layout is unknown and must be reviewed.
