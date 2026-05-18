import { describe, expect, test } from "vitest";
import { receiptDisclaimer } from "./constants";

describe("receiptDisclaimer", () => {
  test("returns IT/EN non-fiscal disclaimer", () => {
    expect(receiptDisclaimer("IT")).toContain("Documento interno non fiscale");
    expect(receiptDisclaimer("IT")).toContain("non valido come fattura");
    expect(receiptDisclaimer("EN")).toContain("Internal non-fiscal document");
    expect(receiptDisclaimer("EN")).toContain("not valid as an invoice");
  });
});

