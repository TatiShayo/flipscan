// SHA-256 helpers (Web Crypto, available in Deno and Node 20+). Used for the 24h
// identification cache key (image bytes) — same image => same ID, no re-billing Claude.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Rough byte size of a base64 payload (server-side image-size re-check).
export function base64ByteLength(b64: string): number {
  const clean = b64.replace(/^data:[^,]+,/, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}
