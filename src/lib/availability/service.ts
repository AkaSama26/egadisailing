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
 * Blocca un range di date consecutive per una barca.
 *
 * W1-perf: esegue gli `updateAvailability` in **parallelo** (`Promise.all`)
 * invece di sequenziale. Ogni giorno mantiene la propria transazione
 * atomica con advisory lock serializzato per-cella (zero rischio
 * double-booking). Benefici:
 *  - WEEK booking (7 giorni): latency ~1.4s → ~200ms (7x speedup)
 *  - Riduce hold-time connection pool in fascia picco (pool da 20→15 attive)
 *  - Fan-out resta per-day (deterministic jobId coalesce nel worker)
 *
 * Errore a meta' (es. 3/7 giorni falliti): lo stato DB resta coerente per
 * ogni giorno (atomicita' per-cella), ma il caller potrebbe vedere un
 * booking con availability parzialmente settata. Reconciliation cron Plan
 * 3+ recupera eventualmente. Accettabile per il nostro dominio.
 */
export async function blockDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
  lockedByBookingId?: string,
): Promise<void> {
  const days = eachUtcDayInclusive(startDate, endDate);
  await Promise.all(
    days.map((date) =>
      updateAvailability({
        boatId,
        date,
        status: "BLOCKED",
        sourceChannel,
        lockedByBookingId,
      }),
    ),
  );
}

export async function releaseDates(
  boatId: string,
  startDate: Date,
  endDate: Date,
  sourceChannel: string,
): Promise<void> {
  const days = eachUtcDayInclusive(startDate, endDate);
  await Promise.all(
    days.map((date) =>
      updateAvailability({
        boatId,
        date,
        status: "AVAILABLE",
        sourceChannel,
      }),
    ),
  );
}
