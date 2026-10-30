// Sanitization & Validation Helpers for user and provider inputs.
// Defends against injection, malformed data, and unexpected character sets.

/**
 * Validates and sanitizes barcodes (GTIN, UPC-A, UPC-E, EAN-8, EAN-13, EAN-14, Code 128).
 * Strips whitespace, dashes, and invalid control characters.
 */
export function sanitizeBarcode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/[\s\-_/]+/g, '');
  if (cleaned.length < 4 || cleaned.length > 64) return null;
  // Allow alphanumeric characters only
  if (!/^[a-zA-Z0-9]+$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * Validates GTIN format specifically (8, 12, 13, or 14 numeric digits with check digit verification).
 */
export function isValidGtin(raw: string | null | undefined): boolean {
  const barcode = sanitizeBarcode(raw);
  if (!barcode || !/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(barcode)) {
    return false;
  }
  // Calculate standard GTIN checksum
  const digits = barcode.split('').map(Number);
  const checkDigit = digits[digits.length - 1];
  const payload = digits.slice(0, -1);
  let sum = 0;
  // Weight alternate digits by 3 and 1 from right to left
  for (let i = 0; i < payload.length; i++) {
    const weight = (payload.length - i) % 2 === 1 ? 3 : 1;
    sum += payload[i] * weight;
  }
  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

/**
 * Sanitizes search keywords array for eBay / marketplace search.
 * Filters empty entries, strips dangerous characters, deduplicates, and limits length.
 */
export function sanitizeKeywords(
  keywords: (string | null | undefined)[] | null | undefined,
  maxKeywords = 4,
  maxKeywordLength = 120,
): string[] {
  if (!keywords || !Array.isArray(keywords)) return [];
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const kw of keywords) {
    if (!kw || typeof kw !== 'string') continue;
    // Strip control characters, quotes, dangerous script characters
    const clean = kw
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/[<>"'`;]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxKeywordLength);

    if (clean.length > 0) {
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        sanitized.push(clean);
        if (sanitized.length >= maxKeywords) break;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitizes product titles for rendering and storage.
 * Strips HTML tags, unescapes entities, removes non-printable characters.
 */
export function sanitizeProductTitle(raw: string | null | undefined, maxLength = 300): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Strip unprintable ASCII
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Computes constrained dimensions respecting aspect ratio.
 */
export function computeDownscaledDimensions(
  width: number,
  height: number,
  maxDim = 1024,
): { width: number; height: number; scaled: boolean } {
  if (width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) {
    return { width: maxDim, height: maxDim, scaled: false };
  }
  if (width <= maxDim && height <= maxDim) {
    return { width: Math.round(width), height: Math.round(height), scaled: false };
  }
  const aspectRatio = width / height;
  if (width >= height) {
    return {
      width: maxDim,
      height: Math.round(maxDim / aspectRatio),
      scaled: true,
    };
  } else {
    return {
      width: Math.round(maxDim * aspectRatio),
      height: maxDim,
      scaled: true,
    };
  }
}

/**
 * Computes rough byte size of a base64 string or data URI.
 */
export function base64ByteLength(b64: string | null | undefined): number {
  if (!b64 || typeof b64 !== 'string') return 0;
  const clean = b64.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
  if (clean.length === 0) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}
