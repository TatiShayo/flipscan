// QA target #2 — zod schemas at the edge-function boundary: valid inputs parse, malformed
// inputs are rejected (the "reject, don't sanitize-and-hope" rule), and defaults fill in.
// The IdentifiedSchema is the LLM-output gate — the whole point is that a malformed model
// response is caught here before anything downstream trusts it.
import {
  IdentifiedSchema,
  CompsSchema,
  ScanRequestSchema,
  ScanResultSchema,
  ScanErrorSchema,
} from '../schema.ts';
import {
  FIXTURE_IDENTIFIED,
  FIXTURE_IDENTIFIED_LOW_CONF,
  FIXTURE_COMPS,
} from '../fixtures.ts';

describe('IdentifiedSchema (LLM output gate)', () => {
  it('accepts a well-formed identification', () => {
    expect(IdentifiedSchema.safeParse(FIXTURE_IDENTIFIED).success).toBe(true);
    expect(IdentifiedSchema.safeParse(FIXTURE_IDENTIFIED_LOW_CONF).success).toBe(true);
  });

  it('fills defaults for optional fields', () => {
    const parsed = IdentifiedSchema.parse({
      name: 'Thing',
      category: 'other',
      confidence: 0.5,
      ebay_search_keywords: ['thing'],
    });
    expect(parsed.brand).toBeNull();
    expect(parsed.needs_better_photo).toBe(false);
    expect(parsed.condition_notes).toBe('');
    expect(parsed.photo_tip).toBeNull();
  });

  it('rejects an out-of-enum category', () => {
    const r = IdentifiedSchema.safeParse({ ...FIXTURE_IDENTIFIED, category: 'weapons' });
    expect(r.success).toBe(false);
  });

  it('rejects confidence outside 0..1', () => {
    expect(IdentifiedSchema.safeParse({ ...FIXTURE_IDENTIFIED, confidence: 1.5 }).success).toBe(false);
    expect(IdentifiedSchema.safeParse({ ...FIXTURE_IDENTIFIED, confidence: -0.1 }).success).toBe(false);
  });

  it('rejects empty or oversized keyword arrays', () => {
    expect(IdentifiedSchema.safeParse({ ...FIXTURE_IDENTIFIED, ebay_search_keywords: [] }).success).toBe(false);
    expect(
      IdentifiedSchema.safeParse({ ...FIXTURE_IDENTIFIED, ebay_search_keywords: ['a', 'b', 'c', 'd', 'e'] }).success,
    ).toBe(false);
  });

  it('rejects a missing name (the one field the UI always renders)', () => {
    const { name: _drop, ...rest } = FIXTURE_IDENTIFIED;
    expect(IdentifiedSchema.safeParse(rest).success).toBe(false);
  });
});

describe('CompsSchema', () => {
  it('accepts the fixture comps', () => {
    expect(CompsSchema.safeParse(FIXTURE_COMPS).success).toBe(true);
  });

  it('requires is_estimate === true (sold price is always labelled an estimate)', () => {
    expect(CompsSchema.safeParse({ ...FIXTURE_COMPS, is_estimate: false }).success).toBe(false);
  });

  it('rejects negative prices and non-https sample urls', () => {
    expect(CompsSchema.safeParse({ ...FIXTURE_COMPS, median: -1 }).success).toBe(false);
    expect(
      CompsSchema.safeParse({
        ...FIXTURE_COMPS,
        sample_listings: [{ title: 'x', price: 1, url: 'not-a-url', img: null }],
      }).success,
    ).toBe(false);
  });
});

describe('ScanRequestSchema (client -> edge boundary)', () => {
  const valid = {
    images: ['aGVsbG8='],
    device_hash: '0123456789abcdef0123',
    mode: 'photo',
  };

  it('accepts a valid photo request and defaults mode', () => {
    const r = ScanRequestSchema.parse({ images: valid.images, device_hash: valid.device_hash });
    expect(r.mode).toBe('photo');
  });

  it('rejects zero images and more than two', () => {
    expect(ScanRequestSchema.safeParse({ ...valid, images: [] }).success).toBe(false);
    expect(ScanRequestSchema.safeParse({ ...valid, images: ['a', 'b', 'c'] }).success).toBe(false);
  });

  it('rejects a too-short device hash (anti-spoof floor)', () => {
    expect(ScanRequestSchema.safeParse({ ...valid, device_hash: 'short' }).success).toBe(false);
  });

  it('accepts the barcode mode with a barcode', () => {
    const r = ScanRequestSchema.safeParse({ ...valid, mode: 'barcode', barcode: '9780135957059' });
    expect(r.success).toBe(true);
  });
});

describe('ScanResultSchema', () => {
  it('rejects a non-uuid scan_id', () => {
    const good = {
      scan_id: '00000000-0000-4000-8000-000000000000',
      identified: FIXTURE_IDENTIFIED,
      comps: FIXTURE_COMPS,
      verdict: 'flip',
      free_scans_used: 1,
      free_limit: 3,
      topup_remaining: 0,
    };
    expect(ScanResultSchema.safeParse(good).success).toBe(true);
    expect(ScanResultSchema.safeParse({ ...good, scan_id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('ScanErrorSchema', () => {
  it('constrains error codes to the known enum', () => {
    expect(ScanErrorSchema.safeParse({ error: 'paywall', message: 'x' }).success).toBe(true);
    expect(ScanErrorSchema.safeParse({ error: 'kaboom', message: 'x' }).success).toBe(false);
  });
});
