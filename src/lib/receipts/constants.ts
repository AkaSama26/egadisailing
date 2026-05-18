export const RECEIPT_DISCLAIMER_IT =
  "Documento interno non fiscale, non valido come fattura o ricevuta fiscale.";

export const RECEIPT_DISCLAIMER_EN =
  "Internal non-fiscal document, not valid as an invoice or fiscal receipt.";

export const RECEIPT_MAX_LINE_ITEMS = 50;
export const RECEIPT_CURRENCY = "EUR";

export function receiptDisclaimer(language: "IT" | "EN"): string {
  return language === "EN" ? RECEIPT_DISCLAIMER_EN : RECEIPT_DISCLAIMER_IT;
}

