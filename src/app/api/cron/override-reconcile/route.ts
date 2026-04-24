import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { withErrorHandler, requireBearerSecret } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { checkOtaReconciliation } from "@/lib/booking/override-reconcile";
import { dispatchNotification } from "@/lib/notifications/dispatcher";
import { auditLog } from "@/lib/audit/log";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const LEASE_TTL_SECONDS = 5 * 60;

/**
 * Cron §8.4: verifica post-approve (+1h) che i conflict OTA siano
 * effettivamente CANCELLED upstream. Se STILL_ACTIVE → flag
 * PENDING_RECONCILE_FAILED + dispatch FATAL admin + audit.
 *
 * R19 Fix #15: usa l'indice `(status, reconcileCheckDue)` con filter
 * secondario `reconcileCheckedAt IS NULL` in-query (small dataset <10k).
 */
export const POST = withErrorHandler(async (req: Request) => {
  requireBearerSecret(req, env.CRON_SECRET);
  await enforceRateLimit({
    identifier: "global",
    scope: RATE_LIMIT_SCOPES.OVERRIDE_RECONCILE_CRON_IP,
    limit: 10,
    windowSeconds: 60,
    failOpen: true,
  });

  const lease = await tryAcquireLease(LEASE_KEYS.OVERRIDE_RECONCILE, LEASE_TTL_SECONDS);
  if (!lease) {
    return NextResponse.json({ skipped: "already-running" });
  }
  try {
    const now = new Date();
    const due = await db.overrideRequest.findMany({
      where: {
        status: "APPROVED",
        reconcileCheckDue: { lte: now },
        reconcileCheckedAt: null,
      },
      take: 50,
      select: { id: true, newBookingId: true },
    });

    let checked = 0;
    let failedCount = 0;

    for (const r of due) {
      checked++;
      try {
        const result = await checkOtaReconciliation(r.id);
        if (result.upstreamStatus === "STILL_ACTIVE") {
          failedCount++;
          await db.overrideRequest.update({
            where: { id: r.id },
            data: { status: "PENDING_RECONCILE_FAILED", reconcileCheckedAt: now },
          });
          const newBooking = await db.booking.findUnique({
            where: { id: r.newBookingId },
            select: { confirmationCode: true },
          });
          await dispatchNotification({
            type: "OVERRIDE_RECONCILE_FAILED",
            channels: ["EMAIL", "TELEGRAM"],
            payload: {
              overrideRequestId: r.id,
              newBookingCode: newBooking?.confirmationCode ?? r.newBookingId,
              upstreamConflicts: result.channels.map((c) => ({
                bookingId: "",
                channel: c,
                externalRef: "",
                status: "CONFIRMED",
              })),
              overrideDetailUrl: `${env.APP_URL}/admin/override-requests/${r.id}`,
            },
          });
          await auditLog({
            action: "OVERRIDE_RECONCILE_FAILED",
            entity: "OverrideRequest",
            entityId: r.id,
            after: { channels: result.channels },
          });
        } else {
          await db.overrideRequest.update({
            where: { id: r.id },
            data: { reconcileCheckedAt: now },
          });
        }
      } catch (err) {
        logger.error({ err, requestId: r.id }, "override-reconcile iteration failed");
      }
    }
    logger.info({ checked, failedCount }, "override-reconcile cron completed");
    return NextResponse.json({ checked, failed: failedCount });
  } finally {
    await releaseLease(lease);
  }
});

export const GET = POST;
