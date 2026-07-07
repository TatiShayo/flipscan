// Thin service-role Supabase client for edge functions. The service-role key lives only
// in edge-function secrets. Every function that uses it MUST first validate the caller's
// JWT (see getUserFromRequest) and never trust a client-supplied user id.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getEnv } from './providers.ts';

export function adminClient(): SupabaseClient {
  const url = getEnv('SUPABASE_URL') ?? getEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '';
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Validate the bearer token and return the authenticated user id, or null. We use the
// service client's getUser(jwt) which verifies the token server-side — never decode-and-trust.
export async function getUserIdFromRequest(
  req: Request,
  admin: SupabaseClient,
): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
