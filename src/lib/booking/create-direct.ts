import crypto from "node:crypto";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { quotePrice } from "@/lib/pricing/service";
import { toCents, fromCents } from "@/lib/pricing/cents";
import { toUtcDay, eachUtcDayInclusive, addHours, addDays } from "@/lib/dates";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import type { DurationType } from "@/generated/prisma/enums";

export interface CreateDirectBookingInput {
  serviceId: string;
  startDate: Date;
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
 * Derives endDate from service duration. Fonte di verita' server-side — NON
 * accettare endDate dal client (DoS: cliente blocca calendario per mesi
 * pagando una giornata).
 */
function deriveEndDate(startDate: Date, durationType: DurationType, durationHours: number): Date {
  switch (durationType) {
    case "WEEK":
      // Cabin charter: 7 giorni, cambio sabato
      return addDays(startDate, 6);
    case "FULL_DAY":
    case "HALF_DAY_MORNING":
    case "HALF_DAY_AFTERNOON":
      return addHours(startDate, durationHours);
    default:
      return addHours(startDate, durationHours);
  }
}

/**
 * Crea una DirectBooking PENDING.
 *
 * Sicurezza:
 * - `endDate` derivato server-side da service.durationType/Hours (no client trust)
 * - `availability` pre-controllata con advisory lock per prevenire overbooking
 *   parallelo (due payment-intent simultanei → uno solo vince)
 * - `totalPrice` calcolato server-side via quotePrice (ignora input client)
 *
 * Note: availability non e' ancora BLOCKED qui — viene bloccata solo dopo
 * payment confermato via webhook (evita lock su PENDING abbandonati).
 * Pero' la pre-check dentro advisory lock rifiuta data gia' venduta.
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

  if (input.startDate.getTime() < Date.now()) {
    throw new ValidationError("startDate must be in the future");
  }

  const endDate = deriveEndDate(input.startDate, service.durationType, service.durationHours);
  const startDay = toUtcDay(input.startDate);
  const endDay = toUtcDay(endDate);

  const quote = await quotePrice(input.serviceId, input.startDate, input.numPeople);
  const totalCents = toCents(quote.totalPrice);

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
    // Advisory lock sulla barca per serializzare i payment-intent concorrenti
    // sullo stesso startDay. Il lock si rilascia al commit/rollback.
    const lockKey = hashLockKey(`booking:${service.boatId}:${startDay.toISOString()}`);
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

    // Pre-check: verifica che non ci siano dates BLOCKED nel range
    const conflicts = await tx.boatAvailability.findMany({
      where: {
        boatId: service.boatId,
        date: { gte: startDay, lte: endDay },
        status: "BLOCKED",
      },
    });
    if (conflicts.length > 0) {
      throw new ConflictError("Dates not available", {
        blockedDates: conflicts.map((c) => c.date.toISOString().slice(0, 10)),
      });
    }

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

    return tx.booking.create({
      data: {
        confirmationCode,
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: service.boatId,
        startDate: input.startDate,
        endDate,
        numPeople: input.numPeople,
        totalPrice: quote.totalPrice.toFixed(2),
        notes: input.notes,
        status: "PENDING",
        directBooking: {
          create: {
            paymentSchedule: input.paymentSchedule,
            depositAmount:
              input.paymentSchedule === "DEPOSIT_BALANCE"
                ? fromCents(depositCents).toFixed(2)
                : null,
            balanceAmount:
              input.paymentSchedule === "DEPOSIT_BALANCE"
                ? fromCents(balanceCents).toFixed(2)
                : null,
          },
        },
      },
    });
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

function hashLockKey(input: string): string {
  const MOD = BigInt("9223372036854775807");
  const BASE = BigInt(31);
  let h = BigInt(0);
  for (let i = 0; i < input.length; i++) {
    h = (h * BASE + BigInt(input.charCodeAt(i))) % MOD;
  }
  return h.toString();
}
