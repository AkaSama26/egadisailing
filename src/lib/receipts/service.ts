import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isoDay, parseIsoDay } from "@/lib/dates";
import { Prisma } from "@/generated/prisma/client";
import {
  PaymentMethod,
  PaymentType,
  ReceiptLanguage,
  ReceiptLineType,
  ReceiptOrigin,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";
import { RECEIPT_CURRENCY } from "./constants";
import { computeReceiptLineTotal, normalizeMoney, normalizeQuantity } from "./calculations";
import { parseReceiptNoteWithManualPaymentSummary } from "./custom-summary";
import { formatReceiptNumber } from "./numbering";
import type { CustomReceiptInput, PaymentReceiptInput, UpdateReceiptInput } from "./schemas";
import { formatDateForReceipt } from "./view-model";

type ReceiptTx = Prisma.TransactionClient;
type ReceiptInputLine = CustomReceiptInput["lineItems"][number] | UpdateReceiptInput["lineItems"][number];

type NormalizedReceiptLine = {
  id?: string;
  clientKey: string;
  lineType: ReceiptLineType;
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  vatTreatment: ReceiptVatTreatment;
  paymentType: PaymentType | null;
  paymentMethod: PaymentMethod | null;
  paymentDate: Date | null;
  productLineKey: string | null;
  sortOrder: number;
};

export async function createCustomReceipt(input: CustomReceiptInput, userId: string) {
  const issueDate = parseIsoDay(input.issueDate);
  const normalizedLines = normalizeReceiptLines(input.lineItems);
  const { productTotal } = summarizeReceiptLines(normalizedLines);
  const note = cleanReceiptNote(input.note);

  const receipt = await db.$transaction(async (tx) => {
    const number = await nextReceiptNumber(tx, issueDate.getUTCFullYear());
    const created = await tx.receipt.create({
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
        totalAmount: productTotal.toFixed(2),
        note,
      },
      include: { lineItems: true, payments: true },
    });
    await createReceiptLineItems(tx, created.id, normalizedLines);
    return tx.receipt.findUniqueOrThrow({
      where: { id: created.id },
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
    const productKey = "booking-product";
    const lines = normalizeReceiptLines([
      {
        clientKey: productKey,
        lineType: ReceiptLineType.PRODUCT,
        description: bookingReceiptLineDescription({
          language: input.language,
          bookingCode: booking.confirmationCode,
          serviceName: booking.service.name,
          startDate: booking.startDate,
          endDate: booking.endDate,
        }),
        quantity: "1",
        unitPrice: booking.totalPrice.toString(),
        vatTreatment: ReceiptVatTreatment.VAT_INCLUDED,
      },
      ...payments.map((payment) => ({
        clientKey: `payment-${payment.id}`,
        lineType: ReceiptLineType.PAYMENT_RECEIVED,
        description: paymentLineDescription(payment.type, input.language),
        quantity: "1",
        unitPrice: payment.amount.toString(),
        vatTreatment: ReceiptVatTreatment.VAT_INCLUDED,
        paymentType: payment.type,
        paymentMethod: payment.method,
        paymentDate: isoDay(payment.processedAt ?? payment.createdAt),
        productLineKey: productKey,
      })),
    ]);
    const { productTotal } = summarizeReceiptLines(lines);
    const number = await nextReceiptNumber(tx, issueDate.getUTCFullYear());

    const created = await tx.receipt.create({
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
        totalAmount: productTotal.toFixed(2),
        note: input.note,
        payments: {
          create: payments.map((payment) => ({ paymentId: payment.id })),
        },
      },
      include: { lineItems: true, payments: true },
    });
    await createReceiptLineItems(tx, created.id, lines);
    return tx.receipt.findUniqueOrThrow({
      where: { id: created.id },
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
      const normalizedLines = normalizeReceiptLines(input.lineItems);
      const { productTotal } = summarizeReceiptLines(normalizedLines);
      const note = cleanReceiptNote(input.note);

      await tx.receiptLineItem.deleteMany({ where: { receiptId: existing.id } });
      const updated = await tx.receipt.update({
        where: { id: existing.id },
        data: {
          language: input.language,
          issueDate,
          recipientName: input.recipient.name.trim(),
          recipientEmail: input.recipient.email,
          recipientAddress: input.recipient.address,
          recipientTaxId: input.recipient.taxId,
          totalAmount: productTotal.toFixed(2),
          note,
        },
        include: { lineItems: true, payments: true },
      });
      await createReceiptLineItems(tx, updated.id, normalizedLines);
      return tx.receipt.findUniqueOrThrow({
        where: { id: updated.id },
        include: { lineItems: true, payments: true },
      });
    }

    assertPaymentReceiptUpdate(existing.lineItems, input.lineItems);
    for (const line of input.lineItems) {
      const existingLine = existing.lineItems.find((item) => item.id === line.id);
      if (!existingLine || existingLine.lineType !== ReceiptLineType.PRODUCT) continue;
      await tx.receiptLineItem.update({
        where: { id: existingLine.id },
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
        note: cleanReceiptNote(input.note),
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

function normalizeReceiptLines(lines: ReceiptInputLine[]): NormalizedReceiptLine[] {
  const normalized = lines.map((line, index) => {
    const lineType = line.lineType ?? ReceiptLineType.PRODUCT;
    const base = {
      id: line.id,
      clientKey: line.clientKey || line.id || `line-${index}`,
      lineType,
      description: line.description.trim(),
      quantity: lineType === ReceiptLineType.PAYMENT_RECEIVED ? normalizeQuantity("1") : normalizeQuantity(line.quantity),
      unitPrice: normalizeMoney(line.unitPrice),
      vatTreatment: line.vatTreatment,
      paymentType: null as PaymentType | null,
      paymentMethod: null as PaymentMethod | null,
      paymentDate: null as Date | null,
      productLineKey: null as string | null,
      sortOrder: index,
    };

    if (lineType === ReceiptLineType.PRODUCT) {
      return base;
    }

    if (!line.paymentType || line.paymentType === PaymentType.REFUND) {
      throw new ValidationError("Le righe pagamento richiedono tipo pagamento valido");
    }
    if (!line.paymentMethod) {
      throw new ValidationError("Le righe pagamento richiedono metodo pagamento");
    }
    if (base.unitPrice.lte(0)) {
      throw new ValidationError("Le righe pagamento devono avere importo positivo");
    }

    return {
      ...base,
      vatTreatment: ReceiptVatTreatment.VAT_INCLUDED,
      paymentType: line.paymentType,
      paymentMethod: line.paymentMethod,
      paymentDate: line.paymentDate ? parseIsoDay(line.paymentDate) : null,
      productLineKey: line.productLineKey || null,
    };
  });

  summarizeReceiptLines(normalized);
  return normalized;
}

function summarizeReceiptLines(lines: NormalizedReceiptLine[]) {
  const productKeys = new Set(
    lines
      .filter((line) => line.lineType === ReceiptLineType.PRODUCT)
      .map((line) => line.clientKey),
  );
  if (productKeys.size === 0) {
    throw new ValidationError("La ricevuta deve avere almeno una riga prodotto/servizio");
  }

  for (const line of lines) {
    if (line.lineType === ReceiptLineType.PAYMENT_RECEIVED && line.productLineKey && !productKeys.has(line.productLineKey)) {
      throw new ValidationError("Una riga pagamento e' collegata a un prodotto non valido");
    }
  }

  const productTotal = lines
    .filter((line) => line.lineType === ReceiptLineType.PRODUCT)
    .reduce(
      (sum, line) => sum.plus(computeReceiptLineTotal({ quantity: line.quantity.toString(), unitPrice: line.unitPrice.toString() })),
      new Decimal(0),
    )
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const paymentTotal = lines
    .filter((line) => line.lineType === ReceiptLineType.PAYMENT_RECEIVED)
    .reduce((sum, line) => sum.plus(line.unitPrice), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  if (paymentTotal.gt(productTotal)) {
    throw new ValidationError(
      `Pagamenti ricevuti eccedono il totale prodotti: pagato ${paymentTotal.toFixed(2)} su ${productTotal.toFixed(2)}`,
    );
  }

  return { productTotal, paymentTotal };
}

async function createReceiptLineItems(tx: ReceiptTx, receiptId: string, lines: NormalizedReceiptLine[]) {
  const productIdByKey = new Map<string, string>();
  for (const line of lines.filter((item) => item.lineType === ReceiptLineType.PRODUCT)) {
    const created = await tx.receiptLineItem.create({
      data: {
        receiptId,
        lineType: ReceiptLineType.PRODUCT,
        description: line.description,
        quantity: line.quantity.toFixed(2),
        unitPrice: line.unitPrice.toFixed(2),
        vatTreatment: line.vatTreatment,
        sortOrder: line.sortOrder,
      },
      select: { id: true },
    });
    productIdByKey.set(line.clientKey, created.id);
  }

  for (const line of lines.filter((item) => item.lineType === ReceiptLineType.PAYMENT_RECEIVED)) {
    await tx.receiptLineItem.create({
      data: {
        receiptId,
        lineType: ReceiptLineType.PAYMENT_RECEIVED,
        description: line.description,
        quantity: "1.00",
        unitPrice: line.unitPrice.toFixed(2),
        vatTreatment: ReceiptVatTreatment.VAT_INCLUDED,
        paymentType: line.paymentType,
        paymentMethod: line.paymentMethod,
        paymentDate: line.paymentDate,
        productLineItemId: line.productLineKey ? productIdByKey.get(line.productLineKey) : null,
        sortOrder: line.sortOrder,
      },
    });
  }
}

function assertPaymentReceiptUpdate(existingLines: Array<{
  id: string;
  lineType: ReceiptLineType;
  quantity: Decimal;
  unitPrice: Decimal;
  paymentType: PaymentType | null;
  paymentMethod: PaymentMethod | null;
  paymentDate: Date | null;
  productLineItemId: string | null;
}>, inputLines: ReceiptInputLine[]) {
  if (inputLines.length !== existingLines.length) {
    throw new ValidationError("Le ricevute collegate a pagamenti non possono cambiare numero righe");
  }
  const existingById = new Map(existingLines.map((line) => [line.id, line]));
  for (const input of inputLines) {
    if (!input.id || !existingById.has(input.id)) {
      throw new ValidationError("Righe ricevuta non valide");
    }
    const existing = existingById.get(input.id)!;
    if (input.lineType !== existing.lineType) {
      throw new ValidationError("Le ricevute collegate a pagamenti non possono cambiare tipo righe");
    }
    if (existing.lineType === ReceiptLineType.PRODUCT) {
      const qty = normalizeQuantity(input.quantity);
      const unitPrice = normalizeMoney(input.unitPrice);
      if (!qty.eq(existing.quantity.toString()) || !unitPrice.eq(existing.unitPrice.toString())) {
        throw new ValidationError("Le ricevute collegate a pagamenti non possono cambiare importi");
      }
      continue;
    }

    const unitPrice = normalizeMoney(input.unitPrice);
    const paymentDate = input.paymentDate ? parseIsoDay(input.paymentDate) : null;
    if (
      input.paymentType !== existing.paymentType ||
      input.paymentMethod !== existing.paymentMethod ||
      !unitPrice.eq(existing.unitPrice.toString()) ||
      !sameOptionalDay(paymentDate, existing.paymentDate) ||
      (input.productLineKey || null) !== (existing.productLineItemId || null)
    ) {
      throw new ValidationError("Le righe pagamento collegate non possono essere modificate");
    }
  }
}

function sameOptionalDay(a: Date | null, b: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return isoDay(a) === isoDay(b);
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

function paymentLineDescription(type: PaymentType, language: ReceiptLanguage): string {
  const labels = language === "EN"
    ? { DEPOSIT: "Deposit received", BALANCE: "Balance received", FULL: "Full payment received" }
    : { DEPOSIT: "Acconto ricevuto", BALANCE: "Saldo ricevuto", FULL: "Pagamento intero ricevuto" };
  return labels[type as "DEPOSIT" | "BALANCE" | "FULL"] ?? (language === "EN" ? "Payment received" : "Pagamento ricevuto");
}

function cleanReceiptNote(note: string | null | undefined): string | null {
  return parseReceiptNoteWithManualPaymentSummary(note).note;
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
