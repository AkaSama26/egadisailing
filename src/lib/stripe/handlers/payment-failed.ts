import type Stripe from "stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseBookingMetadata } from "../metadata";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";

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

export async function onPaymentIntentFailed(pi: Stripe.PaymentIntent): Promise<void> {
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
export async function cleanupPendingAfterPiFailure(
  bookingId: string,
  ctx: { errorCode?: string | null; reason: string },
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      boatId: true,
      startDate: true,
      endDate: true,
      confirmationCode: true,
      service: { select: { type: true, name: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
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
  const { reconcileBoatDatesFromActiveBookings, releaseBookingDates } = await import("@/lib/availability/service");
  const { CHANNELS } = await import("@/lib/channels");
  const { isBoatSharedServiceType } = await import("@/lib/booking/boat-slot-availability");
  if (isBoatSharedServiceType(booking.service.type)) {
    await reconcileBoatDatesFromActiveBookings({
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  } else {
    await releaseBookingDates({
      bookingId: booking.id,
      boatId: booking.boatId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  }
  logger.info(
    { bookingId, ...ctx },
    "Booking cleanup completed after PI failure/cancel",
  );

  await dispatchNotification({
    type: "PAYMENT_FAILED",
    channels: defaultNotificationChannels(),
    payload: {
      confirmationCode: booking.confirmationCode,
      customerName:
        `${booking.customer.firstName ?? ""} ${booking.customer.lastName ?? ""}`.trim() ||
        "n/a",
      serviceName: booking.service.name,
      startDate: booking.startDate.toISOString().slice(0, 10),
      amount: "n/a",
      reason: `${ctx.reason}${ctx.errorCode ? ` · ${ctx.errorCode}` : ""}`,
    },
    emailIdempotencyKey: `payment-failed-cleanup:${bookingId}:${ctx.reason}`,
  }).catch((err) =>
    logger.warn({ err, bookingId }, "Payment failed admin notification failed"),
  );
}
