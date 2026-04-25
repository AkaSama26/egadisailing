import type Stripe from "stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { refundPayment } from "../payment-intents";

/**
 * Round 10 BL-C3: race admin-cancel vs stripe-webhook. Se il booking e'
 * gia' stato cancellato dall'admin mentre il PI era in "processing",
 * NON confermiamo e facciamo auto-refund del charge appena arrivato.
 * Senza questo fix, il cliente pagava ma il booking restava CANCELLED
 * senza refund automatico.
 *
 * Round 11 Reg-C2: NO stripeChargeId/stripeRefundId sul record REFUND
 * per non violare gli unique index (il charge e' nuovo ma il refund id
 * potrebbe collidere con futuri record). Identificatori preservati in `note`.
 *
 * Stripe refund e' idempotent per charge (stripe.refunds.create non duplica
 * se esiste gia' su charge fully-refunded) quindi retry e' safe.
 */
export async function handleAutoRefundOnConfirmedToCancelled(args: {
  bookingId: string;
  bookingStatus: string;
  charge: string;
  pi: Stripe.PaymentIntent;
}): Promise<void> {
  const { bookingId, bookingStatus, charge, pi } = args;
  logger.warn(
    { bookingId, status: bookingStatus, piId: pi.id, charge },
    "Stripe webhook for already-cancelled booking — auto-refunding",
  );
  const ref = await refundPayment(charge);
  await db.payment.create({
    data: {
      bookingId,
      amount: (pi.amount_received / 100).toFixed(2),
      type: "REFUND",
      method: "STRIPE",
      status: "REFUNDED",
      processedAt: new Date(),
      note: `Auto-refund race admin-cancel vs stripe-succeeded · charge=${charge} · refund=${ref.id} · pi=${pi.id}`,
    },
  });
}
