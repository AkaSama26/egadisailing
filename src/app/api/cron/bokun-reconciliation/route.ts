import { NextResponse } from "next/server";
import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addHours } from "@/lib/dates";
import { CHANNELS, RATE_LIMIT_SCOPES } from "@/lib/channels";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { getClientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";

export const runtime = "nodejs";

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety cap: 2000 bookings/run
// Buffer sottratto dal "since" pre-fetch per tollerare clock skew tra il
// nostro server e Bokun. Senza buffer, eventi con updatedAt == now() esatto
// possono essere persi tra un run e il successivo.
const CLOCK_SKEW_BUFFER_MS = 30_000;
const LEASE_NAME = "cron:bokun_reconciliation";
// Il cron gira ogni 5min; il lease deve coprire il run normale con margine.
// TTL auto-libera se il processo crasha (Redis scade, no stale lock).
const LEASE_TTL_SECONDS = 8 * 60;

/**
 * Cron ogni 5 minuti che importa bookings Bokun aggiornati dopo l'ultimo
 * sync noto — fallback per webhook persi.
 *
 * Anti-overrun: lease Redis single-flight con TTL auto-liberation. Se un
 * run precedente e' ancora in corso o un'altra replica Next sta eseguendo,
 * skippiamo senza bloccare. Se il processo crasha, il TTL libera il lease
 * entro 8 minuti (il cron successivo recupera).
 *
 * Rate-limit: 10 req/min per IP (un cron legittimo fa 12 req/ora, l'attacco
 * con secret leakato viene cappato).
 *
 * `updatedSince` letto da `ChannelSyncStatus`. Se assente o `lastSyncAt`
 * vecchio > 1h, fallback a ultimi 60 minuti per evitare backfill massivo.
 *
 * Il `nextSince` salvato e' `runStartedAt - 30s` (clock skew buffer):
 * eventi con updatedAt entro la finestra marginale vengono riletti al
 * prossimo run, idempotent grazie al dedup su `bokunBookingId` nell'adapter.
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  await enforceRateLimit({
    identifier: getClientIp(req.headers),
    scope: RATE_LIMIT_SCOPES.BOKUN_CRON_IP,
    limit: 10,
    windowSeconds: 60,
  });

  if (!isBokunConfigured()) {
    return NextResponse.json({ skipped: "bokun_not_configured" });
  }

  const leased = await tryAcquireLease(LEASE_NAME, LEASE_TTL_SECONDS);
  if (!leased) {
    logger.warn("Bokun reconciliation skipped: another run in progress");
    return NextResponse.json({ skipped: "concurrent_run" });
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

    while (hasMore && page <= MAX_PAGES) {
      const result = await searchBokunBookings({
        updatedSince: since.toISOString(),
        pageSize: PAGE_SIZE,
        page,
      });
      totalHits = result.totalHits;

      for (const b of result.bookings) {
        try {
          const ours = await importBokunBooking(b);
          await syncBookingAvailability(ours);
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

    const nextSince = new Date(runStartedAt.getTime() - CLOCK_SKEW_BUFFER_MS);
    const durationMs = Date.now() - runStartedAt.getTime();
    await db.channelSyncStatus.upsert({
      where: { channel: CHANNELS.BOKUN },
      update: {
        lastSyncAt: nextSince,
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} imports failed` : null,
      },
      create: {
        channel: CHANNELS.BOKUN,
        lastSyncAt: nextSince,
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} imports failed` : null,
      },
    });

    logger.info(
      { imported, failed, totalHits, pages: page - 1, durationMs, since: since.toISOString() },
      "Bokun reconciliation run completed",
    );

    return NextResponse.json({ imported, failed, totalHits, pages: page - 1, durationMs });
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
  } finally {
    await releaseLease(LEASE_NAME).catch((err) => {
      logger.warn({ err }, "Failed to release Bokun reconciliation lease (TTL will recover)");
    });
  }
});
