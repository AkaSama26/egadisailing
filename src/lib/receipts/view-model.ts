import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { formatItDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import type {
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ReceiptLanguage,
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
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  vatTreatment: ReceiptVatTreatment;
  vatLabel: string;
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
    bookingTotal: "Totale prenotazione",
    documentTotal: "Totale documento",
    depositPaid: "Acconto registrato",
    balancePaid: "Saldo registrato",
    fullPaid: "Pagamento intero registrato",
    totalPaid: "Totale pagato alla data documento",
    includedPayments: "Pagamenti inclusi in questa ricevuta",
    includedPaymentsCustom: "Totale pagato indicato in questa ricevuta",
    remainingBalance: "Residuo da pagare",
  },
  EN: {
    bookingTotal: "Booking total",
    documentTotal: "Document total",
    depositPaid: "Registered deposit",
    balancePaid: "Registered balance",
    fullPaid: "Registered full payment",
    totalPaid: "Total paid at document date",
    includedPayments: "Payments included in this receipt",
    includedPaymentsCustom: "Total paid stated in this receipt",
    remainingBalance: "Balance outstanding",
  },
} satisfies Record<ReceiptLanguage, Record<string, string>>;

type PaymentForSummary = {
  amount: { toString(): string };
  currency: string;
  type: PaymentType;
  status: PaymentStatus;
  processedAt: Date | null;
  createdAt: Date;
};

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
          totalPrice: true,
          service: { select: { name: true } },
          payments: {
            where: {
              status: "SUCCEEDED",
              type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
            },
            orderBy: { createdAt: "asc" },
          },
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
  const paymentSummary = receipt.booking
    ? buildPaymentSummary({
        bookingTotal: receipt.booking.totalPrice.toString(),
        currency: receipt.currency,
        language: receipt.language,
        receiptCreatedAt: receipt.createdAt,
        bookingPayments: receipt.booking.payments,
        linkedPayments: receipt.payments.map(({ payment }) => payment),
      })
    : parsedNote.manualPaymentSummary
      ? buildManualPaymentSummary({
          documentTotal: receipt.totalAmount.toString(),
          language: receipt.language,
          receiptCreatedAt: receipt.createdAt,
          manualPaymentSummary: parsedNote.manualPaymentSummary,
        })
      : null;

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
    lineItems: receipt.lineItems.map((line) => {
      const lineTotal = computeReceiptLineTotal({
        quantity: line.quantity.toString(),
        unitPrice: line.unitPrice.toString(),
      });
      return {
        id: line.id,
        description: line.description,
        quantity: normalizeQuantity(line.quantity.toString()).toFixed(2),
        unitPrice: line.unitPrice.toString(),
        lineTotal: lineTotal.toFixed(2),
        unitPriceLabel: formatReceiptMoney(line.unitPrice.toString(), receipt.language),
        lineTotalLabel: formatReceiptMoney(lineTotal, receipt.language),
        vatTreatment: line.vatTreatment,
        vatLabel: vatLabel(line.vatTreatment, receipt.language),
      };
    }),
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

function buildPaymentSummary(input: {
  bookingTotal: string;
  currency: string;
  language: ReceiptLanguage;
  receiptCreatedAt: Date;
  bookingPayments: PaymentForSummary[];
  linkedPayments: PaymentForSummary[];
}): ReceiptPaymentSummaryViewModel {
  const snapshotPayments = input.bookingPayments.filter(
    (payment) =>
      payment.currency === input.currency &&
      payment.status === "SUCCEEDED" &&
      payment.type !== "REFUND" &&
      paymentReferenceDate(payment).getTime() <= input.receiptCreatedAt.getTime(),
  );
  const linkedPayments = input.linkedPayments.filter(
    (payment) =>
      payment.currency === input.currency &&
      payment.status === "SUCCEEDED" &&
      payment.type !== "REFUND",
  );

  const bookingTotal = new Decimal(input.bookingTotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const depositPaid = sumPayments(snapshotPayments, "DEPOSIT");
  const balancePaid = sumPayments(snapshotPayments, "BALANCE");
  const fullPaid = sumPayments(snapshotPayments, "FULL");
  const totalPaid = depositPaid.plus(balancePaid).plus(fullPaid).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const includedPayments = sumPayments(linkedPayments).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const remainingBalance = Decimal.max(bookingTotal.minus(totalPaid), new Decimal(0)).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP,
  );

  const labels = PAYMENT_SUMMARY_LABELS[input.language];
  const summary = {
    totalTitle: labels.bookingTotal,
    sectionTitle: input.language === "EN" ? "Deposit and balance" : "Acconto e saldo",
    includedPaymentsTitle: labels.includedPayments,
    bookingTotal: bookingTotal.toFixed(2),
    bookingTotalLabel: formatReceiptMoney(bookingTotal, input.language),
    depositPaid: depositPaid.toFixed(2),
    depositPaidLabel: formatReceiptMoney(depositPaid, input.language),
    balancePaid: balancePaid.toFixed(2),
    balancePaidLabel: formatReceiptMoney(balancePaid, input.language),
    fullPaid: fullPaid.toFixed(2),
    fullPaidLabel: formatReceiptMoney(fullPaid, input.language),
    totalPaid: totalPaid.toFixed(2),
    totalPaidLabel: formatReceiptMoney(totalPaid, input.language),
    includedPayments: includedPayments.toFixed(2),
    includedPaymentsLabel: formatReceiptMoney(includedPayments, input.language),
    remainingBalance: remainingBalance.toFixed(2),
    remainingBalanceLabel: formatReceiptMoney(remainingBalance, input.language),
    snapshotAtLabel: formatDateForReceipt(input.receiptCreatedAt, input.language),
    rows: [] as ReceiptPaymentSummaryRowViewModel[],
  };

  summary.rows = [
    { label: labels.bookingTotal, value: summary.bookingTotalLabel, emphasis: true },
    { label: labels.depositPaid, value: summary.depositPaidLabel, emphasis: false },
    { label: labels.balancePaid, value: summary.balancePaidLabel, emphasis: false },
    ...(fullPaid.gt(0)
      ? [{ label: labels.fullPaid, value: summary.fullPaidLabel, emphasis: false }]
      : []),
    { label: labels.totalPaid, value: summary.totalPaidLabel, emphasis: true },
    { label: labels.includedPayments, value: summary.includedPaymentsLabel, emphasis: false },
    { label: labels.remainingBalance, value: summary.remainingBalanceLabel, emphasis: true },
  ];

  return summary;
}


function buildManualPaymentSummary(input: {
  documentTotal: string;
  language: ReceiptLanguage;
  receiptCreatedAt: Date;
  manualPaymentSummary: ManualReceiptPaymentSummary;
}): ReceiptPaymentSummaryViewModel {
  const labels = PAYMENT_SUMMARY_LABELS[input.language];
  const documentTotal = new Decimal(input.documentTotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const depositPaid = new Decimal(input.manualPaymentSummary.depositPaid).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const balancePaid = new Decimal(input.manualPaymentSummary.balancePaid).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const fullPaid = new Decimal(input.manualPaymentSummary.fullPaid).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const totalPaid = manualReceiptPaymentSummaryTotal(input.manualPaymentSummary);
  const remainingBalance = Decimal.max(documentTotal.minus(totalPaid), new Decimal(0)).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP,
  );

  const summary = {
    totalTitle: labels.documentTotal,
    sectionTitle: input.language === "EN" ? "Deposit and balance" : "Acconto e saldo",
    includedPaymentsTitle: labels.includedPaymentsCustom,
    bookingTotal: documentTotal.toFixed(2),
    bookingTotalLabel: formatReceiptMoney(documentTotal, input.language),
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
    { label: labels.documentTotal, value: summary.bookingTotalLabel, emphasis: true },
    { label: labels.depositPaid, value: summary.depositPaidLabel, emphasis: false },
    { label: labels.balancePaid, value: summary.balancePaidLabel, emphasis: false },
    ...(fullPaid.gt(0)
      ? [{ label: labels.fullPaid, value: summary.fullPaidLabel, emphasis: false }]
      : []),
    { label: labels.includedPaymentsCustom, value: summary.includedPaymentsLabel, emphasis: true },
    { label: labels.remainingBalance, value: summary.remainingBalanceLabel, emphasis: true },
  ];

  return summary;
}

function sumPayments(payments: PaymentForSummary[], type?: PaymentType): Decimal {
  return payments
    .filter((payment) => !type || payment.type === type)
    .reduce((sum, payment) => sum.plus(payment.amount.toString()), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function paymentReferenceDate(payment: PaymentForSummary): Date {
  return payment.processedAt ?? payment.createdAt;
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
