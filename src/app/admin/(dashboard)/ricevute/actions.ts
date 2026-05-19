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
  const clientKeys = formData.getAll("lineKey").map(String);
  const lineTypes = formData.getAll("lineType").map(String);
  const descriptions = formData.getAll("description").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  const vatTreatments = formData.getAll("vatTreatment").map(String);
  const paymentTypes = formData.getAll("paymentType").map(String);
  const paymentMethods = formData.getAll("paymentMethod").map(String);
  const paymentDates = formData.getAll("paymentDate").map(String);
  const productLineKeys = formData.getAll("productLineKey").map(String);

  return descriptions.map((description, index) => ({
    id: ids[index] || undefined,
    clientKey: clientKeys[index] || ids[index] || `line-${index}`,
    lineType: lineTypes[index] || "PRODUCT",
    description,
    quantity: quantities[index] ?? "",
    unitPrice: unitPrices[index] ?? "",
    vatTreatment: vatTreatments[index] ?? "VAT_INCLUDED",
    paymentType: paymentTypes[index] || undefined,
    paymentMethod: paymentMethods[index] || undefined,
    paymentDate: paymentDates[index] || undefined,
    productLineKey: productLineKeys[index] || undefined,
  }));
}

function revalidateReceiptPaths(receiptId: string, bookingId?: string) {
  revalidatePath("/admin/ricevute");
  revalidatePath(`/admin/ricevute/${receiptId}`);
  revalidatePath(`/admin/ricevute/${receiptId}/preview`);
  if (bookingId) revalidatePath(`/admin/prenotazioni/${bookingId}`);
}
