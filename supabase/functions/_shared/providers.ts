// Provider factory. Selects real vs mock implementations from edge-function secrets.
// Missing key => mock (never stall) and a warning logged for the human. This is the ONE
// place the pipeline learns which providers exist; the pipeline code stays agnostic.
import type { CompsProvider } from './comps_provider.ts';
import { MockCompsProvider } from './comps_provider.ts';
import { EbayCompsProvider } from './ebay_comps.ts';
import type { VisionProvider } from './vision_provider.ts';
import { MockVisionProvider } from './vision_provider.ts';
import { AnthropicVisionProvider } from './anthropic_vision.ts';

// Minimal env accessor that works in Deno and (for tests) Node.
export function getEnv(key: string): string | undefined {
  // deno-lint-ignore no-explicit-any
  const d = (globalThis as any).Deno;
  if (d?.env?.get) return d.env.get(key) ?? undefined;
  // deno-lint-ignore no-explicit-any
  const p = (globalThis as any).process;
  return p?.env?.[key];
}

export function isAiKilled(): boolean {
  return (getEnv('AI_KILL_SWITCH') ?? '').toLowerCase() === 'true';
}

export function makeVisionProvider(): { provider: VisionProvider; isMock: boolean } {
  const key = getEnv('ANTHROPIC_API_KEY');
  if (key) return { provider: new AnthropicVisionProvider(key), isMock: false };
  return { provider: new MockVisionProvider(), isMock: true };
}

export function makeCompsProvider(): { provider: CompsProvider; isMock: boolean } {
  const id = getEnv('EBAY_CLIENT_ID');
  const secret = getEnv('EBAY_CLIENT_SECRET');
  if (id && secret) return { provider: new EbayCompsProvider(id, secret), isMock: false };
  return { provider: new MockCompsProvider(), isMock: true };
}

export function epnCampaignId(): string | null {
  return getEnv('EPN_CAMPAIGN_ID') ?? null;
}

// Per-user server-side cost controls (BUILD_PROMPT anti-abuse §10 + security).
export const DAILY_SCAN_LIMIT = 20;
export const MONTHLY_BUDGET_USD = 8; // per-user soft cap; friendly block at cap
export const FREE_SCAN_LIMIT = 3;
