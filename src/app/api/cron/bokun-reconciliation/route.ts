import { NextResponse } from "next/server";
import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addHours } from "@/lib/dates";
import { CHANNELS } from "@/lib/channels";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

const PAGE_SIZE = 100;
const MAX_PAGES = 20; // safety cap: 2000 bookings/run
// Buffer sottratto dal "since" pre-fetch per tollerare clock skew tra il
// nostro server e Bokun. Senza buffer, eventi con updatedAt == now() esatto
// possono essere persi tra un run e il successivo.
const CLOCK_SKEW_BUFFER_MS = 30_000;

/**
 * Cron ogni 5 minuti che importa bookings Bokun aggiornati dopo l'ultimo
 * sync noto — fallback per webhook persi.
 *
 * `updatedSince` letto da `ChannelSyncStatus`. Se assente o `lastSyncAt`
 * vecchio > 1h, fallback a ultimi 60 minuti per evitare backfill massivo.
 *
 * Il `nextSince` salvato su ChannelSyncStatus e' `runStartedAt - 30s`
 * (clock skew buffer): eventi con updatedAt entro la finestra marginale
 * vengono riletti al prossimo run, idempotent grazie al dedup su
 * `bokunBookingId` nell'adapter.
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);

  if (!isBokunConfigured()) {
    return NextResponse.json({ skipped: "bokun_not_configured" });
  }

  const runStartedAt = new Date();
  const syncStatus = await db.channelSyncStatus.findUnique({
    where: { channel: CHANNELS.BOKUN },
  });
  const hourAgo = addHours(runStartedAt, -1);
  const since = syncStatus?.lastSyncAt ?? hourAgo;

  try {
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
          logger.error({ err, bokunBookingId: b.id }, "importBokunBooking failed");
        }
      }

      hasMore = result.bookings.length >= PAGE_SIZE;
      page++;
    }

    if (page > MAX_PAGES) {
      logger.warn({ page, totalHits }, "Bokun reconciliation hit MAX_PAGES cap");
    }

    const nextSince = new Date(runStartedAt.getTime() - CLOCK_SKEW_BUFFER_MS);
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

    return NextResponse.json({ imported, failed, totalHits, pages: page - 1 });
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
});
