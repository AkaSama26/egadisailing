import { describe, expect, test } from "vitest";
import { computeReceiptLineTotal, computeReceiptTotal } from "./calculations";

describe("receipt calculations", () => {
  test("keeps Decimal arithmetic at two decimals", () => {
    expect(computeReceiptLineTotal({ quantity: "2", unitPrice: "10.005" }).toFixed(2)).toBe(
      "20.02",
    );
  });

  test("sums multiple lines", () => {
    const total = computeReceiptTotal([
      { quantity: "2", unitPrice: "10.00" },
      { quantity: "1.5", unitPrice: "20.00" },
    ]);
    expect(total.toFixed(2)).toBe("50.00");
  });
});

