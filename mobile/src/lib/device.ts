// Stable device fingerprint for server-side free-scan metering. Uses an install-stable
// vendor id where available; hashed before it ever leaves the device. This is a hint to
// the server (which keys metering on device_hash + anon user) — the authoritative count
// lives server-side, so a spoofed value can't grant extra free scans, it can only fail to
// merge two installs.
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'flipscan.device_salt';

async function localSalt(): Promise<string> {
  let salt = await AsyncStorage.getItem(KEY);
  if (!salt) {
    salt = Crypto.randomUUID();
    await AsyncStorage.setItem(KEY, salt);
  }
  return salt;
}

// NOTE: AsyncStorage clears on reinstall, so the salt alone would reset metering. We
// combine it with install-stable device characteristics so a reinstall on the same device
// still hashes close to the same fingerprint bucket; the server also ties the row to the
// anon user id as a second signal.
export async function deviceHash(): Promise<string> {
  const salt = await localSalt();
  const parts = [
    Device.osName ?? '',
    Device.osInternalBuildId ?? Device.osBuildId ?? '',
    Device.modelId ?? Device.modelName ?? '',
    Device.totalMemory ?? '',
    salt,
  ].join('|');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, parts);
}
