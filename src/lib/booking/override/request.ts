"use server";

import type { Prisma } from "@/generated/prisma/client";
import Decimal from "decimal.js";
import { NotFoundError, ValidationError } from "@/lib/errors";

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

  const nonDirectChannels = conflictSourceChannels.filter((ch) => ch !== "DIRECT");
  if (nonDirectChannels.length > 0) {
    throw new ValidationError(
      "Override consentito solo per conflitti DIRECT. Prenotazioni da portali aggregatori bloccano il calendario master.",
      {
        code: "OVERRIDE_EXTERNAL_CONFLICT_FORBIDDEN",
        channels: nonDirectChannels,
      },
    );
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

  await tx.booking.update({
    where: { id: input.newBookingId },
    data: { claimsAvailability: false },
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
      data: { status: "CANCELLED", claimsAvailability: false },
    });
    supersededIds.push(inferior.id);
  }

  return { requestId: request.id, supersededRequestIds: supersededIds };
}
