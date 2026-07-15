// Real eBay comps provider (Browse API, active listings). Only constructed when
// EBAY_CLIENT_ID/SECRET are present. Implements the CompsProvider interface so it drops
// in behind the same seam as the mock. Sold price is estimated (0.75 * median ask) in
// summarizeListings — this provider only supplies active-listing prices.
import type { Comps } from './schema.ts';
import { fetchWithBackoff } from './http.ts';
import {
  type CompsProvider,
  type CompsQuery,
  summarizeListings,
} from './comps_provider.ts';

const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const BROWSE_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
const SCOPE = 'https://api.ebay.com/oauth/api_scope';
const MIN_RESULTS = 5; // fall back to the next keyword if fewer than this

interface EbayItemSummary {
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  image?: { imageUrl?: string };
}

export class EbayCompsProvider implements CompsProvider {
  readonly name = 'ebay_browse';
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  async getComps(query: CompsQuery): Promise<Comps> {
    const currency = query.currency ?? 'USD';
    // Barcode path: search by GTIN directly.
    if (query.gtin) {
      const items = await this.search(`gtin:${query.gtin}`);
      if (items.length) return this.toComps(items, currency);
    }
    // Photo path: try keywords specific -> broad until >= MIN_RESULTS.
    for (const kw of query.keywords) {
      const items = await this.search(kw);
      if (items.length >= MIN_RESULTS) return this.toComps(items, currency);
    }
    // Last resort: whatever the broadest keyword returned (may be empty).
    const last = query.keywords.length
      ? await this.search(query.keywords[query.keywords.length - 1])
      : [];
    return this.toComps(last, currency);
  }

  private toComps(items: EbayItemSummary[], currency: string): Comps {
    const prices: number[] = [];
    const sample = items.slice(0, 12).map((it) => {
      const price = Number(it.price?.value ?? 0);
      if (price > 0) prices.push(price);
      return {
        title: (it.title ?? '').slice(0, 300),
        price,
        url: it.itemWebUrl ?? '',
        img: it.image?.imageUrl ?? null,
      };
    });
    return summarizeListings(prices, sample, this.name, currency);
  }

  private async search(q: string): Promise<EbayItemSummary[]> {
    const token = await this.getToken();
    const url = `${BROWSE_URL}?q=${encodeURIComponent(q)}&limit=50&filter=buyingOptions:{FIXED_PRICE}`;
    const res = await fetchWithBackoff(url, {
      headers: {
        authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
    return json.itemSummaries ?? [];
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.expiresAt > now + 30_000) return this.token.value;
    const basic = btoa(`${this.clientId}:${this.clientSecret}`);
    const res = await fetchWithBackoff(OAUTH_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${basic}`,
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(SCOPE)}`,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`ebay oauth ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      value: json.access_token,
      expiresAt: now + json.expires_in * 1000,
    };
    return this.token.value;
  }
}
