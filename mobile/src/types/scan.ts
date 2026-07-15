// App-side mirror of the edge-function contract (supabase/functions/_shared/schema.ts).
// Duplicated rather than imported across the mobile/supabase boundary: Metro's default
// resolver only bundles files under the Expo project root, so a relative import reaching
// into ../../supabase would require monorepo watchFolders config we don't otherwise need.
// Keep these two schemas in sync by hand; a drift test in __tests__ cross-checks them.
import { z } from 'zod';

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
  estimated_sold: z.number().nonnegative(),
  is_estimate: z.literal(true),
  currency: z.string().length(3).default('USD'),
  source: z.string().max(40),
  sample_listings: z.array(SampleListingSchema).max(12),
});
export type Comps = z.infer<typeof CompsSchema>;

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
  free_scans_used: z.number().int().optional(),
  free_limit: z.number().int().optional(),
});
export type ScanError = z.infer<typeof ScanErrorSchema>;

// ---- Local-only additions (not sent over the wire) ----
// A scan as persisted in local history / the mock backend — result + client-local fields.
// `queued` items (offline capture, BUILD_PROMPT §13) haven't run the pipeline yet, so
// identified/comps/verdict are absent until the queue processor resolves them.
export interface ScanHistoryItem {
  id: string;
  createdAt: string; // ISO
  imageUri: string | null;
  identified: Identified | null;
  comps: Comps | null;
  verdict: Verdict | null;
  condition: ConditionGrade;
  buyPrice: number | null;
  platform: string;
  netProfit: number | null;
  status: 'complete' | 'queued' | 'failed';
  // Drain attempts made against a queued item. A transient failure (network/5xx/rate-limit)
  // keeps the item 'queued' and increments this until MAX_ATTEMPTS, then it becomes 'failed'.
  // Absent/undefined means zero attempts so far. See lib/offlineQueue.ts.
  attempts?: number;
  // Present only while status === 'queued': the exact request payload needed to run the
  // scan once connectivity returns. base64 images kept here too — same size class as an
  // already-persisted result photo, and queue depth is inherently small (one offline trip).
  queuedPayload?: {
    images: string[]; // base64 JPEGs
    mode: 'photo' | 'barcode';
    barcode?: string;
    mockVariant?: 'low_conf' | 'barcode';
  };
}
