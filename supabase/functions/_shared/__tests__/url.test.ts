// QA + security target — URL sanitizer and EPN wrapper. LLM/comps output is untrusted:
// only https eBay-family links survive, everything else becomes null (no attacker-
// controlled destination ever reaches WebBrowser.openBrowserAsync). EPN wrapping is
// additive and only when a campaign id is configured (BUILD_PROMPT §14).
import { sanitizeEbayUrl, withEpn } from '../url.ts';

describe('sanitizeEbayUrl', () => {
  it('accepts https eBay-family hosts', () => {
    expect(sanitizeEbayUrl('https://www.ebay.com/itm/123')).toBe('https://www.ebay.com/itm/123');
    expect(sanitizeEbayUrl('https://ebay.co.uk/itm/1')).toBeTruthy();
    expect(sanitizeEbayUrl('https://i.ebayimg.com/images/g/x/s-l500.jpg')).toBeTruthy();
  });

  it('rejects non-https schemes (injection vectors)', () => {
    expect(sanitizeEbayUrl('http://www.ebay.com/itm/1')).toBeNull();
    expect(sanitizeEbayUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeEbayUrl('data:text/html,<script>1</script>')).toBeNull();
    expect(sanitizeEbayUrl('file:///etc/passwd')).toBeNull();
  });

  it('rejects lookalike / non-eBay hosts', () => {
    expect(sanitizeEbayUrl('https://ebay.com.evil.com/itm/1')).toBeNull();
    expect(sanitizeEbayUrl('https://notebay.com/itm/1')).toBeNull();
    expect(sanitizeEbayUrl('https://evil.com/ebay.com')).toBeNull();
  });

  it('handles junk input without throwing', () => {
    expect(sanitizeEbayUrl(null)).toBeNull();
    expect(sanitizeEbayUrl(undefined)).toBeNull();
    expect(sanitizeEbayUrl('')).toBeNull();
    expect(sanitizeEbayUrl('not a url at all')).toBeNull();
  });
});

describe('withEpn', () => {
  it('returns the plain sanitized link when no campaign id is set (fallback)', () => {
    expect(withEpn('https://www.ebay.com/itm/1', null)).toBe('https://www.ebay.com/itm/1');
  });

  it('appends EPN tracking params when a campaign id is set', () => {
    const wrapped = withEpn('https://www.ebay.com/itm/1', '5338888888');
    expect(wrapped).toContain('campid=5338888888');
    expect(wrapped).toContain('mkcid=1');
    expect(wrapped).toContain('mkevt=1');
  });

  it('returns null for a non-eBay url even with a campaign id (fail-safe)', () => {
    expect(withEpn('https://evil.com/x', '5338888888')).toBeNull();
  });
});
