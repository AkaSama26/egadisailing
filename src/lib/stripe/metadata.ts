import type Stripe from "stripe";
import { ValidationError } from "@/lib/errors";

export const PAYMENT_TYPES = ["FULL", "DEPOSIT", "BALANCE"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export function isPaymentType(v: unknown): v is PaymentType {
  return typeof v === "string" && (PAYMENT_TYPES as readonly string[]).includes(v);
}

export interface BookingMetadata {
  bookingId: string;
  confirmationCode: string;
  paymentType: PaymentType;
}

/**
 * Serialize booking metadata for Stripe (Stripe enforces string values).
 */
export function buildBookingMetadata(m: BookingMetadata): Record<string, string> {
  return {
    bookingId: m.bookingId,
    confirmationCode: m.confirmationCode,
    paymentType: m.paymentType,
  };
}

/**
 * Parse and validate booking metadata from Stripe event.
 * Throws ValidationError (400) if required fields are missing/invalid.
 * No silent fallbacks: better to fail loud than to confirm a BALANCE as FULL.
 */
export function parseBookingMetadata(meta: Stripe.Metadata | null | undefined): BookingMetadata {
  if (!meta) {
    throw new ValidationError("Missing Stripe metadata");
  }
  const bookingId = meta.bookingId;
  const confirmationCode = meta.confirmationCode;
  const paymentType = meta.paymentType;
  if (!bookingId || typeof bookingId !== "string") {
    throw new ValidationError("Missing metadata.bookingId");
  }
  if (!confirmationCode || typeof confirmationCode !== "string") {
    throw new ValidationError("Missing metadata.confirmationCode");
  }
  if (!isPaymentType(paymentType)) {
    throw new ValidationError("Invalid metadata.paymentType");
  }
  return { bookingId, confirmationCode, paymentType };
}
