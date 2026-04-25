import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { parseBookingMetadata } from "../metadata";
import { cleanupPendingAfterPiFailure } from "./payment-failed";

/**
 * R23-S-ALTA-1: gestore `payment_intent.canceled`. Stripe emette questo
 * evento quando:
 *  - il PI raggiunge 24h in `requires_payment_method` (auto-cancel Stripe)
 *  - admin chiama `cancelPaymentIntent` via R10 BL-C3 flow
 * In entrambi i casi il booking PENDING deve essere CANCELLED + slot rilasciato.
 */
export async function onPaymentIntentCanceled(pi: Stripe.PaymentIntent): Promise<void> {
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
