"use server";

import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { postCommitCancelBooking } from "../post-commit-cancel";
import { transitionBookingStatus } from "../transition-status";
import { dispatchNotification, toDispatchResult } from "@/lib/notifications/dispatcher";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getAlternativeDatesIso } from "../alternative-dates";

export interface RejectOverrideResult {
  rejected: true;
  refundOk: boolean;
  emailOk: boolean;
}

/**
 * Rifiuta un OverrideRequest.
 * Cancella il newBooking + refund + releaseDates + email al customer.
 * I conflicting booking NON vengono toccati (restano CONFIRMED — sono "protetti" dal rifiuto).
 */
export async function rejectOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
): Promise<RejectOverrideResult> {
  const request = await db.overrideRequest.findUnique({
    where: { id: requestId },
    include: {
      newBooking: {
        include: {
          customer: { select: { email: true, firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      },
    },
  });
  if (!request) throw new NotFoundError("OverrideRequest", requestId);
  if (request.status !== "PENDING") {
    throw new ValidationError(
      `OverrideRequest ${requestId} non è PENDING (stato: ${request.status}).`,
      { code: "OVERRIDE_REQUEST_NOT_PENDING", requestId, actualStatus: request.status },
    );
  }

  // DB tx: update request + cancel newBooking
  await db.$transaction(async (tx) => {
    await tx.overrideRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedByUserId: adminUserId,
        decisionNotes: notes,
      },
    });
    // Phase 7: state-machine helper. newBooking e' garantito PENDING dal
    // guard sopra (request.status === "PENDING" → newBooking PENDING per
    // invariant del flow override). Race illegale (es. cancelled
    // upstream) propaga ConflictError → l'azione admin fallisce
    // chiaramente.
    await transitionBookingStatus(tx, {
      bookingId: request.newBookingId,
      from: "PENDING",
      to: "CANCELLED",
      reason: "override_rejected",
    });
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { claimsAvailability: false },
    });
  });

  // Post-commit: refund + release + audit via helper condiviso
  const cancelOutcome = await postCommitCancelBooking({
    bookingId: request.newBookingId,
    actorUserId: adminUserId,
    reason: "override_rejected",
  });
  // refundOk: nessun fallimento (status==="ok") significa refund + release entrambi ok.
  const refundOk = cancelOutcome.status === "ok";

  // Email rejection via dispatcher (template override-rejected-winner)
  let emailOk = true;
  if (request.newBooking.customer?.email) {
    const alternativeDates = await getAlternativeDatesIso(
      request.newBooking.boatId,
      request.newBooking.startDate,
      3,
    );
    try {
      const outcome = await dispatchNotification({
        type: "OVERRIDE_REJECTED",
        channels: ["EMAIL"],
        recipientEmail: request.newBooking.customer.email,
        recipientName:
          `${request.newBooking.customer.firstName ?? ""} ${request.newBooking.customer.lastName ?? ""}`.trim() ||
          undefined,
        bookingId: request.newBooking.id,
        emailIdempotencyKey: `override-rejected:${requestId}`,
        payload: {
          customerName:
            `${request.newBooking.customer.firstName ?? ""} ${request.newBooking.customer.lastName ?? ""}`.trim() ||
            "cliente",
          confirmationCode: request.newBooking.confirmationCode,
          serviceName: request.newBooking.service.name,
          startDate: request.newBooking.startDate.toISOString().slice(0, 10),
          refundAmount: request.newBooking.totalPrice.toFixed(2),
          alternativeDates,
          bookingPortalUrl: `${env.APP_URL}/b/sessione`,
          contactEmail: env.BREVO_REPLY_TO ?? env.BREVO_SENDER_EMAIL,
        } as unknown as Record<string, unknown>,
      });
      const result = toDispatchResult(outcome);
      if (!result.emailOk) emailOk = false;
    } catch (err) {
      emailOk = false;
      logger.error({ err, requestId }, "rejectOverride: dispatch OVERRIDE_REJECTED failed");
    }
  }

  // Audit log a livello di request (il helper emette audit BOOKING_CANCELLED_BY_OVERRIDE)
  await auditLog({
    userId: adminUserId,
    action: AUDIT_ACTIONS.OVERRIDE_REJECTED,
    entity: "OverrideRequest",
    entityId: requestId,
    after: { newBookingId: request.newBookingId, notes, refundOk, emailOk },
  });

  return { rejected: true, refundOk, emailOk };
}
