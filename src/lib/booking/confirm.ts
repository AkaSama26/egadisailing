import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { blockDates } from "@/lib/availability/service";
import { logger } from "@/lib/logger";
import { NotFoundError } from "@/lib/errors";
import { CHANNELS } from "@/lib/channels";
import { fromCents } from "@/lib/pricing/cents";
import type { PaymentType } from "@/lib/stripe/metadata";

/**
 * Chiamato dal webhook Stripe quando un Payment Intent va a buon fine.
 *
 * Idempotent a multiple layer:
 * 1. Event-level: handleStripeEvent filtra via ProcessedStripeEvent
 * 2. Charge-level: Payment.stripeChargeId ha UNIQUE constraint →
 *    il secondo INSERT fallisce silently
 * 3. Status-level: updateMany guard su status=PENDING per transizione atomica
 *
 * blockDates viene chiamato SOLO al primo CONFIRMED (transizione atomica).
 */
export async function confirmDirectBookingAfterPayment(params: {
  bookingId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string;
  amountCents: number;
  paymentType: PaymentType;
}): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: { directBooking: true },
  });
  if (!booking) throw new NotFoundError("Booking", params.bookingId);

  const amountDecimal = fromCents(params.amountCents);

  // Transizione atomica PENDING→CONFIRMED + create Payment.
  // updateMany ritorna count=1 solo al primo che vede status=PENDING.
  const statusChanged = await db.$transaction(async (tx) => {
    // Duplicate check sul chargeId: UNIQUE constraint previene doppio insert,
    // ma controlliamo esplicitamente per fare early return senza eccezione.
    const existing = await tx.payment.findFirst({
      where: { stripeChargeId: params.stripeChargeId },
    });
    if (existing) return false;

    let transitioned = false;
    if (params.paymentType !== "BALANCE") {
      const upd = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING" },
        data: { status: "CONFIRMED" },
      });
      transitioned = upd.count === 1;
    }

    if (booking.directBooking) {
      const updateData: Record<string, unknown> = {};
      if (booking.directBooking.stripePaymentIntentId !== params.stripePaymentIntentId) {
        updateData.stripePaymentIntentId = params.stripePaymentIntentId;
      }
      if (params.paymentType === "BALANCE") {
        updateData.balancePaidAt = new Date();
      }
      if (Object.keys(updateData).length > 0) {
        // R18-REG: dopo R17-SEC-#3 (stripePaymentIntentId @unique partial),
        // uno scenario edge (es. wizard-refresh race + Stripe resend PI id
        // riassociato a booking diverso per idempotency-key upstream) puo'
        // triggerare P2002. In quel caso: il PI gia' appartiene a un altro
        // booking → skippa l'update DirectBooking ma completa booking/Payment
        // in quanto la triple-dedup ProcessedStripeEvent ci garantisce
        // eventualmente di processare solo 1 webhook net.
        try {
          await tx.directBooking.update({
            where: { bookingId: booking.id },
            data: updateData,
          });
        } catch (err: unknown) {
          const e = err as { code?: string };
          if (e.code === "P2002") {
            logger.warn(
              { bookingId: booking.id },
              "DirectBooking stripePaymentIntentId collision (P2002) — skipping update",
            );
          } else {
            throw err;
          }
        }
      }
    }

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: amountDecimal.toFixed(2),
        type: params.paymentType,
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: params.stripeChargeId,
        processedAt: new Date(),
      },
    });

    return transitioned;
  });

  // blockDates SOLO se questo e' il primo a confermare (no double-block su
  // webhook retry / balance payment).
  if (statusChanged) {
    await blockDates(
      booking.boatId,
      booking.startDate,
      booking.endDate,
      CHANNELS.DIRECT,
      booking.id,
    );
  }

  logger.info(
    {
      bookingId: booking.id,
      confirmationCode: booking.confirmationCode,
      paymentType: params.paymentType,
      statusChanged,
    },
    "Direct booking payment processed",
  );
}
