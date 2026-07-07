// Pure profit math + verdict logic. No I/O, no dependencies — trivially unit-testable
// (QA target #1). Shared by the edge function (server verdict) and the app (live recalc
// as the user types a buy price / changes condition). Keeping ONE implementation avoids
// client/server drift on the number the whole product is about.
import type { Category, ConditionGrade, Verdict } from './schema.ts';

// Platform fee % (final-value fee, rough blended constants incl. payment processing).
export const PLATFORM_FEES = {
  ebay: 0.1325,
  poshmark: 0.2,
  depop: 0.1,
  mercari: 0.1,
  facebook: 0.05,
} as const;
export type Platform = keyof typeof PLATFORM_FEES;

export const PLATFORM_LABELS: Record<Platform, string> = {
  ebay: 'eBay',
  poshmark: 'Poshmark',
  depop: 'Depop',
  mercari: 'Mercari',
  facebook: 'Facebook Marketplace',
};

// Flat shipping estimate by category (USD), paid by seller on average.
export const SHIPPING_BY_CATEGORY: Record<Category, number> = {
  clothing: 5,
  shoes: 12,
  accessories: 4,
  electronics: 10,
  books_media: 4,
  toys_games: 9,
  home_kitchen: 12,
  collectibles: 8,
  jewelry: 4,
  other: 8,
};

// Condition multipliers applied to the estimate, per category family.
// Clothing/shoes/accessories are condition-sensitive; electronics/media less so.
const CONDITION_MULTIPLIERS: Record<string, Record<ConditionGrade, number>> = {
  soft: { new_with_tags: 1.3, excellent: 1.0, good: 0.7, fair: 0.45 },
  hard: { new_with_tags: 1.15, excellent: 1.0, good: 0.85, fair: 0.6 },
};

const HARD_CATEGORIES: ReadonlySet<Category> = new Set<Category>([
  'electronics',
  'books_media',
  'toys_games',
  'home_kitchen',
  'collectibles',
]);

export function conditionMultiplier(category: Category, grade: ConditionGrade): number {
  const table = HARD_CATEGORIES.has(category)
    ? CONDITION_MULTIPLIERS.hard
    : CONDITION_MULTIPLIERS.soft;
  return table[grade];
}

/** Estimated resale value after adjusting the comp estimate for condition. */
export function adjustedEstimate(
  estimatedSold: number,
  category: Category,
  grade: ConditionGrade,
): number {
  return round2(Math.max(0, estimatedSold) * conditionMultiplier(category, grade));
}

export interface ProfitInput {
  estimatedSold: number; // 0.75 * median active ask, pre-condition
  category: Category;
  condition: ConditionGrade;
  buyPrice: number | null;
  platform: Platform;
}

export interface ProfitBreakdown {
  estimate: number; // condition-adjusted resale value
  platformFee: number;
  shipping: number;
  buyPrice: number;
  netProfit: number; // estimate - fee - shipping - buyPrice
  marginPct: number | null; // netProfit / estimate, null if estimate 0
}

export function computeProfit(input: ProfitInput): ProfitBreakdown {
  const estimate = adjustedEstimate(input.estimatedSold, input.category, input.condition);
  const platformFee = round2(estimate * PLATFORM_FEES[input.platform]);
  const shipping = SHIPPING_BY_CATEGORY[input.category];
  const buyPrice = input.buyPrice == null ? 0 : Math.max(0, input.buyPrice);
  const netProfit = round2(estimate - platformFee - shipping - buyPrice);
  const marginPct = estimate > 0 ? round2(netProfit / estimate) : null;
  return { estimate, platformFee, shipping, buyPrice, netProfit, marginPct };
}

// Verdict thresholds. When no buy price yet, judge on the raw estimate (is it worth
// grabbing at all?). Once a buy price is entered, judge on net profit + margin.
export function verdictFor(breakdown: ProfitBreakdown, hasBuyPrice: boolean): Verdict {
  if (!hasBuyPrice) {
    if (breakdown.estimate >= 40) return 'flip';
    if (breakdown.estimate >= 15) return 'maybe';
    return 'skip';
  }
  const { netProfit, marginPct } = breakdown;
  if (netProfit >= 25 && (marginPct ?? 0) >= 0.4) return 'flip';
  if (netProfit >= 8) return 'maybe';
  return 'skip';
}

/** Sum of value "found" across scans, for the personalized paywall pitch. */
export function potentialProfitFound(estimates: number[]): number {
  return round2(estimates.reduce((a, b) => a + Math.max(0, b), 0));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
