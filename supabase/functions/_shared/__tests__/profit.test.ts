// QA target #1 — profit math (per-platform fees + per-category shipping + condition
// multipliers + verdict thresholds). Pure functions, no I/O, so these run in plain jest
// with no mocks. This is the number the whole product is about; drift here is a P0.
import {
  PLATFORM_FEES,
  SHIPPING_BY_CATEGORY,
  conditionMultiplier,
  adjustedEstimate,
  computeProfit,
  verdictFor,
  potentialProfitFound,
  round2,
} from '../profit.ts';

describe('round2', () => {
  it('rounds to 2 decimals without float dust', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(43.505)).toBe(43.51);
    expect(round2(10)).toBe(10);
  });
});

describe('conditionMultiplier', () => {
  it('uses the soft table for clothing/shoes/accessories/jewelry/other', () => {
    expect(conditionMultiplier('clothing', 'new_with_tags')).toBe(1.3);
    expect(conditionMultiplier('clothing', 'excellent')).toBe(1.0);
    expect(conditionMultiplier('clothing', 'good')).toBe(0.7);
    expect(conditionMultiplier('clothing', 'fair')).toBe(0.45);
    expect(conditionMultiplier('shoes', 'fair')).toBe(0.45);
    expect(conditionMultiplier('jewelry', 'good')).toBe(0.7);
  });

  it('uses the hard table for electronics/media/toys/home/collectibles', () => {
    expect(conditionMultiplier('electronics', 'new_with_tags')).toBe(1.15);
    expect(conditionMultiplier('electronics', 'good')).toBe(0.85);
    expect(conditionMultiplier('books_media', 'fair')).toBe(0.6);
    expect(conditionMultiplier('collectibles', 'excellent')).toBe(1.0);
  });
});

describe('adjustedEstimate', () => {
  it('applies the condition multiplier and never goes negative', () => {
    expect(adjustedEstimate(100, 'clothing', 'good')).toBe(70);
    expect(adjustedEstimate(100, 'electronics', 'good')).toBe(85);
    expect(adjustedEstimate(-50, 'clothing', 'new_with_tags')).toBe(0);
  });
});

describe('computeProfit', () => {
  it('subtracts platform fee, category shipping, and buy price', () => {
    // clothing, excellent (1.0x) so estimate === estimatedSold
    const b = computeProfit({
      estimatedSold: 100,
      category: 'clothing',
      condition: 'excellent',
      buyPrice: 4,
      platform: 'ebay',
    });
    expect(b.estimate).toBe(100);
    expect(b.platformFee).toBe(round2(100 * PLATFORM_FEES.ebay)); // 13.25
    expect(b.shipping).toBe(SHIPPING_BY_CATEGORY.clothing); // 5
    expect(b.buyPrice).toBe(4);
    // 100 - 13.25 - 5 - 4
    expect(b.netProfit).toBe(77.75);
    expect(b.marginPct).toBe(round2(77.75 / 100));
  });

  it('varies fee by platform', () => {
    const base = { estimatedSold: 50, category: 'clothing' as const, condition: 'excellent' as const, buyPrice: 0 };
    const ebay = computeProfit({ ...base, platform: 'ebay' });
    const posh = computeProfit({ ...base, platform: 'poshmark' });
    expect(posh.platformFee).toBeGreaterThan(ebay.platformFee); // 20% > 13.25%
    expect(computeProfit({ ...base, platform: 'facebook' }).platformFee).toBe(round2(50 * 0.05));
  });

  it('treats a null buy price as 0 and clamps negatives', () => {
    const b = computeProfit({ estimatedSold: 40, category: 'clothing', condition: 'excellent', buyPrice: null, platform: 'ebay' });
    expect(b.buyPrice).toBe(0);
    const c = computeProfit({ estimatedSold: 40, category: 'clothing', condition: 'excellent', buyPrice: -10, platform: 'ebay' });
    expect(c.buyPrice).toBe(0);
  });

  it('returns null margin when the estimate is 0', () => {
    const b = computeProfit({ estimatedSold: 0, category: 'other', condition: 'good', buyPrice: 0, platform: 'ebay' });
    expect(b.estimate).toBe(0);
    expect(b.marginPct).toBeNull();
  });

  it('can produce a negative net profit (overpaid)', () => {
    const b = computeProfit({ estimatedSold: 20, category: 'shoes', condition: 'fair', buyPrice: 30, platform: 'poshmark' });
    expect(b.netProfit).toBeLessThan(0);
  });

  it('covers a shipping value for every category', () => {
    for (const cat of Object.keys(SHIPPING_BY_CATEGORY) as (keyof typeof SHIPPING_BY_CATEGORY)[]) {
      const b = computeProfit({ estimatedSold: 50, category: cat, condition: 'good', buyPrice: 0, platform: 'ebay' });
      expect(b.shipping).toBeGreaterThan(0);
    }
  });
});

describe('verdictFor (no buy price -> judge on estimate)', () => {
  const noBuy = (estimate: number) =>
    verdictFor({ estimate, platformFee: 0, shipping: 0, buyPrice: 0, netProfit: estimate, marginPct: 1 }, false);

  it('flips at >= $40 estimate', () => {
    expect(noBuy(40)).toBe('flip');
    expect(noBuy(60)).toBe('flip');
  });
  it('maybes between $15 and $40', () => {
    expect(noBuy(15)).toBe('maybe');
    expect(noBuy(39.99)).toBe('maybe');
  });
  it('skips below $15', () => {
    expect(noBuy(14.99)).toBe('skip');
    expect(noBuy(0)).toBe('skip');
  });
});

describe('verdictFor (with buy price -> judge on net profit + margin)', () => {
  it('flips on strong net profit AND margin', () => {
    expect(verdictFor({ estimate: 100, platformFee: 13, shipping: 5, buyPrice: 4, netProfit: 78, marginPct: 0.78 }, true)).toBe('flip');
  });
  it('does not flip on good profit but thin margin', () => {
    expect(verdictFor({ estimate: 500, platformFee: 66, shipping: 12, buyPrice: 380, netProfit: 42, marginPct: 0.08 }, true)).toBe('maybe');
  });
  it('maybes on modest profit', () => {
    expect(verdictFor({ estimate: 40, platformFee: 5, shipping: 5, buyPrice: 20, netProfit: 10, marginPct: 0.25 }, true)).toBe('maybe');
  });
  it('skips when net profit is too low', () => {
    expect(verdictFor({ estimate: 20, platformFee: 3, shipping: 5, buyPrice: 10, netProfit: 2, marginPct: 0.1 }, true)).toBe('skip');
  });
});

describe('potentialProfitFound (paywall pitch sum)', () => {
  it('sums estimates and ignores negatives', () => {
    expect(potentialProfitFound([40, 85, 12])).toBe(137);
    expect(potentialProfitFound([50, -20, 10])).toBe(60);
    expect(potentialProfitFound([])).toBe(0);
  });
});
