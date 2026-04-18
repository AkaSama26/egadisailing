import { NextResponse } from "next/server";
import { generateBoatIcal } from "@/lib/ical/generator";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { getClientIp } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";

/**
 * GET /api/ical/[boatId] — feed iCal RFC5545 pubblico.
 *
 * Rate-limit 30 req/min per IP: i portali iCal (SamBoat/Airbnb) polling
 * tipico 1-2 req/ora, 30/min e' abbondante + protegge da scraping.
 *
 * Cache 15 min (in-browser + reverse proxy). Il BoatAvailability cambia
 * raramente — 15 min di staleness e' accettabile per il channel sync.
 */
export const GET = withErrorHandler(async (req: Request, ...args: unknown[]) => {
  const ctx = args[0] as { params: Promise<{ boatId: string }> };

  await enforceRateLimit({
    identifier: getClientIp(req.headers),
    scope: RATE_LIMIT_SCOPES.ICAL_EXPORT_IP,
    limit: 30,
    windowSeconds: 60,
  });

  const { boatId } = await ctx.params;
  const ical = await generateBoatIcal(boatId);

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=900",
      "content-disposition": `attachment; filename="${boatId}.ics"`,
    },
  });
});
