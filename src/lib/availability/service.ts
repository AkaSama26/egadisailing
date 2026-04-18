import { db } from "@/lib/db";
import type { AvailabilityStatus } from "@/generated/prisma/enums";
import { logger } from "@/lib/logger";
import { toUtcDay, isoDay, eachUtcDayInclusive } from "@/lib/dates";
import { fanOutAvailability } from "./fan-out";

export interface UpdateAvailabilityInput {
  boatId: string;
  date: Date;
  status: AvailabilityStatus;
  sourceChannel: string;
  lockedByBookingId?: string;
  skipFanOut?: boolean;
}

const SELF_ECHO_WINDOW_SECONDS = 120;

/**
 * Genera un lock key deterministico a 63-bit per Postgres advisory lock.
 * Usa hashCode semplice su "boatId|YYYY-MM-DD".
 */
function advisoryLockKey(boatId: string, day: string): string {
  const input = `${boatId}|${day}`;
  const MOD = BigInt("9223372036854775807"); // 2^63 - 1
  const BASE = BigInt(31);
  let h = BigInt(0);
  for (let i = 0; i < input.length; i++) {
    h = (h * BASE + BigInt(input.charCodeAt(i))) % MOD;
  }
  return h.toString();
}

/**
 * Aggiorna BoatAvailability in modo atomico.
 *
 * Acquisisce un advisory lock Postgres per (boatId, date) che serializza
 * update concorrenti sulla stessa cella del calendario. Dentro la transazione:
 *   1. Acquisisce lock transazionale
 *   2. Ri-legge availability (gia' con lock)
 *   3. Verifica self-echo
 *   4. Upsert
 *   5. Commit → il lock si rilascia automaticamente
 *
 * Il fan-out viene accodato DOPO il commit per evitare ghost jobs se la
 * transazione fa rollback.
 */
export async function updateAvailability(input: UpdateAvailabilityInput): Promise<void> {
  const dateOnly = toUtcDay(input.date);
  const dayIso = isoDay(dateOnly);
  const lockKey = advisoryLockKey(input.boatId, dayIso);

  const { shouldFanOut } = await db.$transaction(async (tx) => {
    // Advisory lock transazionale: rilasciato auto al commit/rollback.
    // $executeRawUnsafe perche' pg_advisory_xact_lock ritorna VOID.
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${lockKey})`);

    // Re-read con lock gia' acquisito
    const current = await tx.boatAvailability.findUnique({
      where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
    });

    // Self-echo detection (dentro la transazione: TOCTOU-safe)
    if (current?.lastSyncedSource === input.sourceChannel && current.lastSyncedAt) {
      const ageSeconds = (Date.now() - current.lastSyncedAt.getTime()) / 1000;
      if (ageSeconds < SELF_ECHO_WINDOW_SECONDS) {
        logger.debug(
          { boatId: input.boatId, date: dayIso, source: input.sourceChannel },
          "Self-echo detected, skipping",
        );
        return { shouldFanOut: false };
      }
    }

    await tx.boatAvailability.upsert({
      where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
      update: {
        status: input.status,
        lockedByBookingId: input.lockedByBookingId ?? null,
        lastSyncedSource: input.sourceChannel,
        lastSyncedAt: new Date(),
      },
      create: {
        boatId: input.boatId,
        date: dateOnly,
        status: input.status,
        lockedByBookingId: input.lockedByBookingId ?? null,
        lastSyncedSource: input.sourceChannel,
        lastSyncedAt: new Date(),
      },
    });

    return { shouldFanOut: !input.skipFanOut };
  });

  // Fan-out POST-commit (outbox-lite): se crashiamo qui, la consistency DB e' salva
  // e un reconciliation cron separato puo' recuperare.
  if (shouldFanOut) {
    await fanOutAvailability({
      boatId: input.boatId,
      date: dayIso,
      status: input.status,
      sourceChannel: input.sourceChannel,
      originBookingId: input.lockedByBookingId,
    });
  }
}

/**
 * Blocca un range di date consecutive per una barca.
 * Ogni giorno e' una transazione separata: un errore a meta' non lascia lo
 * stato incoerente tra giorni (ogni giorno e' atomico per se'), ma non
 * garantisce atomicita' sull'intero range. Accettabile per il nostro dominio.
 */
export async function blockDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  lockedByBookingId?: string,
): Promise<void> {
  for (const date of eachUtcDayInclusive(startDate, endDate)) {
    await updateAvailability({
      boatId,
      date,
      status: "BLOCKED",
      sourceChannel,
      lockedByBookingId,
    });
  }
}

export async function releaseDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
): Promise<void> {
  for (const date of eachUtcDayInclusive(startDate, endDate)) {
    await updateAvailability({
      boatId,
      date,
      status: "AVAILABLE",
      sourceChannel,
    });
  }
}
