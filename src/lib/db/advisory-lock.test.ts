import { describe, test, expect } from "vitest";
import { computeAdvisoryLockKey } from "./advisory-lock";

describe("computeAdvisoryLockKey", () => {
  test("is deterministic for same input", () => {
    const k1 = computeAdvisoryLockKey("availability", "boat-1", "2026-07-15");
    const k2 = computeAdvisoryLockKey("availability", "boat-1", "2026-07-15");
    expect(k1).toBe(k2);
  });

  test("different namespace produces different key", () => {
    const k1 = computeAdvisoryLockKey("availability", "boat-1", "2026-07-15");
    const k2 = computeAdvisoryLockKey("booking", "boat-1", "2026-07-15");
    expect(k1).not.toBe(k2);
  });

  test("different parts produce different keys", () => {
    const k1 = computeAdvisoryLockKey("availability", "boat-1", "2026-07-15");
    const k2 = computeAdvisoryLockKey("availability", "boat-2", "2026-07-15");
    expect(k1).not.toBe(k2);
  });

  test("fits within 63-bit signed range", () => {
    const k = computeAdvisoryLockKey("availability", "boat-xyz", "2026-07-15");
    const max = BigInt("9223372036854775807"); // 2^63 - 1
    expect(BigInt(k) >= BigInt(0)).toBe(true);
    expect(BigInt(k) <= max).toBe(true);
  });
});
