import { describe, expect, test } from "vitest";
import {
  normalizeReceiptPdfMoney,
  normalizeReceiptPdfText,
  receiptPdfFilename,
  renderReceiptPdf,
} from "./pdf";
import type { ReceiptViewModel } from "./view-model";

describe("receipt PDF", () => {
  test("renders a valid PDF buffer and filename", async () => {
    const bytes = await renderReceiptPdf(makeReceiptViewModel());
    const signature = Buffer.from(bytes.slice(0, 4)).toString("ascii");

    expect(signature).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(1000);
    expect(receiptPdfFilename("RC-2026-0001")).toBe("RC-2026-0001.pdf");
  });

  test("preserves euro labels for PDF text", () => {
    expect(normalizeReceiptPdfMoney("€120.00")).toBe("€120.00");
    expect(normalizeReceiptPdfMoney("120,00\u00a0€")).toBe("120,00 €");
    expect(normalizeReceiptPdfText("€120.00")).toBe("€120.00");
    expect(normalizeReceiptPdfText("Paid → confirmed ✓")).toBe("Paid -> confirmed ?");
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
        clientKey: "line_1",
        lineType: "PRODUCT",
        lineTypeLabel: "Product/service",
        description: "Custom private sailing experience",
        quantity: "1.00",
        unitPrice: "120.00",
        lineTotal: "120.00",
        unitPriceLabel: "€120.00",
        lineTotalLabel: "€120.00",
        vatTreatment: "VAT_INCLUDED",
        vatLabel: "VAT included",
        paymentType: null,
        paymentTypeLabel: null,
        paymentMethod: null,
        paymentMethodLabel: null,
        paymentDate: null,
        paymentDateLabel: null,
        productLineItemId: null,
        productLineLabel: null,
        paymentMetaLabel: null,
      },
      {
        id: "line_2",
        clientKey: "line_2",
        lineType: "PAYMENT_RECEIVED",
        lineTypeLabel: "Payment received",
        description: "Deposit received",
        quantity: "1.00",
        unitPrice: "40.00",
        lineTotal: "40.00",
        unitPriceLabel: "€40.00",
        lineTotalLabel: "€40.00",
        vatTreatment: "VAT_INCLUDED",
        vatLabel: "-",
        paymentType: "DEPOSIT",
        paymentTypeLabel: "Deposit",
        paymentMethod: "CASH",
        paymentMethodLabel: "Cash",
        paymentDate: "2026-05-18",
        paymentDateLabel: "18/05/2026",
        productLineItemId: "line_1",
        productLineLabel: "Custom private sailing experience",
        paymentMetaLabel: "Deposit · Cash · 18/05/2026 · For: Custom private sailing experience",
      },
    ],
    payments: [],
    paymentSummary: {
      totalTitle: "Products/services total",
      sectionTitle: "Payments summary",
      includedPaymentsTitle: "Payments received",
      bookingTotal: "120.00",
      bookingTotalLabel: "€120.00",
      depositPaid: "40.00",
      depositPaidLabel: "€40.00",
      balancePaid: "0.00",
      balancePaidLabel: "€0.00",
      fullPaid: "0.00",
      fullPaidLabel: "€0.00",
      totalPaid: "40.00",
      totalPaidLabel: "€40.00",
      includedPayments: "40.00",
      includedPaymentsLabel: "€40.00",
      remainingBalance: "80.00",
      remainingBalanceLabel: "€80.00",
      snapshotAtLabel: "18/05/2026",
      rows: [
        { label: "Products/services total", value: "€120.00", emphasis: true },
        { label: "Deposits received", value: "€40.00", emphasis: false },
        { label: "Balances received", value: "€0.00", emphasis: false },
        { label: "Payments received", value: "€40.00", emphasis: true },
        { label: "Balance outstanding", value: "€80.00", emphasis: true },
      ],
    },
    createdAt: date,
    updatedAt: date,
    cancelledAt: null,
  };
}
