import { z } from "zod";
import Decimal from "decimal.js";
import { emailSchema, freeTextSchema } from "@/lib/validation/common-zod";
import {
  PaymentMethod,
  PaymentType,
  ReceiptLanguage,
  ReceiptLineType,
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


const noHtmlOptionalText = (max: number) =>
  z
    .preprocess((value) => {
      if (value === undefined || value === null) return undefined;
      const text = String(value).trim();
      return text ? text : undefined;
    }, z.string().max(max).regex(/^[^<>]*$/, "Caratteri non validi").optional())
    .optional();

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
  clientKey: z.string().min(1).max(128).optional(),
  lineType: z.enum(ReceiptLineType).default("PRODUCT"),
  description: freeTextSchema({ min: 1, max: 300 }),
  quantity: quantityTextSchema,
  unitPrice: moneyTextSchema,
  vatTreatment: z.enum(ReceiptVatTreatment),
  paymentType: z.enum(PaymentType).optional(),
  paymentMethod: z.enum(PaymentMethod).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data pagamento non valida").optional(),
  productLineKey: z.string().max(128).optional(),
});

export const customReceiptInputSchema = z.object({
  language: z.enum(ReceiptLanguage),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  recipient: receiptRecipientSchema,
  lineItems: z.array(receiptLineInputSchema).min(1).max(RECEIPT_MAX_LINE_ITEMS),
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
  note: noHtmlOptionalText(2000),
});

export const cancelReceiptInputSchema = z.object({
  receiptId: z.string().min(1).max(128),
});

export type ReceiptRecipientInput = {
  name: string;
  email?: string;
  address?: string;
  taxId?: string;
};

export type ReceiptLineInput = {
  id?: string;
  clientKey?: string;
  lineType?: ReceiptLineType;
  description: string;
  quantity: string | number;
  unitPrice: string | number;
  vatTreatment: ReceiptVatTreatment;
  paymentType?: PaymentType;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  productLineKey?: string;
};

export type CustomReceiptInput = {
  language: ReceiptLanguage;
  issueDate: string;
  recipient: ReceiptRecipientInput;
  lineItems: ReceiptLineInput[];
  note?: string | null;
};

export type PaymentReceiptInput = {
  paymentIds: string[];
  language: ReceiptLanguage;
  issueDate?: string;
  recipient?: Partial<ReceiptRecipientInput>;
  note?: string | null;
};

export type UpdateReceiptInput = CustomReceiptInput & {
  receiptId: string;
};

export type CancelReceiptInput = z.infer<typeof cancelReceiptInputSchema>;
