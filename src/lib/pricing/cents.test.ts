import { describe, test, expect } from "vitest";
import Decimal from "decimal.js";
import { toCents, fromCents, formatEur } from "./cents";

describe("toCents", () => {
  test("half-up at .005", () => {
    expect(toCents("19.995")).toBe(2000);
    expect(toCents("19.994")).toBe(1999);
  });

  test("no floating point drift on Decimal arithmetic", () => {
    const sum = new Decimal("0.1").plus("0.2");
    expect(toCents(sum)).toBe(30);
  });

  test("handles whole euros", () => {
    expect(toCents("100")).toBe(10000);
    expect(toCents(1000)).toBe(100000);
  });
});

describe("fromCents", () => {
  test("1999 cents -> 19.99 EUR", () => {
    expect(fromCents(1999).toFixed(2)).toBe("19.99");
  });

  test("round-trip preserves value", () => {
    const original = new Decimal("123.45");
    expect(fromCents(toCents(original)).toFixed(2)).toBe("123.45");
  });
});

describe("formatEur", () => {
  test("formats with Italian locale", () => {
    // Italian locale uses "," as decimal separator, "€" as symbol
    expect(formatEur(1234.5)).toMatch(/1.?234,50/);
    expect(formatEur(1234.5)).toMatch(/€/);
  });

  test("handles null/undefined gracefully", () => {
    expect(formatEur(null)).toBe("");
    expect(formatEur(undefined)).toBe("");
  });
});
