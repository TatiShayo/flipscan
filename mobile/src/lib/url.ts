// App-side mirror of supabase/functions/_shared/url.ts — re-validated here because the
// app must never trust that a URL surviving the server's sanitizer is still safe to open
// (defense in depth: the app is the last gate before WebBrowser.openBrowserAsync opens an
// attacker-influenced destination). Only https eBay(-family) hosts are allowed through.
const ALLOWED_HOST_SUFFIXES = [
  'ebay.com',
  'ebay.co.uk',
  'ebay.de',
  'ebay.ca',
  'ebay.com.au',
  'ebayimg.com',
];

export function sanitizeEbayUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  const ok = ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith('.' + suffix));
  if (!ok) return null;
  return u.toString();
}
