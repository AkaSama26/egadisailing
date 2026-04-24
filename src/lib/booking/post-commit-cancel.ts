import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { refundPayment, getChargeRefundState } from "@/lib/stripe/payment-intents";
import { releaseDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { auditLog } from "@/lib/audit/log";
import { fromCents } from "@/lib/pricing/cents";

/**
 * Helper condiviso per side-effect post-commit dopo cancel di un Booking
 * nel contesto del meccanismo di priority override (Fase 1).
 *
 * Call-site pianificati (Chunk 2a):
 *  - `approveOverride`    → cancella i conflicting booking
 *  - `rejectOverride`     → cancella il newBooking
 *  - `expireDropDead`     → cancella il newBooking (cron)
 *  - `supersedeInferiorRequest` → cancella i newBooking inferior
 *
 * Pattern (R10 BL-M4):
 *  1. Il caller updata `Booking.status = "CANCELLED"` DENTRO la tx principale
 *     (override approval / reject / expire) — NON qui.
 *  2. Dopo commit, chiama `postCommitCancelBooking` per Stripe refund +
 *     release availability + audit log.
 *  3. Error-tolerant: fallimenti Stripe/availability raccolti e ritornati,
 *     MAI throw — un refund fallito NON deve bloccare l'override flow
 *     (l'admin dovra' riprovare manualmente). Il caller puo' ispezionare
 *     `refundsFailed[]` per dispatch notification/alert.
 *
 * Differenze vs admin `cancelBooking` (`src/app/admin/(dashboard)/prenotazioni/actions.ts`):
 *  - NON throw su refund failure (admin-cancel invece blocca il DB update —
 *    qui il DB update e' gia' avvenuto nella tx principale del caller).
 *  - NON crea ManualAlert per source != DIRECT (responsabilita' del caller
 *    decidere se l'evento override richiede alert upstream — dipende dal
 *    motivo: `override_approved` non richiede alert, `override_rejected`
 *    forse si').
 *  - NON dispatcha notification customer (responsabilita' del caller per
 *    template differenziato per reason).
 *  - NON crea sibling Payment REFUND (Round 10 Int-C1): questo helper e'
 *    focalizzato sullo stato tecnico (Stripe charge + availability). Se
 *    l'audit finanza richiedera' sibling REFUND per override flow, sara'
 *    il caller a crearlo nella tx principale (coerente con cancel admin).
 *  - Usa `CHANNELS.DIRECT` per il fan-out release: consistent con admin-cancel
 *    (Round 10 BL-C2 + Int-M3) — un override decision e' source DIRECT.
 *
 * PRECONDITION: caller MUST commit `booking.status = CANCELLED` within the same
 * tx that decided the cancellation. Guard at function head throws if status is
 * not CANCELLED (fail-fast instead of silent side-effects on race).
 */

export interface PostCommitCancelInput {
  bookingId: string;
  /** Actor admin (id) o null/undefined per azione automatica (cron). */
  actorUserId?: string | null;
  /** Motivo della cancellazione (audit log + logger). */
  reason:
    | "override_approved"
    | "override_rejected"
    | "override_expired"
    | "override_superseded";
}

export interface PostCommitCancelResult {
  bookingId: string;
  refundsAttempted: number;
  refundsSucceeded: number;
  refundsFailed: Array<{ paymentId: string; message: string }>;
  releaseOk: boolean;
}

export async function postCommitCancelBooking(
  input: PostCommitCancelInput,
): Promise<PostCommitCancelResult> {
  const booking = await db.booking.findUnique({
    where: { id: input.bookingId },
    include: { payments: true },
  });
  if (!booking) {
    throw new Error(`postCommitCancelBooking: booking ${input.bookingId} not found`);
  }

  if (booking.status !== "CANCELLED") {
    logger.error(
      { bookingId: booking.id, actualStatus: booking.status, reason: input.reason },
      "postCommitCancelBooking: booking not CANCELLED — race window detected, skipping side-effects",
    );
    throw new Error(
      `postCommitCancelBooking: booking ${input.bookingId} has status ${booking.status}, expected CANCELLED. Caller must commit CANCELLED before calling.`,
    );
  }

  const result: PostCommitCancelResult = {
    bookingId: input.bookingId,
    refundsAttempted: 0,
    refundsSucceeded: 0,
    refundsFailed: [],
    releaseOk: true,
  };

  // 1. Refund Stripe — solo pagamenti SUCCEEDED con charge id, skip sibling
  // REFUND (type=REFUND non ha charge vero, ha note di correlation).
  // R27-CRIT-3 pattern: residualCents via `getChargeRefundState` per evitare
  // double-refund di partial refund gia' eseguiti da admin via dashboard.
  for (const p of booking.payments) {
    if (p.status !== "SUCCEEDED" || !p.stripeChargeId || p.type === "REFUND") {
      continue;
    }
    result.refundsAttempted++;
    try {
      const state = await getChargeRefundState(p.stripeChargeId);
      if (state.residualCents <= 0) {
        // Charge gia' fully refunded upstream — marca solo il record DB.
        await db.payment.update({
          where: { id: p.id },
          data: { status: "REFUNDED" },
        });
        logger.info(
          {
            paymentId: p.id,
            chargeId: p.stripeChargeId,
            refundedCents: state.refundedCents,
            reason: input.reason,
          },
          "postCommitCancelBooking: charge already fully refunded upstream",
        );
        result.refundsSucceeded++;
        continue;
      }
      await refundPayment(p.stripeChargeId, state.residualCents);
      await db.payment.update({
        where: { id: p.id },
        data: { status: "REFUNDED" },
      });
      logger.info(
        {
          paymentId: p.id,
          chargeId: p.stripeChargeId,
          residualCents: state.residualCents,
          residualAmount: fromCents(state.residualCents).toFixed(2),
          reason: input.reason,
          bookingId: booking.id,
        },
        "postCommitCancelBooking: refund succeeded",
      );
      result.refundsSucceeded++;
    } catch (err) {
      const message = (err as Error).message;
      result.refundsFailed.push({ paymentId: p.id, message });
      logger.error(
        { err, paymentId: p.id, bookingId: booking.id, reason: input.reason },
        "postCommitCancelBooking: refund failed",
      );
    }
  }

  // 2. Release availability — fan-out via CHANNELS.DIRECT a tutti gli esterni.
  // Error tolerant: log warn, flag releaseOk=false, continue (non blocca audit).
  try {
    await releaseDates(
      booking.boatId,
      booking.startDate,
      booking.endDate,
      CHANNELS.DIRECT,
    );
  } catch (err) {
    result.releaseOk = false;
    logger.error(
      { err, bookingId: booking.id, reason: input.reason },
      "postCommitCancelBooking: releaseDates failed",
    );
  }

  // 3. Audit log — azione dedicata per distinguere cancel-by-override da
  // cancel admin manuale. Failure-safe dentro auditLog.
  await auditLog({
    userId: input.actorUserId ?? undefined,
    action: "BOOKING_CANCELLED_BY_OVERRIDE",
    entity: "Booking",
    entityId: booking.id,
    after: {
      reason: input.reason,
      refundsAttempted: result.refundsAttempted,
      refundsSucceeded: result.refundsSucceeded,
      refundsFailed: result.refundsFailed.length,
      releaseOk: result.releaseOk,
    },
  });

  return result;
}
