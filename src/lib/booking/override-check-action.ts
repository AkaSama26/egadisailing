"use server";

import { z } from "zod";
import { headers } from "next/headers";
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
import { loadEligibilityContext } from "./eligibility-context";

const inputSchema = z.object({
  boatId: z.string().min(1).optional(),
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

  const parsedInput = inputSchema.parse(rawInput);
  let boatId = parsedInput.boatId;
  if (!boatId) {
    const svc = await db.service.findUnique({
      where: { id: parsedInput.serviceId },
      select: { boatId: true },
    });
    if (!svc) {
      throw new Error(`Service ${parsedInput.serviceId} not found`);
    }
    boatId = svc.boatId;
  }

  const { input: eligibilityInput, rawConflicts } = await loadEligibilityContext({
    boatId,
    serviceId: parsedInput.serviceId,
    startDate: parsedInput.startDate,
    endDate: parsedInput.endDate,
    numPax: parsedInput.numPax,
  });

  const result = checkPure(eligibilityInput);

  logger.info(
    {
      boatId,
      startDay: eligibilityInput.experienceDate.toISOString(),
      status: result.status,
      numConflicts: rawConflicts.length,
      numBlocks: eligibilityInput.conflictingBookings.length - rawConflicts.length,
    },
    "override.eligibility.check",
  );

  return result;
}
