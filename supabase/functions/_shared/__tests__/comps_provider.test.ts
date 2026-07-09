// QA target — comps provider: the mock returns schema-valid fixture comps, the shared
// `summarizeListings` computes median/low/high/estimated_sold correctly and strips any
// non-eBay sample link, and the real eBay provider's keyword-fallback + GTIN path is
// exercised against a mocked fetch (recorded Browse API shape). No network / no keys.
import { MockCompsProvider, summarizeListings } from '../comps_provider.ts';
import { EbayCompsProvider } from '../ebay_comps.ts';

describe('MockCompsProvider', () => {
  it('returns schema-valid comps with source=mock', async () => {
    const comps = await new MockCompsProvider().getComps({ keywords: ['anything'] });
    expect(comps.source).toBe('mock');
    expect(comps.is_estimate).toBe(true);
    expect(comps.estimated_sold).toBeCloseTo(comps.median * 0.75, 2);
  });
});

describe('summarizeListings', () => {
  const link = (n: number) => `https://www.ebay.com/itm/${n}`;

  it('computes median (odd count), low, high, and 0.75x estimate', () => {
    const prices = [10, 20, 30];
    const sample = prices.map((p, i) => ({ title: `item ${i}`, price: p, url: link(i), img: null }));
    const c = summarizeListings(prices, sample, 'ebay_browse');
    expect(c.median).toBe(20);
    expect(c.low).toBe(10);
    expect(c.high).toBe(30);
    expect(c.count).toBe(3);
    expect(c.estimated_sold).toBe(15); // 0.75 * 20
  });

  it('averages the two middle values for an even count', () => {
    const prices = [10, 20, 30, 40];
    const sample = prices.map((p, i) => ({ title: `i${i}`, price: p, url: link(i), img: null }));
    expect(summarizeListings(prices, sample, 'ebay_browse').median).toBe(25);
  });

  it('ignores zero/negative prices in the stats', () => {
    const prices = [0, 50, 100];
    const sample = prices.map((p, i) => ({ title: `i${i}`, price: p, url: link(i), img: null }));
    const c = summarizeListings(prices, sample, 'ebay_browse');
    expect(c.count).toBe(2);
    expect(c.low).toBe(50);
    expect(c.median).toBe(75);
  });

  it('drops sample listings whose url is not an eBay https link (injection guard)', () => {
    const sample = [
      { title: 'ok', price: 10, url: 'https://www.ebay.com/itm/1', img: null },
      { title: 'evil', price: 10, url: 'javascript:alert(1)', img: null },
      { title: 'phish', price: 10, url: 'https://ebay.evil.com/itm/2', img: null },
    ];
    const c = summarizeListings([10, 10, 10], sample, 'ebay_browse');
    expect(c.sample_listings).toHaveLength(1);
    expect(c.sample_listings[0].title).toBe('ok');
  });

  it('returns zeros for an empty result set (never throws)', () => {
    const c = summarizeListings([], [], 'ebay_browse');
    expect(c.count).toBe(0);
    expect(c.median).toBe(0);
    expect(c.estimated_sold).toBe(0);
  });
});

describe('EbayCompsProvider (mocked fetch)', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  // Minimal fetch router: OAuth token, then Browse search returning the queued item pages.
  function mockEbay(pagesByQuery: (url: string) => { title: string; price: number }[]) {
    return jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 't', expires_in: 7200 }) } as unknown as Response;
      }
      const items = pagesByQuery(url).map((it) => ({
        title: it.title,
        price: { value: String(it.price), currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/1',
        image: { imageUrl: 'https://i.ebayimg.com/x.jpg' },
      }));
      return { ok: true, status: 200, json: async () => ({ itemSummaries: items }) } as unknown as Response;
    });
  }

  it('falls back to the next keyword when the first returns < 5 results', async () => {
    // keyword[0] (specific) -> 2 results; keyword[1] (broad) -> 6 results
    const fetchMock = mockEbay((url) => {
      const q = new URL(url).searchParams.get('q') ?? '';
      if (q.includes('specific')) return [{ title: 'a', price: 10 }, { title: 'b', price: 20 }];
      return Array.from({ length: 6 }, (_, i) => ({ title: `broad ${i}`, price: 30 + i }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new EbayCompsProvider('id', 'secret');
    const comps = await provider.getComps({ keywords: ['specific term', 'broad term'] });
    expect(comps.count).toBe(6);
    expect(comps.source).toBe('ebay_browse');
  });

  it('uses the GTIN path when a barcode is supplied', async () => {
    const seen: string[] = [];
    const fetchMock = mockEbay((url) => {
      const q = new URL(url).searchParams.get('q') ?? '';
      seen.push(q);
      return [{ title: 'book', price: 25 }];
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new EbayCompsProvider('id', 'secret');
    const comps = await provider.getComps({ keywords: ['fallback'], gtin: '9780135957059' });
    expect(seen.some((q) => q.startsWith('gtin:'))).toBe(true);
    expect(comps.count).toBe(1);
  });

  it('returns empty comps rather than throwing when the API returns nothing', async () => {
    global.fetch = mockEbay(() => []) as unknown as typeof fetch;
    const provider = new EbayCompsProvider('id', 'secret');
    const comps = await provider.getComps({ keywords: ['nothing here'] });
    expect(comps.count).toBe(0);
    expect(comps.median).toBe(0);
  });
});
