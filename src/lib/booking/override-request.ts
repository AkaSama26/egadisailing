"use server";

import type { Prisma } from "@/generated/prisma/client";
import type { OverrideStatus } from "@/generated/prisma/enums";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { OtaConfirmation } from "./override-types";
import { isOtaChannel, isOtaConfirmationComplete } from "./override-types";
import { ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { isUpstreamCancelled } from "./override-reconcile";
import { computeCancellationRate } from "./cancellation-rate";

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
    throw new Error(`newBookingId ${input.newBookingId} not found`);
  }
  if (newBooking.status !== "PENDING") {
    throw new Error(
      `newBookingId ${input.newBookingId} not PENDING (is ${newBooking.status})`,
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
  if (!request) throw new Error(`OverrideRequest ${requestId} not found`);
  if (request.status !== "PENDING") {
    throw new Error(`OverrideRequest ${requestId} is not PENDING (is ${request.status})`);
  }

  // OTA checklist enforcement (§7.4 step 1)
  const otaConflictChannels = request.conflictSourceChannels.filter((c) =>
    isOtaChannel(c as never),
  );
  if (otaConflictChannels.length > 0) {
    for (const conflictId of request.conflictingBookingIds) {
      const conflict = await db.booking.findUnique({
        where: { id: conflictId },
        select: { source: true },
      });
      if (!conflict || !isOtaChannel(conflict.source as never)) continue;

      const conf = otaConfirmations.find((c) => c.conflictBookingId === conflictId);
      if (!conf || !isOtaConfirmationComplete(conf)) {
        throw new ValidationError(
          `Conflict booking ${conflictId} (${conflict.source}) richiede le 4 checkbox complete prima dell'approve`,
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

  // Post-commit side-effects: Stripe refund + fan-out + emails
  // TODO: implement in task 2.5/2.6
  return { approved: true, refundErrors: [], emailsSent: 0, emailsFailed: 0 };
}
