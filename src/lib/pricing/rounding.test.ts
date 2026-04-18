import { describe, test, expect } from "vitest";
import { roundUpTo } from "./rounding";

describe("roundUpTo", () => {
  test("rounds 187.5 up to 190 at step 10", () => {
    expect(roundUpTo(187.5, 10)).toBe(190);
  });

  test("is identity at exact multiple", () => {
    expect(roundUpTo(200, 10)).toBe(200);
    expect(roundUpTo(3000, 50)).toBe(3000);
  });

  test("rounds small fractions up", () => {
    expect(roundUpTo(180.01, 10)).toBe(190);
    expect(roundUpTo(180.99, 10)).toBe(190);
  });

  test("returns value when multiple <= 0", () => {
    expect(roundUpTo(187.5, 0)).toBe(187.5);
    expect(roundUpTo(187.5, -10)).toBe(187.5);
  });
});
