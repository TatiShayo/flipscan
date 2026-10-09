// Supabase client (app side). Uses the anon key with the auth session persisted
// in expo-secure-store (Keychain / Keystore), NOT AsyncStorage: the session
// holds access + refresh JWTs, and plaintext AsyncStorage leaves them readable
// by anything with app-data access (backups, rooted devices, other apps on
// rooted/jailbroken hardware). Mirrors the sibling app (quitvape)'s
// device-bound session store.
// When EXPO_PUBLIC_SUPABASE_URL/ANON_KEY are absent, `supabase` is null and
// callers use the in-memory mock repo (src/lib/mockBackend.ts) instead — the
// app runs fully offline on fixtures until a project is wired.
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CONFIGURED, ENV } from '@/config/env';

/** SecureStore keys are restricted to alphanumerics plus . - _ (Expo SDK 57). */
function safeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Chunked SecureStore adapter for the Supabase storage interface.
 *
 * The platform secure stores reject large values (historically ~2KB on iOS),
 * and a Supabase session (access + refresh JWT + user JSON) can exceed that.
 * Values above CHUNK_THRESHOLD are split across numbered chunk keys and
 * reassembled on read; removeItem deletes every chunk.
 *
 * Exported for unit tests; application code should not need it directly.
 */
const CHUNK_THRESHOLD = 1800;
const MAX_CHUNKS = 8;

export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const base = safeKey(key);
    const first = await SecureStore.getItemAsync(base);
    if (first === null) return null;
    // Stored whole (legacy or small values).
    if (!first.startsWith('\u0000chunks:')) return first;

    const total = Number.parseInt(first.slice('\u0000chunks:'.length), 10);
    if (!Number.isInteger(total) || total < 1 || total > MAX_CHUNKS) return null;

    const parts: string[] = [];
    for (let i = 0; i < total; i++) {
      const chunk = await SecureStore.getItemAsync(`${base}.${i}`);
      if (chunk === null) return null; // torn write — treat as absent
      parts.push(chunk);
    }
    return parts.join('');
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const base = safeKey(key);
    await SecureStore.deleteItemAsync(base).catch(() => {});
    for (let i = 0; i < MAX_CHUNKS; i++) {
      await SecureStore.deleteItemAsync(`${base}.${i}`).catch(() => {});
    }

    if (value.length <= CHUNK_THRESHOLD) {
      await SecureStore.setItemAsync(base, value);
      return;
    }

    const size = Math.ceil(value.length / MAX_CHUNKS);
    const chunks: string[] = [];
    for (let i = 0; i < MAX_CHUNKS; i++) {
      chunks.push(value.slice(i * size, (i + 1) * size));
    }
    await SecureStore.setItemAsync(base, `\u0000chunks:${MAX_CHUNKS}`);
    for (let i = 0; i < MAX_CHUNKS; i++) {
      await SecureStore.setItemAsync(`${base}.${i}`, chunks[i]);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    const base = safeKey(key);
    await SecureStore.deleteItemAsync(base).catch(() => {});
    for (let i = 0; i < MAX_CHUNKS; i++) {
      await SecureStore.deleteItemAsync(`${base}.${i}`).catch(() => {});
    }
  },
};

export const supabase: SupabaseClient | null = CONFIGURED.supabase
  ? createClient(ENV.supabaseUrl as string, ENV.supabaseAnonKey as string, {
      auth: {
        storage: secureStorage,
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
