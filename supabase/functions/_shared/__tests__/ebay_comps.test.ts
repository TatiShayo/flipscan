// Unit tests for EbayCompsProvider OAuth and Browse Search.
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EbayCompsProvider } from '../ebay_comps.ts';

describe('EbayCompsProvider', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  const oauthResponse = {
    access_token: 'v1_mock_ebay_token',
    expires_in: 7200,
  };

  const sampleSearchResponse = {
    itemSummaries: [
      {
        title: 'Patagonia Synchilla Snap-T Fleece Pullover Blue Mens M',
        price: { value: '55.00', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/123456789',
        image: { imageUrl: 'https://i.ebayimg.com/images/g/abc/s-l500.jpg' },
      },
      {
        title: 'Patagonia Fleece Snap T Jacket Green Medium',
        price: { value: '45.00', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/987654321',
        image: { imageUrl: 'https://i.ebayimg.com/images/g/def/s-l500.jpg' },
      },
      {
        title: 'Patagonia Snap-T Fleece Vintage Small',
        price: { value: '65.00', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/456789123',
        image: { imageUrl: 'https://i.ebayimg.com/images/g/ghi/s-l500.jpg' },
      },
      {
        title: 'Patagonia Fleece Pullover Snap T Retro',
        price: { value: '50.00', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/654321987',
        image: { imageUrl: 'https://i.ebayimg.com/images/g/jkl/s-l500.jpg' },
      },
      {
        title: 'Patagonia Synchilla Fleece Grey Large',
        price: { value: '60.00', currency: 'USD' },
        itemWebUrl: 'https://www.ebay.com/itm/321987654',
        image: { imageUrl: 'https://i.ebayimg.com/images/g/mno/s-l500.jpg' },
      },
    ],
  };

  it('authenticates via OAuth client credentials and queries active listings', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify(oauthResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(sampleSearchResponse), { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new EbayCompsProvider('client-id', 'client-secret');
    const comps = await provider.getComps({
      keywords: ['patagonia synchilla snap-t fleece', 'patagonia fleece'],
    });

    expect(comps.source).toBe('ebay_browse');
    expect(comps.count).toBe(5);
    expect(comps.median).toBe(55); // sorted: 45, 50, 55, 60, 65 -> median is 55
    expect(comps.low).toBe(45);
    expect(comps.high).toBe(65);
    expect(comps.estimated_sold).toBe(41.25); // 55 * 0.75
    expect(comps.sample_listings).toHaveLength(5);
    expect(comps.sample_listings[0].url).toContain('https://www.ebay.com/itm/');
  });

  it('searches by barcode directly when gtin query is provided', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify(oauthResponse), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(sampleSearchResponse), { status: 200 }));
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new EbayCompsProvider('client-id', 'client-secret');
    const comps = await provider.getComps({
      keywords: [],
      gtin: '9780135957059',
    });

    expect(comps.count).toBe(5);
  });

  it('reuses valid unexpired oauth token across multiple getComps calls', async () => {
    const fetchMock = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify(oauthResponse), { status: 200 })) // token request
      .mockResolvedValueOnce(new Response(JSON.stringify(sampleSearchResponse), { status: 200 })) // 1st search
      .mockResolvedValueOnce(new Response(JSON.stringify(sampleSearchResponse), { status: 200 })); // 2nd search
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const provider = new EbayCompsProvider('client-id', 'client-secret');
    await provider.getComps({ keywords: ['query 1'] });
    await provider.getComps({ keywords: ['query 2'] });

    // Total fetch calls = 1 token + 2 searches = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
