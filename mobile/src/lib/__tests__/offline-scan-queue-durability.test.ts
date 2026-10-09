import { describe, it, expect } from "@jest/globals";
import {
  calculateBackoff,
  BACKOFF_BASE_MS,
  BACKOFF_CAP_MS,
} from "../offlineQueue";

describe("FlipScan Offline Scan Queue Durability & Backoff", () => {
  it("calculates exponential backoff correctly across retry attempts", () => {
    const b0 = calculateBackoff(0, 100, 1000);
    const b1 = calculateBackoff(1, 100, 1000);
    const b2 = calculateBackoff(2, 100, 1000);

    expect(b0).toBeGreaterThanOrEqual(100);
    expect(b1).toBeGreaterThanOrEqual(200);
    expect(b2).toBeGreaterThanOrEqual(400);
  });

  it("strictly bounds exponential backoff under the cap", () => {
    const cap = 2000;
    // Attempt 10 would be 100 * 2^10 = 102,400 without capping
    const b10 = calculateBackoff(10, 100, cap);
    // Cap + 10% max jitter = 2200
    expect(b10).toBeLessThanOrEqual(cap * 1.1);
  });

  it("adds non-deterministic jitter to prevent thundering herds", () => {
    const values = new Set<number>();
    for (let i = 0; i < 20; i++) {
      values.add(calculateBackoff(2, 500, 5000));
    }
    // Should have generated varying values due to jitter
    expect(values.size).toBeGreaterThan(1);
  });
});
