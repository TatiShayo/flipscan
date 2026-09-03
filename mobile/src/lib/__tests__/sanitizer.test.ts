// Unit & Security Tests for Barcode, Keyword, Title Sanitization & Image Dimensions.
import { describe, it, expect } from '@jest/globals';
import {
  sanitizeBarcode,
  isValidGtin,
  sanitizeKeywords,
  sanitizeProductTitle,
  computeDownscaledDimensions,
} from '@/lib/sanitizer';

describe('sanitizeBarcode', () => {
  it('cleans standard numeric barcodes (UPC-A, EAN-13)', () => {
    expect(sanitizeBarcode('978-0-1359-5705-9')).toBe('9780135957059');
    expect(sanitizeBarcode(' 012345678905 ')).toBe('012345678905');
    expect(sanitizeBarcode('4006381333931')).toBe('4006381333931');
  });

  it('allows alphanumeric barcodes (Code 128, custom tags)', () => {
    expect(sanitizeBarcode('ABC-1234-XYZ')).toBe('ABC1234XYZ');
  });

  it('rejects barcodes with invalid symbols or punctuation', () => {
    expect(sanitizeBarcode('1234$5678')).toBeNull();
    expect(sanitizeBarcode('978<script>')).toBeNull();
    expect(sanitizeBarcode('UPC;DROP TABLE')).toBeNull();
  });

  it('rejects barcodes that are too short or too long', () => {
    expect(sanitizeBarcode('123')).toBeNull(); // < 4
    expect(sanitizeBarcode('a'.repeat(65))).toBeNull(); // > 64
  });

  it('handles null, undefined, and non-string values safely', () => {
    expect(sanitizeBarcode(null)).toBeNull();
    expect(sanitizeBarcode(undefined)).toBeNull();
    expect(sanitizeBarcode('')).toBeNull();
  });
});

describe('isValidGtin Checksum Validation', () => {
  it('validates correct 13-digit EAN-13 / Bookland GTINs', () => {
    // 9780135957059 is The Pragmatic Programmer 2nd ed
    expect(isValidGtin('9780135957059')).toBe(true);
    // 4006381333931 is Stabilo Boss
    expect(isValidGtin('4006381333931')).toBe(true);
  });

  it('validates correct 12-digit UPC-A codes', () => {
    // 012000000133 (Diet Pepsi 12oz)
    expect(isValidGtin('012000000133')).toBe(true);
  });

  it('validates correct 8-digit EAN-8 codes', () => {
    expect(isValidGtin('96385074')).toBe(true);
  });

  it('rejects barcodes with corrupted check digits', () => {
    // 9780135957058 (last digit should be 9)
    expect(isValidGtin('9780135957058')).toBe(false);
  });

  it('rejects non-standard lengths for GTIN', () => {
    expect(isValidGtin('1234567890')).toBe(false); // 10 digits
  });
});

describe('sanitizeKeywords for eBay / Search Providers', () => {
  it('strips control characters, quotes, and dangerous injection syntax', () => {
    const raw = [
      'Patagonia "Snap-T" fleece',
      'Vintage <script>alert(1)</script> sweater',
      "Men's jacket; drop table",
    ];
    const cleaned = sanitizeKeywords(raw);

    expect(cleaned).toEqual([
      'Patagonia Snap-T fleece',
      'Vintage scriptalert(1)/script sweater',
      'Mens jacket drop table',
    ]);
  });

  it('collapses excessive whitespace and trims', () => {
    const raw = ['   Patagonia    Retro-X    Fleece   '];
    expect(sanitizeKeywords(raw)).toEqual(['Patagonia Retro-X Fleece']);
  });

  it('deduplicates case-insensitively', () => {
    const raw = ['vintage pyrex', 'Vintage Pyrex', 'VINTAGE PYREX', 'pyrex dish'];
    expect(sanitizeKeywords(raw)).toEqual(['vintage pyrex', 'pyrex dish']);
  });

  it('caps keyword count at maxKeywords (default 4)', () => {
    const raw = ['kw1', 'kw2', 'kw3', 'kw4', 'kw5', 'kw6'];
    expect(sanitizeKeywords(raw, 3)).toHaveLength(3);
    expect(sanitizeKeywords(raw)).toHaveLength(4);
  });

  it('caps individual keyword length at maxKeywordLength (default 120)', () => {
    const longKw = 'a'.repeat(200);
    const cleaned = sanitizeKeywords([longKw]);
    expect(cleaned[0]).toHaveLength(120);
  });

  it('handles null, undefined, empty arrays, and mixed types without crashing', () => {
    expect(sanitizeKeywords(null)).toEqual([]);
    expect(sanitizeKeywords(undefined)).toEqual([]);
    expect(sanitizeKeywords([])).toEqual([]);
    expect(sanitizeKeywords(['', null as unknown as string, undefined as unknown as string, 'valid'])).toEqual(['valid']);
  });
});

describe('sanitizeProductTitle', () => {
  it('strips HTML tags and unescapes entities', () => {
    const title = '<b>Patagonia</b> &amp; <i>North Face</i> Fleece Jacket';
    expect(sanitizeProductTitle(title)).toBe('Patagonia & North Face Fleece Jacket');
  });

  it('strips unprintable and control characters', () => {
    const title = 'Vintage\x00 Wool\x1F Sweater\x7F';
    expect(sanitizeProductTitle(title)).toBe('Vintage Wool Sweater');
  });

  it('truncates at maxLength', () => {
    const long = 'x'.repeat(400);
    expect(sanitizeProductTitle(long, 50)).toHaveLength(50);
  });

  it('handles null and undefined', () => {
    expect(sanitizeProductTitle(null)).toBe('');
    expect(sanitizeProductTitle(undefined)).toBe('');
  });
});

describe('computeDownscaledDimensions', () => {
  it('leaves dimensions within maxDim unchanged', () => {
    const res = computeDownscaledDimensions(800, 600, 1024);
    expect(res).toEqual({ width: 800, height: 600, scaled: false });
  });

  it('scales down landscape images proportionally to fit maxWidth', () => {
    const res = computeDownscaledDimensions(2048, 1024, 1024);
    expect(res.width).toBe(1024);
    expect(res.height).toBe(512);
    expect(res.scaled).toBe(true);
  });

  it('scales down portrait images proportionally to fit maxHeight', () => {
    const res = computeDownscaledDimensions(1024, 2048, 1024);
    expect(res.width).toBe(512);
    expect(res.height).toBe(1024);
    expect(res.scaled).toBe(true);
  });

  it('handles square high-res images', () => {
    const res = computeDownscaledDimensions(3000, 3000, 1024);
    expect(res).toEqual({ width: 1024, height: 1024, scaled: true });
  });

  it('handles invalid or zero dimensions safely', () => {
    expect(computeDownscaledDimensions(0, 0, 1024)).toEqual({ width: 1024, height: 1024, scaled: false });
    expect(computeDownscaledDimensions(-10, 500, 1024)).toEqual({ width: 1024, height: 1024, scaled: false });
  });
});
