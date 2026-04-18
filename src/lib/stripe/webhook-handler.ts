import type Stripe from "stripe";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toCents, formatEur, formatEurCents } from "@/lib/pricing/cents";
import { parseBookingMetadata } from "./metadata";
import { ValidationError } from "@/lib/errors";

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
    case "charge.refunded":
      await onChargeRefunded(event.data.object);
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
    const message = (err as Error).message ?? "";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
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
  }
}

async function sendConfirmationEmail(bookingId: string, paidCents: number): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true, directBooking: true },
  });
  if (!booking) return;

  const { subject, html, text } = bookingConfirmationTemplate({
    customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    confirmationCode: booking.confirmationCode,
    serviceName: booking.service.name,
    startDate: booking.startDate.toLocaleDateString("it-IT"),
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

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  // Tolerant metadata parsing: se il PI era orfano (no booking), logga e basta.
  try {
    const metadata = parseBookingMetadata(pi.metadata);
    logger.warn(
      {
        bookingId: metadata.bookingId,
        paymentType: metadata.paymentType,
        lastPaymentError: pi.last_payment_error?.message,
      },
      "Payment intent failed",
    );
  } catch {
    logger.warn(
      { piId: pi.id, lastPaymentError: pi.last_payment_error?.message },
      "Payment intent failed without bookingId metadata",
    );
  }
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({
    where: { stripeChargeId: charge.id },
    include: { booking: true },
  });
  if (!payment) return;
  if (payment.status === "REFUNDED") return;

  // Full refund se `amount_refunded === amount`. Partial refund: NON
  // rilasciamo availability (il cliente sta ancora venendo).
  const isFullRefund = charge.amount_refunded === charge.amount;

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        stripeRefundId: charge.refunds?.data[0]?.id,
      },
    });

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
