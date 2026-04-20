import type Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toCents, formatEur, formatEurCents } from "@/lib/pricing/cents";
import { parseBookingMetadata } from "./metadata";
import { ValidationError } from "@/lib/errors";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";
import { formatItDay } from "@/lib/dates";
import { bookingWithDetailsInclude } from "@/lib/booking/queries";

/**
 * Handler dei webhook Stripe.
 *
 * Idempotency: marker `ProcessedStripeEvent` inserito ALLA FINE (dopo tutti
 * i side-effect). Se il processo crasha a metà:
 *  - Stripe riprova (5xx)
 *  - al secondo tentativo, Payment.stripeChargeId @unique previene doppio insert
 *  - booking.updateMany(status=PENDING) previene doppia transizione
 *  - blockDates e' idempotente (self-echo)
 *  - marker viene finalmente scritto
 *
 * Il marker serve solo a evitare lavoro ridondante quando l'handler e' gia'
 * completato correttamente (non e' l'unica linea di difesa contro duplicati).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Stripe event received");

  // Early return se event gia' processato completamente
  const existing = await db.processedStripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing) {
    logger.info({ eventId: event.id }, "Duplicate Stripe event, skipping");
    return;
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      await onPaymentIntentSucceeded(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await onPaymentIntentFailed(event.data.object);
      break;
    case "payment_intent.canceled":
      // R23-S-ALTA-1: Stripe auto-cancel PI dopo 24h requires_payment_method
      // + admin manual cancel via cancelPaymentIntent helper. Senza questo
      // handler il booking restava PENDING fino al cron pending-gc (30min+).
      await onPaymentIntentCanceled(event.data.object);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object);
      break;
    case "charge.dispute.created":
    case "charge.dispute.updated":
    case "charge.dispute.closed":
      // R27-CRIT-4: chargeback/dispute. Senza handler, l'evento finiva in
      // `default` log + marker → admin NON notificato → slot BLOCKED per
      // 30gg di dispute window senza possibilita' di rivendere. GDPR art.
      // 33 + perdita revenue €500-2000/caso. Ora notify sincrono admin +
      // log persistente (no release automatico: dispute potrebbe essere
      // winnable).
      await onChargeDispute(event.data.object as Stripe.Dispute, event.type);
      break;
    default:
      logger.debug({ type: event.type }, "Unhandled stripe event");
  }

  // Mark event as processed AFTER all side-effects succeeded.
  // Unique constraint previene doppio insert se Stripe retry atterra in
  // un'altra istanza dopo il commit.
  try {
    await db.processedStripeEvent.create({
      data: { eventId: event.id, eventType: event.type },
    });
  } catch (err) {
    // R20-A1-2: check robusto su Prisma error code invece di string match
    // sul message (che poteva cambiare tra versioni Prisma).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.info({ eventId: event.id }, "Event already marked processed by another worker");
      return;
    }
    throw err;
  }
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  // Tolerant parsing: PI creato fuori dal flusso (Stripe dashboard, testing)
  // non ha booking metadata — loggiamo e skippiamo senza throw (altrimenti
  // Stripe ritenta forever).
  let metadata;
  try {
    metadata = parseBookingMetadata(pi.metadata);
  } catch {
    logger.warn(
      { piId: pi.id, amount: pi.amount_received },
      "PaymentIntent succeeded without valid booking metadata — ignored",
    );
    return;
  }

  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  if (!charge) {
    // Lasciamo propagare: Stripe fara' retry. In tempo utile latest_charge sara'
    // popolato. Meglio retry che silent-return (che perdeva l'evento dopo insert
    // del marker quando questo era all'inizio).
    throw new ValidationError(
      `PaymentIntent ${pi.id} succeeded ma latest_charge mancante — retry richiesto`,
    );
  }

  // Amount verification: confronta con valore atteso in DB.
  const booking = await db.booking.findUnique({
    where: { id: metadata.bookingId },
    include: { directBooking: true },
  });
  if (!booking) {
    // Throw (non return): il marker ProcessedStripeEvent NON e' ancora
    // inserito (lo fa il caller a fine handler), quindi Stripe retryera'.
    // Caso tipico: replica lag Postgres — al retry successivo il booking
    // sara' visibile.
    logger.error({ bookingId: metadata.bookingId }, "Booking not found for PI — Stripe will retry");
    throw new ValidationError(
      `Booking ${metadata.bookingId} not found for PI ${pi.id} — retry required`,
    );
  }
  if (!booking.directBooking) {
    logger.error({ bookingId: metadata.bookingId }, "DirectBooking missing — Stripe will retry");
    throw new ValidationError(
      `DirectBooking missing for ${metadata.bookingId} — retry required`,
    );
  }

  // Round 10 BL-C3: race admin-cancel vs stripe-webhook. Se il booking e'
  // gia' stato cancellato dall'admin mentre il PI era in "processing",
  // NON confermiamo e facciamo auto-refund del charge appena arrivato.
  // Senza questo fix, il cliente pagava ma il booking restava CANCELLED
  // senza refund automatico.
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    logger.warn(
      { bookingId: booking.id, status: booking.status, piId: pi.id, charge },
      "Stripe webhook for already-cancelled booking — auto-refunding",
    );
    const { refundPayment } = await import("./payment-intents");
    try {
      const ref = await refundPayment(charge);
      // Round 11 Reg-C2: NO stripeChargeId/stripeRefundId sul record REFUND
      // per non violare gli unique index (il charge e' nuovo ma il refund id
      // potrebbe collidere con futuri record). Identificatori preservati in `note`.
      await db.payment.create({
        data: {
          bookingId: booking.id,
          amount: (pi.amount_received / 100).toFixed(2),
          type: "REFUND",
          method: "STRIPE",
          status: "REFUNDED",
          processedAt: new Date(),
          note: `Auto-refund race admin-cancel vs stripe-succeeded · charge=${charge} · refund=${ref.id} · pi=${pi.id}`,
        },
      });
    } catch (err) {
      // Se il refund fallisce qui, Stripe ritentera' il webhook. Stripe refund
      // e' idempotent per charge (stripe.refunds.create non duplica se esiste
      // gia' su charge fully-refunded) quindi retry e' safe.
      logger.error({ err, bookingId: booking.id }, "Auto-refund failed after cancel race");
      throw err;
    }
    return; // NON confermare il booking — e' cancellato.
  }

  const totalCents = toCents(booking.totalPrice);
  const depositCents = booking.directBooking.depositAmount
    ? toCents(booking.directBooking.depositAmount)
    : 0;
  const balanceCents = booking.directBooking.balanceAmount
    ? toCents(booking.directBooking.balanceAmount)
    : 0;

  const expectedCents =
    metadata.paymentType === "FULL"
      ? totalCents
      : metadata.paymentType === "DEPOSIT"
        ? depositCents
        : balanceCents;

  if (pi.amount_received !== expectedCents) {
    // Hard-fail: throw so Stripe retries AND operator gets alerted via logs.
    // A silent return would lose the event after marker insert.
    logger.error(
      {
        bookingId: metadata.bookingId,
        paymentType: metadata.paymentType,
        expectedCents,
        actualCents: pi.amount_received,
      },
      "Payment amount mismatch — manual review required",
    );
    throw new ValidationError(
      `Payment amount mismatch for booking ${metadata.bookingId}: expected ${expectedCents}, got ${pi.amount_received}`,
    );
  }

  await confirmDirectBookingAfterPayment({
    bookingId: metadata.bookingId,
    stripePaymentIntentId: pi.id,
    stripeChargeId: charge,
    amountCents: pi.amount_received,
    paymentType: metadata.paymentType,
  });

  if (metadata.paymentType !== "BALANCE") {
    await sendConfirmationEmail(metadata.bookingId, pi.amount_received).catch((err) => {
      logger.error(
        { err, bookingId: metadata.bookingId },
        "Confirmation email failed (booking still confirmed)",
      );
    });

    // Plan 6 Task 8: alert admin su nuova prenotazione DIRECT.
    void notifyNewBooking(metadata.bookingId, "DIRECT").catch((err) =>
      logger.error({ err, bookingId: metadata.bookingId }, "Admin notify failed"),
    );
  }
}

async function notifyNewBooking(bookingId: string, source: string): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });
  if (!booking) return;
  await dispatchNotification({
    type: "NEW_BOOKING_DIRECT",
    channels: defaultNotificationChannels(),
    payload: {
      source,
      confirmationCode: booking.confirmationCode,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`.trim(),
      serviceName: booking.service.name,
      startDate: booking.startDate.toISOString().slice(0, 10),
      numPeople: booking.numPeople,
      totalPrice: formatEur(booking.totalPrice),
    },
  });
}

async function sendConfirmationEmail(bookingId: string, paidCents: number): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: bookingWithDetailsInclude,
  });
  if (!booking) return;

  const { subject, html, text } = bookingConfirmationTemplate({
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    confirmationCode: booking.confirmationCode,
    serviceName: booking.service.name,
    startDate: formatItDay(booking.startDate),
    numPeople: booking.numPeople,
    totalPrice: formatEur(booking.totalPrice),
    paidAmount: formatEurCents(paidCents),
    balanceAmount: booking.directBooking?.balanceAmount
      ? formatEur(booking.directBooking.balanceAmount)
      : undefined,
    recoveryUrl: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`,
  });

  await sendEmail({
    to: booking.customer.email,
    toName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    subject,
    htmlContent: html,
    textContent: text,
  });
}

/**
 * Set di error code Stripe **terminal** (no recovery): cliente deve
 * riprovare con metodo diverso. I non-terminal (authentication_required,
 * insufficient_funds su test card) possono riprovare stesso PI.
 */
const TERMINAL_PI_ERROR_CODES = new Set([
  "card_declined",
  "expired_card",
  "incorrect_cvc",
  "generic_decline",
  "lost_card",
  "stolen_card",
  "pickup_card",
  "fraudulent",
]);

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  let metadata;
  try {
    metadata = parseBookingMetadata(pi.metadata);
  } catch {
    logger.warn(
      { piId: pi.id, lastPaymentError: pi.last_payment_error?.message },
      "Payment intent failed without bookingId metadata",
    );
    return;
  }

  const errorCode = pi.last_payment_error?.code;
  const isTerminal = errorCode ? TERMINAL_PI_ERROR_CODES.has(errorCode) : false;

  logger.warn(
    {
      bookingId: metadata.bookingId,
      paymentType: metadata.paymentType,
      errorCode,
      isTerminal,
      lastPaymentError: pi.last_payment_error?.message,
    },
    "Payment intent failed",
  );

  // R23-S-ALTA-3: solo terminal errors triggerano cleanup PENDING.
  // Non-terminal (authentication_required, processing_error) → il cliente
  // puo' retry stesso PI. Terminal → cliente deve nuovo PI (R15-UX-1
  // flow), vecchio booking non recuperabile → release slot subito invece
  // di aspettare pending-gc 30min.
  if (!isTerminal) return;

  // Solo DEPOSIT/FULL triggerano PENDING cleanup — BALANCE PI failure
  // lascia booking CONFIRMED (cliente ha gia' pagato deposit).
  if (metadata.paymentType === "BALANCE") return;

  await cleanupPendingAfterPiFailure(metadata.bookingId, { errorCode, reason: "pi_failed" });
}

/**
 * R23-P2-ALTA-1: cleanup helper condiviso tra `onPaymentIntentFailed` e
 * `onPaymentIntentCanceled`. Gestisce il drift scenario: primo attempt
 * fa updateMany (PENDING→CANCELLED) + releaseDates throw (Redis down).
 * Su retry Stripe, updateMany ritornerebbe count=0 (gia' CANCELLED) →
 * releaseDates verrebbe skippato → slot BLOCKED permanente (pending-gc
 * scansiona solo status=PENDING, non recupera).
 *
 * Soluzione: leggiamo il booking prima; se PENDING transition; se gia'
 * CANCELLED (da prior attempt) ri-chiamiamo releaseDates comunque —
 * l'operazione e' idempotente (updateAvailability AVAILABLE su cella
 * gia' AVAILABLE e' no-op). Re-throw sugli errori → Stripe retry
 * continuera' finche' il cleanup completo va a buon fine.
 */
async function cleanupPendingAfterPiFailure(
  bookingId: string,
  ctx: { errorCode?: string | null; reason: string },
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, status: true, boatId: true, startDate: true, endDate: true },
  });
  if (!booking) {
    logger.warn({ bookingId }, "Booking not found for PI cleanup — ignored");
    return;
  }
  // CONFIRMED or REFUNDED: skip (altro flow ha gia' agito su di lui).
  if (booking.status === "CONFIRMED" || booking.status === "REFUNDED") {
    logger.info(
      { bookingId, status: booking.status },
      "Booking not cancelable for PI cleanup (already CONFIRMED/REFUNDED)",
    );
    return;
  }
  // Transition PENDING → CANCELLED se applicabile (idempotent: se gia'
  // CANCELLED, updateMany count=0 senza errore).
  if (booking.status === "PENDING") {
    await db.booking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  }
  // releaseDates sempre — idempotent, recovery-safe su retry Stripe.
  const { releaseDates } = await import("@/lib/availability/service");
  const { CHANNELS } = await import("@/lib/channels");
  await releaseDates(booking.boatId, booking.startDate, booking.endDate, CHANNELS.DIRECT);
  logger.info(
    { bookingId, ...ctx },
    "Booking cleanup completed after PI failure/cancel",
  );
}

/**
 * R23-S-ALTA-1: gestore `payment_intent.canceled`. Stripe emette questo
 * evento quando:
 *  - il PI raggiunge 24h in `requires_payment_method` (auto-cancel Stripe)
 *  - admin chiama `cancelPaymentIntent` via R10 BL-C3 flow
 * In entrambi i casi il booking PENDING deve essere CANCELLED + slot rilasciato.
 */
async function onPaymentIntentCanceled(pi: Stripe.PaymentIntent): Promise<void> {
  let metadata;
  try {
    metadata = parseBookingMetadata(pi.metadata);
  } catch {
    logger.info({ piId: pi.id }, "PI canceled without booking metadata — ignored");
    return;
  }

  // BALANCE PI cancellato: booking resta CONFIRMED (deposit gia' pagato).
  // Solo DEPOSIT/FULL triggerano cleanup.
  if (metadata.paymentType === "BALANCE") {
    logger.info(
      { bookingId: metadata.bookingId, piId: pi.id },
      "BALANCE PI canceled — booking resta CONFIRMED",
    );
    return;
  }

  // R23-P2-ALTA-1: usa helper condiviso (drift-safe).
  await cleanupPendingAfterPiFailure(metadata.bookingId, {
    errorCode: pi.id,
    reason: "pi_canceled",
  });
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({
    where: { stripeChargeId: charge.id },
    include: { booking: true },
  });
  // R13-ALTA: se charge.refunded arriva PRIMA di payment_intent.succeeded
  // (rare network race Stripe workers), il Payment non esiste ancora. Se
  // ritornassimo silenziosamente, l'evento finirebbe in ProcessedStripeEvent
  // e il refund verrebbe perso → slot CONFIRMED + BLOCKED senza rimborso.
  // Throw → Stripe retry fino a 3 giorni; al retry il succeeded avra' gia'
  // creato il Payment.
  if (!payment) {
    throw new ValidationError(
      "Payment not found for refund (likely out-of-order Stripe webhook); retry will resolve",
    );
  }

  // R23-S-CRITICA-2 / R23-B-CRITICA-1: dual-write pattern (come admin
  // cancelBooking). Overwrite `Payment.status=REFUNDED` + `stripeRefundId`
  // sull'originale causava:
  //  1. revenue per mese retroattivo (groupBy status=SUCCEEDED esclude il
  //     mese originale → audit fiscale art. 2220 c.c. rotto)
  //  2. `stripeRefundId` sovrascritto su partial refund multipli → solo
  //     il primo refundId persistito, il secondo perso
  //  3. mismatch con cancelBooking admin path che crea REFUND sibling rows
  // Ora: (a) insert sibling Payment(type=REFUND) idempotent via unique
  // stripeRefundId, (b) update original→REFUNDED **solo** su full refund
  // (partial lascia SUCCEEDED), (c) update booking→REFUNDED solo full.

  // R27-CRIT-5: `charge.amount_refunded` e' CUMULATIVO. Su partial refund
  // multipli (admin fa 3 refund €50 + €100 + €100 via dashboard Stripe),
  // l'event emesso ad ogni operazione portava a sibling REFUND scritti con
  // il TOTALE cumulativo (50, 150, 250) invece del delta (50, 100, 100) →
  // KPI finanza double-count. Ora leggiamo l'amount del singolo refund dal
  // refund object associato all'event (Stripe Events API: in charge.refunded
  // il nuovo refund e' il primo di `refunds.data`, sorted newest first).
  const refund = charge.refunds?.data[0];
  const refundId = refund?.id;
  const refundAmountCents = refund?.amount ?? charge.amount_refunded;
  const isFullRefund = charge.amount_refunded === charge.amount;

  // Idempotency: se sibling REFUND con stesso stripeRefundId esiste, webhook
  // replay. Skip senza throw — dedup ProcessedStripeEvent gia' gestisce
  // event replay, questo copre partial refund multipli con stesso refund.
  if (refundId) {
    const existingRefund = await db.payment.findUnique({
      where: { stripeRefundId: refundId },
    });
    if (existingRefund) {
      logger.info(
        { refundId, paymentId: payment.id },
        "Refund already recorded — idempotent skip",
      );
      return;
    }
  }

  await db.$transaction(async (tx) => {
    // (a) sibling REFUND row — audit fiscale per mese del rimborso.
    //     `stripeChargeId` NULL per evitare unique collision con original.
    await tx.payment.create({
      data: {
        bookingId: payment.bookingId,
        amount: (refundAmountCents / 100).toFixed(2),
        currency: payment.currency,
        type: "REFUND",
        method: "STRIPE",
        status: "REFUNDED",
        stripeChargeId: null,
        stripeRefundId: refundId,
        note: `Stripe refund of charge ${charge.id}${isFullRefund ? " (full)" : " (partial)"}`,
        processedAt: new Date(),
      },
    });

    // (b) update original **solo** full refund. Partial → originale resta
    //     SUCCEEDED (il cliente ha ancora valore residuo).
    if (isFullRefund && payment.status !== "REFUNDED") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    }

    // (c) booking → REFUNDED solo full refund.
    if (isFullRefund && payment.booking.status !== "REFUNDED") {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: "REFUNDED" },
      });
    }
  });

  // Fan-out release FUORI dalla tx (side-effect su availability+BullMQ).
  // Solo per full refund: partial refund mantiene lo slot perche' il
  // booking e' ancora attivo, il cliente riceve solo parziale rimborso.
  if (isFullRefund) {
    try {
      const { releaseDates } = await import("@/lib/availability/service");
      const { CHANNELS } = await import("@/lib/channels");
      await releaseDates(
        payment.booking.boatId,
        payment.booking.startDate,
        payment.booking.endDate,
        CHANNELS.DIRECT,
      );
    } catch (err) {
      // Log ma non throw: il refund Stripe e' gia' committato. Admin
      // dovra' rilasciare manualmente il calendario se questo fallisce.
      logger.error(
        { err, bookingId: payment.bookingId },
        "Availability release after refund failed — manual admin action required",
      );
    }
  }

  logger.info(
    {
      paymentId: payment.id,
      chargeId: charge.id,
      bookingId: payment.bookingId,
      isFullRefund,
    },
    "Payment refunded",
  );
}

/**
 * R27-CRIT-4: chargeback handler. Stripe emette `charge.dispute.created`
 * quando la banca del cliente apre una contestazione (carta rubata, prodotto
 * non ricevuto, frode). L'evento triggera:
 *  - notify admin sincrono (email + telegram se configurato)
 *  - log persistente via audit log per tracking response deadline
 *  - NO release automatico: il booking potrebbe essere legit (winnable),
 *    rilasciare lo slot aprirebbe a prenotazione duplicata mentre la
 *    disputa e' in corso.
 *
 * Quando la disputa si chiude come "lost", Stripe emette `charge.refunded`
 * (gia' gestito) che propaga il refund normale + releaseDates.
 */
async function onChargeDispute(
  dispute: Stripe.Dispute,
  eventType: string,
): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    logger.warn({ disputeId: dispute.id }, "Dispute without charge reference — skipped");
    return;
  }

  const payment = await db.payment.findFirst({
    where: { stripeChargeId: chargeId },
    include: {
      booking: {
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          service: { select: { name: true } },
        },
      },
    },
  });
  if (!payment) {
    logger.warn(
      { disputeId: dispute.id, chargeId },
      "Dispute on unknown charge — likely booking deleted or never imported",
    );
    return;
  }

  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : null;

  logger.error(
    {
      disputeId: dispute.id,
      chargeId,
      bookingId: payment.bookingId,
      confirmationCode: payment.booking.confirmationCode,
      disputeStatus: dispute.status,
      disputeReason: dispute.reason,
      disputeAmountCents: dispute.amount,
      eventType,
      evidenceDueBy,
    },
    "STRIPE DISPUTE — admin action required",
  );

  try {
    await dispatchNotification({
      type: "PAYMENT_FAILED",
      channels: defaultNotificationChannels(),
      payload: {
        confirmationCode: payment.booking.confirmationCode,
        customerName:
          `${payment.booking.customer?.firstName ?? ""} ${payment.booking.customer?.lastName ?? ""}`.trim() ||
          "n/a",
        serviceName: payment.booking.service?.name ?? "n/a",
        startDate: payment.booking.startDate.toISOString().slice(0, 10),
        amount: formatEurCents(dispute.amount),
        reason: `DISPUTE ${eventType.replace("charge.dispute.", "")} · reason=${dispute.reason} · status=${dispute.status}${evidenceDueBy ? ` · evidence_due=${evidenceDueBy}` : ""}`,
      },
    });
  } catch (err) {
    logger.warn({ err, disputeId: dispute.id }, "Dispute notification failed (non-blocking)");
  }
}
