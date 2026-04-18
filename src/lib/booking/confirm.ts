import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { blockDates } from "@/lib/availability/service";
import { logger } from "@/lib/logger";
import { NotFoundError } from "@/lib/errors";
import { CHANNELS } from "@/lib/channels";

/**
 * Chiamata dal webhook Stripe quando un Payment Intent va a buon fine.
 *
 * Idempotente: se Payment con lo stesso chargeId esiste, non fa nulla.
 * In transazione: update Booking + update DirectBooking + create Payment.
 * Dopo il commit: blockDates() triggera fan-out availability ai canali esterni.
 */
export async function confirmDirectBookingAfterPayment(params: {
  bookingId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string;
  amountCents: number;
  paymentType: "FULL" | "DEPOSIT" | "BALANCE";
}): Promise<void> {
  const existing = await db.payment.findFirst({
    where: { stripeChargeId: params.stripeChargeId },
  });
  if (existing) {
    logger.info(
      { chargeId: params.stripeChargeId, bookingId: params.bookingId },
      "Payment already processed, skipping",
    );
    return;
  }

  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: { directBooking: true },
  });
  if (!booking) throw new NotFoundError("Booking", params.bookingId);

  const wasAlreadyConfirmed = booking.status === "CONFIRMED";
  const amountDecimal = new Decimal(params.amountCents).div(100);

  await db.$transaction(async (tx) => {
    if (!wasAlreadyConfirmed) {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });
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
        type: params.paymentType === "BALANCE" ? "BALANCE" : params.paymentType === "FULL" ? "FULL" : "DEPOSIT",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: params.stripeChargeId,
        processedAt: new Date(),
      },
    });
  });

  // Blocca availability per il range della booking. Primo pagamento solo.
  if (!wasAlreadyConfirmed) {
    await blockDates(
      booking.boatId,
      booking.startDate,
      booking.endDate,
      CHANNELS.DIRECT,
      booking.id,
    );
  }

  logger.info(
    { bookingId: booking.id, confirmationCode: booking.confirmationCode },
    "Direct booking confirmed",
  );
}
