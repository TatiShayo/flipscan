// URL sanitization for LLM- and comps-provider-supplied links. Prevents link injection:
// the model or a comps response could return a javascript:/data: URL or a non-eBay host.
// Only https eBay(-family) URLs survive; everything else becomes null and the UI hides
// the link rather than rendering an attacker-controlled destination.
const ALLOWED_HOST_SUFFIXES = [
  'ebay.com',
  'ebay.co.uk',
  'ebay.de',
  'ebay.ca',
  'ebay.com.au',
  'ebayimg.com', // eBay image CDN (for listing thumbnails)
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
  const ok = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith('.' + suffix),
  );
  if (!ok) return null;
  return u.toString();
}

// Wrap an outbound listing URL with an eBay Partner Network tracking param when the
// EPN campaign id is configured; otherwise return the plain (already-sanitized) link.
// Fail-safe: if the input isn't a valid eBay URL, return null (no link rendered).
export function withEpn(rawUrl: string, campaignId: string | null): string | null {
  const clean = sanitizeEbayUrl(rawUrl);
  if (!clean) return null;
  if (!campaignId) return clean;
  const u = new URL(clean);
  u.searchParams.set('mkcid', '1');
  u.searchParams.set('mkrid', '711-53200-19255-0');
  u.searchParams.set('campid', campaignId);
  u.searchParams.set('toolid', '10001');
  u.searchParams.set('mkevt', '1');
  return u.toString();
}
