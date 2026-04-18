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

  it("parses dd/mm/yyyy", () => {
    const d = parseFlexibleDate("15/07/2026");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-15");
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
