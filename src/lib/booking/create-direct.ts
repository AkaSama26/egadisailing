import { db } from "@/lib/db";
import { quotePrice } from "@/lib/pricing/service";
import { toCents, fromCents } from "@/lib/pricing/cents";
import { toUtcDay, isoDay, parseDateLikelyLocalDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { deriveEndDate, generateConfirmationCode } from "./helpers";

export interface ConsentInput {
  privacyAccepted: boolean;
  termsAccepted: boolean;
  policyVersion: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

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
  /**
   * GDPR art. 7: consenso esplicito a privacy + T&C. Obbligatorio.
   * Persistito in `ConsentRecord` dentro la stessa tx del Booking.
   */
  consent: ConsentInput;
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
  // GDPR: checkbox privacy + T&C obbligatorie, senza il consenso il booking
  // non puo' essere creato (art. 7 + art. 6.1.a).
  if (!input.consent.privacyAccepted || !input.consent.termsAccepted) {
    throw new ValidationError(
      "Devi accettare privacy policy e termini & condizioni per prenotare",
    );
  }

  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service) throw new NotFoundError("Service", input.serviceId);
  if (!service.active) throw new ValidationError("Service is not active");

  if (input.numPeople < 1 || input.numPeople > service.capacityMax) {
    throw new ValidationError(
      `numPeople out of range (1..${service.capacityMax}): ${input.numPeople}`,
    );
  }

  // minPaying: soglia minima per ordine singolo (non pooling cross-ordine).
  // Es. SOCIAL_BOATING minPaying=11: il cliente singolo non puo' acquistare
  // 1 posto su una giornata non ancora attiva. La logica "tour parte se
  // cumulativamente raggiunge minPaying" va gestita separatamente (Plan 5
  // admin: cancel + refund se soglia non raggiunta X giorni prima).
  if (service.minPaying && input.numPeople < service.minPaying) {
    throw new ValidationError(
      `Minimum ${service.minPaying} persone richieste per ${service.name}`,
    );
  }

  // Enforce paymentSchedule dal service — il client non puo' overridere.
  // Es. Cabin Charter e' sempre DEPOSIT_BALANCE: bloccare FULL mantiene
  // coerenza con il flusso commerciale (admin puo' sempre fare booking
  // manuali con logica diversa).
  if (input.paymentSchedule !== service.defaultPaymentSchedule) {
    throw new ValidationError(
      `${service.name} richiede ${service.defaultPaymentSchedule}, ricevuto ${input.paymentSchedule}`,
    );
  }

  // Normalizza startDate al giorno di calendario Europe/Rome (risolve
  // off-by-one: 2026-04-07 digitato dal cliente e' 2026-04-06T22:00Z).
  const startDay = parseDateLikelyLocalDay(input.startDate);
  if (startDay.getTime() < toUtcDay(new Date()).getTime()) {
    throw new ValidationError("startDate must not be in the past");
  }

  // Cabin charter e' settimana-intera con pivot sabato (standard Mediterraneo).
  // Validare per evitare booking che bloccano mercoledi-martedi invece
  // di sabato-sabato (pattern del settore charter).
  if (service.durationType === "WEEK" && startDay.getUTCDay() !== 6) {
    throw new ValidationError(
      "Cabin charter settimanali iniziano il sabato (cambio sabato-sabato)",
    );
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

    // Pre-check 1: nessuna cella BoatAvailability BLOCKED nel range.
    // Questo intercetta booking CONFIRMED (che fanno blockDates) e blocchi
    // manuali admin.
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

    // Upsert customer PRIMA del pre-check #2 per permettere retry self-booking.
    // NON sovrascriviamo firstName/lastName alla seconda prenotazione stessa
    // email: il cliente ha gia' ricevuto email con il nome originale, tenerlo
    // stabile. Aggiorniamo solo campi non-critici (phone/nationality/language).
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

    // Pre-check 2: nessun Booking attivo overlapping (PENDING o CONFIRMED)
    // da qualsiasi canale (DIRECT, BOKUN, charter platforms).
    //
    // Senza questo: durante il checkout DIRECT il BoatAvailability non e'
    // ancora BLOCKED (viene bloccato solo dopo Stripe webhook), quindi un
    // webhook Bokun concorrente passa il check #1 e crea un secondo Booking
    // sulla stessa slot. Il DB accetta perche' manca l'exclusion constraint
    // `EXCLUDE USING gist (boatId, daterange, status)` — aggiunta in backlog.
    //
    // R15-REG-UX-1: escludiamo PENDING dello stesso customer creati <30min
    // fa. Scenario: primo tentativo pagamento Stripe fallisce con
    // card_declined terminale, cliente clicca "Usa un altro metodo" → wizard
    // ri-crea PI → senza questa whitelist il PENDING del primo tentativo
    // verrebbe visto come conflitto, il cliente resta stuck fino al
    // pending-gc cron (30min). Il vecchio PENDING scadra' normalmente.
    const retryWindowStart = new Date(Date.now() - 30 * 60 * 1000);
    const overlappingBookings = await tx.booking.findMany({
      where: {
        boatId: service.boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        // Range overlap: NOT (existing.end < new.start OR existing.start > new.end)
        startDate: { lte: endDay },
        endDate: { gte: startDay },
        // R15-REG-UX-1 retry window exclusion
        NOT: {
          AND: [
            { customerId: customer.id },
            { status: "PENDING" },
            { source: "DIRECT" },
            { createdAt: { gte: retryWindowStart } },
          ],
        },
      },
      select: { id: true, source: true, confirmationCode: true },
    });
    if (overlappingBookings.length > 0) {
      throw new ConflictError("Dates not available (overlapping active booking)", {
        conflictingBookings: overlappingBookings.map((b) => ({
          code: b.confirmationCode,
          source: b.source,
        })),
      });
    }

    const created = await tx.booking.create({
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

    // GDPR art. 7: snapshot del consenso al momento della creazione booking.
    // Persistere prima del pagamento (puo' succedere che l'utente non
    // completi il checkout — il consenso e' comunque stato dato). Plan 5
    // batch 4 fix deferred CRITICA ConsentRecord.
    await tx.consentRecord.create({
      data: {
        customerId: customer.id,
        bookingId: created.id,
        privacyAccepted: input.consent.privacyAccepted,
        termsAccepted: input.consent.termsAccepted,
        policyVersion: input.consent.policyVersion,
        ipAddress: input.consent.ipAddress ?? null,
        userAgent: input.consent.userAgent ?? null,
      },
    });

    return created;
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
