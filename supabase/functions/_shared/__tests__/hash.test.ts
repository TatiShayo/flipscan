// Unit tests for Web Crypto SHA-256 and base64 calculations.
import { describe, it, expect } from '@jest/globals';
import { sha256Hex, base64ByteLength } from '../hash.ts';

describe('Hash & Byte Length Helpers', () => {
  it('computes deterministic SHA-256 hex string for ascii inputs', async () => {
    const hash1 = await sha256Hex('hello');
    const hash2 = await sha256Hex('hello');

    expect(hash1).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(hash1).toBe(hash2);
  });

  it('computes distinct hashes for distinct inputs', async () => {
    const hashA = await sha256Hex('inputA');
    const hashB = await sha256Hex('inputB');
    expect(hashA).not.toBe(hashB);
  });

  it('computes correct base64 byte length for standard payloads', () => {
    // "hello" in base64 is "aGVsbG8=" (length 8, 1 padding char => 5 bytes)
    expect(base64ByteLength('aGVsbG8=')).toBe(5);

    // "hi" in base64 is "aGk=" (length 4, 1 padding char => 2 bytes)
    expect(base64ByteLength('aGk=')).toBe(2);

    // Empty string
    expect(base64ByteLength('')).toBe(0);
  });

  it('strips data URL prefix when computing byte length', () => {
    const rawB64 = 'aGVsbG8=';
    const dataUri = `data:image/jpeg;base64,${rawB64}`;
    expect(base64ByteLength(dataUri)).toBe(5);
  });

  it('handles padding variants (=, ==, none)', () => {
    // 3 bytes -> 4 chars, no padding
    expect(base64ByteLength('AAAA')).toBe(3);
    // 2 bytes -> 4 chars, 1 padding
    expect(base64ByteLength('AAA=')).toBe(2);
    // 1 byte -> 4 chars, 2 padding
    expect(base64ByteLength('AA==')).toBe(1);
  });
});
