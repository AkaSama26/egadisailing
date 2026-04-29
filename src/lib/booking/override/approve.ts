"use server";

import { db } from "@/lib/db";
import type { ConflictSourceChannel, OtaConfirmation } from "../override-types";
import { isOtaChannel, isOtaConfirmationComplete } from "../override-types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { isUpstreamCancelled } from "../override-reconcile";
import { computeCancellationRate, invalidateCancellationRateCache } from "../cancellation-rate";
import { logger } from "@/lib/logger";
import { blockDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { postCommitCancelBooking } from "../post-commit-cancel";
import { dispatchNotification, toDispatchResult } from "@/lib/notifications/dispatcher";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { getAlternativeDatesIso } from "../alternative-dates";

export interface ApproveOverrideResult {
  approved: true;
  refundErrors: Array<{ paymentId: string; message: string }>;
  emailsSent: number;
  emailsFailed: number;
}

/**
 * Approva un OverrideRequest.
 * Se la request ha almeno un `conflictSourceChannels` OTA (non-DIRECT),
 * `otaConfirmations` DEVE contenere una confermata completa per ciascun
 * conflicting OTA booking. Throw ValidationError se mancante o incompleta.
 *
 * Side-effects post-commit (Stripe refund + fan-out + email): TBD Task 2.5+.
 */
export async function approveOverride(
  requestId: string,
  adminUserId: string,
  notes?: string,
  otaConfirmations: OtaConfirmation[] = [],
): Promise<ApproveOverrideResult> {
  const request = await db.overrideRequest.findUnique({
    where: { id: requestId },
    include: { newBooking: { select: { boatId: true } } },
  });
  if (!request) throw new NotFoundError("OverrideRequest", requestId);
  if (request.status !== "PENDING") {
    throw new ValidationError(
      `OverrideRequest ${requestId} non è PENDING (stato: ${request.status}). Una decisione esiste già.`,
      { code: "OVERRIDE_REQUEST_NOT_PENDING", requestId, actualStatus: request.status },
    );
  }

  const nonDirectConflictChannels = request.conflictSourceChannels.filter(
    (c) => c !== "DIRECT",
  );
  if (nonDirectConflictChannels.length > 0) {
    throw new ValidationError(
      "Override non approvabile: i conflitti da portali aggregatori bloccano il calendario master e non possono essere scavalcati.",
      {
        code: "OVERRIDE_EXTERNAL_CONFLICT_FORBIDDEN",
        requestId,
        channels: nonDirectConflictChannels,
      },
    );
  }

  // OTA checklist enforcement (§7.4 step 1)
  const otaConflictChannels = request.conflictSourceChannels.filter((c) =>
    isOtaChannel(c as ConflictSourceChannel),
  );
  if (otaConflictChannels.length > 0) {
    // Batch-load all conflict rows (avoid N+1 in guard loop).
    const conflicts = await db.booking.findMany({
      where: { id: { in: request.conflictingBookingIds } },
      select: { id: true, source: true },
    });
    const conflictsById = new Map(conflicts.map((c) => [c.id, c]));

    for (const conflictId of request.conflictingBookingIds) {
      const conflict = conflictsById.get(conflictId);
      if (!conflict || !isOtaChannel(conflict.source as ConflictSourceChannel)) continue;

      // Double-bracket pattern: admin attestation (checkbox) + server verification.
      // Vedi JSDoc su `OtaConfirmation.upstreamCancelled` in override-types.ts.
      const conf = otaConfirmations.find((c) => c.conflictBookingId === conflictId);
      if (!conf || !isOtaConfirmationComplete(conf)) {
        throw new ValidationError(
          `Conferma OTA mancante o incompleta per il conflict ${conflictId} (${conflict.source}). Tutte e 4 le checkbox devono essere spuntate prima dell'approve.`,
          { code: "OTA_CHECKLIST_INCOMPLETE", conflictId, channel: conflict.source },
        );
      }

      const upstreamOk = await isUpstreamCancelled(conflictId, conflict.source);
      if (!upstreamOk) {
        throw new ValidationError(
          `Conflict ${conflictId} (${conflict.source}) risulta ancora attivo upstream. Attendere che il webhook cancel arrivi (tipicamente <5min).`,
          { code: "OTA_UPSTREAM_NOT_CANCELLED", conflictId, channel: conflict.source },
        );
      }
    }

    // Cancellation-rate hard-block guard (§13.10)
    const uniqueOtaChannels = Array.from(new Set(otaConflictChannels));
    for (const channel of uniqueOtaChannels) {
      const { rate } = await computeCancellationRate(channel, 30);
      if (rate > env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK) {
        throw new ValidationError(
          `Impossibile approvare: ${channel} cancellation rate ultimi 30gg e' ${(rate * 100).toFixed(1)}%, sopra la soglia hard-block ${(env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK * 100).toFixed(1)}%. Attendi che il rate scenda prima di approvare nuovi override su questo canale.`,
          { code: "CANCELLATION_RATE_HARD_BLOCK", channel, rate },
        );
      }
    }
  }

  // DB tx atomic (NO Stripe calls here — R10 BL-M4 pattern)
  await db.$transaction(async (tx) => {
    await tx.overrideRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedByUserId: adminUserId,
        decisionNotes: notes,
      },
    });
    await tx.booking.updateMany({
      where: { id: { in: request.conflictingBookingIds } },
      data: { status: "CANCELLED", claimsAvailability: false },
    });
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { status: "CONFIRMED", claimsAvailability: true },
    });
  });

  // Post-commit side-effects (R10 BL-M4 pattern — no Stripe in DB tx)
  const refundErrors: Array<{ paymentId: string; message: string }> = [];

  // 1. Per ogni conflict: refund + releaseDates + audit via helper condiviso
  for (const conflictId of request.conflictingBookingIds) {
    const cancelOutcome = await postCommitCancelBooking({
      bookingId: conflictId,
      actorUserId: adminUserId,
      reason: "override_approved",
    });
    if (cancelOutcome.status === "partial") {
      for (const e of cancelOutcome.errors) {
        if (e.kind === "refund") {
          refundErrors.push({ paymentId: e.id, message: e.message });
        }
      }
    }
  }

  // 2. blockDates per newBooking (side-effect unico dell'approve)
  const newBookingData = await db.booking.findUnique({
    where: { id: request.newBookingId },
    include: {
      customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
  });
  if (newBookingData) {
    try {
      await blockDates(
        newBookingData.boatId,
        newBookingData.startDate,
        newBookingData.endDate,
        CHANNELS.DIRECT,
        request.newBookingId,
      );
    } catch (err) {
      logger.error(
        { err, bookingId: request.newBookingId },
        "approveOverride: blockDates failed",
      );
    }
  }

  if (newBookingData?.customer?.email) {
    try {
      await dispatchNotification({
        type: "OVERRIDE_APPROVED",
        channels: ["EMAIL"],
        recipientEmail: newBookingData.customer.email,
        recipientName:
          `${newBookingData.customer.firstName ?? ""} ${newBookingData.customer.lastName ?? ""}`.trim() ||
          undefined,
        bookingId: request.newBookingId,
        customerId: newBookingData.customer.id,
        emailIdempotencyKey: `override-approved:${requestId}`,
        payload: {
          customerName:
            `${newBookingData.customer.firstName ?? ""} ${newBookingData.customer.lastName ?? ""}`.trim() ||
            "cliente",
          confirmationCode: newBookingData.confirmationCode,
          serviceName: newBookingData.service.name,
          startDate: newBookingData.startDate.toISOString().slice(0, 10),
          numPeople: newBookingData.numPeople,
          bookingPortalUrl: `${env.APP_URL}/b/sessione`,
          contactPhone: env.CONTACT_PHONE ?? "",
        } as unknown as Record<string, unknown>,
      });
    } catch (err) {
      logger.error({ err, bookingId: request.newBookingId }, "approveOverride: dispatch OVERRIDE_APPROVED failed");
    }
  }

  // 4. Email apology ai loser + audit log (R19 Fix #7: voucher+rebooking via Task 4.6)
  let emailsSent = 0;
  let emailsFailed = 0;

  for (const conflictId of request.conflictingBookingIds) {
    const conflict = await db.booking.findUnique({
      where: { id: conflictId },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        service: { select: { name: true } },
      },
    });
    if (!conflict?.customer?.email) continue;

    const alternativeDates = await getAlternativeDatesIso(
      conflict.boatId,
      conflict.startDate,
      3,
    );

    // Phase 8 #5: route via dispatcher (single notification funnel).
    // The dispatcher renders the overbookingApology template and enqueues it
    // in the transactional email outbox.
    try {
      const outcome = await dispatchNotification({
        type: "OVERRIDE_APOLOGY_LOSER",
        channels: ["EMAIL"],
        // Recipient is the per-conflict customer, not the default ADMIN_EMAIL.
        recipientEmail: conflict.customer.email,
        recipientName:
          `${conflict.customer.firstName ?? ""} ${conflict.customer.lastName ?? ""}`.trim() ||
          undefined,
        bookingId: conflict.id,
        emailIdempotencyKey: `override-apology-loser:${requestId}:${conflictId}`,
        payload: {
          customerName: `${conflict.customer.firstName} ${conflict.customer.lastName}`.trim() || "cliente",
          confirmationCode: conflict.confirmationCode,
          serviceName: conflict.service.name,
          startDate: conflict.startDate.toISOString().slice(0, 10),
          refundAmount: `${conflict.totalPrice.toFixed(2)}€`,
          refundChannel: "stripe",
          contactEmail: env.BREVO_REPLY_TO ?? env.BREVO_SENDER_EMAIL,
          contactPhone: env.CONTACT_PHONE,
          bookingUrl: `${env.APP_URL}/b/sessione`,
          voucherSoftText: "Per scusarci ti offriamo 2 drink gratis a bordo per persona alla prossima visita",
          rebookingSuggestions: alternativeDates,
        } as unknown as Record<string, unknown>,
      });
      const result = toDispatchResult(outcome);
      if (result.emailOk) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    } catch (err) {
      emailsFailed++;
      logger.error({ err, bookingId: conflictId }, "approveOverride: dispatch OVERRIDE_APOLOGY_LOSER failed");
    }
  }

  // 5. Audit log
  await auditLog({
    userId: adminUserId,
    action: AUDIT_ACTIONS.OVERRIDE_APPROVED,
    entity: "OverrideRequest",
    entityId: requestId,
    after: {
      newBookingId: request.newBookingId,
      conflictCount: request.conflictingBookingIds.length,
      emailsSent,
      emailsFailed,
    },
  });

  // 6. Invalida cache cancellation-rate per i canali OTA coinvolti
  // (riflette subito nuovo rate nella dashboard admin KPI).
  const uniqueOtaChannelsForCache = Array.from(
    new Set(
      request.conflictSourceChannels.filter((c) =>
        isOtaChannel(c as ConflictSourceChannel),
      ),
    ),
  );
  for (const channel of uniqueOtaChannelsForCache) {
    await invalidateCancellationRateCache(channel);
  }

  return { approved: true, refundErrors, emailsSent, emailsFailed };
}
