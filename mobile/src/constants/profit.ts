// App-side mirror of supabase/functions/_shared/profit.ts — pure profit math, no I/O.
// Duplicated (not imported) for the same Metro-monorepo-resolution reason as
// src/types/scan.ts; a jest cross-check test asserts the two stay numerically identical.
// This is the ONE place the app recalculates profit live as the user types a buy price,
// picks a platform, or slides the condition adjuster.
import type { Category, ConditionGrade, Verdict } from '@/types/scan';

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

export function adjustedEstimate(
  estimatedSold: number,
  category: Category,
  grade: ConditionGrade,
): number {
  return round2(Math.max(0, estimatedSold) * conditionMultiplier(category, grade));
}

export interface ProfitInput {
  estimatedSold: number;
  category: Category;
  condition: ConditionGrade;
  buyPrice: number | null;
  platform: Platform;
}

export interface ProfitBreakdown {
  estimate: number;
  platformFee: number;
  shipping: number;
  buyPrice: number;
  netProfit: number;
  marginPct: number | null;
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

export function potentialProfitFound(estimates: number[]): number {
  return round2(estimates.reduce((a, b) => a + Math.max(0, b), 0));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
