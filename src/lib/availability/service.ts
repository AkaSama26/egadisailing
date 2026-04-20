import { db } from "@/lib/db";
import type { AvailabilityStatus } from "@/generated/prisma/enums";
import { logger } from "@/lib/logger";
import { toUtcDay, isoDay, eachUtcDayInclusive } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { fanOutAvailability } from "./fan-out";

export interface UpdateAvailabilityInput {
  boatId: string;
  date: Date;
  status: AvailabilityStatus;
  sourceChannel: string;
  lockedByBookingId?: string;
  skipFanOut?: boolean;
}

/**
 * Finestra di self-echo detection. Deve coprire la latenza piu' lunga
 * prevedibile di un roundtrip OTA: DB → fan-out → provider upstream →
 * webhook di ritorno. Bokun agisce come hub (Viator/GYG) e i loro webhook
 * possono ritardare diversi minuti. 10 minuti e' il compromesso: abbastanza
 * per evitare loop, non cosi' lungo da mascherare update legittimi dallo
 * stesso canale su date diverse (la comparazione e' per-cella).
 */
const SELF_ECHO_WINDOW_SECONDS = 600;

/**
 * Namespace per advisory lock sull'availability. Serializza update concorrenti
 * sulla stessa (boatId, date). Deve essere coerente tra availability service
 * e qualunque altro caller che lockki la stessa cella — usare lo stesso helper.
 */
const AVAILABILITY_LOCK_NAMESPACE = "availability";

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

  const { shouldFanOut, effectiveLockedBy } = await db.$transaction(async (tx) => {
    // Advisory lock transazionale: rilasciato auto al commit/rollback.
    await acquireTxAdvisoryLock(tx, AVAILABILITY_LOCK_NAMESPACE, input.boatId, dayIso);

    // Re-read con lock gia' acquisito
    const current = await tx.boatAvailability.findUnique({
      where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
    });

    // Self-echo detection (dentro la transazione: TOCTOU-safe).
    // R26-P3-TEST-FOUND-CRITICA: self-echo deve scattare SOLO se lo stato
    // target coincide con quello corrente (= echo vero). Prima scattava su
    // qualsiasi write stesso-source entro 600s → rompeva flussi legittimi
    // come "admin booking DIRECT 10:00 → admin cancel DIRECT 10:05" → release
    // saltata → cella stuck BLOCKED. Test
    // `availability-service.test.ts > BLOCKED → AVAILABLE clear` ha esposto.
    if (
      current?.lastSyncedSource === input.sourceChannel &&
      current.lastSyncedAt &&
      current.status === input.status &&
      (current.lockedByBookingId ?? null) === (input.lockedByBookingId ?? null)
    ) {
      const ageSeconds = (Date.now() - current.lastSyncedAt.getTime()) / 1000;
      if (ageSeconds < SELF_ECHO_WINDOW_SECONDS) {
        logger.debug(
          { boatId: input.boatId, date: dayIso, source: input.sourceChannel },
          "Self-echo detected, skipping",
        );
        return { shouldFanOut: false };
      }
    }

    // Idempotency cross-channel: se lo stato DB e' gia' quello target e il
    // lockedByBookingId coincide, non c'e' niente da propagare — evita ping-pong
    // BOKUN ↔ BOATAROUND infinito quando due canali confermano lo stesso slot.
    const noChange =
      current?.status === input.status &&
      (current?.lockedByBookingId ?? null) === (input.lockedByBookingId ?? null);
    if (noChange) {
      // Aggiorniamo comunque `lastSyncedSource`/`lastSyncedAt` per la prossima
      // self-echo, ma skippiamo il fan-out.
      await tx.boatAvailability.update({
        where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
        data: {
          lastSyncedSource: input.sourceChannel,
          lastSyncedAt: new Date(),
        },
      });
      return {
        shouldFanOut: false,
        effectiveLockedBy: current?.lockedByBookingId ?? null,
      };
    }

    // R23-B-ALTA-1: preserve first-winner `lockedByBookingId`. Se la cella
    // e' gia' BLOCKED con lockedByBookingId=A (booking DIRECT confirm) e
    // poi un webhook cross-OTA fuori dalla self-echo window 600s arriva con
    // status=BLOCKED e lockedByBookingId=B, SENZA preserve A verrebbe
    // sovrascritto da B → un admin cancel di B rilascia la cella AVAILABLE
    // → A e' CONFIRMED ma slot libero → double-book successivo.
    // Regola: quando il BLOCCO resta attivo (BLOCKED in + BLOCKED out) e
    // current ha gia' un lockedByBookingId, lo preserviamo. Su transizione
    // AVAILABLE lo clear come before.
    const preservedLockedBy =
      input.status === "BLOCKED" && current?.lockedByBookingId
        ? current.lockedByBookingId
        : (input.lockedByBookingId ?? null);

    await tx.boatAvailability.upsert({
      where: { boatId_date: { boatId: input.boatId, date: dateOnly } },
      update: {
        status: input.status,
        lockedByBookingId: preservedLockedBy,
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

    return {
      shouldFanOut: !input.skipFanOut,
      effectiveLockedBy: preservedLockedBy,
    };
  });

  // Fan-out POST-commit (outbox-lite): se Redis e' giu' logghiamo e andiamo
  // avanti — la consistency DB e' salva e un reconciliation cron separato
  // (Plan 3+) recuperera' dalle SyncQueue entry failed.
  if (shouldFanOut) {
    try {
      await fanOutAvailability({
        boatId: input.boatId,
        date: dayIso,
        status: input.status,
        sourceChannel: input.sourceChannel,
        // R23-P2-MEDIA-1: propaga il `lockedByBookingId` effettivo (post
        // preservation) invece dell'input. Se preservedLockedBy=A (first
        // winner) mentre input.lockedByBookingId=B (tentativo seconda
        // cross-OTA), il fan-out upstream e audit downstream vedono A
        // (owner reale della cella) — consistency con il DB.
        originBookingId: effectiveLockedBy ?? undefined,
      });
    } catch (err) {
      logger.error(
        { err, boatId: input.boatId, date: dayIso, source: input.sourceChannel },
        "Fan-out enqueue failed — reconciliation cron will recover",
      );
    }
  }
}

/**
 * R23-L-CAPACITY (R3 + R16 deferred): batch `blockDates`/`releaseDates` in
 * UNA sola transazione invece di N TX parallele via `Promise.all`.
 *
 * Before (fino a R23): 7 giorni WEEK → 7 connessioni Prisma consumate
 * simultaneamente. Pool size=20 reggeva ~2 WEEK booking concurrent in
 * Ferragosto prima di pool-exhaustion (R16 capacity analysis).
 *
 * Now: 1 connessione, advisory lock acquisiti sequenzialmente within
 * la stessa tx (stessa session Postgres → pg_advisory_xact_lock sono
 * no-op se gia' held). Stesso `updateAvailability` logic (self-echo,
 * noChange, preservedLockedBy) per-day dentro il loop.
 *
 * Trade-off: latency ~1.4s (sequential 7×200ms) vs ~200ms (parallel).
 * Accettiamo perche': (1) il caller `createPendingDirectBooking` gia'
 * fa una tx propria con advisory lock boat-level quindi l'ordine e'
 * serializzato globalmente, (2) pool pressure e' il vero bottleneck
 * Ferragosto, (3) fan-out (7 enqueue BullMQ) resta dopo commit.
 */
async function changeDatesBatch(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  status: AvailabilityStatus,
  lockedByBookingId?: string,
): Promise<void> {
  const days = eachUtcDayInclusive(startDate, endDate);
  const fanOutTargets: Array<{
    dayIso: string;
    effectiveLockedBy: string | null;
  }> = [];

  await db.$transaction(async (tx) => {
    for (const date of days) {
      const dateOnly = toUtcDay(date);
      const dayIso = isoDay(dateOnly);

      await acquireTxAdvisoryLock(tx, AVAILABILITY_LOCK_NAMESPACE, boatId, dayIso);

      const current = await tx.boatAvailability.findUnique({
        where: { boatId_date: { boatId, date: dateOnly } },
      });

      // R26-P3-TEST-FOUND-CRITICA: self-echo solo se stato target uguale
      // al corrente (vedi updateAvailability single-row per motivazione).
      if (
        current?.lastSyncedSource === sourceChannel &&
        current.lastSyncedAt &&
        current.status === status &&
        (current.lockedByBookingId ?? null) === (lockedByBookingId ?? null)
      ) {
        const ageSeconds = (Date.now() - current.lastSyncedAt.getTime()) / 1000;
        if (ageSeconds < SELF_ECHO_WINDOW_SECONDS) {
          logger.debug(
            { boatId, date: dayIso, source: sourceChannel },
            "Self-echo detected in batch, skipping day",
          );
          continue;
        }
      }

      // noChange optimization
      const noChange =
        current?.status === status &&
        (current?.lockedByBookingId ?? null) === (lockedByBookingId ?? null);
      if (noChange) {
        await tx.boatAvailability.update({
          where: { boatId_date: { boatId, date: dateOnly } },
          data: {
            lastSyncedSource: sourceChannel,
            lastSyncedAt: new Date(),
          },
        });
        continue;
      }

      // R23-B-ALTA-1: preserve first-winner lockedByBookingId su BLOCKED→BLOCKED.
      const preservedLockedBy =
        status === "BLOCKED" && current?.lockedByBookingId
          ? current.lockedByBookingId
          : (lockedByBookingId ?? null);

      await tx.boatAvailability.upsert({
        where: { boatId_date: { boatId, date: dateOnly } },
        update: {
          status,
          lockedByBookingId: preservedLockedBy,
          lastSyncedSource: sourceChannel,
          lastSyncedAt: new Date(),
        },
        create: {
          boatId,
          date: dateOnly,
          status,
          lockedByBookingId: lockedByBookingId ?? null,
          lastSyncedSource: sourceChannel,
          lastSyncedAt: new Date(),
        },
      });

      fanOutTargets.push({ dayIso, effectiveLockedBy: preservedLockedBy });
    }
  });

  // Fan-out POST-commit (outbox-lite): come updateAvailability single-cell.
  for (const target of fanOutTargets) {
    try {
      await fanOutAvailability({
        boatId,
        date: target.dayIso,
        status,
        sourceChannel,
        originBookingId: target.effectiveLockedBy ?? undefined,
      });
    } catch (err) {
      logger.error(
        { err, boatId, date: target.dayIso, source: sourceChannel },
        "Fan-out enqueue failed in batch — reconciliation cron will recover",
      );
    }
  }
}

export async function blockDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  lockedByBookingId?: string,
): Promise<void> {
  await changeDatesBatch(boatId, startDate, endDate, sourceChannel, "BLOCKED", lockedByBookingId);
}

export async function releaseDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
): Promise<void> {
  await changeDatesBatch(boatId, startDate, endDate, sourceChannel, "AVAILABLE");
}
