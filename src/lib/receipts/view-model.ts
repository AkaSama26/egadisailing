import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { formatItDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import type {
  PaymentMethod,
  PaymentType,
  ReceiptLanguage,
  ReceiptLineType,
  ReceiptOrigin,
  ReceiptStatus,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";
import { computeReceiptLineTotal, normalizeQuantity } from "./calculations";
import { receiptDisclaimer } from "./constants";
import {
  manualReceiptPaymentSummaryTotal,
  parseReceiptNoteWithManualPaymentSummary,
  type ManualReceiptPaymentSummary,
} from "./custom-summary";

export interface ReceiptLineViewModel {
  id: string;
  clientKey: string;
  lineType: ReceiptLineType;
  lineTypeLabel: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  vatTreatment: ReceiptVatTreatment;
  vatLabel: string;
  paymentType: PaymentType | null;
  paymentTypeLabel: string | null;
  paymentMethod: PaymentMethod | null;
  paymentMethodLabel: string | null;
  paymentDate: string | null;
  paymentDateLabel: string | null;
  productLineItemId: string | null;
  productLineLabel: string | null;
  paymentMetaLabel: string | null;
  isLegacySynthetic?: boolean;
}

export interface ReceiptPaymentViewModel {
  id: string;
  paymentId: string;
  amountLabel: string;
  type: PaymentType;
  typeLabel: string;
  method: PaymentMethod;
  methodLabel: string;
  processedAtLabel: string | null;
}

export interface ReceiptPaymentSummaryRowViewModel {
  label: string;
  value: string;
  emphasis: boolean;
}

export interface ReceiptPaymentSummaryViewModel {
  totalTitle: string;
  sectionTitle: string;
  includedPaymentsTitle: string;
  bookingTotal: string;
  bookingTotalLabel: string;
  depositPaid: string;
  depositPaidLabel: string;
  balancePaid: string;
  balancePaidLabel: string;
  fullPaid: string;
  fullPaidLabel: string;
  totalPaid: string;
  totalPaidLabel: string;
  includedPayments: string;
  includedPaymentsLabel: string;
  remainingBalance: string;
  remainingBalanceLabel: string;
  snapshotAtLabel: string;
  rows: ReceiptPaymentSummaryRowViewModel[];
}

export interface ReceiptViewModel {
  id: string;
  number: string;
  year: number;
  sequence: number;
  origin: ReceiptOrigin;
  language: ReceiptLanguage;
  status: ReceiptStatus;
  issueDate: Date;
  issueDateLabel: string;
  currency: string;
  totalAmount: string;
  totalLabel: string;
  note: string | null;
  disclaimer: string;
  company: {
    name: string;
    legalAddress: string;
    vatNumber: string;
    email: string;
  };
  recipient: {
    name: string;
    email: string | null;
    address: string | null;
    taxId: string | null;
  };
  booking: {
    id: string;
    confirmationCode: string;
    serviceName: string;
    startDateLabel: string;
    endDateLabel: string;
  } | null;
  lineItems: ReceiptLineViewModel[];
  payments: ReceiptPaymentViewModel[];
  paymentSummary: ReceiptPaymentSummaryViewModel | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

const PAYMENT_TYPE_LABELS: Record<ReceiptLanguage, Record<PaymentType, string>> = {
  IT: {
    DEPOSIT: "Acconto",
    BALANCE: "Saldo",
    FULL: "Pagamento intero",
    REFUND: "Rimborso",
  },
  EN: {
    DEPOSIT: "Deposit",
    BALANCE: "Balance",
    FULL: "Full payment",
    REFUND: "Refund",
  },
};

const PAYMENT_METHOD_LABELS: Record<ReceiptLanguage, Record<PaymentMethod, string>> = {
  IT: {
    STRIPE: "Stripe",
    CASH: "Contanti",
    BANK_TRANSFER: "Bonifico",
    EXTERNAL: "Canale esterno",
  },
  EN: {
    STRIPE: "Stripe",
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    EXTERNAL: "External channel",
  },
};

const PAYMENT_SUMMARY_LABELS = {
  IT: {
    productTotal: "Totale prodotti/servizi",
    depositPaid: "Acconti ricevuti",
    balancePaid: "Saldi ricevuti",
    fullPaid: "Pagamenti interi ricevuti",
    totalPaid: "Pagamenti ricevuti",
    remainingBalance: "Residuo da pagare",
  },
  EN: {
    productTotal: "Products/services total",
    depositPaid: "Deposits received",
    balancePaid: "Balances received",
    fullPaid: "Full payments received",
    totalPaid: "Payments received",
    remainingBalance: "Balance outstanding",
  },
} satisfies Record<ReceiptLanguage, Record<string, string>>;

export async function getReceiptViewModel(id: string): Promise<ReceiptViewModel> {
  const receipt = await db.receipt.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          confirmationCode: true,
          startDate: true,
          endDate: true,
          service: { select: { name: true } },
        },
      },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: {
        include: { payment: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!receipt) throw new NotFoundError("Receipt", id);

  const parsedNote = parseReceiptNoteWithManualPaymentSummary(receipt.note);
  const lineItems = buildLineViewModels({
    lines: receipt.lineItems,
    language: receipt.language,
    legacySummary: parsedNote.manualPaymentSummary,
    receiptIssueDate: receipt.issueDate,
  });
  const paymentSummary = buildLinePaymentSummary({
    lineItems,
    language: receipt.language,
    receiptCreatedAt: receipt.createdAt,
  });

  return {
    id: receipt.id,
    number: receipt.number,
    year: receipt.year,
    sequence: receipt.sequence,
    origin: receipt.origin,
    language: receipt.language,
    status: receipt.status,
    issueDate: receipt.issueDate,
    issueDateLabel: formatDateForReceipt(receipt.issueDate, receipt.language),
    currency: receipt.currency,
    totalAmount: receipt.totalAmount.toString(),
    totalLabel: formatReceiptMoney(receipt.totalAmount.toString(), receipt.language),
    note: parsedNote.note,
    disclaimer: receiptDisclaimer(receipt.language),
    company: {
      name: PUBLIC_COMPANY_LEGAL.name,
      legalAddress: PUBLIC_COMPANY_LEGAL.legalAddress,
      vatNumber: PUBLIC_COMPANY_LEGAL.vatNumber,
      email: PUBLIC_CONTACT_EMAIL,
    },
    recipient: {
      name: receipt.recipientName,
      email: receipt.recipientEmail,
      address: receipt.recipientAddress,
      taxId: receipt.recipientTaxId,
    },
    booking: receipt.booking
      ? {
          id: receipt.booking.id,
          confirmationCode: receipt.booking.confirmationCode,
          serviceName: receipt.booking.service.name,
          startDateLabel: formatDateForReceipt(receipt.booking.startDate, receipt.language),
          endDateLabel: formatDateForReceipt(receipt.booking.endDate, receipt.language),
        }
      : null,
    lineItems,
    payments: receipt.payments.map(({ id: linkId, payment }) => ({
      id: linkId,
      paymentId: payment.id,
      amountLabel: formatReceiptMoney(payment.amount.toString(), receipt.language),
      type: payment.type,
      typeLabel: paymentTypeLabel(payment.type, receipt.language),
      method: payment.method,
      methodLabel: paymentMethodLabel(payment.method, receipt.language),
      processedAtLabel: payment.processedAt
        ? formatDateForReceipt(payment.processedAt, receipt.language)
        : null,
    })),
    paymentSummary,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    cancelledAt: receipt.cancelledAt,
  };
}

export function formatDateForReceipt(date: Date, language: ReceiptLanguage): string {
  if (language === "EN") {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  return formatItDay(date);
}

function buildLineViewModels(input: {
  lines: Array<{
    id: string;
    lineType: ReceiptLineType;
    description: string;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    vatTreatment: ReceiptVatTreatment;
    paymentType: PaymentType | null;
    paymentMethod: PaymentMethod | null;
    paymentDate: Date | null;
    productLineItemId: string | null;
  }>;
  language: ReceiptLanguage;
  legacySummary: ManualReceiptPaymentSummary | null;
  receiptIssueDate: Date;
}): ReceiptLineViewModel[] {
  const productLabels = new Map(
    input.lines
      .filter((line) => line.lineType === "PRODUCT")
      .map((line) => [line.id, line.description]),
  );
  const mapped = input.lines.map((line) => lineViewModel({ line, language: input.language, productLabels }));
  if (mapped.some((line) => line.lineType === "PAYMENT_RECEIVED") || !input.legacySummary) {
    return mapped;
  }

  const synthetic = legacyPaymentLines(input.legacySummary, input.language, input.receiptIssueDate);
  return [...mapped, ...synthetic];
}

function lineViewModel(input: {
  line: {
    id: string;
    lineType: ReceiptLineType;
    description: string;
    quantity: { toString(): string };
    unitPrice: { toString(): string };
    vatTreatment: ReceiptVatTreatment;
    paymentType: PaymentType | null;
    paymentMethod: PaymentMethod | null;
    paymentDate: Date | null;
    productLineItemId: string | null;
  };
  language: ReceiptLanguage;
  productLabels: Map<string, string>;
}): ReceiptLineViewModel {
  const { line, language, productLabels } = input;
  const isPayment = line.lineType === "PAYMENT_RECEIVED";
  const lineTotal = isPayment
    ? new Decimal(line.unitPrice.toString()).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    : computeReceiptLineTotal({
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
      });
  const paymentTypeLabelValue = line.paymentType ? paymentTypeLabel(line.paymentType, language) : null;
  const paymentMethodLabelValue = line.paymentMethod ? paymentMethodLabel(line.paymentMethod, language) : null;
  const paymentDateLabel = line.paymentDate ? formatDateForReceipt(line.paymentDate, language) : null;
  const productLineLabel = line.productLineItemId
    ? (productLabels.get(line.productLineItemId) ?? null)
    : null;
  const paymentMetaParts = [paymentTypeLabelValue, paymentMethodLabelValue, paymentDateLabel]
    .filter(Boolean) as string[];
  if (productLineLabel) {
    paymentMetaParts.push(language === "EN" ? `For: ${productLineLabel}` : `Su: ${productLineLabel}`);
  }

  return {
    id: line.id,
    clientKey: line.id,
    lineType: line.lineType,
    lineTypeLabel: line.lineType === "PRODUCT"
      ? (language === "EN" ? "Product/service" : "Prodotto/servizio")
      : (language === "EN" ? "Payment received" : "Pagamento ricevuto"),
    description: line.description,
    quantity: normalizeQuantity(line.quantity.toString()).toFixed(2),
    unitPrice: line.unitPrice.toString(),
    lineTotal: lineTotal.toFixed(2),
    unitPriceLabel: formatReceiptMoney(line.unitPrice.toString(), language),
    lineTotalLabel: formatReceiptMoney(lineTotal, language),
    vatTreatment: line.vatTreatment,
    vatLabel: isPayment ? "-" : vatLabel(line.vatTreatment, language),
    paymentType: line.paymentType,
    paymentTypeLabel: paymentTypeLabelValue,
    paymentMethod: line.paymentMethod,
    paymentMethodLabel: paymentMethodLabelValue,
    paymentDate: line.paymentDate ? isoDayLocal(line.paymentDate) : null,
    paymentDateLabel,
    productLineItemId: line.productLineItemId,
    productLineLabel,
    paymentMetaLabel: paymentMetaParts.length > 0 ? paymentMetaParts.join(" · ") : null,
  };
}

function legacyPaymentLines(
  summary: ManualReceiptPaymentSummary,
  language: ReceiptLanguage,
  receiptIssueDate: Date,
): ReceiptLineViewModel[] {
  const rows: Array<{ type: PaymentType; amount: string }> = [
    { type: "DEPOSIT", amount: summary.depositPaid },
    { type: "BALANCE", amount: summary.balancePaid },
    { type: "FULL", amount: summary.fullPaid },
  ];
  return rows
    .filter((row) => new Decimal(row.amount).gt(0))
    .map((row) => {
      const label = paymentTypeLabel(row.type, language);
      const amount = new Decimal(row.amount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      return {
        id: `legacy-${row.type.toLowerCase()}`,
        clientKey: `legacy-${row.type.toLowerCase()}`,
        lineType: "PAYMENT_RECEIVED",
        lineTypeLabel: language === "EN" ? "Payment received" : "Pagamento ricevuto",
        description: language === "EN" ? `${label} received` : `${label} ricevuto`,
        quantity: "1.00",
        unitPrice: amount.toFixed(2),
        lineTotal: amount.toFixed(2),
        unitPriceLabel: formatReceiptMoney(amount, language),
        lineTotalLabel: formatReceiptMoney(amount, language),
        vatTreatment: "VAT_INCLUDED",
        vatLabel: "-",
        paymentType: row.type,
        paymentTypeLabel: label,
        paymentMethod: "CASH",
        paymentMethodLabel: paymentMethodLabel("CASH", language),
        paymentDate: isoDayLocal(receiptIssueDate),
        paymentDateLabel: formatDateForReceipt(receiptIssueDate, language),
        productLineItemId: null,
        productLineLabel: null,
        paymentMetaLabel: [label, paymentMethodLabel("CASH", language), formatDateForReceipt(receiptIssueDate, language)].join(" · "),
        isLegacySynthetic: true,
      } satisfies ReceiptLineViewModel;
    });
}

function buildLinePaymentSummary(input: {
  lineItems: ReceiptLineViewModel[];
  language: ReceiptLanguage;
  receiptCreatedAt: Date;
}): ReceiptPaymentSummaryViewModel {
  const productTotal = input.lineItems
    .filter((line) => line.lineType === "PRODUCT")
    .reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const paymentLines = input.lineItems.filter((line) => line.lineType === "PAYMENT_RECEIVED");
  const depositPaid = sumLinePayments(paymentLines, "DEPOSIT");
  const balancePaid = sumLinePayments(paymentLines, "BALANCE");
  const fullPaid = sumLinePayments(paymentLines, "FULL");
  const totalPaid = depositPaid.plus(balancePaid).plus(fullPaid).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const remainingBalance = Decimal.max(productTotal.minus(totalPaid), new Decimal(0)).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP,
  );

  const labels = PAYMENT_SUMMARY_LABELS[input.language];
  const summary = {
    totalTitle: labels.productTotal,
    sectionTitle: input.language === "EN" ? "Payments summary" : "Riepilogo pagamenti",
    includedPaymentsTitle: labels.totalPaid,
    bookingTotal: productTotal.toFixed(2),
    bookingTotalLabel: formatReceiptMoney(productTotal, input.language),
    depositPaid: depositPaid.toFixed(2),
    depositPaidLabel: formatReceiptMoney(depositPaid, input.language),
    balancePaid: balancePaid.toFixed(2),
    balancePaidLabel: formatReceiptMoney(balancePaid, input.language),
    fullPaid: fullPaid.toFixed(2),
    fullPaidLabel: formatReceiptMoney(fullPaid, input.language),
    totalPaid: totalPaid.toFixed(2),
    totalPaidLabel: formatReceiptMoney(totalPaid, input.language),
    includedPayments: totalPaid.toFixed(2),
    includedPaymentsLabel: formatReceiptMoney(totalPaid, input.language),
    remainingBalance: remainingBalance.toFixed(2),
    remainingBalanceLabel: formatReceiptMoney(remainingBalance, input.language),
    snapshotAtLabel: formatDateForReceipt(input.receiptCreatedAt, input.language),
    rows: [] as ReceiptPaymentSummaryRowViewModel[],
  };

  summary.rows = [
    { label: labels.productTotal, value: summary.bookingTotalLabel, emphasis: true },
    { label: labels.depositPaid, value: summary.depositPaidLabel, emphasis: false },
    { label: labels.balancePaid, value: summary.balancePaidLabel, emphasis: false },
    ...(fullPaid.gt(0)
      ? [{ label: labels.fullPaid, value: summary.fullPaidLabel, emphasis: false }]
      : []),
    { label: labels.totalPaid, value: summary.totalPaidLabel, emphasis: true },
    { label: labels.remainingBalance, value: summary.remainingBalanceLabel, emphasis: true },
  ];

  return summary;
}

function sumLinePayments(lines: ReceiptLineViewModel[], type: PaymentType): Decimal {
  return lines
    .filter((line) => line.paymentType === type)
    .reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function formatReceiptMoney(amount: Parameters<typeof formatEur>[0], language: ReceiptLanguage) {
  return formatEur(amount, language === "EN" ? "en" : "it");
}

function vatLabel(vatTreatment: ReceiptVatTreatment, language: ReceiptLanguage): string {
  if (vatTreatment === "VAT_EXEMPT") {
    return language === "EN" ? "VAT exempt" : "IVA esente";
  }
  return language === "EN" ? "VAT included" : "IVA inclusa";
}

function paymentTypeLabel(type: PaymentType, language: ReceiptLanguage): string {
  return PAYMENT_TYPE_LABELS[language][type];
}

function paymentMethodLabel(method: PaymentMethod, language: ReceiptLanguage): string {
  return PAYMENT_METHOD_LABELS[language][method];
}

function isoDayLocal(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
