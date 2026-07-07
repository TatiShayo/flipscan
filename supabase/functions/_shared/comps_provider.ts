// COMPS PROVIDER INTERFACE — the single seam the whole comps subsystem lives behind.
// Today: eBay Browse API (active listings) with a mock fallback. Tomorrow: swap in
// eBay Marketplace Insights (real sold data) or another source WITHOUT touching the
// scan pipeline. This isolation is a hard requirement of the build prompt.
import { CompsSchema, type Comps } from './schema.ts';
import { FIXTURE_COMPS } from './fixtures.ts';
import { round2 } from './profit.ts';
import { sanitizeEbayUrl } from './url.ts';

export interface CompsQuery {
  keywords: string[]; // ordered specific -> broad; try [0], fall back to [1]...
  gtin?: string; // barcode path
  currency?: string;
}

export interface CompsProvider {
  readonly name: string;
  getComps(query: CompsQuery): Promise<Comps>;
}

// ---- Estimate helpers (shared by any real provider) ----
// Sold price is estimated as 0.75 * median active ask; always flagged is_estimate.
const SOLD_MULTIPLIER = 0.75;

export function summarizeListings(
  prices: number[],
  sample: { title: string; price: number; url: string; img: string | null }[],
  source: string,
  currency = 'USD',
): Comps {
  const sorted = [...prices].filter((p) => p > 0).sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : 0;
  const low = sorted[0] ?? 0;
  const high = sorted[sorted.length - 1] ?? 0;
  const cleanedSample = sample
    .map((s) => ({ ...s, url: sanitizeEbayUrl(s.url) }))
    .filter((s): s is typeof s & { url: string } => s.url !== null)
    .map((s) => ({ ...s, img: sanitizeEbayUrl(s.img) }))
    .slice(0, 12);
  return CompsSchema.parse({
    median: round2(median),
    low: round2(low),
    high: round2(high),
    count: sorted.length,
    estimated_sold: round2(median * SOLD_MULTIPLIER),
    is_estimate: true,
    currency,
    source,
    sample_listings: cleanedSample,
  });
}

// ---- Mock provider (used until EBAY_CLIENT_ID/SECRET are set) ----
export class MockCompsProvider implements CompsProvider {
  readonly name = 'mock';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getComps(_query: CompsQuery): Promise<Comps> {
    // Return the fixture, re-parsed through the schema so mock and real share validation.
    return CompsSchema.parse({ ...FIXTURE_COMPS, source: 'mock' });
  }
}
