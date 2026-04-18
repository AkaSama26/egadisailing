import { describe, expect, it } from "vitest";
import { generateIcal } from "./formatter";

describe("generateIcal", () => {
  const baseEvent = {
    uid: "test-1@egadisailing.com",
    summary: "Prenotato",
    startDate: new Date("2026-07-15T00:00:00Z"),
    endDate: new Date("2026-07-22T00:00:00Z"),
    lastModified: new Date("2026-01-01T12:00:00Z"),
  };

  it("produces well-formed VCALENDAR envelope", () => {
    const out = generateIcal({
      prodId: "-//Test//EN",
      name: "Test",
      events: [baseEvent],
    });
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("VERSION:2.0");
    expect(out).toContain("PRODID:-//Test//EN");
    expect(out).toContain("CALSCALE:GREGORIAN");
  });

  it("uses CRLF line separators (RFC 5545)", () => {
    const out = generateIcal({
      prodId: "-//Test//EN",
      name: "Test",
      events: [baseEvent],
    });
    expect(out).toContain("\r\n");
    expect(out.split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
  });

  it("converts DTEND to exclusive day (RFC 5545 VALUE=DATE)", () => {
    const out = generateIcal({
      prodId: "-//Test//EN",
      name: "Test",
      events: [baseEvent],
    });
    expect(out).toContain("DTSTART;VALUE=DATE:20260715");
    // end 2026-07-22 → DTEND 2026-07-23 exclusive
    expect(out).toContain("DTEND;VALUE=DATE:20260723");
  });

  it("escapes commas, semicolons, backslashes and newlines in SUMMARY/DESCRIPTION", () => {
    const out = generateIcal({
      prodId: "-//Test//EN",
      name: "Test, with; special \\ chars",
      events: [
        {
          ...baseEvent,
          summary: "a, b; c \\ d",
          description: "line1\nline2",
        },
      ],
    });
    expect(out).toContain("X-WR-CALNAME:Test\\, with\\; special \\\\ chars");
    expect(out).toContain("SUMMARY:a\\, b\\; c \\\\ d");
    expect(out).toContain("DESCRIPTION:line1\\nline2");
  });

  it("folds lines longer than 75 octets (RFC 5545 §3.1)", () => {
    const longDesc = "x".repeat(200);
    const out = generateIcal({
      prodId: "-//Test//EN",
      name: "Test",
      events: [{ ...baseEvent, description: longDesc }],
    });
    const lines = out.split("\r\n");
    // Nessuna linea > 75 char
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});
