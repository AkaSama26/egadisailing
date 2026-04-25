import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { blockDates } from "@/lib/availability/service";
import { logger } from "@/lib/logger";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { CHANNELS } from "@/lib/channels";
import { fromCents } from "@/lib/pricing/cents";
import type { PaymentType } from "@/lib/stripe/metadata";
import { transitionBookingStatus } from "./transition-status";

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
      // Phase 7: usa state-machine helper. Catch ConflictError per
      // distinguere idempotent (CONFIRMED) da race illegale
      // (CANCELLED/REFUNDED). Quest'ultimo path delega al webhook handler
      // (R10 BL-C3 auto-refund) via re-throw.
      try {
        await transitionBookingStatus(tx, {
          bookingId: booking.id,
          from: "PENDING",
          to: "CONFIRMED",
          reason: "stripe_succeeded",
        });
        transitioned = true;
      } catch (err) {
        if (err instanceof ConflictError) {
          const actual = err.context.actualStatus as string | undefined;
          if (actual === "CONFIRMED") {
            // Idempotent (webhook retry on already-confirmed booking).
            transitioned = false;
          } else {
            // Race illegale (CANCELLED/REFUNDED): admin ha cancellato dopo
            // che PI era processing. Re-throw → webhook handler triggera
            // auto-refund via R10 BL-C3 path.
            throw err;
          }
        } else {
          throw err;
        }
      }
    }

    if (booking.directBooking) {
      // R19-REG-ALTA: usiamo updateMany con OR clause invece di update+catch
      // P2002. Motivo: un P2002 dentro `$transaction` mette la sessione pg in
      // failed state (25P02) → ogni query successiva fallisce → rollback
      // totale anche se volevamo solo skip. updateMany con where
      // `OR: [{stripePaymentIntentId:null}, {=params.PI}]` non puo' mai
      // violare unique (modifica solo righe compatibili) → nessun P2002 →
      // tx prosegue pulita.
      // R19-REG-ALTA-2: NON sovrascrivere PI esistente (BALANCE PI diverso
      // dal DEPOSIT PI). Il DEPOSIT PI resta source of truth; il link al
      // BALANCE PI si ricava da Payment[type=BALANCE].stripeChargeId.
      const directUpdateData: Record<string, unknown> = {};
      if (params.paymentType === "BALANCE") {
        directUpdateData.balancePaidAt = new Date();
      }
      // Attach stripePaymentIntentId SOLO se currently null (primo attach).
      const res = await tx.directBooking.updateMany({
        where: {
          bookingId: booking.id,
          OR: [
            { stripePaymentIntentId: null },
            { stripePaymentIntentId: params.stripePaymentIntentId },
          ],
        },
        data: {
          ...directUpdateData,
          stripePaymentIntentId: params.stripePaymentIntentId,
        },
      });
      if (res.count === 0) {
        // Il booking ha gia' un PI diverso attaccato (DEPOSIT flow BALANCE
        // webhook, o race). Apply solo balancePaidAt senza toccare PI.
        if (Object.keys(directUpdateData).length > 0) {
          await tx.directBooking.update({
            where: { bookingId: booking.id },
            data: directUpdateData,
          });
        }
        logger.info(
          { bookingId: booking.id, incomingPI: params.stripePaymentIntentId },
          "DirectBooking PI already attached (likely BALANCE webhook) — preserved original",
        );
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

  // R20-A1-3: blockDates sempre chiamato (NON gated su `statusChanged`).
  // Scenario race risolto: webhook1 tx commit → crash PRIMA di blockDates.
  // webhook2 retry Stripe: findFirst stripeChargeId matcha Payment gia'
  // creato → return false → `statusChanged=false` → slot restava AVAILABLE
  // mentre booking CONFIRMED → overbook possibile. Ora blockDates e'
  // idempotente via self-echo window + noChange shortcut in
  // updateAvailability (Round 8 fix), quindi sempre-chiama e' safe.
  //
  // Per BALANCE payment: statusChanged=false perche' booking era gia'
  // CONFIRMED, ma blockDates su slot gia' BLOCKED → noChange → no-op,
  // ok.
  if (booking.status === "CONFIRMED" || statusChanged) {
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
