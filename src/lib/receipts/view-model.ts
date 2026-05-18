import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { formatItDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import type {
  PaymentMethod,
  PaymentType,
  ReceiptLanguage,
  ReceiptOrigin,
  ReceiptStatus,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";
import { computeReceiptLineTotal, normalizeQuantity } from "./calculations";
import { receiptDisclaimer } from "./constants";

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
  method: PaymentMethod;
  processedAtLabel: string | null;
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
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

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
    note: receipt.note,
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
      method: payment.method,
      processedAtLabel: payment.processedAt
        ? formatDateForReceipt(payment.processedAt, receipt.language)
        : null,
    })),
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

function formatReceiptMoney(amount: Parameters<typeof formatEur>[0], language: ReceiptLanguage) {
  return formatEur(amount, language === "EN" ? "en" : "it");
}

function vatLabel(vatTreatment: ReceiptVatTreatment, language: ReceiptLanguage): string {
  if (vatTreatment === "VAT_EXEMPT") {
    return language === "EN" ? "VAT exempt" : "IVA esente";
  }
  return language === "EN" ? "VAT included" : "IVA inclusa";
}

