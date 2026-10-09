// SECURITY: the Supabase auth session (access + refresh JWTs) lives in
// expo-secure-store (Keychain / Keystore), never plaintext AsyncStorage.
// This suite pins the storage adapter contract the Supabase client relies on,
// including the chunking path for sessions larger than the platform's ~2KB
// secure-store value cap.
import { describe, it, expect, beforeEach } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { secureStorage } from "@/lib/supabase";

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

describe("secureStorage adapter (expo-secure-store backed session)", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips small values verbatim", async () => {
    await secureStorage.setItem("sb-auth-token", "small-value");
    expect(await secureStorage.getItem("sb-auth-token")).toBe("small-value");
  });

  it("round-trips oversized values via chunking (session-sized payloads)", async () => {
    // ~4KB: larger than a Supabase session and larger than the platform cap.
    const big = "x".repeat(4000);
    await secureStorage.setItem("sb-auth-token", big);
    expect(await secureStorage.getItem("sb-auth-token")).toBe(big);
    // Chunk marker + 8 chunk keys are present.
    expect(store.has("sb-auth-token")).toBe(true);
    expect(store.has("sb-auth-token.0")).toBe(true);
    expect(store.has("sb-auth-token.7")).toBe(true);
  });

  it("sanitizes keys that SecureStore would reject", async () => {
    await secureStorage.setItem("sb://auth token:weird*chars", "v");
    expect(store.has("sb___auth_token_weird_chars")).toBe(true);
    expect(await secureStorage.getItem("sb://auth token:weird*chars")).toBe("v");
  });

  it("removeItem deletes every chunk, not just the marker", async () => {
    await secureStorage.setItem("sb-auth-token", "y".repeat(5000));
    await secureStorage.removeItem("sb-auth-token");
    expect(await secureStorage.getItem("sb-auth-token")).toBeNull();
    expect(store.has("sb-auth-token.0")).toBe(false);
    expect(store.has("sb-auth-token.7")).toBe(false);
  });

  it("returns null for a torn (partially missing) chunked write", async () => {
    await secureStorage.setItem("sb-auth-token", "z".repeat(4000));
    store.delete("sb-auth-token.3"); // simulate a lost chunk
    expect(await secureStorage.getItem("sb-auth-token")).toBeNull();
  });

  it("overwriting replaces stale chunks from the previous value", async () => {
    await secureStorage.setItem("sb-auth-token", "a".repeat(4000));
    await secureStorage.setItem("sb-auth-token", "short");
    expect(await secureStorage.getItem("sb-auth-token")).toBe("short");
    expect(store.has("sb-auth-token.0")).toBe(false);
  });
});
