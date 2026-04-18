import type Stripe from "stripe";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { toCents, formatEur, formatEurCents } from "@/lib/pricing/cents";
import { parseBookingMetadata } from "./metadata";

/**
 * Handler dei webhook Stripe. Event-level idempotency via tabella
 * ProcessedStripeEvent — duplicate event.id ritorna early.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Stripe event received");

  // Event-level idempotency: insert con chiave primaria event.id.
  // Se esiste, P2002 → early return.
  try {
    await db.processedStripeEvent.create({
      data: { eventId: event.id, eventType: event.type },
    });
  } catch (err) {
    const message = (err as Error).message ?? "";
    if (message.includes("Unique constraint") || message.includes("P2002")) {
      logger.info({ eventId: event.id }, "Duplicate Stripe event, skipping");
      return;
    }
    throw err;
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
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const metadata = parseBookingMetadata(pi.metadata);

  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  if (!charge) {
    logger.error({ piId: pi.id }, "PaymentIntent succeeded but no latest_charge");
    return;
  }

  // Amount verification: confronta con valore atteso in DB.
  // Previene spoofing di metadata su PI con amount_received arbitrario.
  const booking = await db.booking.findUnique({
    where: { id: metadata.bookingId },
    include: { directBooking: true },
  });
  if (!booking) {
    logger.error({ bookingId: metadata.bookingId }, "Booking not found for PI");
    return;
  }
  if (!booking.directBooking) {
    logger.error({ bookingId: metadata.bookingId }, "DirectBooking missing");
    return;
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
    logger.error(
      {
        bookingId: metadata.bookingId,
        paymentType: metadata.paymentType,
        expectedCents,
        actualCents: pi.amount_received,
      },
      "Payment amount mismatch — NOT confirming booking. Manual review required.",
    );
    return;
  }

  await confirmDirectBookingAfterPayment({
    bookingId: metadata.bookingId,
    stripePaymentIntentId: pi.id,
    stripeChargeId: charge,
    amountCents: pi.amount_received,
    paymentType: metadata.paymentType,
  });

  // Email di conferma: solo al primo pagamento (non al saldo).
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

  const { subject, html } = bookingConfirmationTemplate({
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
  });
}

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata?.bookingId;
  if (!bookingId) return;
  logger.warn(
    { bookingId, lastPaymentError: pi.last_payment_error?.message },
    "Payment intent failed",
  );
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({ where: { stripeChargeId: charge.id } });
  if (!payment) return;
  // Idempotent: se gia' REFUNDED non fare nulla
  if (payment.status === "REFUNDED") return;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "REFUNDED",
      stripeRefundId: charge.refunds?.data[0]?.id,
    },
  });
  logger.info({ paymentId: payment.id, chargeId: charge.id }, "Payment marked as refunded");
}
