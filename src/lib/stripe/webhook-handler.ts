import type Stripe from "stripe";
import { confirmDirectBookingAfterPayment } from "@/lib/booking/confirm";
import { sendEmail } from "@/lib/email/brevo";
import { bookingConfirmationTemplate } from "@/lib/email/templates/booking-confirmation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  logger.info({ type: event.type, id: event.id }, "Stripe event received");

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
    case "checkout.session.completed":
      await onCheckoutSessionCompleted(event.data.object);
      break;
    default:
      logger.debug({ type: event.type }, "Unhandled stripe event");
  }
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const bookingId = pi.metadata.bookingId;
  const rawType = pi.metadata.paymentType;
  const paymentType: "FULL" | "DEPOSIT" | "BALANCE" =
    rawType === "BALANCE" ? "BALANCE" : rawType === "DEPOSIT" ? "DEPOSIT" : "FULL";

  if (!bookingId) {
    logger.warn({ piId: pi.id }, "PaymentIntent without bookingId metadata — skipping");
    return;
  }

  const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id;
  if (!charge) {
    logger.error({ piId: pi.id }, "PaymentIntent succeeded but no latest_charge");
    return;
  }

  await confirmDirectBookingAfterPayment({
    bookingId,
    stripePaymentIntentId: pi.id,
    stripeChargeId: charge,
    amountCents: pi.amount_received,
    paymentType,
  });

  // Solo la prima conferma (FULL o DEPOSIT) manda email conferma; BALANCE no.
  if (paymentType !== "BALANCE") {
    await sendConfirmationEmail(bookingId, pi.amount_received).catch((err) => {
      logger.error({ err, bookingId }, "Confirmation email failed (booking still confirmed)");
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
    totalPrice: `€${booking.totalPrice.toFixed(2)}`,
    paidAmount: `€${(paidCents / 100).toFixed(2)}`,
    balanceAmount: booking.directBooking?.balanceAmount
      ? `€${booking.directBooking.balanceAmount.toFixed(2)}`
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
  const bookingId = pi.metadata.bookingId;
  if (!bookingId) return;
  logger.warn(
    { bookingId, lastPaymentError: pi.last_payment_error?.message },
    "Payment intent failed",
  );
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({ where: { stripeChargeId: charge.id } });
  if (!payment) return;
  await db.payment.update({
    where: { id: payment.id },
    data: { status: "REFUNDED", stripeRefundId: charge.refunds?.data[0]?.id },
  });
  logger.info({ paymentId: payment.id, chargeId: charge.id }, "Payment marked as refunded");
}

async function onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Il balance payment link genera questo evento. Il payment_intent.succeeded
  // viene lanciato in parallelo, quindi la gestione avviene li.
  logger.info(
    { sessionId: session.id, paymentStatus: session.payment_status },
    "Checkout session completed",
  );
}
