// Unit tests for device fingerprinting and salt persistence.
import { describe, it, expect, beforeEach } from '@jest/globals';
import { deviceHash } from '@/lib/device';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Device Fingerprinting Subsystem', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('generates a 64-character SHA-256 hex string as device hash', async () => {
    const hash = await deviceHash();
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maintains hash stability across multiple invocations in the same session', async () => {
    const hash1 = await deviceHash();
    const hash2 = await deviceHash();
    expect(hash1).toBe(hash2);
  });

  it('persists salt in AsyncStorage and reuses it', async () => {
    const hash1 = await deviceHash();
    const storedSalt = await AsyncStorage.getItem('flipscan.device_salt');
    expect(storedSalt).toBeTruthy();

    const hash2 = await deviceHash();
    expect(hash1).toBe(hash2);
  });

  it('generates distinct hash if salt is reset', async () => {
    const hash1 = await deviceHash();
    await AsyncStorage.clear();
    const hash2 = await deviceHash();

    // Since a new random salt was generated, hash should change
    expect(hash1).not.toBe(hash2);
  });
});
