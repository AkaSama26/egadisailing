"use server";

import { z } from "zod";
import { headers } from "next/headers";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp } from "@/lib/http/client-ip";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import {
  checkOverrideEligibility as checkPure,
  type OverrideEligibilityResult,
} from "./override-eligibility";
import { toUtcDay, eachUtcDayInclusive } from "@/lib/dates";
import { quotePrice } from "@/lib/pricing/service";

const inputSchema = z.object({
  boatId: z.string().min(1),
  serviceId: z.string().min(1),
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "startDate must be parseable",
  }),
  endDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "endDate must be parseable",
  }),
  numPax: z.number().int().min(1).max(100),
});

export type CheckOverrideEligibilityInput = z.infer<typeof inputSchema>;

export type CheckOverrideEligibilityResult =
  | OverrideEligibilityResult
  | {
      status: "blocked";
      reason: "feature_disabled";
      conflictingBookingIds: string[];
    };

/**
 * Server Action invocata dal booking wizard al click "Continua" del pax step.
 * Pure check — NON crea nulla nel DB.
 * Rate-limit 30/min per IP (scope OVERRIDE_CHECK_IP).
 *
 * Se FEATURE_OVERRIDE_ENABLED=false → { status: "blocked", reason: "feature_disabled" }.
 */
export async function checkOverrideEligibilityAction(
  rawInput: unknown,
): Promise<CheckOverrideEligibilityResult> {
  if (!env.FEATURE_OVERRIDE_ENABLED) {
    return {
      status: "blocked",
      reason: "feature_disabled",
      conflictingBookingIds: [],
    };
  }

  const hdrs = await headers();
  const ip = getClientIp(hdrs);
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.OVERRIDE_CHECK_IP,
    limit: 30,
    windowSeconds: 60,
    failOpen: true,
  });

  const input = inputSchema.parse(rawInput);
  const startDay = toUtcDay(new Date(input.startDate));
  const endDay = toUtcDay(new Date(input.endDate));

  // Conflicting bookings (PENDING | CONFIRMED) on same boat overlapping range
  const conflictingBookings = await db.booking.findMany({
    where: {
      boatId: input.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startDate: { lte: endDay },
      endDate: { gte: startDay },
    },
    select: { id: true, totalPrice: true, source: true },
  });

  // Admin boat-block (BoatAvailability BLOCKED + lockedByBookingId null)
  const dayRange = Array.from(eachUtcDayInclusive(startDay, endDay));
  const availability = await db.boatAvailability.findMany({
    where: {
      boatId: input.boatId,
      date: { in: dayRange },
      status: "BLOCKED",
      lockedByBookingId: null,
    },
    select: { date: true },
  });

  // Revenue nuovo via quotePrice
  const quote = await quotePrice(input.serviceId, startDay, input.numPax);
  const newBookingRevenue = new Decimal(quote.totalPrice.toString());

  const result = checkPure({
    newBookingRevenue,
    conflictingBookings: [
      ...conflictingBookings.map((b) => ({
        id: b.id,
        revenue: new Decimal(b.totalPrice.toString()),
        isAdminBlock: false,
      })),
      ...availability.map((a) => ({
        id: `block:${a.date.toISOString().slice(0, 10)}`,
        revenue: new Decimal(0),
        isAdminBlock: true,
      })),
    ],
    experienceDate: startDay,
    today: new Date(),
  });

  logger.info(
    {
      boatId: input.boatId,
      startDay: startDay.toISOString(),
      status: result.status,
      numConflicts: conflictingBookings.length,
      numBlocks: availability.length,
    },
    "override.eligibility.check",
  );

  return result;
}
