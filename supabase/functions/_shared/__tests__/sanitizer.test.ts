// Unit & Security Tests for Backend Sanitizer Helpers.
import {
  sanitizeBarcode,
  isValidGtin,
  sanitizeKeywords,
  sanitizeProductTitle,
  computeDownscaledDimensions,
} from '../sanitizer.ts';

describe('Backend sanitizeBarcode', () => {
  it('cleans valid numeric and alphanumeric barcodes', () => {
    expect(sanitizeBarcode(' 978-0135-95705-9 ')).toBe('9780135957059');
    expect(sanitizeBarcode('UPC-123456')).toBe('UPC123456');
  });

  it('rejects invalid barcodes', () => {
    expect(sanitizeBarcode('12')).toBeNull();
    expect(sanitizeBarcode('invalid;injection')).toBeNull();
  });
});

describe('Backend isValidGtin', () => {
  it('validates GTIN-13 and GTIN-12 correctly', () => {
    expect(isValidGtin('9780135957059')).toBe(true);
    expect(isValidGtin('012000000133')).toBe(true);
    expect(isValidGtin('9780135957051')).toBe(false);
  });
});

describe('Backend sanitizeKeywords', () => {
  it('strips harmful injection characters', () => {
    const raw = ['Vintage "leather" jacket', '<script>alert(1)</script> coat', 'wool sweater;'];
    const res = sanitizeKeywords(raw);
    expect(res).toEqual(['Vintage leather jacket', 'scriptalert(1)/script coat', 'wool sweater']);
  });

  it('limits keywords count and length', () => {
    const raw = ['a'.repeat(200), 'k2', 'k3', 'k4', 'k5'];
    const res = sanitizeKeywords(raw);
    expect(res).toHaveLength(4);
    expect(res[0]).toHaveLength(120);
  });
});

describe('Backend sanitizeProductTitle', () => {
  it('strips HTML tags and entities', () => {
    expect(sanitizeProductTitle('<b>Item</b> &amp; Good')).toBe('Item & Good');
  });
});

describe('Backend computeDownscaledDimensions', () => {
  it('scales dimensions within maxDim', () => {
    const res = computeDownscaledDimensions(2000, 1000, 1000);
    expect(res.width).toBe(1000);
    expect(res.height).toBe(500);
    expect(res.scaled).toBe(true);
  });
});
