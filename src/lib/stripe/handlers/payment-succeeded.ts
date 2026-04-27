import type Stripe from "stripe";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toCents, formatEur, formatEurCents } from "@/lib/pricing/cents";
import { parseBookingMetadata } from "../metadata";
import { ValidationError } from "@/lib/errors";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";
import { formatItDay } from "@/lib/dates";
import { bookingWithDetailsInclude } from "@/lib/booking/queries";
import { handleAutoRefundOnConfirmedToCancelled } from "./auto-refund";
import { buildTicketUrl } from "@/lib/booking/ticket";

export async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
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

  // Round 10 BL-C3: race admin-cancel vs stripe-webhook. Auto-refund extracted to helper.
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    try {
      await handleAutoRefundOnConfirmedToCancelled({
        bookingId: booking.id,
        bookingStatus: booking.status,
        charge,
        pi,
      });
    } catch (err) {
      // Se il refund fallisce qui, Stripe ritentera' il webhook.
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
    ticketUrl: buildTicketUrl(booking.confirmationCode),
  });

  await sendEmail({
    to: booking.customer.email,
    toName: `${booking.customer.firstName} ${booking.customer.lastName}`,
    subject,
    htmlContent: html,
    textContent: text,
  });
}
