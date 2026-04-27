import type Stripe from "stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const payment = await db.payment.findFirst({
    where: { stripeChargeId: charge.id },
    include: {
      booking: { include: { service: { select: { type: true } } } },
    },
  });
  // R13-ALTA: se charge.refunded arriva PRIMA di payment_intent.succeeded
  // (rare network race Stripe workers), il Payment non esiste ancora. Se
  // ritornassimo silenziosamente, l'evento finirebbe in ProcessedStripeEvent
  // e il refund verrebbe perso → slot CONFIRMED + BLOCKED senza rimborso.
  // Throw → Stripe retry fino a 3 giorni; al retry il succeeded avra' gia'
  // creato il Payment.
  if (!payment) {
    throw new ValidationError(
      "Payment not found for refund (likely out-of-order Stripe webhook); retry will resolve",
    );
  }

  // R23-S-CRITICA-2 / R23-B-CRITICA-1: dual-write pattern (come admin
  // cancelBooking). Overwrite `Payment.status=REFUNDED` + `stripeRefundId`
  // sull'originale causava:
  //  1. revenue per mese retroattivo (groupBy status=SUCCEEDED esclude il
  //     mese originale → audit fiscale art. 2220 c.c. rotto)
  //  2. `stripeRefundId` sovrascritto su partial refund multipli → solo
  //     il primo refundId persistito, il secondo perso
  //  3. mismatch con cancelBooking admin path che crea REFUND sibling rows
  // Ora: (a) insert sibling Payment(type=REFUND) idempotent via unique
  // stripeRefundId, (b) update original→REFUNDED **solo** su full refund
  // (partial lascia SUCCEEDED), (c) update booking→REFUNDED solo full.

  // R27-CRIT-5 + R28-ALTA-2: `charge.amount_refunded` e' CUMULATIVO; `refunds.data`
  // contiene TUTTI i refund del charge (Stripe Events API). Ordering `data[]`
  // non e' documentato garantito newest-first → pattern R27 di prendere
  // `data[0]` era fragile.
  //
  // Pattern robusto find-by-not-exists: il NUOVO refund e' quello non ancora
  // registrato come sibling Payment. Idempotency via unique stripeRefundId.
  const allRefunds = charge.refunds?.data ?? [];
  if (allRefunds.length === 0) {
    throw new ValidationError(
      "charge.refunded event without refunds.data — malformed payload",
    );
  }
  const chargeRefundIds = allRefunds.map((r) => r.id);
  const alreadyRecorded = await db.payment.findMany({
    where: { stripeRefundId: { in: chargeRefundIds } },
    select: { stripeRefundId: true },
  });
  const recordedSet = new Set(
    alreadyRecorded.map((p) => p.stripeRefundId).filter((id): id is string => !!id),
  );
  // Trova il nuovo refund: quello non ancora in DB, piu' recente per created
  // (deterministico anche se piu' di uno e' pending registration).
  const newRefund = allRefunds
    .filter((r) => !recordedSet.has(r.id))
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))[0];
  if (!newRefund) {
    // Webhook replay di event gia' processato — tutti i refund registrati.
    // ProcessedStripeEvent dedup gia' previene ma defense-in-depth.
    logger.info(
      { chargeId: charge.id, refundIds: chargeRefundIds },
      "charge.refunded replay — all refunds already recorded, skipping",
    );
    return;
  }
  const refund = newRefund;
  const refundId = refund.id;
  const refundAmountCents = refund.amount;
  const isFullRefund = charge.amount_refunded === charge.amount;

  // R28-ALTA-2: idempotency gia' garantita dal find-by-not-exists sopra
  // (filter `!recordedSet.has(r.id)`). Il check legacy findUnique+return
  // e' ridondante e aggiungeva 1 query inutile.

  await db.$transaction(async (tx) => {
    // (a) sibling REFUND row — audit fiscale per mese del rimborso.
    //     `stripeChargeId` NULL per evitare unique collision con original.
    await tx.payment.create({
      data: {
        bookingId: payment.bookingId,
        amount: (refundAmountCents / 100).toFixed(2),
        currency: payment.currency,
        type: "REFUND",
        method: "STRIPE",
        status: "REFUNDED",
        stripeChargeId: null,
        stripeRefundId: refundId,
        note: `Stripe refund of charge ${charge.id}${isFullRefund ? " (full)" : " (partial)"}`,
        processedAt: new Date(),
      },
    });

    // (b) update original **solo** full refund. Partial → originale resta
    //     SUCCEEDED (il cliente ha ancora valore residuo).
    if (isFullRefund && payment.status !== "REFUNDED") {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    }

    // (c) booking → REFUNDED solo full refund.
    if (isFullRefund && payment.booking.status !== "REFUNDED") {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { status: "REFUNDED" },
      });
    }
  });

  // Fan-out release FUORI dalla tx (side-effect su availability+BullMQ).
  // Solo per full refund: partial refund mantiene lo slot perche' il
  // booking e' ancora attivo, il cliente riceve solo parziale rimborso.
  if (isFullRefund) {
    try {
      const { reconcileBoatDatesFromActiveBookings, releaseBookingDates } = await import("@/lib/availability/service");
      const { CHANNELS } = await import("@/lib/channels");
      const { isBoatSharedServiceType } = await import("@/lib/booking/boat-slot-availability");
      if (isBoatSharedServiceType(payment.booking.service.type)) {
        await reconcileBoatDatesFromActiveBookings({
          boatId: payment.booking.boatId,
          startDate: payment.booking.startDate,
          endDate: payment.booking.endDate,
          sourceChannel: CHANNELS.DIRECT,
        });
      } else {
        await releaseBookingDates({
          bookingId: payment.bookingId,
          boatId: payment.booking.boatId,
          startDate: payment.booking.startDate,
          endDate: payment.booking.endDate,
          sourceChannel: CHANNELS.DIRECT,
        });
      }
    } catch (err) {
      // Log ma non throw: il refund Stripe e' gia' committato. Admin
      // dovra' rilasciare manualmente il calendario se questo fallisce.
      logger.error(
        { err, bookingId: payment.bookingId },
        "Availability release after refund failed — manual admin action required",
      );
    }
  }

  logger.info(
    {
      paymentId: payment.id,
      chargeId: charge.id,
      bookingId: payment.bookingId,
      isFullRefund,
    },
    "Payment refunded",
  );
}
