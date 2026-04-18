import { describe, test, expect } from "vitest";
import {
  toUtcDay,
  isoDay,
  parseIsoDay,
  eachUtcDayInclusive,
  addDays,
  parseDateLikelyLocalDay,
} from "./dates";

describe("toUtcDay", () => {
  test("strips time component", () => {
    const d = toUtcDay(new Date("2026-07-15T23:59:59Z"));
    expect(d.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
});

describe("parseIsoDay", () => {
  test("parses valid YYYY-MM-DD", () => {
    expect(parseIsoDay("2026-07-15").toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });

  test("rejects malformed", () => {
    expect(() => parseIsoDay("2026/07/15")).toThrow();
    expect(() => parseIsoDay("2026-7-5")).toThrow();
  });
});

describe("eachUtcDayInclusive", () => {
  test("yields N days inclusive", () => {
    const days = Array.from(
      eachUtcDayInclusive(parseIsoDay("2026-07-01"), parseIsoDay("2026-07-03")),
    ).map(isoDay);
    expect(days).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
  });
});

describe("addDays", () => {
  test("adds days preserving UTC midnight", () => {
    const d = addDays(parseIsoDay("2026-03-29"), 1);
    expect(isoDay(d)).toBe("2026-03-30");
  });

  test("handles month boundary", () => {
    const d = addDays(parseIsoDay("2026-01-31"), 1);
    expect(isoDay(d)).toBe("2026-02-01");
  });
});

describe("parseDateLikelyLocalDay", () => {
  test("preserves Italian-intended day for 2026-04-07 midnight CEST", () => {
    // 2026-04-07 midnight CEST = 2026-04-06T22:00:00Z
    const input = "2026-04-06T22:00:00.000Z";
    expect(isoDay(parseDateLikelyLocalDay(input))).toBe("2026-04-07");
  });

  test("preserves day for 2026-01-15 midnight CET", () => {
    // 2026-01-15 midnight CET = 2026-01-14T23:00:00Z
    const input = "2026-01-14T23:00:00.000Z";
    expect(isoDay(parseDateLikelyLocalDay(input))).toBe("2026-01-15");
  });

  test("accepts plain ISO midday", () => {
    expect(isoDay(parseDateLikelyLocalDay("2026-07-15T12:00:00Z"))).toBe("2026-07-15");
  });
});
