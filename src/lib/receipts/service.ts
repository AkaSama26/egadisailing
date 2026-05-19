import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isoDay, parseIsoDay } from "@/lib/dates";
import { Prisma } from "@/generated/prisma/client";
import {
  ReceiptLanguage,
  ReceiptOrigin,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";
import { RECEIPT_CURRENCY } from "./constants";
import { computeReceiptTotal, normalizeMoney, normalizeQuantity } from "./calculations";
import {
  manualReceiptPaymentSummaryTotal,
  normalizeManualReceiptPaymentSummary,
  serializeReceiptNoteWithManualPaymentSummary,
} from "./custom-summary";
import { formatReceiptNumber } from "./numbering";
import type { CustomReceiptInput, PaymentReceiptInput, UpdateReceiptInput } from "./schemas";
import { formatDateForReceipt } from "./view-model";

type ReceiptTx = Prisma.TransactionClient;

export async function createCustomReceipt(input: CustomReceiptInput, userId: string) {
  const issueDate = parseIsoDay(input.issueDate);
  const normalizedLines = input.lineItems.map((line, index) => ({
    description: line.description.trim(),
    quantity: normalizeQuantity(line.quantity),
    unitPrice: normalizeMoney(line.unitPrice),
    vatTreatment: line.vatTreatment,
    sortOrder: index,
  }));
  const totalAmount = computeReceiptTotal(normalizedLines);
  assertManualPaymentSummaryWithinTotal(input.manualPaymentSummary, totalAmount);
  const note = serializeReceiptNoteWithManualPaymentSummary(input.note, input.manualPaymentSummary);

  const receipt = await db.$transaction(async (tx) => {
    const number = await nextReceiptNumber(tx, issueDate.getUTCFullYear());
    return tx.receipt.create({
      data: {
        number,
        year: issueDate.getUTCFullYear(),
        sequence: parseReceiptSequence(number),
        origin: ReceiptOrigin.CUSTOM,
        language: input.language,
        issueDate,
        currency: RECEIPT_CURRENCY,
        recipientName: input.recipient.name.trim(),
        recipientEmail: input.recipient.email,
        recipientAddress: input.recipient.address,
        recipientTaxId: input.recipient.taxId,
        totalAmount: totalAmount.toFixed(2),
        note,
        lineItems: {
          create: normalizedLines.map((line) => ({
            description: line.description,
            quantity: line.quantity.toFixed(2),
            unitPrice: line.unitPrice.toFixed(2),
            vatTreatment: line.vatTreatment,
            sortOrder: line.sortOrder,
          })),
        },
      },
      include: { lineItems: true, payments: true },
    });
  });

  await auditReceipt(AUDIT_ACTIONS.RECEIPT_CREATE, receipt.id, userId, {
    number: receipt.number,
    origin: receipt.origin,
    totalAmount: receipt.totalAmount.toString(),
    status: receipt.status,
    lineCount: receipt.lineItems.length,
    paymentCount: receipt.payments.length,
  });

  return receipt;
}

export async function createReceiptFromPayments(input: PaymentReceiptInput, userId: string) {
  const issueDate = input.issueDate ? parseIsoDay(input.issueDate) : parseIsoDay(isoDay(new Date()));
  const uniquePaymentIds = Array.from(new Set(input.paymentIds));
  if (uniquePaymentIds.length === 0) {
    throw new ValidationError("Seleziona almeno un pagamento");
  }
  if (uniquePaymentIds.length !== input.paymentIds.length) {
    throw new ValidationError("Lo stesso pagamento e' stato selezionato piu' volte");
  }

  const receipt = await db.$transaction(async (tx) => {
    const payments = await loadPaymentsForReceipt(tx, uniquePaymentIds);

    if (payments.length !== uniquePaymentIds.length) {
      throw new NotFoundError("Payment", uniquePaymentIds.find((id) => !payments.some((p) => p.id === id)) ?? "unknown");
    }

    const bookingId = payments[0]?.bookingId;
    const currency = payments[0]?.currency;
    for (const payment of payments) {
      if (payment.bookingId !== bookingId) {
        throw new ValidationError("I pagamenti devono appartenere alla stessa prenotazione");
      }
      if (payment.currency !== currency || payment.currency !== RECEIPT_CURRENCY) {
        throw new ValidationError("In v1 le ricevute supportano solo pagamenti in EUR della stessa valuta");
      }
      if (payment.status !== "SUCCEEDED") {
        throw new ValidationError("Si possono collegare solo pagamenti completati");
      }
      if (payment.type === "REFUND") {
        throw new ValidationError("I rimborsi non possono generare ricevute");
      }
      if (payment.receiptLink) {
        throw new ConflictError("Uno dei pagamenti selezionati ha gia' una ricevuta");
      }
    }

    const booking = payments[0].booking;
    const customer = booking.customer;
    const recipient = {
      name:
        input.recipient?.name?.trim() ||
        `${customer.firstName} ${customer.lastName}`.trim() ||
        customer.email,
      email: input.recipient?.email ?? customer.email,
      address: input.recipient?.address,
      taxId: input.recipient?.taxId,
    };
    const lines = [
      {
        description: bookingReceiptLineDescription({
          language: input.language,
          bookingCode: booking.confirmationCode,
          serviceName: booking.service.name,
          startDate: booking.startDate,
          endDate: booking.endDate,
        }),
        quantity: normalizeQuantity("1"),
        unitPrice: normalizeMoney(booking.totalPrice.toString()),
        vatTreatment: ReceiptVatTreatment.VAT_INCLUDED,
        sortOrder: 0,
      },
    ];
    const totalAmount = normalizeMoney(booking.totalPrice.toString());
    const number = await nextReceiptNumber(tx, issueDate.getUTCFullYear());

    return tx.receipt.create({
      data: {
        number,
        year: issueDate.getUTCFullYear(),
        sequence: parseReceiptSequence(number),
        origin: ReceiptOrigin.PAYMENT,
        language: input.language,
        issueDate,
        currency: RECEIPT_CURRENCY,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientAddress: recipient.address,
        recipientTaxId: recipient.taxId,
        bookingId: booking.id,
        customerId: customer.id,
        totalAmount: totalAmount.toFixed(2),
        note: input.note,
        lineItems: {
          create: lines.map((line) => ({
            description: line.description,
            quantity: line.quantity.toFixed(2),
            unitPrice: line.unitPrice.toFixed(2),
            vatTreatment: line.vatTreatment,
            sortOrder: line.sortOrder,
          })),
        },
        payments: {
          create: payments.map((payment) => ({ paymentId: payment.id })),
        },
      },
      include: { lineItems: true, payments: true },
    });
  }).catch((err: unknown) => {
    if (isPrismaUniqueConstraint(err)) {
      throw new ConflictError("Uno dei pagamenti selezionati ha gia' una ricevuta");
    }
    throw err;
  });

  await auditReceipt(AUDIT_ACTIONS.RECEIPT_CREATE, receipt.id, userId, {
    number: receipt.number,
    origin: receipt.origin,
    totalAmount: receipt.totalAmount.toString(),
    status: receipt.status,
    lineCount: receipt.lineItems.length,
    paymentCount: receipt.payments.length,
  });

  return receipt;
}

export async function updateReceipt(input: UpdateReceiptInput, userId: string) {
  const issueDate = parseIsoDay(input.issueDate);

  const receipt = await db.$transaction(async (tx) => {
    const existing = await loadReceiptForUpdate(tx, input.receiptId);
    if (existing.status !== "ACTIVE") {
      throw new ConflictError("Le ricevute annullate non possono essere modificate");
    }

    if (existing.origin === ReceiptOrigin.CUSTOM) {
      const normalizedLines = input.lineItems.map((line, index) => ({
        description: line.description.trim(),
        quantity: normalizeQuantity(line.quantity),
        unitPrice: normalizeMoney(line.unitPrice),
        vatTreatment: line.vatTreatment,
        sortOrder: index,
      }));
      const totalAmount = computeReceiptTotal(normalizedLines);
      assertManualPaymentSummaryWithinTotal(input.manualPaymentSummary, totalAmount);
      const note = serializeReceiptNoteWithManualPaymentSummary(input.note, input.manualPaymentSummary);

      await tx.receiptLineItem.deleteMany({ where: { receiptId: existing.id } });
      return tx.receipt.update({
        where: { id: existing.id },
        data: {
          language: input.language,
          issueDate,
          recipientName: input.recipient.name.trim(),
          recipientEmail: input.recipient.email,
          recipientAddress: input.recipient.address,
          recipientTaxId: input.recipient.taxId,
          totalAmount: totalAmount.toFixed(2),
          note,
          lineItems: {
            create: normalizedLines.map((line) => ({
              description: line.description,
              quantity: line.quantity.toFixed(2),
              unitPrice: line.unitPrice.toFixed(2),
              vatTreatment: line.vatTreatment,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: { lineItems: true, payments: true },
      });
    }

    const currentLineIds = new Set(existing.lineItems.map((line) => line.id));
    if (input.lineItems.length !== existing.lineItems.length) {
      throw new ValidationError("Le ricevute collegate a pagamenti non possono cambiare numero righe");
    }
    const inputLineIds = new Set(input.lineItems.map((line) => line.id));
    if (
      inputLineIds.size !== existing.lineItems.length ||
      existing.lineItems.some((line) => !inputLineIds.has(line.id))
    ) {
      throw new ValidationError("Righe ricevuta non valide");
    }
    for (const line of input.lineItems) {
      if (!line.id || !currentLineIds.has(line.id)) {
        throw new ValidationError("Riga ricevuta non valida");
      }
      await tx.receiptLineItem.update({
        where: { id: line.id },
        data: {
          description: line.description.trim(),
          vatTreatment: line.vatTreatment,
        },
      });
    }

    return tx.receipt.update({
      where: { id: existing.id },
      data: {
        language: input.language,
        issueDate,
        recipientName: input.recipient.name.trim(),
        recipientEmail: input.recipient.email,
        recipientAddress: input.recipient.address,
        recipientTaxId: input.recipient.taxId,
        note: input.note,
      },
      include: { lineItems: true, payments: true },
    });
  });

  await auditReceipt(AUDIT_ACTIONS.RECEIPT_UPDATE, receipt.id, userId, {
    number: receipt.number,
    origin: receipt.origin,
    totalAmount: receipt.totalAmount.toString(),
    status: receipt.status,
    lineCount: receipt.lineItems.length,
    paymentCount: receipt.payments.length,
  });

  return receipt;
}

export async function cancelReceipt(receiptId: string, userId: string) {
  const result = await db.$transaction(async (tx) => {
    const existing = await loadReceiptForUpdate(tx, receiptId);
    if (existing.status === "CANCELLED") {
      return { receipt: existing, didCancel: false };
    }

    const receipt = await tx.receipt.update({
      where: { id: receiptId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledByUserId: userId,
      },
      include: { lineItems: true, payments: true },
    });
    return { receipt, didCancel: true };
  });

  if (result.didCancel) {
    await auditReceipt(AUDIT_ACTIONS.RECEIPT_CANCEL, result.receipt.id, userId, {
      number: result.receipt.number,
      origin: result.receipt.origin,
      totalAmount: result.receipt.totalAmount.toString(),
      status: result.receipt.status,
      lineCount: result.receipt.lineItems.length,
      paymentCount: result.receipt.payments.length,
    });
  }

  return result.receipt;
}

async function nextReceiptNumber(tx: ReceiptTx, year: number): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ lastSequence: number }>>(Prisma.sql`
    INSERT INTO "ReceiptSequence" ("year", "lastSequence", "updatedAt")
    VALUES (${year}, 1, NOW())
    ON CONFLICT ("year") DO UPDATE
      SET "lastSequence" = "ReceiptSequence"."lastSequence" + 1,
          "updatedAt" = NOW()
    RETURNING "lastSequence"
  `);
  const sequence = rows[0]?.lastSequence;
  if (!sequence) {
    throw new Error("Receipt sequence generation failed");
  }
  return formatReceiptNumber(year, sequence);
}

function parseReceiptSequence(number: string): number {
  const raw = number.split("-").at(-1);
  const sequence = raw ? Number(raw) : NaN;
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid receipt number: ${number}`);
  }
  return sequence;
}

function bookingReceiptLineDescription(input: {
  language: ReceiptLanguage;
  bookingCode: string;
  serviceName: string;
  startDate: Date;
  endDate: Date;
}): string {
  const start = formatDateForReceipt(input.startDate, input.language);
  const end = formatDateForReceipt(input.endDate, input.language);
  const dateRange = start === end ? start : `${start} / ${end}`;
  if (input.language === "EN") {
    return `${input.serviceName} - booking ${input.bookingCode} - service date ${dateRange}`;
  }
  return `${input.serviceName} - prenotazione ${input.bookingCode} - giornata ${dateRange}`;
}

function assertManualPaymentSummaryWithinTotal(
  input: { depositPaid?: string; balancePaid?: string; fullPaid?: string } | undefined,
  totalAmount: { toString(): string },
) {
  const summary = normalizeManualReceiptPaymentSummary(input);
  const totalPaid = manualReceiptPaymentSummaryTotal(summary);
  const receiptTotal = normalizeMoney(totalAmount.toString());
  if (totalPaid.gt(receiptTotal)) {
    throw new ValidationError(
      `Acconto/saldo eccedono il totale documento: pagato ${totalPaid.toFixed(2)} su ${receiptTotal.toFixed(2)}`,
    );
  }
}

async function auditReceipt(
  action: string,
  receiptId: string,
  userId: string,
  metadata: {
    number: string;
    origin: ReceiptOrigin;
    totalAmount: string;
    status: string;
    lineCount: number;
    paymentCount: number;
  },
): Promise<void> {
  await auditLog({
    userId,
    action,
    entity: "Receipt",
    entityId: receiptId,
    after: metadata,
  });
}

function isPrismaUniqueConstraint(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

async function loadReceiptForUpdate(tx: ReceiptTx, receiptId: string) {
  const lockedRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "Receipt"
    WHERE "id" = ${receiptId}
    FOR UPDATE
  `);
  if (lockedRows.length === 0) {
    throw new NotFoundError("Receipt", receiptId);
  }

  const receipt = await tx.receipt.findUnique({
    where: { id: receiptId },
    include: { lineItems: { orderBy: { sortOrder: "asc" } }, payments: true },
  });
  if (!receipt) throw new NotFoundError("Receipt", receiptId);
  return receipt;
}

async function loadPaymentsForReceipt(tx: ReceiptTx, paymentIds: string[]) {
  await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "Payment"
    WHERE "id" IN (${Prisma.join(paymentIds)})
    ORDER BY "id"
    FOR UPDATE
  `);

  return tx.payment.findMany({
    where: { id: { in: paymentIds } },
    include: {
      receiptLink: true,
      booking: {
        include: {
          customer: true,
          service: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
