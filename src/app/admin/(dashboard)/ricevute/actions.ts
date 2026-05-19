"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import {
  cancelReceipt,
  createCustomReceipt,
  createReceiptFromPayments,
  updateReceipt,
} from "@/lib/receipts/service";
import {
  cancelReceiptInputSchema,
  customReceiptInputSchema,
  paymentReceiptInputSchema,
  updateReceiptInputSchema,
} from "@/lib/receipts/schemas";

export async function createCustomReceiptFromForm(formData: FormData) {
  const { userId } = await requireAdminForReceiptAction();
  const input = customReceiptInputSchema.parse({
    language: String(formData.get("language") ?? "IT"),
    issueDate: String(formData.get("issueDate") ?? ""),
    recipient: readRecipient(formData),
    lineItems: readLineItems(formData),
    manualPaymentSummary: readManualPaymentSummary(formData),
    note: String(formData.get("note") ?? ""),
  });
  const receipt = await createCustomReceipt(input, userId);
  revalidateReceiptPaths(receipt.id);
  redirect(`/admin/ricevute/${receipt.id}`);
}

export async function createReceiptFromPaymentsFromForm(formData: FormData) {
  const { userId } = await requireAdminForReceiptAction();
  const input = paymentReceiptInputSchema.parse({
    paymentIds: formData.getAll("paymentId").map(String),
    language: String(formData.get("language") ?? "IT"),
    issueDate: formData.get("issueDate") ? String(formData.get("issueDate")) : undefined,
    recipient: readOptionalRecipient(formData),
    note: String(formData.get("note") ?? ""),
  });
  const receipt = await createReceiptFromPayments(input, userId);
  revalidateReceiptPaths(receipt.id, receipt.bookingId ?? undefined);
  redirect(`/admin/ricevute/${receipt.id}`);
}

export async function updateReceiptFromForm(receiptId: string, formData: FormData) {
  const { userId } = await requireAdminForReceiptAction();
  const input = updateReceiptInputSchema.parse({
    receiptId,
    language: String(formData.get("language") ?? "IT"),
    issueDate: String(formData.get("issueDate") ?? ""),
    recipient: readRecipient(formData),
    lineItems: readLineItems(formData),
    manualPaymentSummary: readManualPaymentSummary(formData),
    note: String(formData.get("note") ?? ""),
  });
  const receipt = await updateReceipt(input, userId);
  revalidateReceiptPaths(receipt.id, receipt.bookingId ?? undefined);
  redirect(`/admin/ricevute/${receipt.id}`);
}

export async function cancelReceiptFromForm(receiptId: string) {
  const { userId } = await requireAdminForReceiptAction();
  const input = cancelReceiptInputSchema.parse({ receiptId });
  const receipt = await cancelReceipt(input.receiptId, userId);
  revalidateReceiptPaths(receipt.id, receipt.bookingId ?? undefined);
  redirect(`/admin/ricevute/${receipt.id}`);
}

async function requireAdminForReceiptAction() {
  const auth = await requireAdmin();
  await enforceRateLimit({
    identifier: auth.userId,
    scope: RATE_LIMIT_SCOPES.ADMIN_RECEIPT_ACTION,
    limit: 30,
    windowSeconds: 60,
    failOpen: false,
  });
  return auth;
}

function readRecipient(formData: FormData) {
  return {
    name: String(formData.get("recipientName") ?? ""),
    email: String(formData.get("recipientEmail") ?? ""),
    address: String(formData.get("recipientAddress") ?? ""),
    taxId: String(formData.get("recipientTaxId") ?? ""),
  };
}

function readOptionalRecipient(formData: FormData) {
  const recipient = readRecipient(formData);
  const cleanRecipient = Object.fromEntries(
    Object.entries(recipient).filter(([, value]) => value.trim() !== ""),
  );
  if (Object.keys(cleanRecipient).length === 0) {
    return undefined;
  }
  return cleanRecipient;
}

function readLineItems(formData: FormData) {
  const ids = formData.getAll("lineId").map(String);
  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  const vatTreatments = formData.getAll("vatTreatment").map(String);

  return descriptions.map((description, index) => ({
    id: ids[index] || undefined,
    description,
    quantity: quantities[index] ?? "",
    unitPrice: unitPrices[index] ?? "",
    vatTreatment: vatTreatments[index] ?? "VAT_INCLUDED",
  }));
}

function readManualPaymentSummary(formData: FormData) {
  return {
    depositPaid: String(formData.get("manualDepositPaid") ?? ""),
    balancePaid: String(formData.get("manualBalancePaid") ?? ""),
    fullPaid: String(formData.get("manualFullPaid") ?? ""),
  };
}

function revalidateReceiptPaths(receiptId: string, bookingId?: string) {
  revalidatePath("/admin/ricevute");
  revalidatePath(`/admin/ricevute/${receiptId}`);
  revalidatePath(`/admin/ricevute/${receiptId}/preview`);
  if (bookingId) revalidatePath(`/admin/prenotazioni/${bookingId}`);
}
