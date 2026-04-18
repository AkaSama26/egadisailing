import { NextResponse } from "next/server";
import { searchBokunBookings } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { addDays } from "@/lib/dates";
import { CHANNELS } from "@/lib/channels";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

/**
 * Cron ogni 5 minuti che importa bookings Bokun aggiornati dopo l'ultimo
 * sync noto — fallback per webhook persi.
 *
 * `updatedSince` letto da `ChannelSyncStatus`. Se assente o ChannelSyncStatus
 * old (>1h), fallback a ultimi 60 minuti per evitare backfill massivo
 * (meglio dati recenti che nulla).
 */
export const GET = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);

  if (!isBokunConfigured()) {
    return NextResponse.json({ skipped: "bokun_not_configured" });
  }

  const syncStatus = await db.channelSyncStatus.findUnique({
    where: { channel: CHANNELS.BOKUN },
  });
  const hourAgo = addDays(new Date(), 0);
  hourAgo.setUTCHours(hourAgo.getUTCHours() - 1);
  const since = syncStatus?.lastSyncAt ?? hourAgo;

  try {
    const result = await searchBokunBookings({
      updatedSince: since.toISOString(),
      pageSize: 100,
    });

    let imported = 0;
    let failed = 0;
    for (const b of result.bookings) {
      try {
        await importBokunBooking(b);
        imported++;
      } catch (err) {
        failed++;
        logger.error({ err, bokunBookingId: b.id }, "importBokunBooking failed");
      }
    }

    await db.channelSyncStatus.upsert({
      where: { channel: CHANNELS.BOKUN },
      update: {
        lastSyncAt: new Date(),
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} imports failed` : null,
      },
      create: {
        channel: CHANNELS.BOKUN,
        lastSyncAt: new Date(),
        healthStatus: failed === 0 ? "GREEN" : "YELLOW",
        lastError: failed > 0 ? `${failed} imports failed` : null,
      },
    });

    return NextResponse.json({ imported, failed, totalHits: result.totalHits });
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
