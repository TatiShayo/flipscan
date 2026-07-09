// Security test — AI-budget-cap + daily-rate-limit gate (scan/index.ts step 4). Pure
// decision logic extracted into checkUsageLimits() so "at cap -> soft-block" is testable
// without a Deno runtime or a live Postgres connection (record_ai_usage does the atomic
// increment server-side; this only asserts what the already-incremented counters mean).
import {
  checkUsageLimits,
  isAiKilled,
  DAILY_SCAN_LIMIT,
  MONTHLY_BUDGET_USD,
} from '../providers.ts';

describe('checkUsageLimits (soft-block at cap)', () => {
  it('allows a fresh user well under both caps', () => {
    expect(checkUsageLimits({ scansToday: 1, monthCostUsd: 0.05 })).toEqual({
      allowed: true,
      reason: 'ok',
    });
  });

  it('allows exactly at the daily limit (limit is "more than", not "at least")', () => {
    expect(checkUsageLimits({ scansToday: DAILY_SCAN_LIMIT, monthCostUsd: 0 }).allowed).toBe(true);
  });

  it('soft-blocks with rate_limited the scan AFTER the daily limit is reached', () => {
    const r = checkUsageLimits({ scansToday: DAILY_SCAN_LIMIT + 1, monthCostUsd: 0 });
    expect(r).toEqual({ allowed: false, reason: 'rate_limited' });
  });

  it('allows exactly at the monthly budget', () => {
    expect(checkUsageLimits({ scansToday: 1, monthCostUsd: MONTHLY_BUDGET_USD }).allowed).toBe(true);
  });

  it('soft-blocks with budget_capped once the monthly AI budget is exceeded', () => {
    const r = checkUsageLimits({ scansToday: 1, monthCostUsd: MONTHLY_BUDGET_USD + 0.01 });
    expect(r).toEqual({ allowed: false, reason: 'budget_capped' });
  });

  it('reports rate_limited (not budget_capped) when both caps are blown', () => {
    // Rate limit surfaces first: it reads as temporary ("back tomorrow"), which is a more
    // honest message than the budget cap when both are true.
    const r = checkUsageLimits({
      scansToday: DAILY_SCAN_LIMIT + 5,
      monthCostUsd: MONTHLY_BUDGET_USD + 5,
    });
    expect(r.reason).toBe('rate_limited');
  });
});

describe('isAiKilled (kill-switch env flag)', () => {
  const KEY = 'AI_KILL_SWITCH';
  const original = process.env[KEY];

  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it('is false when unset', () => {
    delete process.env[KEY];
    expect(isAiKilled()).toBe(false);
  });

  it('is true when set to "true" (case-insensitive)', () => {
    process.env[KEY] = 'TRUE';
    expect(isAiKilled()).toBe(true);
  });

  it('is false for any other value', () => {
    process.env[KEY] = 'yes';
    expect(isAiKilled()).toBe(false);
  });
});
