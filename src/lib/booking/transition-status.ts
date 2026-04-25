"use server";

import type { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { ConflictError } from "@/lib/errors";

/**
 * Legal Booking status transitions. Enforces state machine at write site.
 *
 * Stato sorgente → Set di stati destinazione validi:
 *   PENDING → CONFIRMED, CANCELLED, REFUNDED
 *   CONFIRMED → CANCELLED, REFUNDED
 *   CANCELLED → REFUNDED (rimborso post-cancel)
 *   REFUNDED → (terminal)
 *
 * Note: webhook Stripe `payment_intent.succeeded` puo' arrivare DOPO admin
 * cancel — il caller deve gestire questa race (vedi R7-Reg-A2). Questo
 * helper rifiuta CANCELLED→CONFIRMED preventing the placebo bug class.
 */
const LEGAL_TRANSITIONS: Record<BookingStatus, ReadonlySet<BookingStatus>> = {
  PENDING: new Set(["CONFIRMED", "CANCELLED", "REFUNDED"]),
  CONFIRMED: new Set(["CANCELLED", "REFUNDED"]),
  CANCELLED: new Set(["REFUNDED"]),
  REFUNDED: new Set(),
};

export interface TransitionBookingStatusInput {
  bookingId: string;
  from: BookingStatus;
  to: BookingStatus;
  /** Optional context per audit trail / debugging. */
  reason?: string;
}

/**
 * Atomic state-machine-enforced status transition. Use INSIDE a transaction
 * to leverage row-level locking (BEGIN; SELECT...FOR UPDATE in Postgres).
 *
 * @throws ConflictError se la transizione non e' legale (state machine violated).
 * @throws ConflictError se bookingId not found OR current status != `from` (concurrent modification).
 */
export async function transitionBookingStatus(
  tx: Prisma.TransactionClient,
  input: TransitionBookingStatusInput,
): Promise<{ id: string; status: BookingStatus }> {
  const allowedTo = LEGAL_TRANSITIONS[input.from];
  if (!allowedTo.has(input.to)) {
    throw new ConflictError(
      `Illegal booking status transition: ${input.from} → ${input.to}`,
      {
        bookingId: input.bookingId,
        from: input.from,
        to: input.to,
        reason: input.reason,
      },
    );
  }

  // Atomic guarded update — only succeeds if current.status === from.
  const result = await tx.booking.updateMany({
    where: { id: input.bookingId, status: input.from },
    data: { status: input.to },
  });

  if (result.count === 0) {
    // Concurrent modification: status differs from `from`. Caller must
    // re-read + decide (is the new status acceptable?).
    const current = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: { status: true },
    });
    throw new ConflictError(
      `Concurrent modification: booking ${input.bookingId} not in expected state`,
      {
        bookingId: input.bookingId,
        expectedFrom: input.from,
        actualStatus: current?.status,
        attemptedTo: input.to,
      },
    );
  }

  return { id: input.bookingId, status: input.to };
}
