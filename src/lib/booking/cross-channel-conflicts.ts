import type { Prisma } from "@/generated/prisma/client";
import type { BookingSource } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  dispatchNotification,
  defaultNotificationChannels,
} from "@/lib/notifications/dispatcher";

/**
 * R14 cross-OTA double-booking detection helper.
 *
 * Scenario: due webhook legittimi (BOKUN + BOATAROUND) arrivano entrambi
 * per lo stesso boat/range dates. Ogni canale passa il proprio dedup +
 * self-echo + advisory lock ma NON vede l'altro canale → due Booking
 * CONFIRMED + `lockedByBookingId` punta solo al primo → alla cancel
 * del primo la cella torna AVAILABLE ma il secondo cliente si presenta.
 * Prima si creavano due booking silently → cliente #2 esclamava al check-in.
 *
 * Questo helper:
 *  1. rileva overlapping bookings cross-source (escluso self + stato non
 *     terminale) dentro la stessa tx dell'import adapter
 *  2. ritorna lista conflitti per il caller che decide cosa fare
 *  3. Il caller chiama poi `recordDoubleBookingIncident` post-tx per
 *     emettere ManualAlert per-conflict + dispatch notification admin.
 *
 * Scope: SOLO boat-exclusive services (CABIN_CHARTER, BOAT_EXCLUSIVE).
 * SOCIAL_BOATING/BOAT_SHARED sono tour condivisi dove overlap multi-source
 * e' feature, non bug (passenger slots allocati via `capacityMax`).
 */

export interface CrossChannelConflictInput {
  boatId: string;
  startDate: Date;
  endDate: Date;
  selfSource: string;
  /** ID del nostro booking lato questo import (per evitare self-match). */
  selfBookingId?: string;
}

export interface CrossChannelConflict {
  id: string;
  source: string;
  status: string;
  confirmationCode: string;
  startDate: Date;
  endDate: Date;
  customerEmail: string;
}

/**
 * Rileva booking cross-source attivi che overlappano lo stesso boat/range.
 *
 * Chiamato DENTRO la transazione dell'adapter (tx parametro) cosi' vede
 * lo stato pre-commit + l'advisory lock eventualmente gia' acquisito.
 *
 * Filtra SOLO Service di tipo boat-exclusive: lookup `service.type` via
 * join per escludere SOCIAL_BOATING (20 posti, shared).
 */
export async function detectCrossChannelConflicts(
  tx: Prisma.TransactionClient,
  input: CrossChannelConflictInput,
): Promise<CrossChannelConflict[]> {
  const selfSource = input.selfSource as BookingSource;
  const results = await tx.booking.findMany({
    where: {
      boatId: input.boatId,
      ...(input.selfBookingId ? { id: { not: input.selfBookingId } } : {}),
      source: { not: selfSource },
      status: { in: ["PENDING", "CONFIRMED"] },
      // Overlap: existingStart <= newEnd AND existingEnd >= newStart
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
      service: {
        is: {
          type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] },
        },
      },
    },
    include: {
      customer: { select: { email: true } },
    },
  });

  return results.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    confirmationCode: r.confirmationCode,
    startDate: r.startDate,
    endDate: r.endDate,
    customerEmail: r.customer.email,
  }));
}

export interface RecordIncidentInput {
  newBookingId: string;
  newSource: string;
  newConfirmationCode: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  conflicts: CrossChannelConflict[];
}

/**
 * Registra un'incident di double-booking cross-channel:
 *  - emette N ManualAlert (uno per conflitto) per la dashboard admin
 *  - dispatch notifica EMAIL + TELEGRAM (se configurato) all'admin
 *
 * Fail-safe: se ManualAlert fallisce (DB down, unique violation), logga
 * ma non throw → il booking import e' gia' committato, non vogliamo
 * perderlo per un alert. L'admin vedra' il warn log.
 *
 * Chiamato DOPO il commit della tx import (non dentro) perche':
 *  - ManualAlert ha la propria advisory lock (dedup pending per slot)
 *  - dispatchNotification fa side-effect rete (Brevo+Telegram)
 *  - tx import deve rimanere breve
 */
export async function recordDoubleBookingIncident(input: RecordIncidentInput): Promise<void> {
  if (input.conflicts.length === 0) return;

  logger.error(
    {
      newBookingId: input.newBookingId,
      newSource: input.newSource,
      boatId: input.boatId,
      conflictCount: input.conflicts.length,
      conflictIds: input.conflicts.map((c) => c.id),
    },
    "Cross-OTA double-booking detected",
  );

  // ManualAlert per ogni conflitto (admin UI lista tutti i problemi).
  // Usa unique channel "CROSS_OTA_DOUBLE_BOOKING" per distinguere dagli
  // alert sync-based (CLICKANDBOAT/NAUTAL).
  const dayKey = input.startDate;
  for (const conflict of input.conflicts) {
    try {
      // Insert diretto (no advisory lock qui: ogni conflict e' unique
      // per-bookingId nel notes). Dedup via findFirst + partial unique
      // index su (channel, boatId, date, action) WHERE status=PENDING.
      const existing = await db.manualAlert.findFirst({
        where: {
          channel: "CROSS_OTA_DOUBLE_BOOKING",
          boatId: input.boatId,
          date: dayKey,
          action: "REVIEW",
          status: "PENDING",
          bookingId: input.newBookingId,
        },
        select: { id: true },
      });
      if (existing) continue;
      await db.manualAlert.create({
        data: {
          channel: "CROSS_OTA_DOUBLE_BOOKING",
          boatId: input.boatId,
          date: dayKey,
          action: "REVIEW",
          bookingId: input.newBookingId,
          notes:
            `Nuovo booking ${input.newConfirmationCode} (${input.newSource}) ` +
            `overlappa con ${conflict.confirmationCode} (${conflict.source}, ${conflict.status}). ` +
            `Decidere quale cancellare + rimborsare.`,
        },
      });
    } catch (err) {
      logger.error(
        { err, newBookingId: input.newBookingId, conflictId: conflict.id },
        "Failed to create ManualAlert for double-booking incident",
      );
    }
  }

  // Dispatch notification (fail-safe: ogni canale try/catch indipendente
  // dentro il dispatcher).
  try {
    await dispatchNotification({
      type: "DOUBLE_BOOKING_DETECTED",
      channels: defaultNotificationChannels(),
      payload: {
        newBookingId: input.newBookingId,
        newSource: input.newSource,
        newConfirmationCode: input.newConfirmationCode,
        boatId: input.boatId,
        startDate: input.startDate.toISOString().slice(0, 10),
        endDate: input.endDate.toISOString().slice(0, 10),
        conflicts: input.conflicts.map((c) => ({
          source: c.source,
          confirmationCode: c.confirmationCode,
          status: c.status,
        })),
      },
    });
  } catch (err) {
    logger.error(
      { err, newBookingId: input.newBookingId },
      "Failed to dispatch DOUBLE_BOOKING_DETECTED notification",
    );
  }
}
