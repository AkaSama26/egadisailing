import type { Prisma } from "@/generated/prisma/client";
import type { BookingSource } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  dispatchNotification,
  defaultNotificationChannels,
} from "@/lib/notifications/dispatcher";

// R29-AUDIT-FIX2: helper per decidere se un service type richiede
// serializzazione cross-adapter. Tours condivisi (SOCIAL_BOATING 20 posti,
// BOAT_SHARED 12 posti) NON hanno bisogno del lock "availability" perche'
// cohabitation e' feature, non bug.
export const BOAT_EXCLUSIVE_SERVICE_TYPES = [
  "CABIN_CHARTER",
  "BOAT_EXCLUSIVE",
] as const;

export function isBoatExclusiveServiceType(type: string): boolean {
  return (BOAT_EXCLUSIVE_SERVICE_TYPES as readonly string[]).includes(type);
}

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

  // R24-A1-A5: SINGOLO ManualAlert aggregato con tutti i conflitti in `notes`.
  // Prima il loop creava N alert separati, ma il partial unique index
  // `ManualAlert(channel, boatId, date, action) WHERE status=PENDING`
  // (migration 20260418220000) faceva fallire gli insert 2..N con P2002 →
  // alert persi silent, admin vedeva solo il primo conflict. Un alert
  // aggregato elenca tutti i conflitti nel notes + partial unique garantisce
  // idempotency su retry webhook.
  const dayKey = input.startDate;
  try {
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
    if (!existing) {
      const conflictsList = input.conflicts
        .map(
          (c, i) =>
            `  ${i + 1}. ${c.source} ${c.confirmationCode} (${c.status})`,
        )
        .join("\n");
      await db.manualAlert.create({
        data: {
          channel: "CROSS_OTA_DOUBLE_BOOKING",
          boatId: input.boatId,
          date: dayKey,
          action: "REVIEW",
          bookingId: input.newBookingId,
          notes:
            `Nuovo booking ${input.newConfirmationCode} (${input.newSource}) ` +
            `overlappa con ${input.conflicts.length} booking cross-source:\n` +
            `${conflictsList}\n` +
            `Decidere quale cancellare + rimborsare + cancellare upstream sul panel OTA.`,
        },
      });
    }
  } catch (err) {
    logger.error(
      {
        err,
        newBookingId: input.newBookingId,
        conflictCount: input.conflicts.length,
      },
      "Failed to create ManualAlert for double-booking incident",
    );
  }

  // Dispatch notification (fail-safe: ogni canale try/catch indipendente
  // dentro il dispatcher).
  //
  // R29-#4: verifica `DispatchResult.anyOk`. Prima: se Brevo+Telegram
  // entrambi fallivano (Brevo 503 + TELEGRAM_BOT_TOKEN unset), l'admin
  // NON riceveva alert silenziosamente. Il ManualAlert era salvato ma
  // l'admin scopriva l'incident solo alla prossima visita dashboard.
  // Per double-booking questo puo' voler dire cliente arriva al molo
  // prima che admin reagisca.
  // Ora: log `fatal` + marker DB su `ManualAlert.notes` se anyOk=false.
  // Admin log aggregator (Sentry/CloudWatch alarm su level=fatal) avvisa
  // un canale alternativo (SMS PagerDuty, Opsgenie) per escalation manuale.
  try {
    const result = await dispatchNotification({
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
    if (!result.anyOk) {
      logger.fatal(
        {
          newBookingId: input.newBookingId,
          newConfirmationCode: input.newConfirmationCode,
          emailOk: result.emailOk,
          telegramOk: result.telegramOk,
          conflictCount: input.conflicts.length,
        },
        "DOUBLE_BOOKING_DETECTED notification NOT DELIVERED — admin manual escalation required",
      );
      // R29-AUDIT-FIX4: rileggo l'alert + prepend tag [NOTIFICATION_FAILED]
      // nelle notes. Admin che apre sync-log vede subito lo stato.
      // Idempotency guard: se il prefix gia' presente (retry), skip per
      // evitare accumulo infinito.
      const NOTIFICATION_FAILED_PREFIX = "[⚠ NOTIFICATION_FAILED";
      const alert = await db.manualAlert.findFirst({
        where: {
          channel: "CROSS_OTA_DOUBLE_BOOKING",
          boatId: input.boatId,
          date: dayKey,
          bookingId: input.newBookingId,
          status: "PENDING",
        },
        select: { id: true, notes: true },
      });
      if (alert && !alert.notes?.startsWith(NOTIFICATION_FAILED_PREFIX)) {
        await db.manualAlert
          .update({
            where: { id: alert.id },
            data: {
              notes: `${NOTIFICATION_FAILED_PREFIX} — admin non notificato via email/telegram]\n${alert.notes ?? ""}`,
            },
          })
          .catch((err) =>
            logger.warn({ err }, "Failed to mark ManualAlert as NOTIFICATION_FAILED"),
          );
      }
    }
  } catch (err) {
    logger.fatal(
      { err, newBookingId: input.newBookingId },
      "DOUBLE_BOOKING_DETECTED dispatch throw (unexpected) — admin manual escalation required",
    );
  }
}
