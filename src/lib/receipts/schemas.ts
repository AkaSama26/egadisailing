import { z } from "zod";
import Decimal from "decimal.js";
import { emailSchema, freeTextSchema } from "@/lib/validation/common-zod";
import {
  ReceiptLanguage,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";
import { RECEIPT_MAX_LINE_ITEMS } from "./constants";

const decimalTextSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim().replace(",", "."))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Formato importo non valido"),
  );

const quantityTextSchema = decimalTextSchema
  .refine((value) => new Decimal(value).gt(0), "Quantità non valida")
  .refine((value) => new Decimal(value).lte("1000000"), "Quantità troppo alta");

const moneyTextSchema = decimalTextSchema
  .refine((value) => new Decimal(value).gte(0), "Importo non valido")
  .refine((value) => new Decimal(value).lte("1000000"), "Importo troppo alto");

const optionalMoneyTextSchema = z.preprocess((value) => {
  const text = String(value ?? "").trim();
  return text ? text : "0";
}, moneyTextSchema);

const noHtmlOptionalText = (max: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    const text = String(value).trim();
    return text ? text : undefined;
  }, z.string().max(max).regex(/^[^<>]*$/, "Caratteri non validi").optional());

export const receiptRecipientSchema = z.object({
  name: freeTextSchema({ min: 1, max: 160 }),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined))
    .pipe(emailSchema.optional()),
  address: noHtmlOptionalText(500),
  taxId: noHtmlOptionalText(64),
});

export const receiptLineInputSchema = z.object({
  id: z.string().min(1).max(128).optional(),
  description: freeTextSchema({ min: 1, max: 300 }),
  quantity: quantityTextSchema,
  unitPrice: moneyTextSchema,
  vatTreatment: z.enum(ReceiptVatTreatment),
});

export const manualReceiptPaymentSummaryInputSchema = z.object({
  depositPaid: optionalMoneyTextSchema,
  balancePaid: optionalMoneyTextSchema,
  fullPaid: optionalMoneyTextSchema,
});

export const customReceiptInputSchema = z.object({
  language: z.enum(ReceiptLanguage),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  recipient: receiptRecipientSchema,
  lineItems: z.array(receiptLineInputSchema).min(1).max(RECEIPT_MAX_LINE_ITEMS),
  manualPaymentSummary: manualReceiptPaymentSummaryInputSchema.optional(),
  note: noHtmlOptionalText(2000),
});

export const paymentReceiptInputSchema = z.object({
  paymentIds: z.array(z.string().min(1).max(128)).min(1).max(20),
  language: z.enum(ReceiptLanguage),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida").optional(),
  recipient: receiptRecipientSchema.partial().optional(),
  note: noHtmlOptionalText(2000),
});

export const updateReceiptInputSchema = z.object({
  receiptId: z.string().min(1).max(128),
  language: z.enum(ReceiptLanguage),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  recipient: receiptRecipientSchema,
  lineItems: z.array(receiptLineInputSchema).min(1).max(RECEIPT_MAX_LINE_ITEMS),
  manualPaymentSummary: manualReceiptPaymentSummaryInputSchema.optional(),
  note: noHtmlOptionalText(2000),
});

export const cancelReceiptInputSchema = z.object({
  receiptId: z.string().min(1).max(128),
});

export type CustomReceiptInput = z.infer<typeof customReceiptInputSchema>;
export type PaymentReceiptInput = z.infer<typeof paymentReceiptInputSchema>;
export type UpdateReceiptInput = z.infer<typeof updateReceiptInputSchema>;
export type CancelReceiptInput = z.infer<typeof cancelReceiptInputSchema>;
