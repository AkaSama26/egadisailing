import { describe, expect, it } from "vitest";
import { parseAmountToCents, parseFlexibleDate, stripHtml } from "./booking-extractor";

describe("parseAmountToCents", () => {
  it("handles plain decimal", () => {
    expect(parseAmountToCents("1234.50")).toBe(123450);
    expect(parseAmountToCents("99")).toBe(9900);
  });

  it("handles European format 1.234,50", () => {
    expect(parseAmountToCents("1.234,50")).toBe(123450);
    expect(parseAmountToCents("12.345,00")).toBe(1234500);
  });

  it("handles comma-as-decimal without thousand separator", () => {
    expect(parseAmountToCents("99,50")).toBe(9950);
  });

  it("handles EU thousands no decimals '1.234' as 1234€ (not 1€23)", () => {
    expect(parseAmountToCents("1.234")).toBe(123400);
    expect(parseAmountToCents("12.345")).toBe(1234500);
  });

  it("handles US thousands no decimals '1,234' as 1234€", () => {
    expect(parseAmountToCents("1,234")).toBe(123400);
  });

  it("keeps '.50' / ',50' as decimals (2-digit last segment)", () => {
    expect(parseAmountToCents("1234.50")).toBe(123450);
    expect(parseAmountToCents("1234,50")).toBe(123450);
  });

  it("strips currency prefixes/symbols", () => {
    expect(parseAmountToCents("€ 1234.50")).toBe(123450);
    expect(parseAmountToCents("EUR  99")).toBe(9900);
  });

  it("returns null on garbage", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
  });
});

describe("parseFlexibleDate", () => {
  it("parses ISO YYYY-MM-DD", () => {
    const d = parseFlexibleDate("2026-07-15");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-15");
  });

  it("parses dd/mm/yyyy (EU strict)", () => {
    const d = parseFlexibleDate("15/07/2026");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-15");
  });

  it("rejects US mm/dd format ambiguity (07/15 → m=15 invalid)", () => {
    // Senza questo check, Date.UTC(2026, 14, 7) = 7 marzo 2027 silent.
    expect(parseFlexibleDate("07/15/2026")).toBeNull();
  });

  it("rejects invalid calendar dates (31 Feb etc)", () => {
    expect(parseFlexibleDate("31/02/2026")).toBeNull();
    expect(parseFlexibleDate("2026-02-31")).toBeNull();
    expect(parseFlexibleDate("31/11/2026")).toBeNull();
  });

  it("rejects out-of-range years", () => {
    expect(parseFlexibleDate("2019-01-01")).toBeNull();
    expect(parseFlexibleDate("2101-01-01")).toBeNull();
  });

  it("returns null on unsupported format", () => {
    expect(parseFlexibleDate("July 15 2026")).toBeNull();
    expect(parseFlexibleDate("2026/07/15")).toBeNull();
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello  <b>world</b></p>")).toBe("Hello world");
  });

  it("removes script/style content entirely", () => {
    expect(stripHtml("<style>body{}</style>text")).toBe("text");
    expect(stripHtml("<script>alert(1)</script>text")).toBe("text");
  });

  it("decodes basic HTML entities", () => {
    expect(stripHtml("Tom&amp;Jerry &lt;3 &gt;=")).toBe("Tom&Jerry <3 >=");
  });
});
