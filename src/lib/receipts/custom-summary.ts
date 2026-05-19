import Decimal from "decimal.js";

export interface ManualReceiptPaymentSummaryInput {
  depositPaid?: string | number | null;
  balancePaid?: string | number | null;
  fullPaid?: string | number | null;
}

export interface ManualReceiptPaymentSummary {
  version: 1;
  depositPaid: string;
  balancePaid: string;
  fullPaid: string;
}

const META_PREFIX = "[[EGADISAILING_RECEIPT_PAYMENT_SUMMARY:";
const META_SUFFIX = "]]";
const META_RE = /\n?\n?\[\[EGADISAILING_RECEIPT_PAYMENT_SUMMARY:(\{[^\]]*\})\]\]\s*$/;

export function normalizeManualReceiptPaymentSummary(
  input: ManualReceiptPaymentSummaryInput | null | undefined,
): ManualReceiptPaymentSummary | null {
  const depositPaid = normalizeAmount(input?.depositPaid);
  const balancePaid = normalizeAmount(input?.balancePaid);
  const fullPaid = normalizeAmount(input?.fullPaid);

  if (depositPaid.isZero() && balancePaid.isZero() && fullPaid.isZero()) {
    return null;
  }

  return {
    version: 1,
    depositPaid: depositPaid.toFixed(2),
    balancePaid: balancePaid.toFixed(2),
    fullPaid: fullPaid.toFixed(2),
  };
}

export function manualReceiptPaymentSummaryTotal(
  summary: ManualReceiptPaymentSummary | null | undefined,
): Decimal {
  if (!summary) return new Decimal(0);
  return new Decimal(summary.depositPaid)
    .plus(summary.balancePaid)
    .plus(summary.fullPaid)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function serializeReceiptNoteWithManualPaymentSummary(
  note: string | null | undefined,
  input: ManualReceiptPaymentSummaryInput | null | undefined,
): string | null {
  const cleanNote = stripExistingMetadata(note).trim();
  const summary = normalizeManualReceiptPaymentSummary(input);
  if (!summary) return cleanNote || null;

  const metadata = `${META_PREFIX}${JSON.stringify(summary)}${META_SUFFIX}`;
  return cleanNote ? `${cleanNote}\n\n${metadata}` : metadata;
}

export function parseReceiptNoteWithManualPaymentSummary(note: string | null | undefined): {
  note: string | null;
  manualPaymentSummary: ManualReceiptPaymentSummary | null;
} {
  if (!note) return { note: null, manualPaymentSummary: null };

  const match = note.match(META_RE);
  if (!match) return { note, manualPaymentSummary: null };

  const cleanNote = note.replace(META_RE, "").trim();
  return {
    note: cleanNote || null,
    manualPaymentSummary: parseManualSummary(match[1]),
  };
}

function stripExistingMetadata(note: string | null | undefined): string {
  if (!note) return "";
  return note.replace(META_RE, "");
}

function parseManualSummary(raw: string): ManualReceiptPaymentSummary | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ManualReceiptPaymentSummary>;
    if (parsed.version !== 1) return null;
    const summary = normalizeManualReceiptPaymentSummary(parsed);
    return summary;
  } catch {
    return null;
  }
}

function normalizeAmount(value: string | number | null | undefined): Decimal {
  const text = String(value ?? "0").trim().replace(",", ".") || "0";
  return new Decimal(text).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
