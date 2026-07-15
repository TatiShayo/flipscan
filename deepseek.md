# flipscan — DeepSeek Audit

**Date:** 2026-07-13
**Path:** `C:\Users\TATI\Desktop\DEV\flipscan\`
**Stack:** TypeScript / Expo (mobile) + Next.js (landing) + Supabase Edge Functions
**Tier:** 3 — Medium
**Dependencies:** None installed

---

## 🔴 Security Vulnerabilities

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| ✅ | `supabase/functions/_shared/supabase_admin.ts` | — | JWT never decoded client-side — always verified server-side via `getUser(jwt)`. Good. | — |
| ✅ | `supabase/functions/scan/index.ts` | — | JWT auth + zod body validation + daily rate limit + monthly budget cap. Good. | — |
| ✅ | `supabase/functions/_shared/url.ts` | — | `sanitizeEbayUrl()` — blocks `javascript:`, `data:`, `file:`. Good. | — |
| ✅ | `mobile/scripts/secret-scan.js` | — | Pre-commit secret scanner. Good. | — |
| ✅ | `supabase/functions/revenuecat-webhook/index.ts` | — | Server-to-server auth (RC_WEBHOOK_AUTH). Good. | — |
| ✅ | Architecture | — | Mock-first architecture — runs fully without keys. Good. | — |

---

## 🟡 UI/UX Improvements

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟡 MEDIUM | `mobile/app/share/[scanId].tsx` | 190 | Hardcoded `#E8D9BC` background color — not using theme tokens. | Use `theme.colors.background.secondary`. |
| 🟡 MEDIUM | `mobile/src/components/Icon.tsx` | 34 | Default `color='#211D18'` not using theme tokens. | Use `theme.colors.text.primary` as default. |
| 🟡 MEDIUM | Landing page | — | Empty `alt=""` on user-uploaded images. | Add descriptive alt text or auto-generate from scan result. |
| ✅ | `mobile/src/constants/theme.ts` | — | Full theme token file: Colors, Verdict, Fonts, Spacing, Radius, Type. Good. | — |
| ✅ | Mobile components | — | QueueResolvedToast for offline UX, ConfettiBurst animation, VerdictStamp, OnboardingShell pattern. Good. | — |

---

## 🔧 Session: 2026-07-14 — Multi-Agent Deep Audit Sweep (Round 1)

**Status:** Not audited in this round. Most complex project in portfolio (Expo SDK 57 mobile + Supabase Edge Functions + Next.js landing). Milestones 1-7 complete per PROJECT_STATE.md. Vercel deploy & device tests NEEDS HUMAN. Sweep Round 2 will cover in depth.

| Category | Package | Issue | Fix |
|----------|---------|-------|-----|
| 🟡 MEDIUM | `flipscan/landing` | ALL deps use `^` (loose pinning). No lockfile visible. | Add `package-lock.json`. Pin deps to exact versions. |
| 🟡 MEDIUM | `flipscan/mobile` | 29 prod deps — heaviest project in portfolio. Expo + reanimated + skia + sentry + posthog + supabase — all justified for functionality. | — |

### Missing Dev Tooling (Landing Page)
- **No eslint** — no `eslint-config-next`
- **No test script** — no vitest/jest
- **No `typecheck` script**
- No `.nvmrc`

### Good (Mobile)
- Jest + jest-expo — good
- ESLint — good
- `secret-scan` script — excellent
- `typecheck` script — good

---

## 📋 Priority Fix Queue

1. **[MEDIUM — Landing Dev Tooling]** `flipscan/landing` — Add eslint, vitest, `typecheck` script, `.nvmrc`.
2. **[MEDIUM — Theme Tokens]** `mobile/app/share/[scanId].tsx:190`, `mobile/src/components/Icon.tsx:34` — Replace hardcoded colors with theme tokens.
3. **[MEDIUM — Alt Text]** Landing page — Add descriptive alt text to images.
4. **[MEDIUM — Lockfile]** `flipscan/landing` — Commit `package-lock.json`.
