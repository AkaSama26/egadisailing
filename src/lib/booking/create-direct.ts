import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { quotePrice } from "@/lib/pricing/service";
import { toCents, fromCents } from "@/lib/pricing/cents";
import { toUtcDay, isoDay, parseDateLikelyLocalDay } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { normalizeEmail } from "@/lib/email-normalize";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { deriveEndDate, generateConfirmationCode } from "./helpers";
import { DIRECT_RETRY_WINDOW_MS } from "./constants";

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
  // R22-P2-MEDIA-2: `parseDateLikelyLocalDay(new Date())` invece di
  // `toUtcDay` → entrambi gli operandi sono day Europe/Rome. Fix 00:30
  // Rome CEST edge case (22:30 UTC ieri) dove `toUtcDay(now)` = ieri ma
  // il cliente italiano pensa "oggi".
  if (startDay.getTime() < parseDateLikelyLocalDay(new Date()).getTime()) {
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
    // R26-P4 (audit double-book Agent 1 #4b): retry-window refactored.
    // Prima escludeva PENDING stesso customer silent → 2 clienti reali che
    // condividono email (famiglia/azienda) upsert stesso Customer.id →
    // entrambi passano pre-check → entrambi pagano → 2 CONFIRMED stesso slot.
    // Ora: cancelliamo ATOMICAMENTE il vecchio PENDING dentro la tx, poi
    // creiamo il nuovo. Invariante: al piu' 1 PENDING attivo per (customer,
    // slot). Se il vecchio PI e' ancora in-flight (requires_action, processing),
    // NON cancelliamo (il 2° request e' un utente diverso, non un retry) → il
    // nuovo insert fallira' comunque via exclusion constraint DB (R26-P4
    // migration 20260421190000) + ConflictError visibile.
    const retryWindowStart = new Date(Date.now() - DIRECT_RETRY_WINDOW_MS);

    // Step 1: trova TUTTI i booking overlapping PENDING/CONFIRMED.
    //
    // R28-CRIT-1: filtro asimmetrico per tipo servizio. Il pattern precedente
    // (pre-R28) bloccava OGNI overlap stessa (boatId, date-range) —
    // appropriato per boat-exclusive (CABIN_CHARTER/BOAT_EXCLUSIVE) ma ROMPE
    // il modello tour condivisi (SOCIAL_BOATING 20 posti / BOAT_SHARED 12
    // posti): secondo cliente riceveva ConflictError invece di passare a
    // capacity-check normale.
    //
    // Logica asimmetrica:
    //  - Nuovo booking EXCLUSIVE → blocca su QUALSIASI booking attivo stesso
    //    slot (un cliente che compra la barca intera non puo' coesistere
    //    con social tour gia' vendibile).
    //  - Nuovo booking SHARED → blocca solo su booking EXCLUSIVE esistente
    //    (2 shared stesso slot sono OK: sono letteralmente tour condivisi).
    //
    // Aligned con pattern Bokun/Boataround/Charter adapter + cross-channel-
    // conflicts helper (gia' usavano filter service.type IN boat-exclusive).
    const isNewBoatExclusive = ["CABIN_CHARTER", "BOAT_EXCLUSIVE"].includes(
      service.type,
    );
    const allConflicts = await tx.booking.findMany({
      where: {
        boatId: service.boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: endDay },
        endDate: { gte: startDay },
        // Se nuovo e' shared, escludiamo altri shared dai conflitti
        // (permettiamo cohabitation). Se exclusive, NO filter (tutti).
        ...(isNewBoatExclusive
          ? {}
          : { service: { is: { type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] } } } }),
      },
      include: { directBooking: true },
    });

    // Step 2: partitio — "ownRetriable" sono i propri PENDING recenti con
    // PI in stato terminal-failure (card_declined, canceled). Altri sono
    // blocker. Una PI ancora "processing" o "requires_action" (es. 3DS
    // in corso) significa che un PAGAMENTO REALE e' in flight: NON
    // autorizziamo retry, e' un utente diverso → blocker.
    const ownRetriable: typeof allConflicts = [];
    const blockers: typeof allConflicts = [];
    for (const c of allConflicts) {
      const isOwnRecent =
        c.customerId === customer.id &&
        c.status === "PENDING" &&
        c.source === "DIRECT" &&
        c.createdAt >= retryWindowStart;
      if (!isOwnRecent) {
        blockers.push(c);
        continue;
      }
      // Proprio PENDING recente — determina se e' un retry vero (PI
      // fallito) o 2° utente stessa email (PI attivo).
      // Senza PI: gia' abbandonato (es. client crashed pre-PI). Safe to cancel.
      // Con PI noto e terminal: safe to cancel.
      // Altrimenti (PI sconosciuto + pending): blocker (serve attesa del
      // webhook payment_failed o del pending-gc).
      //
      // Proxy semplice: se DirectBooking.stripePaymentIntentId e' null o
      // se c'e' un Payment FAILED per questo booking, e' retriable.
      // Altrimenti tratta come blocker.
      const hasFailedPayment = await tx.payment.findFirst({
        where: { bookingId: c.id, status: "FAILED" },
        select: { id: true },
      });
      const hasStripePi = c.directBooking?.stripePaymentIntentId != null;
      if (hasFailedPayment || !hasStripePi) {
        ownRetriable.push(c);
      } else {
        // PI noto + nessun FAILED record: potrebbe essere in-flight. Tratta
        // come blocker per sicurezza. Il pending-gc (45min) sblocca se
        // abbandonato.
        blockers.push(c);
      }
    }

    if (blockers.length > 0) {
      throw new ConflictError("Dates not available (overlapping active booking)", {
        conflictingBookings: blockers.map((b) => ({
          code: b.confirmationCode,
          source: b.source,
        })),
      });
    }

    // Step 3: cancella atomicamente i propri PENDING retriabili. Questo
    // libera la tx per il nuovo insert senza conflict constraint DB.
    // PI cleanup (cancelPaymentIntent) lo faremo post-commit best-effort.
    if (ownRetriable.length > 0) {
      await tx.booking.updateMany({
        where: { id: { in: ownRetriable.map((r) => r.id) }, status: "PENDING" },
        data: { status: "CANCELLED" },
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

    return {
      created,
      cancelledPiIds: ownRetriable
        .map((r) => r.directBooking?.stripePaymentIntentId)
        .filter((pi): pi is string => !!pi),
    };
  });

  // R26-P4: post-commit best-effort cancel dei PI del vecchio PENDING appena
  // cancellato (dentro tx). Se Stripe e' giu' o il PI e' gia' terminale,
  // cancelPaymentIntent degrada silenzioso (pattern R14-REG-M2). Il
  // pending-gc cron copre i casi dove questa cleanup fallisce.
  for (const piId of result.cancelledPiIds) {
    void import("@/lib/stripe/payment-intents")
      .then(({ cancelPaymentIntent }) => cancelPaymentIntent(piId))
      .catch((err) => {
        logger.warn(
          { err: (err as Error).message, piId },
          "Retry-cancel PI failed (pending-gc will retry)",
        );
      });
  }

  const upfrontCents = input.paymentSchedule === "DEPOSIT_BALANCE" ? depositCents : totalCents;

  return {
    bookingId: result.created.id,
    confirmationCode,
    totalAmountCents: totalCents,
    depositAmountCents: depositCents,
    balanceAmountCents: balanceCents,
    upfrontAmountCents: upfrontCents,
  };
}
