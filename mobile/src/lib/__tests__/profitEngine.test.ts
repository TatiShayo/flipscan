// Comprehensive Unit & Property Tests for the Profit & Pricing Engine.
// Covers marketplace fee structures (eBay, Poshmark tiered fees, Depop, Mercari, Facebook),
// shipping matrix, condition sensitivity, ROI %, net profit, and verdict calculations.
import { describe, it, expect } from '@jest/globals';
import {
  PLATFORM_LABELS,
  SHIPPING_BY_CATEGORY,
  calculatePlatformFee,
  conditionMultiplier,
  adjustedEstimate,
  computeProfit,
  verdictFor,
  potentialProfitFound,
  type Platform,
} from '@/constants/profit';
import type { Category } from '@/types/scan';

describe('Marketplace Fee Calculations', () => {
  it('calculates eBay fee as 13.25%', () => {
    expect(calculatePlatformFee(100, 'ebay')).toBe(13.25);
    expect(calculatePlatformFee(50, 'ebay')).toBe(6.63);
    expect(calculatePlatformFee(200, 'ebay')).toBe(26.50);
  });

  it('calculates Poshmark tiered fee: flat $2.95 for sales under $15', () => {
    expect(calculatePlatformFee(5, 'poshmark')).toBe(2.95);
    expect(calculatePlatformFee(10, 'poshmark')).toBe(2.95);
    expect(calculatePlatformFee(14.99, 'poshmark')).toBe(2.95);
  });

  it('calculates Poshmark fee as 20% for sales of $15 and above', () => {
    expect(calculatePlatformFee(15, 'poshmark')).toBe(3.00);
    expect(calculatePlatformFee(50, 'poshmark')).toBe(10.00);
    expect(calculatePlatformFee(100, 'poshmark')).toBe(20.00);
  });

  it('calculates Depop fee as 10%', () => {
    expect(calculatePlatformFee(80, 'depop')).toBe(8.00);
  });

  it('calculates Mercari fee as 10%', () => {
    expect(calculatePlatformFee(65, 'mercari')).toBe(6.50);
  });

  it('calculates Facebook Marketplace fee as 5%', () => {
    expect(calculatePlatformFee(120, 'facebook')).toBe(6.00);
  });

  it('returns 0 fee for 0 estimate', () => {
    expect(calculatePlatformFee(0, 'poshmark')).toBe(0);
    expect(calculatePlatformFee(0, 'ebay')).toBe(0);
  });

  it('has readable labels for every platform', () => {
    const platforms: Platform[] = ['ebay', 'poshmark', 'depop', 'mercari', 'facebook'];
    for (const p of platforms) {
      expect(PLATFORM_LABELS[p]).toBeTruthy();
      expect(typeof PLATFORM_LABELS[p]).toBe('string');
    }
  });
});

describe('Shipping Matrix by Category', () => {
  const categories: Category[] = [
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
  ];

  it('provides non-zero shipping estimates for all 10 categories', () => {
    for (const cat of categories) {
      const ship = SHIPPING_BY_CATEGORY[cat];
      expect(ship).toBeGreaterThan(0);
      expect(typeof ship).toBe('number');
    }
  });

  it('shoes and home_kitchen have highest shipping allowance ($12)', () => {
    expect(SHIPPING_BY_CATEGORY.shoes).toBe(12);
    expect(SHIPPING_BY_CATEGORY.home_kitchen).toBe(12);
  });

  it('accessories, jewelry, and books_media have lowest shipping allowance ($4)', () => {
    expect(SHIPPING_BY_CATEGORY.accessories).toBe(4);
    expect(SHIPPING_BY_CATEGORY.jewelry).toBe(4);
    expect(SHIPPING_BY_CATEGORY.books_media).toBe(4);
  });
});

describe('Condition Multipliers & Adjustment', () => {
  it('applies soft category multipliers (clothing, shoes, accessories, jewelry, other)', () => {
    expect(conditionMultiplier('clothing', 'new_with_tags')).toBe(1.3);
    expect(conditionMultiplier('clothing', 'excellent')).toBe(1.0);
    expect(conditionMultiplier('clothing', 'good')).toBe(0.7);
    expect(conditionMultiplier('clothing', 'fair')).toBe(0.45);

    expect(conditionMultiplier('shoes', 'good')).toBe(0.7);
    expect(conditionMultiplier('jewelry', 'fair')).toBe(0.45);
  });

  it('applies hard category multipliers (electronics, books_media, toys_games, home_kitchen, collectibles)', () => {
    expect(conditionMultiplier('electronics', 'new_with_tags')).toBe(1.15);
    expect(conditionMultiplier('electronics', 'excellent')).toBe(1.0);
    expect(conditionMultiplier('electronics', 'good')).toBe(0.85);
    expect(conditionMultiplier('electronics', 'fair')).toBe(0.6);

    expect(conditionMultiplier('books_media', 'good')).toBe(0.85);
    expect(conditionMultiplier('toys_games', 'fair')).toBe(0.6);
  });

  it('adjusts estimates according to category and condition grade', () => {
    expect(adjustedEstimate(100, 'clothing', 'new_with_tags')).toBe(130);
    expect(adjustedEstimate(100, 'clothing', 'good')).toBe(70);
    expect(adjustedEstimate(100, 'clothing', 'fair')).toBe(45);

    expect(adjustedEstimate(100, 'electronics', 'new_with_tags')).toBe(115);
    expect(adjustedEstimate(100, 'electronics', 'good')).toBe(85);
    expect(adjustedEstimate(100, 'electronics', 'fair')).toBe(60);
  });

  it('clamps negative input estimates to 0', () => {
    expect(adjustedEstimate(-40, 'clothing', 'excellent')).toBe(0);
  });
});

describe('computeProfit Full Breakdown & ROI % Math', () => {
  it('computes exact net profit and ROI % when buyPrice is positive', () => {
    const result = computeProfit({
      estimatedSold: 100,
      category: 'clothing',
      condition: 'excellent', // 1.0x -> $100
      buyPrice: 10,
      platform: 'ebay', // fee 13.25, ship 5
    });

    expect(result.estimate).toBe(100);
    expect(result.platformFee).toBe(13.25);
    expect(result.shipping).toBe(5);
    expect(result.buyPrice).toBe(10);
    // 100 - 13.25 - 5 - 10 = 71.75
    expect(result.netProfit).toBe(71.75);
    // Margin % = 71.75 / 100 = 0.72 (72%)
    expect(result.marginPct).toBe(0.72);
    // ROI % = (71.75 / 10) * 100 = 717.5%
    expect(result.roiPct).toBe(717.5);
  });

  it('handles buyPrice = 0 gracefully with null ROI % and correct margin', () => {
    const result = computeProfit({
      estimatedSold: 60,
      category: 'accessories',
      condition: 'good', // 0.7x -> $42
      buyPrice: 0,
      platform: 'depop', // fee 4.20, ship 4
    });

    expect(result.estimate).toBe(42);
    expect(result.platformFee).toBe(4.20);
    expect(result.shipping).toBe(4);
    expect(result.buyPrice).toBe(0);
    expect(result.netProfit).toBe(33.80);
    expect(result.roiPct).toBeNull();
    expect(result.marginPct).toBe(0.8);
  });

  it('handles null buyPrice as 0 buyPrice', () => {
    const withNull = computeProfit({
      estimatedSold: 50,
      category: 'books_media',
      condition: 'good',
      buyPrice: null,
      platform: 'ebay',
    });
    const withZero = computeProfit({
      estimatedSold: 50,
      category: 'books_media',
      condition: 'good',
      buyPrice: 0,
      platform: 'ebay',
    });

    expect(withNull.netProfit).toBe(withZero.netProfit);
    expect(withNull.roiPct).toBeNull();
  });

  it('computes negative net profit and negative ROI % when overpaid', () => {
    const result = computeProfit({
      estimatedSold: 20,
      category: 'shoes',
      condition: 'fair', // 0.45x -> $9.00
      buyPrice: 25,
      platform: 'poshmark', // fee $2.95 (<$15), ship $12
    });

    // 9 - 2.95 - 12 - 25 = -30.95
    expect(result.estimate).toBe(9);
    expect(result.platformFee).toBe(2.95);
    expect(result.shipping).toBe(12);
    expect(result.netProfit).toBe(-30.95);
    expect(result.roiPct).toBe(-123.8); // (-30.95 / 25) * 100
  });

  it('handles 0 estimate without division by zero', () => {
    const result = computeProfit({
      estimatedSold: 0,
      category: 'other',
      condition: 'good',
      buyPrice: 5,
      platform: 'ebay',
    });

    expect(result.estimate).toBe(0);
    expect(result.marginPct).toBeNull();
    expect(result.roiPct).toBe(-260); // (-13 / 5) * 100
  });
});

describe('Verdict Determination Logic', () => {
  describe('Without Buy Price (Judging potential resale value)', () => {
    it('verdicts "flip" for estimated value >= $40', () => {
      expect(verdictFor({ estimate: 40, platformFee: 5, shipping: 5, buyPrice: 0, netProfit: 30, marginPct: 0.75, roiPct: null }, false)).toBe('flip');
      expect(verdictFor({ estimate: 120, platformFee: 15, shipping: 5, buyPrice: 0, netProfit: 100, marginPct: 0.83, roiPct: null }, false)).toBe('flip');
    });

    it('verdicts "maybe" for estimated value between $15 and $40', () => {
      expect(verdictFor({ estimate: 15, platformFee: 2, shipping: 4, buyPrice: 0, netProfit: 9, marginPct: 0.6, roiPct: null }, false)).toBe('maybe');
      expect(verdictFor({ estimate: 39.99, platformFee: 5, shipping: 5, buyPrice: 0, netProfit: 29.99, marginPct: 0.75, roiPct: null }, false)).toBe('maybe');
    });

    it('verdicts "skip" for estimated value < $15', () => {
      expect(verdictFor({ estimate: 14.99, platformFee: 2, shipping: 4, buyPrice: 0, netProfit: 8.99, marginPct: 0.6, roiPct: null }, false)).toBe('skip');
      expect(verdictFor({ estimate: 5, platformFee: 1, shipping: 4, buyPrice: 0, netProfit: 0, marginPct: 0, roiPct: null }, false)).toBe('skip');
    });
  });

  describe('With Buy Price (Judging profit & margin)', () => {
    it('verdicts "flip" on net profit >= $25 and margin >= 40%', () => {
      expect(verdictFor({ estimate: 80, platformFee: 10.6, shipping: 5, buyPrice: 10, netProfit: 54.4, marginPct: 0.68, roiPct: 544 }, true)).toBe('flip');
      expect(verdictFor({ estimate: 50, platformFee: 6.63, shipping: 5, buyPrice: 5, netProfit: 33.37, marginPct: 0.67, roiPct: 667.4 }, true)).toBe('flip');
    });

    it('verdicts "maybe" on modest profit ($8 to $24.99)', () => {
      expect(verdictFor({ estimate: 30, platformFee: 4, shipping: 4, buyPrice: 10, netProfit: 12, marginPct: 0.4, roiPct: 120 }, true)).toBe('maybe');
    });

    it('verdicts "maybe" on high dollar profit but thin margin (< 40%)', () => {
      expect(verdictFor({ estimate: 300, platformFee: 40, shipping: 10, buyPrice: 220, netProfit: 30, marginPct: 0.1, roiPct: 13.6 }, true)).toBe('maybe');
    });

    it('verdicts "skip" on net profit < $8', () => {
      expect(verdictFor({ estimate: 20, platformFee: 2.65, shipping: 5, buyPrice: 6, netProfit: 6.35, marginPct: 0.32, roiPct: 105.8 }, true)).toBe('skip');
      expect(verdictFor({ estimate: 15, platformFee: 2.95, shipping: 5, buyPrice: 10, netProfit: -2.95, marginPct: -0.2, roiPct: -29.5 }, true)).toBe('skip');
    });
  });
});

describe('potentialProfitFound Accumulator', () => {
  it('sums multiple estimates and excludes negatives', () => {
    expect(potentialProfitFound([45, 80, 25])).toBe(150);
    expect(potentialProfitFound([100, -50, 25.5])).toBe(125.5);
    expect(potentialProfitFound([])).toBe(0);
  });
});
