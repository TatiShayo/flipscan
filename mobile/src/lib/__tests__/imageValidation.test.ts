import { describe, it, expect } from '@jest/globals';
import { base64ByteLength } from '@/lib/sanitizer';
import { ScanRequestSchema } from '@/types/scan';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

describe('base64ByteLength', () => {
  it('calculates exact byte size of unpadded base64', () => {
    // "any carnal pleasure." in base64 is 20 bytes -> "YW55IGNhcm5hbCBwbGVhc3VyZS4=" (with 1 pad)
    // "Man" -> "TWFu" (3 bytes, 4 chars, 0 pad)
    expect(base64ByteLength('TWFu')).toBe(3);
  });

  it('handles base64 with single padding =', () => {
    // "Ma" -> "TWE=" (2 bytes, 4 chars, 1 pad)
    expect(base64ByteLength('TWE=')).toBe(2);
  });

  it('handles base64 with double padding ==', () => {
    // "M" -> "TQ==" (1 byte, 4 chars, 2 pad)
    expect(base64ByteLength('TQ==')).toBe(1);
  });

  it('strips data:image/jpeg;base64, prefixes accurately before computing size', () => {
    const dataUri = 'data:image/jpeg;base64,TWFu';
    expect(base64ByteLength(dataUri)).toBe(3);
  });

  it('handles base64 with newlines or whitespace', () => {
    const withWhitespace = 'TWFu\nTWFu\r\n';
    expect(base64ByteLength(withWhitespace)).toBe(6);
  });

  it('returns 0 for empty or invalid inputs', () => {
    expect(base64ByteLength('')).toBe(0);
    expect(base64ByteLength(null as unknown as string)).toBe(0);
    expect(base64ByteLength(undefined as unknown as string)).toBe(0);
  });

  it('correctly evaluates 3MB image boundary', () => {
    // 3MB payload in base64 is approx 4 * 1024 * 1024 chars
    const approx3MB = 'A'.repeat(4 * 1024 * 1024);
    const size = base64ByteLength(approx3MB);
    expect(size).toBe(3145728);
    expect(size <= MAX_IMAGE_BYTES).toBe(true);

    const over3MB = 'A'.repeat(4 * 1024 * 1024 + 100);
    expect(base64ByteLength(over3MB) > MAX_IMAGE_BYTES).toBe(true);
  });
});

describe('ScanRequestSchema Image Bounds Enforcement', () => {
  const basePayload = {
    device_hash: '12345678901234567890',
  };

  it('accepts 1 image in photo mode', () => {
    const res = ScanRequestSchema.safeParse({
      ...basePayload,
      images: ['base64photo1'],
      mode: 'photo',
    });
    expect(res.success).toBe(true);
  });

  it('accepts 2 images (item + tag) in photo mode', () => {
    const res = ScanRequestSchema.safeParse({
      ...basePayload,
      images: ['base64photo1', 'base64tag2'],
      mode: 'photo',
    });
    expect(res.success).toBe(true);
  });

  it('rejects 3 images (exceeds max 2 photos bound)', () => {
    const res = ScanRequestSchema.safeParse({
      ...basePayload,
      images: ['img1', 'img2', 'img3'],
      mode: 'photo',
    });
    expect(res.success).toBe(false);
  });

  it('rejects 0 images in photo mode', () => {
    const res = ScanRequestSchema.safeParse({
      ...basePayload,
      images: [],
      mode: 'photo',
    });
    expect(res.success).toBe(false);
  });

  it('accepts 0 images in barcode mode when barcode is present', () => {
    const res = ScanRequestSchema.safeParse({
      ...basePayload,
      images: [],
      mode: 'barcode',
      barcode: '9780135957059',
    });
    expect(res.success).toBe(true);
  });
});
