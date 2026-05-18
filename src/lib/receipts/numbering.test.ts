import { describe, expect, test } from "vitest";
import { formatReceiptNumber } from "./numbering";

describe("formatReceiptNumber", () => {
  test("formats annual progressive numbers", () => {
    expect(formatReceiptNumber(2026, 1)).toBe("RC-2026-0001");
    expect(formatReceiptNumber(2026, 42)).toBe("RC-2026-0042");
  });

  test("rejects invalid sequence", () => {
    expect(() => formatReceiptNumber(2026, 0)).toThrow("Invalid receipt sequence");
  });
});

