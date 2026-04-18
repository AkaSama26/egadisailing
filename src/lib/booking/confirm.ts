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
        await tx.directBooking.update({
          where: { bookingId: booking.id },
          data: updateData,
        });
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
