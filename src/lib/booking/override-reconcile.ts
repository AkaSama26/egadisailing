"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getBokunBooking } from "@/lib/bokun/bookings";

/**
 * Verifica che un booking OTA conflittuale sia effettivamente CANCELLED upstream.
 * Usato da approveOverride per assicurarsi che admin abbia fatto il manual step
 * sul pannello OTA prima di confermare l'override.
 *
 * Per BOKUN: chiama `getBokunBooking(bokunBookingId)` e verifica status.
 * Per altri OTA (BOATAROUND/SAMBOAT/CLICKANDBOAT/NAUTAL): TODO Fase 1.1+ — per ora
 * ritorna true (admin deve comunque fare il manual step upstream).
 */
export async function isUpstreamCancelled(
  conflictId: string,
  channel: string,
): Promise<boolean> {
  if (channel === "BOKUN") {
    const booking = await db.booking.findUnique({
      where: { id: conflictId },
      include: { bokunBooking: true },
    });
    if (!booking?.bokunBooking?.bokunBookingId) {
      logger.warn(
        { conflictId, channel },
        "isUpstreamCancelled: BokunBooking record missing, cannot verify upstream",
      );
      return false;
    }
    try {
      const upstream = await getBokunBooking(booking.bokunBooking.bokunBookingId);
      const status = (upstream as { status?: string })?.status ?? "";
      return typeof status === "string" && status.toUpperCase().startsWith("CANCEL");
    } catch (err) {
      logger.error(
        { err, conflictId, bokunBookingId: booking.bokunBooking.bokunBookingId },
        "isUpstreamCancelled: Bokun API lookup failed",
      );
      return false;
    }
  }

  // BOATAROUND / SAMBOAT / CLICKANDBOAT / NAUTAL — API lookup non implementato.
  // Admin ha fatto manual cancel sul pannello esterno (checkbox spuntata);
  // tornare true = trust admin.
  return true;
}

/**
 * Cron helper §8.4: verifica post-approve che i conflict OTA siano effettivamente
 * CANCELLED upstream. Chiamato 1h dopo l'approve admin.
 *
 * Ritorno:
 *   - `upstreamStatus: "CANCELLED"` → tutto ok, nessuna azione
 *   - `upstreamStatus: "STILL_ACTIVE"` → almeno 1 conflict ancora attivo upstream
 *     → caller (cron) setta OverrideRequest.status = PENDING_RECONCILE_FAILED
 */
export async function checkOtaReconciliation(
  requestId: string,
): Promise<{
  upstreamStatus: "CANCELLED" | "STILL_ACTIVE";
  channels: string[];
}> {
  const request = await db.overrideRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  if (request.status !== "APPROVED") {
    throw new Error(`OverrideRequest ${requestId} is not APPROVED (is ${request.status})`);
  }

  const channels = new Set<string>();
  let stillActive = false;

  for (const conflictId of request.conflictingBookingIds) {
    const conflict = await db.booking.findUnique({
      where: { id: conflictId },
      select: { source: true },
    });
    if (!conflict) continue;

    // Skip non-OTA sources
    if (conflict.source === "DIRECT") continue;

    channels.add(conflict.source);
    const cancelled = await isUpstreamCancelled(conflictId, conflict.source);
    if (!cancelled) stillActive = true;
  }

  return {
    upstreamStatus: stillActive ? "STILL_ACTIVE" : "CANCELLED",
    channels: Array.from(channels),
  };
}
