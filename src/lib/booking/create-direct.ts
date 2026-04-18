import crypto from "node:crypto";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { quotePrice } from "@/lib/pricing/service";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateDirectBookingInput {
  serviceId: string;
  startDate: Date;
  endDate: Date;
  numPeople: number;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    nationality?: string;
    language?: string;
  };
  paymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  depositPercentage?: number;
  weatherGuarantee: boolean;
  notes?: string;
}

export interface CreatedBooking {
  bookingId: string;
  confirmationCode: string;
  totalAmountCents: number;
  depositAmountCents: number;
  balanceAmountCents: number;
  upfrontAmountCents: number;
}

const CONFIRMATION_CODE_ALPHABET = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";

function generateConfirmationCode(): string {
  let code = "ES-";
  for (let i = 0; i < 7; i++) {
    code += CONFIRMATION_CODE_ALPHABET[crypto.randomInt(0, CONFIRMATION_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Crea una DirectBooking in status PENDING. Non blocca ancora availability —
 * la conferma avviene DOPO il pagamento Stripe (via webhook).
 *
 * Tutto in Decimal (no floating point) fino al boundary Stripe che usa cents int.
 */
export async function createPendingDirectBooking(
  input: CreateDirectBookingInput,
): Promise<CreatedBooking> {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new NotFoundError("Service", input.serviceId);
  if (!service.active) throw new ValidationError("Service is not active");

  if (input.numPeople < 1 || input.numPeople > service.capacityMax) {
    throw new ValidationError(
      `numPeople out of range (1..${service.capacityMax}): ${input.numPeople}`,
    );
  }

  const quote = await quotePrice(input.serviceId, input.startDate, input.numPeople);
  const totalCents = quote.totalPrice.mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

  let depositCents = 0;
  let balanceCents = 0;
  if (input.paymentSchedule === "DEPOSIT_BALANCE") {
    const pct = input.depositPercentage ?? service.defaultDepositPercentage ?? 30;
    if (pct < 1 || pct > 100) throw new ValidationError(`Invalid depositPercentage: ${pct}`);
    depositCents = Math.round((totalCents * pct) / 100);
    balanceCents = totalCents - depositCents;
  }

  const confirmationCode = generateConfirmationCode();
  const emailLower = input.customer.email.toLowerCase();

  const result = await db.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { email: emailLower },
      update: {
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        nationality: input.customer.nationality,
        language: input.customer.language,
      },
      create: {
        email: emailLower,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        phone: input.customer.phone,
        nationality: input.customer.nationality,
        language: input.customer.language,
      },
    });

    const booking = await tx.booking.create({
      data: {
        confirmationCode,
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: service.boatId,
        startDate: input.startDate,
        endDate: input.endDate,
        numPeople: input.numPeople,
        totalPrice: quote.totalPrice.toFixed(2),
        weatherGuarantee: input.weatherGuarantee,
        notes: input.notes,
        status: "PENDING",
        directBooking: {
          create: {
            paymentSchedule: input.paymentSchedule,
            depositAmount:
              input.paymentSchedule === "DEPOSIT_BALANCE"
                ? new Decimal(depositCents).div(100).toFixed(2)
                : null,
            balanceAmount:
              input.paymentSchedule === "DEPOSIT_BALANCE"
                ? new Decimal(balanceCents).div(100).toFixed(2)
                : null,
          },
        },
      },
    });

    return booking;
  });

  const upfrontCents = input.paymentSchedule === "DEPOSIT_BALANCE" ? depositCents : totalCents;

  return {
    bookingId: result.id,
    confirmationCode,
    totalAmountCents: totalCents,
    depositAmountCents: depositCents,
    balanceAmountCents: balanceCents,
    upfrontAmountCents: upfrontCents,
  };
}
