import { describe, expect, test } from "vitest";
import { receiptPdfFilename, renderReceiptPdf } from "./pdf";
import type { ReceiptViewModel } from "./view-model";

describe("receipt PDF", () => {
  test("renders a valid PDF buffer and filename", async () => {
    const bytes = await renderReceiptPdf(makeReceiptViewModel());
    const signature = Buffer.from(bytes.slice(0, 4)).toString("ascii");

    expect(signature).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(1000);
    expect(receiptPdfFilename("RC-2026-0001")).toBe("RC-2026-0001.pdf");
  });
});

function makeReceiptViewModel(): ReceiptViewModel {
  const date = new Date("2026-05-18T00:00:00.000Z");
  return {
    id: "receipt_1",
    number: "RC-2026-0001",
    year: 2026,
    sequence: 1,
    origin: "CUSTOM",
    language: "EN",
    status: "ACTIVE",
    issueDate: date,
    issueDateLabel: "18/05/2026",
    currency: "EUR",
    totalAmount: "120.00",
    totalLabel: "€120.00",
    note: "Boarding services",
    disclaimer: "Internal non-fiscal document, not valid as an invoice or fiscal receipt.",
    company: {
      name: "EGADI SAILING SRLS",
      legalAddress: "Via Calipso 42, 91100 Trapani",
      vatNumber: "02925600815",
      email: "info@egadisailing.com",
    },
    recipient: {
      name: "Test Customer",
      email: "customer@example.com",
      address: "Example Street 1",
      taxId: null,
    },
    booking: null,
    lineItems: [
      {
        id: "line_1",
        description: "Custom private sailing experience",
        quantity: "1.00",
        unitPrice: "120.00",
        lineTotal: "120.00",
        unitPriceLabel: "€120.00",
        lineTotalLabel: "€120.00",
        vatTreatment: "VAT_INCLUDED",
        vatLabel: "VAT included",
      },
    ],
    payments: [],
    createdAt: date,
    updatedAt: date,
    cancelledAt: null,
  };
}
