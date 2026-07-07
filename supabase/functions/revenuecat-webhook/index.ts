// POST /revenuecat-webhook — grants consumable top-up scans on a NON_RENEWING_PURCHASE.
// Idempotent by RevenueCat event id (grant_topup_scans inserts into rc_events; a repeat
// event returns false and grants nothing). Authenticated by a shared secret header
// (RC_WEBHOOK_AUTH) rather than a user JWT — this is a server-to-server call.
import { CORS_HEADERS, json } from '../_shared/http.ts';
import { adminClient } from '../_shared/supabase_admin.ts';
import { getEnv } from '../_shared/providers.ts';
import { z } from 'zod';

// Number of extra scans per consumable purchase (BUILD_PROMPT: 20 extra scans for $4.99).
const TOPUP_SCANS = 20;

const RcEventSchema = z.object({
  event: z.object({
    id: z.string().min(1),
    type: z.string(),
    app_user_id: z.string().uuid().optional(),
    product_id: z.string().optional(),
  }),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false }, 405);

  // shared-secret auth (RevenueCat sends a configurable Authorization header)
  const expected = getEnv('RC_WEBHOOK_AUTH');
  if (expected && req.headers.get('Authorization') !== expected) {
    return json({ ok: false }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const parsed = RcEventSchema.safeParse(payload);
  if (!parsed.success) return json({ ok: false }, 400);
  const { id, type, app_user_id, product_id } = parsed.data.event;

  // only consumable top-up purchases grant scans
  const isTopup =
    type === 'NON_RENEWING_PURCHASE' && (product_id ?? '').includes('topup');
  if (!isTopup || !app_user_id) return json({ ok: true, granted: false });

  const admin = adminClient();
  const { data, error } = await admin.rpc('grant_topup_scans', {
    p_event_id: id,
    p_user_id: app_user_id,
    p_scans: TOPUP_SCANS,
  });
  if (error) {
    console.error('rc_webhook_error', error.message);
    return json({ ok: false }, 500);
  }
  // data === false means the event was already processed (idempotent replay)
  return json({ ok: true, granted: data === true });
});
