"use server";

import type { Prisma } from "@/generated/prisma/client";
import type { OverrideStatus } from "@/generated/prisma/enums";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import type { ConflictSourceChannel, OtaConfirmation } from "./override-types";
import { isOtaChannel, isOtaConfirmationComplete } from "./override-types";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { isUpstreamCancelled } from "./override-reconcile";
import { computeCancellationRate } from "./cancellation-rate";
import { logger } from "@/lib/logger";
import { blockDates } from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { postCommitCancelBooking } from "./post-commit-cancel";
import { overbookingApologyTemplate } from "@/lib/email/templates/overbooking-apology";
import { sendEmail } from "@/lib/email/brevo";
import { auditLog } from "@/lib/audit/log";

export interface CreateOverrideRequestInput {
  newBookingId: string;
  conflictingBookingIds: string[];
  /**
   * Union di Booking.source dei conflict. Se omesso, derivato in tx via
   * `tx.booking.findMany({where:{id:{in:conflictingBookingIds}},select:{source:true}})`.
   * Preferibile omettere e far derivare al helper — evita drift tra caller e DB.
   */
  conflictSourceChannels?: string[];
  newBookingRevenue: Decimal;
  conflictingRevenueTotal: Decimal;
  dropDeadAt: Date;
}

export interface CreateOverrideRequestResult {
  requestId: string;
  supersededRequestIds: string[];
}

/**
 * Crea una OverrideRequest dentro la tx passata.
 * Side-effects post-commit (dispatchati dal caller): email "in attesa",
 * dispatch admin alert, eventuale supersede di request inferiore.
 *
 * @throws se newBookingId non esiste o non è PENDING
 */
export async function createOverrideRequest(
  tx: Prisma.TransactionClient,
  input: CreateOverrideRequestInput,
): Promise<CreateOverrideRequestResult> {
  // Verify newBooking exists and is PENDING; load slot fields for supersede overlap query
  const newBooking = await tx.booking.findUnique({
    where: { id: input.newBookingId },
    select: {
      status: true,
      boatId: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!newBooking) {
    throw new NotFoundError("Booking", input.newBookingId);
  }
  if (newBooking.status !== "PENDING") {
    throw new ValidationError(
      `Booking ${input.newBookingId} non è PENDING (stato: ${newBooking.status}). L'override può scavalcare solo booking PENDING.`,
      { code: "NEW_BOOKING_NOT_PENDING", bookingId: input.newBookingId, actualStatus: newBooking.status },
    );
  }

  // Derive conflictSourceChannels if not provided (semantically correct default)
  let conflictSourceChannels = input.conflictSourceChannels;
  if (!conflictSourceChannels || conflictSourceChannels.length === 0) {
    const conflicts = await tx.booking.findMany({
      where: { id: { in: input.conflictingBookingIds } },
      select: { source: true },
    });
    conflictSourceChannels = Array.from(new Set(conflicts.map((c) => c.source)));
  }

  const request = await tx.overrideRequest.create({
    data: {
      newBookingId: input.newBookingId,
      conflictingBookingIds: input.conflictingBookingIds,
      conflictSourceChannels,
      newBookingRevenue: input.newBookingRevenue.toFixed(2),
      conflictingRevenueTotal: input.conflictingRevenueTotal.toFixed(2),
      dropDeadAt: input.dropDeadAt,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Supersede inferior PENDING requests on overlapping slot + lower revenue.
  // Overlap: daterange(newA.start, newA.end) overlap daterange(newB.start, newB.end)
  // = newA.start <= newB.end AND newA.end >= newB.start
  const supersededIds: string[] = [];

  const inferiorRequests = await tx.overrideRequest.findMany({
    where: {
      id: { not: request.id },
      status: "PENDING",
      newBooking: {
        boatId: newBooking.boatId,
        startDate: { lte: newBooking.endDate },
        endDate: { gte: newBooking.startDate },
      },
      newBookingRevenue: { lt: input.newBookingRevenue.toFixed(2) },
    },
    include: { newBooking: { select: { id: true } } },
  });

  for (const inferior of inferiorRequests) {
    await tx.overrideRequest.update({
      where: { id: inferior.id },
      data: {
        status: "REJECTED",
        decisionNotes: `auto-superseded by request ${request.id} (revenue €${input.newBookingRevenue.toFixed(2)})`,
        decidedAt: new Date(),
      },
    });
    await tx.booking.update({
      where: { id: inferior.newBooking.id },
      data: { status: "CANCELLED" },
    });
    supersededIds.push(inferior.id);
  }

  return { requestId: request.id, supersededRequestIds: supersededIds };
}

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
      data: { status: "CANCELLED" },
    });
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { status: "CONFIRMED" },
    });
  });

  // Post-commit side-effects (R10 BL-M4 pattern — no Stripe in DB tx)
  const refundErrors: Array<{ paymentId: string; message: string }> = [];

  // 1. Per ogni conflict: refund + releaseDates + audit via helper condiviso
  for (const conflictId of request.conflictingBookingIds) {
    const cancelResult = await postCommitCancelBooking({
      bookingId: conflictId,
      actorUserId: adminUserId,
      reason: "override_approved",
    });
    refundErrors.push(...cancelResult.refundsFailed);
  }

  // 2. blockDates per newBooking (side-effect unico dell'approve)
  const newBookingData = await db.booking.findUnique({
    where: { id: request.newBookingId },
    select: { boatId: true, startDate: true, endDate: true },
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

    const alternatives = await findAlternativeDates(
      conflict.boatId,
      conflict.serviceId,
      conflict.startDate,
      3,
    );
    // TODO(task-4.6): passa `alternatives` come rebookingSuggestions + voucherSoftText
    // al template. Richiede estensione props overbooking-apology.ts.
    void alternatives;

    const tpl = overbookingApologyTemplate({
      customerName: `${conflict.customer.firstName} ${conflict.customer.lastName}`.trim() || "cliente",
      confirmationCode: conflict.confirmationCode,
      serviceName: conflict.service.name,
      startDate: conflict.startDate.toISOString().slice(0, 10),
      refundAmount: `${conflict.totalPrice.toFixed(2)}€`,
      refundChannel: "stripe",
      contactEmail: env.BREVO_REPLY_TO ?? env.BREVO_SENDER_EMAIL,
      contactPhone: env.CONTACT_PHONE,
      bookingUrl: `${env.APP_URL}/b/sessione`,
    });
    try {
      const delivered = await sendEmail({
        to: conflict.customer.email,
        subject: tpl.subject,
        htmlContent: tpl.html,
        textContent: tpl.text,
      });
      delivered ? emailsSent++ : emailsFailed++;
    } catch (err) {
      emailsFailed++;
      logger.error({ err, bookingId: conflictId }, "approveOverride: sendEmail loser failed");
    }
  }

  // 5. Audit log
  await auditLog({
    userId: adminUserId,
    action: "OVERRIDE_APPROVED",
    entity: "OverrideRequest",
    entityId: requestId,
    after: {
      newBookingId: request.newBookingId,
      conflictCount: request.conflictingBookingIds.length,
      emailsSent,
      emailsFailed,
    },
  });

  return { approved: true, refundErrors, emailsSent, emailsFailed };
}

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
    await tx.booking.update({
      where: { id: request.newBookingId },
      data: { status: "CANCELLED" },
    });
  });

  // Post-commit: refund + release + audit via helper condiviso
  const cancelResult = await postCommitCancelBooking({
    bookingId: request.newBookingId,
    actorUserId: adminUserId,
    reason: "override_rejected",
  });
  const refundOk = cancelResult.refundsFailed.length === 0 && cancelResult.releaseOk;

  // Email rejection (inline temporary — USE_IN_CHUNK_4_TASK_4.3)
  let emailOk = true;
  if (request.newBooking.customer?.email) {
    try {
      const alternatives = await findAlternativeDates(
        request.newBooking.boatId,
        request.newBooking.serviceId,
        request.newBooking.startDate,
        3,
      );
      const altStr = alternatives.map((d) => d.toISOString().slice(0, 10)).join(", ");
      const delivered = await sendEmail({
        to: request.newBooking.customer.email,
        subject: `Prenotazione ${request.newBooking.confirmationCode} non approvata`,
        htmlContent: `<p>Ci dispiace, la richiesta non è stata approvata. Rimborso in corso (5-10 giorni lavorativi).</p><p>Date alternative disponibili: ${altStr || "contattaci"}.</p>`,
        textContent: `Ci dispiace, la richiesta non è stata approvata. Rimborso in corso. Date alternative: ${altStr || "contattaci"}.`,
      });
      if (!delivered) emailOk = false;
    } catch (err) {
      emailOk = false;
      logger.error({ err, requestId }, "rejectOverride: sendEmail failed");
    }
  }

  // Audit log a livello di request (il helper emette audit BOOKING_CANCELLED_BY_OVERRIDE)
  await auditLog({
    userId: adminUserId,
    action: "OVERRIDE_REJECTED",
    entity: "OverrideRequest",
    entityId: requestId,
    after: { newBookingId: request.newBookingId, notes, refundOk, emailOk },
  });

  return { rejected: true, refundOk, emailOk };
}

/**
 * Trova N date libere successive per suggerimento rebooking.
 * Scan dei 30 giorni successivi a `aroundDate`, ritorna le prime N senza booking attivi.
 */
async function findAlternativeDates(
  boatId: string,
  _serviceId: string,
  aroundDate: Date,
  limit: number,
): Promise<Date[]> {
  const results: Date[] = [];
  for (let i = 1; i <= 30 && results.length < limit; i++) {
    const candidate = new Date(aroundDate);
    candidate.setUTCDate(candidate.getUTCDate() + i);
    const conflicts = await db.booking.count({
      where: {
        boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: candidate },
        endDate: { gte: candidate },
      },
    });
    if (conflicts === 0) results.push(candidate);
  }
  return results;
}
