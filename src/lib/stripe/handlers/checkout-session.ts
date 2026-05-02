import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import {
  attachCheckoutSessionToPendingDirectBooking,
  cancelPendingDirectBookingAndReleaseHold,
} from "@/lib/booking/direct-availability-hold";

function paymentIntentIdFromSession(session: Stripe.Checkout.Session): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

function bookingIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.bookingId || null;
}

export async function onCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const bookingId = bookingIdFromSession(session);
  if (!bookingId) {
    logger.warn({ checkoutSessionId: session.id }, "Checkout completed without booking reference");
    return;
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  await attachCheckoutSessionToPendingDirectBooking({
    bookingId,
    checkoutSessionId: session.id,
    checkoutSessionExpiresAt: session.expires_at
      ? new Date(session.expires_at * 1000)
      : null,
    paymentIntentId,
  });

  logger.info(
    {
      bookingId,
      checkoutSessionId: session.id,
      paymentIntentId,
      paymentStatus: session.payment_status,
    },
    "Checkout Session completed observed",
  );
}

export async function onCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
  const bookingId = bookingIdFromSession(session);
  if (!bookingId) {
    logger.warn({ checkoutSessionId: session.id }, "Checkout expired without booking reference");
    return;
  }

  if (session.payment_status === "paid") {
    logger.info(
      { bookingId, checkoutSessionId: session.id },
      "Checkout expired event ignored because session is paid",
    );
    return;
  }

  await cancelPendingDirectBookingAndReleaseHold({
    bookingId,
    reason: "checkout_session_expired",
  });

  logger.info(
    { bookingId, checkoutSessionId: session.id },
    "Checkout Session expired cleanup completed",
  );
}
