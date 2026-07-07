// Supabase client (app side). Uses the anon key + AsyncStorage-persisted anonymous auth.
// When EXPO_PUBLIC_SUPABASE_URL/ANON_KEY are absent, `supabase` is null and callers use
// the in-memory mock repo (src/lib/mockBackend.ts) instead — the app runs fully offline
// on fixtures until a project is wired.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CONFIGURED, ENV } from '@/config/env';

export const supabase: SupabaseClient | null = CONFIGURED.supabase
  ? createClient(ENV.supabaseUrl as string, ENV.supabaseAnonKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Ensure an anonymous session exists (BUILD_PROMPT: 3 free scans, no signup). Returns the
// user id, or a stable local pseudo-id in mock mode.
export async function ensureAnonSession(): Promise<string> {
  if (!supabase) return 'mock-anon-user';
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw error ?? new Error('anon sign-in failed');
  return signed.user.id;
}

export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
