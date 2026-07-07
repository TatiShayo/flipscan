// POST /scan — the wallet-guarding core edge function.
//
// Security order (each gate fails closed before any spend):
//   1. JWT auth (never trust client user id)
//   2. zod-validate body; server-side image-size re-check
//   3. AI kill-switch
//   4. daily rate limit + monthly budget cap (record_ai_usage, compare to caps)
//   5. metering: consume a scan credit atomically (top-up before free); paywall if none
//   6. 24h image-hash cache (skip Claude on a repeat image; refund the just-consumed credit)
//   7. vision identify -> comps -> verdict
//   8. persist scan row (service role), respond with generic errors on failure
//
// On any pipeline failure AFTER consuming a credit, we refund it so users aren't charged
// a free scan for our outage.
import { ScanRequestSchema, IdentifiedSchema, type ScanResult } from '../_shared/schema.ts';
import { CORS_HEADERS, ERROR_STATUS, errorResponse, json } from '../_shared/http.ts';
import { adminClient, getUserIdFromRequest } from '../_shared/supabase_admin.ts';
import {
  DAILY_SCAN_LIMIT,
  FREE_SCAN_LIMIT,
  MONTHLY_BUDGET_USD,
  epnCampaignId,
  isAiKilled,
  makeCompsProvider,
  makeVisionProvider,
} from '../_shared/providers.ts';
import { EST_COST_PER_SCAN_USD } from '../_shared/anthropic_vision.ts';
import { base64ByteLength, sha256Hex } from '../_shared/hash.ts';
import { computeProfit, verdictFor, type Platform } from '../_shared/profit.ts';
import { withEpn } from '../_shared/url.ts';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // matches bucket file_size_limit

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail('bad_request', 'POST only');

  const admin = adminClient();

  // 1. auth
  const userId = await getUserIdFromRequest(req, admin);
  if (!userId) return fail('unauthorized', 'Sign-in required.');

  // 2. validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request', 'Malformed request.');
  }
  const parsed = ScanRequestSchema.safeParse(body);
  if (!parsed.success) return fail('bad_request', 'Invalid scan request.');
  const { images, device_hash, mode, barcode } = parsed.data;

  // server-side image-size re-check (don't trust client downscale)
  for (const img of images) {
    if (base64ByteLength(img) > MAX_IMAGE_BYTES) {
      return fail('bad_request', 'Image too large. Please retake.');
    }
  }

  // 3. kill switch
  if (isAiKilled()) {
    return fail('ai_disabled', 'Scanning is temporarily unavailable. Try again soon.');
  }

  try {
    // 4. daily rate limit + monthly budget (atomic increment, then compare)
    const { data: usage, error: usageErr } = await admin.rpc('record_ai_usage', {
      p_user_id: userId,
      p_cost_usd: EST_COST_PER_SCAN_USD,
    });
    if (usageErr) throw usageErr;
    const u = firstRow(usage);
    if (u && u.scans_today > DAILY_SCAN_LIMIT) {
      return fail('rate_limited', "You've hit today's scan limit. Back tomorrow.");
    }
    if (u && Number(u.month_cost_usd) > MONTHLY_BUDGET_USD) {
      return fail('budget_capped', "You've reached this month's scan quota.");
    }

    // 5. metering — consume a credit atomically
    const { data: credit, error: creditErr } = await admin.rpc('consume_scan_credit', {
      p_device_hash: device_hash,
      p_user_id: userId,
      p_free_limit: FREE_SCAN_LIMIT,
    });
    if (creditErr) throw creditErr;
    const c = firstRow(credit);
    if (!c || !c.allowed) {
      return failPaywall(c?.free_used ?? FREE_SCAN_LIMIT);
    }
    const freeUsed = c.free_used;
    const topupRemaining = c.topup_remaining;

    // 6. 24h cache by image hash (only the primary image)
    const imageHash = await sha256Hex(images[0]);
    let identified;
    const { data: cached } = await admin
      .from('scan_cache')
      .select('identified')
      .eq('image_hash', imageHash)
      .maybeSingle();

    if (cached?.identified) {
      identified = IdentifiedSchema.parse(cached.identified);
      // cache hit => we didn't call Claude; refund the credit we just consumed
      await admin.rpc('refund_scan_credit', { p_device_hash: device_hash });
    } else {
      // 7. vision
      const { provider: vision } = makeVisionProvider();
      try {
        identified = await vision.identify({
          imagesB64: images,
          barcode: mode === 'barcode' ? barcode : undefined,
        });
      } catch {
        await admin.rpc('refund_scan_credit', { p_device_hash: device_hash });
        return fail('identification_failed', "Couldn't identify that. Try another angle.");
      }
      await admin
        .from('scan_cache')
        .upsert({ image_hash: imageHash, identified }, { onConflict: 'image_hash' });
    }

    // comps
    const { provider: comps } = makeCompsProvider();
    const rawComps = await comps.getComps({
      keywords: identified.ebay_search_keywords,
      gtin: mode === 'barcode' ? barcode : undefined,
    });
    // wrap sample links with EPN (or plain-link fallback), drop any that fail sanitization
    const campaign = epnCampaignId();
    const sample_listings = rawComps.sample_listings
      .map((l) => ({ ...l, url: withEpn(l.url, campaign) }))
      .filter((l): l is typeof l & { url: string } => l.url !== null);
    const finalComps = { ...rawComps, sample_listings };

    // verdict (server-authoritative; no buy price yet -> judge on estimate)
    const platform: Platform = 'ebay';
    const breakdown = computeProfit({
      estimatedSold: finalComps.estimated_sold,
      category: identified.category,
      condition: 'good',
      buyPrice: null,
      platform,
    });
    const verdict = verdictFor(breakdown, false);

    // 8. persist
    const { data: inserted, error: insErr } = await admin
      .from('scans')
      .insert({
        user_id: userId,
        identified,
        comps: finalComps,
        verdict,
        status: 'complete',
      })
      .select('id')
      .single();
    if (insErr || !inserted) throw insErr ?? new Error('insert failed');

    const result: ScanResult = {
      scan_id: inserted.id,
      identified,
      comps: finalComps,
      verdict,
      free_scans_used: freeUsed,
      free_limit: FREE_SCAN_LIMIT,
      topup_remaining: topupRemaining,
    };
    return json(result, 200);
  } catch (e) {
    // details to Sentry (wired via SENTRY_DSN); generic message to client
    console.error('scan_pipeline_error', (e as Error)?.message);
    return fail('internal', 'Something went wrong. Please try again.');
  }
});

// deno-lint-ignore no-explicit-any
function firstRow<T = any>(data: any): T | null {
  if (Array.isArray(data)) return (data[0] as T) ?? null;
  return (data as T) ?? null;
}

function fail(code: Parameters<typeof errorResponse>[0]['error'], message: string): Response {
  return errorResponse({ error: code, message }, ERROR_STATUS[code]);
}

function failPaywall(freeUsed: number): Response {
  return errorResponse(
    {
      error: 'paywall',
      message: "You've used your 3 free scans.",
      free_scans_used: freeUsed,
      free_limit: FREE_SCAN_LIMIT,
    },
    ERROR_STATUS.paywall,
  );
}
