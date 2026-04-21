import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { generateBoatIcal } from "@/lib/ical/generator";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { getClientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";

/**
 * GET /api/ical/[boatId] — feed iCal RFC5545 pubblico.
 *
 * Rate-limit 30 req/min per IP.
 *
 * R26-P4 (audit double-book Agent 2 Scenario 3 / R13-D): cache ridotta da
 * 15min → 60s + ETag basato su `max(BoatAvailability.updatedAt)` per-boat.
 * Consumer iCal (SamBoat, Airbnb, Google Calendar) che supportano
 * If-None-Match ricevono 304 Not Modified invece di re-parsare → traffico
 * quasi identico ma staleness window ridotta a ~60s. Riduce double-booking
 * Airbnb-style (cliente vede slot libero 15min dopo che l'abbiamo bloccato).
 */
export const GET = withErrorHandler(async (req: Request, ...args: unknown[]) => {
  const ctx = args[0] as { params: Promise<{ boatId: string }> };

  await enforceRateLimit({
    identifier: getClientIp(req.headers),
    scope: RATE_LIMIT_SCOPES.ICAL_EXPORT_IP,
    limit: 30,
    windowSeconds: 60,
    // R28-CRIT-3: fail-closed. Generation costly (DB aggregate + sort +
    // iCal serialize). Consumer conformi (Google Cal/Airbnb/SamBoat)
    // retentano o usano cache stale ETag.
    failOpen: false,
  });

  const { boatId } = await ctx.params;

  // ETag: hash di max(BoatAvailability.updatedAt) + boatId. Cambia su
  // qualsiasi update cella → consumer invalidano cache immediatamente.
  const latest = await db.boatAvailability.aggregate({
    where: { boatId },
    _max: { updatedAt: true },
  });
  const lastModified = latest._max.updatedAt ?? new Date(0);
  const etag = `"${crypto
    .createHash("sha1")
    .update(`${boatId}:${lastModified.toISOString()}`)
    .digest("base64url")
    .slice(0, 16)}"`;

  // If-None-Match: consumer conforme (Airbnb, Google Cal) invia ETag
  // precedente → 304 Not Modified → niente body + cache validation.
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        etag,
        "cache-control": "public, max-age=60, must-revalidate",
      },
    });
  }

  const ical = await generateBoatIcal(boatId);
  return new NextResponse(ical, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      // max-age=60 + must-revalidate → consumer rivalida ogni minuto.
      // Staleness window effettiva con ETag: ~60s.
      "cache-control": "public, max-age=60, must-revalidate",
      etag,
      "last-modified": lastModified.toUTCString(),
      "content-disposition": `attachment; filename="${boatId}.ics"`,
    },
  });
});
