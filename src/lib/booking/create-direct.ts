import { db } from "@/lib/db";
import { quotePrice } from "@/lib/pricing/service";
import { toCents, fromCents } from "@/lib/pricing/cents";
import { toUtcDay, isoDay, parseDateLikelyLocalDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { deriveEndDate, generateConfirmationCode } from "./helpers";

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

  // Normalizza startDate al giorno di calendario Europe/Rome (risolve
  // off-by-one: 2026-04-07 digitato dal cliente e' 2026-04-06T22:00Z).
  const startDay = parseDateLikelyLocalDay(input.startDate);
  if (startDay.getTime() < toUtcDay(new Date()).getTime()) {
    throw new ValidationError("startDate must not be in the past");
  }

  const endDate = deriveEndDate(startDay, service.durationType, service.durationHours);
  const endDay = toUtcDay(endDate);

  const quote = await quotePrice(input.serviceId, startDay, input.numPeople);
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
  const emailLower = normalizeEmail(input.customer.email);

  const result = await db.$transaction(async (tx) => {
    // Advisory lock sulla barca per serializzare i payment-intent concorrenti
    // sullo stesso startDay. Stesso namespace di availability/service.ts per
    // serializzare anche vs blockDates concorrenti.
    await acquireTxAdvisoryLock(tx, "availability", service.boatId, isoDay(startDay));

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

    // Upsert customer. NON sovrascriviamo firstName/lastName alla seconda
    // prenotazione stessa email: il cliente ha gia' ricevuto email con il
    // nome originale, tenerlo stabile. Aggiorniamo solo campi non-critici
    // (phone/nationality/language se forniti).
    const customer = await tx.customer.upsert({
      where: { email: emailLower },
      update: {
        phone: input.customer.phone || undefined,
        nationality: input.customer.nationality || undefined,
        language: input.customer.language || undefined,
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
        startDate: startDay,
        endDate: endDay,
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
