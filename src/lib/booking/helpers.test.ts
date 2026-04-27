import { describe, test, expect } from "vitest";
import {
  generateConfirmationCode,
  normalizeConfirmationCode,
  deriveEndDate,
} from "./helpers";
import { parseIsoDay, isoDay } from "../dates";

describe("generateConfirmationCode", () => {
  test("format is ES-XXXXXXX with 7 alphabet chars", () => {
    const code = generateConfirmationCode();
    expect(code).toMatch(/^ES-[ABCDEFGHIJKLMNPQRSTUVWXYZ23456789]{7}$/);
  });

  test("randomness: 100 codes are not all identical", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateConfirmationCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("normalizeConfirmationCode", () => {
  test("uppercases and trims", () => {
    expect(normalizeConfirmationCode("  es-aba1234  ")).toBe("ES-ABA1234");
  });
});

describe("deriveEndDate", () => {
  test("WEEK = 6 days after start (7-day inclusive)", () => {
    const start = parseIsoDay("2026-07-04");
    const end = deriveEndDate(start, "WEEK", 168);
    expect(isoDay(end)).toBe("2026-07-10");
  });

  test("MULTI_DAY = calendar days inclusive", () => {
    const start = parseIsoDay("2026-07-04");
    const end = deriveEndDate(start, "MULTI_DAY", 72);
    expect(isoDay(end)).toBe("2026-07-06");
  });

  test("FULL_DAY = +durationHours", () => {
    const start = new Date("2026-07-15T09:00:00Z");
    const end = deriveEndDate(start, "FULL_DAY", 8);
    expect(end.toISOString()).toBe("2026-07-15T17:00:00.000Z");
  });

  test("HALF_DAY_MORNING = +4h", () => {
    const start = new Date("2026-07-15T09:00:00Z");
    const end = deriveEndDate(start, "HALF_DAY_MORNING", 4);
    expect(end.toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });
});
