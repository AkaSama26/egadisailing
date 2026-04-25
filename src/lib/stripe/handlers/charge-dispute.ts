import type Stripe from "stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formatEurCents } from "@/lib/pricing/cents";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";

/**
 * R27-CRIT-4: chargeback handler. Stripe emette `charge.dispute.created`
 * quando la banca del cliente apre una contestazione (carta rubata, prodotto
 * non ricevuto, frode). L'evento triggera:
 *  - notify admin sincrono (email + telegram se configurato)
 *  - log persistente via audit log per tracking response deadline
 *  - NO release automatico: il booking potrebbe essere legit (winnable),
 *    rilasciare lo slot aprirebbe a prenotazione duplicata mentre la
 *    disputa e' in corso.
 *
 * Quando la disputa si chiude come "lost", Stripe emette `charge.refunded`
 * (gia' gestito) che propaga il refund normale + releaseDates.
 */
export async function onChargeDispute(
  dispute: Stripe.Dispute,
  eventType: string,
): Promise<void> {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) {
    logger.warn({ disputeId: dispute.id }, "Dispute without charge reference — skipped");
    return;
  }

  const payment = await db.payment.findFirst({
    where: { stripeChargeId: chargeId },
    include: {
      booking: {
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          service: { select: { name: true } },
        },
      },
    },
  });
  if (!payment) {
    logger.warn(
      { disputeId: dispute.id, chargeId },
      "Dispute on unknown charge — likely booking deleted or never imported",
    );
    return;
  }

  const evidenceDueBy = dispute.evidence_details?.due_by
    ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
    : null;

  logger.error(
    {
      disputeId: dispute.id,
      chargeId,
      bookingId: payment.bookingId,
      confirmationCode: payment.booking.confirmationCode,
      disputeStatus: dispute.status,
      disputeReason: dispute.reason,
      disputeAmountCents: dispute.amount,
      eventType,
      evidenceDueBy,
    },
    "STRIPE DISPUTE — admin action required",
  );

  try {
    await dispatchNotification({
      type: "PAYMENT_FAILED",
      channels: defaultNotificationChannels(),
      payload: {
        confirmationCode: payment.booking.confirmationCode,
        customerName:
          `${payment.booking.customer?.firstName ?? ""} ${payment.booking.customer?.lastName ?? ""}`.trim() ||
          "n/a",
        serviceName: payment.booking.service?.name ?? "n/a",
        startDate: payment.booking.startDate.toISOString().slice(0, 10),
        amount: formatEurCents(dispute.amount),
        reason: `DISPUTE ${eventType.replace("charge.dispute.", "")} · reason=${dispute.reason} · status=${dispute.status}${evidenceDueBy ? ` · evidence_due=${evidenceDueBy}` : ""}`,
      },
    });
  } catch (err) {
    logger.warn({ err, disputeId: dispute.id }, "Dispute notification failed (non-blocking)");
  }
}
