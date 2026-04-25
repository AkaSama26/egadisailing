import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addHours } from "@/lib/dates";
import { CHANNELS, RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { RUN_BUDGET } from "@/lib/timing";

export const runtime = "nodejs";

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety cap: 2000 bookings/run
// Buffer sottratto dal "since" pre-fetch per tollerare clock skew tra il
// nostro server e Bokun. Senza buffer, eventi con updatedAt == now() esatto
// possono essere persi tra un run e il successivo.
const CLOCK_SKEW_BUFFER_MS = 30_000;
// R28-ALTA-3: soft-timeout per non superare il lease TTL. 2000 booking worst
// × 1.5s = 3000s potenzialmente → lease 480s scade mid-run → altro replica
// prende lease → doppio run concorrente. 6min cap lascia 2min margine per
// upsert finale + finally. Pattern identico pending-gc RUN_BUDGET_MS.
const RUN_BUDGET_MS = RUN_BUDGET.EXTENDED;

/**
 * Cron ogni 5 minuti che importa bookings Bokun aggiornati dopo l'ultimo
 * sync noto — fallback per webhook persi.
 *
 * Anti-overrun: lease Redis single-flight con TTL auto-liberation. Se un
 * run precedente e' ancora in corso o un'altra replica Next sta eseguendo,
 * skippiamo senza bloccare. Se il processo crasha, il TTL libera il lease
 * entro 8 minuti (il cron successivo recupera).
 *
 * Rate-limit: 10 req/min globali (R20-P2-MEDIA standardize: era per-IP via
 * getClientIp che rendeva inconsistente con altri cron, X-Forwarded-For
 * spoofing creava bucket diversi).
 *
 * `updatedSince` letto da `ChannelSyncStatus`. Se assente o `lastSyncAt`
 * vecchio > 1h, fallback a ultimi 60 minuti per evitare backfill massivo.
 *
 * Il `nextSince` salvato e' `runStartedAt - 30s` (clock skew buffer):
 * eventi con updatedAt entro la finestra marginale vengono riletti al
 * prossimo run, idempotent grazie al dedup su `bokunBookingId` nell'adapter.
 *
 * R20-P2-MEDIA: lease key uniformata a hyphen. Al prossimo deploy il vecchio
 * lease `cron:bokun_reconciliation` in Redis scade via TTL 8min — nessun
 * fix manuale richiesto.
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.BOKUN_CRON_IP,
    leaseKey: LEASE_KEYS.BOKUN_RECONCILIATION,
    leaseTtlSeconds: 8 * 60,
    runBudgetMs: RUN_BUDGET_MS,
  },
  async (_req, ctx) => {
    if (!isBokunConfigured()) {
      return { skipped: "bokun_not_configured" };
    }

    const runStartedAt = new Date();
    try {
      const syncStatus = await db.channelSyncStatus.findUnique({
        where: { channel: CHANNELS.BOKUN },
      });
      const hourAgo = addHours(runStartedAt, -1);
      const since = syncStatus?.lastSyncAt ?? hourAgo;

      let imported = 0;
      let failed = 0;
      let totalHits = 0;
      let page = 1;
      let hasMore = true;
      let budgetExceeded = false;

      while (hasMore && page <= MAX_PAGES) {
        // R28-ALTA-3: break su budget per evitare overrun lease TTL.
        if (ctx.shouldStop()) {
          budgetExceeded = true;
          logger.warn(
            {
              page,
              imported,
              failed,
              elapsedMs: ctx.elapsedMs(),
            },
            "Bokun reconciliation stopped at RUN_BUDGET_MS — backlog continues next run",
          );
          break;
        }
        const result = await searchBokunBookings({
          updatedSince: since.toISOString(),
          pageSize: PAGE_SIZE,
          page,
        });
        totalHits = result.totalHits;

        for (const b of result.bookings) {
          try {
            const ours = await importBokunBooking(b);
            // R27-CRIT-6: skip fan-out quando l'import e' stato "skipped"
            // (status terminale locale preserva admin-cancel). Senza questa
            // guardia il cron re-chiamava `blockDates` → ri-BLOCCA cella su
            // booking gia' CANCELLED admin lato → admin-cancel visibilmente
            // "non funziona" + ManualAlert per cancel upstream non recepito.
            if (ours.mode !== "skipped") {
              await syncBookingAvailability(ours);
            }
            imported++;
          } catch (err) {
            failed++;
            logger.error(
              {
                bokunBookingId: b.id,
                errorCode: (err as { code?: string }).code,
                errorMessage: (err as Error).message,
              },
              "importBokunBooking failed",
            );
          }
        }

        hasMore = result.bookings.length >= PAGE_SIZE;
        page++;
      }

      if (page > MAX_PAGES) {
        logger.warn({ page, totalHits }, "Bokun reconciliation hit MAX_PAGES cap");
      }

      // R28-ALTA-3: se abbiamo interrotto per budget o failure, NON avanzare
      // il cursor `since` — il prossimo run ri-legge la stessa finestra
      // (idempotent via bokunBookingId dedup). Se avanzassimo, i booking
      // non ancora importati verrebbero persi dalla finestra successiva.
      const nextSince =
        budgetExceeded || failed > 0
          ? since
          : new Date(runStartedAt.getTime() - CLOCK_SKEW_BUFFER_MS);
      const durationMs = Date.now() - runStartedAt.getTime();
      const healthStatus = failed === 0 && !budgetExceeded ? "GREEN" : "YELLOW";
      const lastError = budgetExceeded
        ? `budget exceeded @ page ${page}, ${imported} imported, ${failed} failed`
        : failed > 0
          ? `${failed} imports failed`
          : null;
      await db.channelSyncStatus.upsert({
        where: { channel: CHANNELS.BOKUN },
        update: {
          lastSyncAt: nextSince,
          healthStatus,
          lastError,
        },
        create: {
          channel: CHANNELS.BOKUN,
          lastSyncAt: nextSince,
          healthStatus,
          lastError,
        },
      });

      logger.info(
        { imported, failed, totalHits, pages: page - 1, durationMs, since: since.toISOString() },
        "Bokun reconciliation run completed",
      );

      return { imported, failed, totalHits, pages: page - 1, durationMs };
    } catch (err) {
      logger.error({ err }, "Bokun reconciliation failed");
      await db.channelSyncStatus.upsert({
        where: { channel: CHANNELS.BOKUN },
        update: { healthStatus: "RED", lastError: (err as Error).message },
        create: {
          channel: CHANNELS.BOKUN,
          healthStatus: "RED",
          lastError: (err as Error).message,
        },
      });
      throw err;
    }
  },
);
