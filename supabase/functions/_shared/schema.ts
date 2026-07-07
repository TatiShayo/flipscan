// Shared zod schemas — the single contract between the edge functions (Deno) and
// the mobile app (RN). LLM output is validated against `IdentifiedSchema` before use;
// it is NEVER rendered as markup or executed. eBay URLs are sanitized separately.
//
// NOTE: imported by Deno edge functions AND by jest (Node) tests. Keep it dependency-free
// apart from zod, and import zod with a bare specifier so Node resolves node_modules and
// Deno resolves via its import map (see functions/import_map.json).
import { z } from 'zod';

// Category enum MUST match the fee table keys in _shared/profit.ts.
export const CategorySchema = z.enum([
  'clothing',
  'shoes',
  'accessories',
  'electronics',
  'books_media',
  'toys_games',
  'home_kitchen',
  'collectibles',
  'jewelry',
  'other',
]);
export type Category = z.infer<typeof CategorySchema>;

export const ConditionGradeSchema = z.enum([
  'new_with_tags',
  'excellent',
  'good',
  'fair',
]);
export type ConditionGrade = z.infer<typeof ConditionGradeSchema>;

export const VerdictSchema = z.enum(['flip', 'maybe', 'skip']);
export type Verdict = z.infer<typeof VerdictSchema>;

// ---- Claude vision identification output (strict) ----
export const IdentifiedSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(120).nullable().default(null),
  model_or_era: z.string().max(120).nullable().default(null),
  category: CategorySchema,
  condition_notes: z.string().max(500).default(''),
  confidence: z.number().min(0).max(1),
  ebay_search_keywords: z.array(z.string().min(1).max(120)).min(1).max(4),
  needs_better_photo: z.boolean().default(false),
  photo_tip: z.string().max(160).nullable().default(null),
});
export type Identified = z.infer<typeof IdentifiedSchema>;

// ---- Comps (from the comps provider — eBay or a mock) ----
export const SampleListingSchema = z.object({
  title: z.string().max(300),
  price: z.number().nonnegative(),
  url: z.string().url(),
  img: z.string().url().nullable().default(null),
});
export type SampleListing = z.infer<typeof SampleListingSchema>;

export const CompsSchema = z.object({
  median: z.number().nonnegative(),
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
  count: z.number().int().nonnegative(),
  // Estimated sold price = 0.75 * median active ask. Always label as estimate in UI.
  estimated_sold: z.number().nonnegative(),
  is_estimate: z.literal(true),
  currency: z.string().length(3).default('USD'),
  source: z.string().max(40), // e.g. 'ebay_browse' | 'mock'
  sample_listings: z.array(SampleListingSchema).max(12),
});
export type Comps = z.infer<typeof CompsSchema>;

// ---- Scan request / response (edge function boundary) ----
export const ScanRequestSchema = z.object({
  // base64 JPEG(s), downscaled client-side to <=1024px. Server re-checks size.
  images: z.array(z.string().min(1)).min(1).max(2),
  device_hash: z.string().min(16).max(128),
  mode: z.enum(['photo', 'barcode']).default('photo'),
  barcode: z.string().max(64).optional(),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

export const ScanResultSchema = z.object({
  scan_id: z.string().uuid(),
  identified: IdentifiedSchema,
  comps: CompsSchema,
  verdict: VerdictSchema,
  free_scans_used: z.number().int().nonnegative(),
  free_limit: z.number().int().positive(),
  topup_remaining: z.number().int().nonnegative(),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

// Structured, generic error envelope (never leak internals to the client).
export const ScanErrorSchema = z.object({
  error: z.enum([
    'unauthorized',
    'rate_limited',
    'quota_exhausted',
    'budget_capped',
    'paywall',
    'ai_disabled',
    'bad_request',
    'identification_failed',
    'internal',
  ]),
  message: z.string(),
  // present on paywall so the client can personalize the pitch
  free_scans_used: z.number().int().optional(),
  free_limit: z.number().int().optional(),
});
export type ScanError = z.infer<typeof ScanErrorSchema>;
