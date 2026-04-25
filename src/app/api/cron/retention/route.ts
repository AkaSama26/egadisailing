import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { addDays } from "@/lib/dates";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { pruneProcessedEvents } from "@/lib/dedup/processed-event";
import { processBatchPaginated } from "@/lib/cron/process-batch-paginated";

export const runtime = "nodejs";

/**
 * Cron giornaliero di data retention — GDPR art. 5.1.e (storage limitation).
 *
 * Policy:
 * - BookingRecoveryOtp usati/scaduti   → delete dopo 30 giorni
 * - BookingRecoverySession scadute     → delete dopo 90 giorni
 * - RateLimitEntry con window chiusa   → delete dopo 7 giorni
 * - ProcessedStripeEvent               → delete dopo 60 giorni (Stripe retry max 30g)
 * - ProcessedBokunEvent                → delete dopo 365 giorni (R25-A3-C1:
 *                                         dedup replay-proof window esteso —
 *                                         webhook replay vecchio con payload
 *                                         capturato bypassa dedup solo dopo 1y;
 *                                         abbinato a replay window ±5min su
 *                                         x-bokun-date header)
 * - ProcessedBoataroundEvent           → delete dopo 365 giorni (R25-A3-C2)
 * - ProcessedCharterEmail              → delete dopo 90 giorni
 * - WeatherForecastCache               → delete dopo 14 giorni
 * - AuditLog                           → delete dopo 24 mesi (bilanciato con antifraud/compliance)
 * - BokunBooking.rawPayload            → redacted PII dopo 90 giorni
 * - CharterBooking.rawPayload          → redacted PII dopo 90 giorni (R18)
 * - Booking e Customer: retention 10 anni (art. 2220 c.c.) gestiti separatamente
 *
 * Auth: Bearer CRON_SECRET (timing-safe). Multi-replica safe: Redis lease.
 *
 * R14-Area2: lease cross-replica. Retention deleteMany non ha side
 * effect pericolosi in doppio (delete idempotente), ma genera log noise
 * + carico DB raddoppiato per nulla.
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.RETENTION_CRON_IP,
    leaseKey: LEASE_KEYS.RETENTION,
    leaseTtlSeconds: 15 * 60,
  },
  async (_req, _ctx) => {
    const now = new Date();
    const thirtyDaysAgo = addDays(now, -30);
    const ninetyDaysAgo = addDays(now, -90);
    const sevenDaysAgo = addDays(now, -7);
    const fourteenDaysAgo = addDays(now, -14);
    const twoYearsAgo = addDays(now, -365 * 2);

    const results = {
      otpDeleted: 0,
      sessionDeleted: 0,
      rateLimitDeleted: 0,
      stripeEventDeleted: 0,
      bokunEventDeleted: 0,
      boataroundEventDeleted: 0,
      charterEmailDeleted: 0,
      bokunPayloadRedacted: 0,
      charterPayloadRedacted: 0,
      weatherCacheDeleted: 0,
      auditLogDeleted: 0,
    };
    const errors: string[] = [];

    try {
      results.otpDeleted = (
        await db.bookingRecoveryOtp.deleteMany({
          where: {
            OR: [{ usedAt: { not: null } }, { expiresAt: { lt: now } }],
            createdAt: { lt: thirtyDaysAgo },
          },
        })
      ).count;
    } catch (err) {
      errors.push("otp");
      logger.error({ err }, "OTP retention cleanup failed");
    }

    try {
      results.sessionDeleted = (
        await db.bookingRecoverySession.deleteMany({
          where: { expiresAt: { lt: ninetyDaysAgo } },
        })
      ).count;
    } catch (err) {
      errors.push("session");
      logger.error({ err }, "Session retention cleanup failed");
    }

    try {
      results.rateLimitDeleted = (
        await db.rateLimitEntry.deleteMany({
          where: { windowEnd: { lt: sevenDaysAgo } },
        })
      ).count;
    } catch (err) {
      errors.push("rateLimit");
      logger.error({ err }, "RateLimit retention cleanup failed");
    }

    try {
      // 60d retention window: Stripe webhook retry max 30g + buffer audit.
      results.stripeEventDeleted = await pruneProcessedEvents("ProcessedStripeEvent", 60);
    } catch (err) {
      errors.push("stripeEvent");
      logger.error({ err }, "StripeEvent retention cleanup failed");
    }

    try {
      // R25-A3-C1: 365d dedup window (era 30d). Combinato con replay window
      // ±5min su x-bokun-date nel webhook route, un payload capturato non
      // puo' piu' essere replayato > 5min dopo l'emissione originale.
      // Storage: 64-byte hash × 1k events/day × 365d = ~23MB/y, trascurabile.
      results.bokunEventDeleted = await pruneProcessedEvents("ProcessedBokunEvent", 365);
    } catch (err) {
      errors.push("bokunEvent");
      logger.error({ err }, "BokunEvent retention cleanup failed");
    }

    try {
      // R25-A3-C2: same 365d window di Bokun per consistenza replay defense.
      results.boataroundEventDeleted = await pruneProcessedEvents("ProcessedBoataroundEvent", 365);
    } catch (err) {
      errors.push("boataroundEvent");
      logger.error({ err }, "BoataroundEvent retention cleanup failed");
    }

    try {
      results.charterEmailDeleted = await pruneProcessedEvents("ProcessedCharterEmail", 90);
    } catch (err) {
      errors.push("charterEmail");
      logger.error({ err }, "CharterEmail retention cleanup failed");
    }

    // GDPR: BokunBooking.rawPayload contiene PII (firstName/lastName/email/phone/
    // passengers). La retention legale del Booking e' 10 anni (art. 2220 c.c.)
    // ma la PII serve solo finche' la prenotazione e' operativa. Dopo 90g
    // sostituiamo il payload con i soli campi business-essenziali, cancellando
    // la PII residua. Idempotent: ri-esecuzione su record gia' redatti non ha
    // effetti (skippati via marker `_redacted: true`).
    try {
      const bokunRes = await processBatchPaginated<
        { bookingId: string; rawPayload: unknown },
        string
      >({
        label: "retention-bokun-payload",
        batchSize: 500,
        maxBatches: 20,
        fetchBatch: async (cursor, size) => {
          const rows = await db.bokunBooking.findMany({
            where: {
              booking: { createdAt: { lt: ninetyDaysAgo } },
              ...(cursor ? { bookingId: { gt: cursor } } : {}),
            },
            select: { bookingId: true, rawPayload: true },
            orderBy: { bookingId: "asc" },
            take: size,
          });
          return {
            items: rows,
            nextCursor: rows.length > 0 ? rows[rows.length - 1].bookingId : undefined,
          };
        },
        processItem: async (row) => {
          const payload = row.rawPayload as Record<string, unknown>;
          if (payload && typeof payload === "object" && payload._redacted === true) return;
          const pickNumber = (v: unknown): number | null =>
            typeof v === "number" ? v : null;
          const pickString = (v: unknown): string | null =>
            typeof v === "string" ? v : null;
          const redacted: Prisma.InputJsonValue = {
            id: pickNumber(payload?.id),
            productId: pickString(payload?.productId),
            status: pickString(payload?.status),
            channelName: pickString(payload?.channelName),
            startDate: pickString(payload?.startDate),
            endDate: pickString(payload?.endDate),
            numPeople: pickNumber(payload?.numPeople),
            totalPrice: pickNumber(payload?.totalPrice),
            currency: pickString(payload?.currency),
            // Campi non-PII tenuti per audit fiscale (art. 2220 c.c., 10 anni).
            paymentStatus: pickString(payload?.paymentStatus),
            passengerCount: pickNumber(payload?.passengerCount),
            _redacted: true,
            _redactedAt: now.toISOString(),
          };
          await db.bokunBooking.update({
            where: { bookingId: row.bookingId },
            data: { rawPayload: redacted },
          });
          results.bokunPayloadRedacted++;
        },
      });
      if (bokunRes.hitMaxBatches) {
        logger.warn(
          { batches: bokunRes.batchCount, redacted: results.bokunPayloadRedacted },
          "Bokun rawPayload redaction hit MAX_BATCHES — backlog remains",
        );
      }
    } catch (err) {
      errors.push("bokunPayload");
      logger.error({ err }, "Bokun rawPayload redaction failed");
    }

    // R18-CRITICA: CharterBooking.rawPayload contiene PII analoga a BokunBooking
    // (firstName/lastName/email/phone persiti dall'email parser o webhook
    // Boataround). Retention 90g uguale. Senza questo, PII sopravvivono 10y
    // legali fino al hard-delete Booking → violazione art. 5.1.c minimization
    // + art. 5.1.e storage limitation.
    try {
      const charterRes = await processBatchPaginated<
        { bookingId: string; rawPayload: unknown },
        string
      >({
        label: "retention-charter-payload",
        batchSize: 500,
        maxBatches: 20,
        fetchBatch: async (cursor, size) => {
          const rows = await db.charterBooking.findMany({
            where: {
              booking: { createdAt: { lt: ninetyDaysAgo } },
              ...(cursor ? { bookingId: { gt: cursor } } : {}),
            },
            select: { bookingId: true, rawPayload: true },
            orderBy: { bookingId: "asc" },
            take: size,
          });
          return {
            items: rows,
            nextCursor: rows.length > 0 ? rows[rows.length - 1].bookingId : undefined,
          };
        },
        processItem: async (row) => {
          const payload = row.rawPayload as Record<string, unknown>;
          if (payload && typeof payload === "object" && payload._redacted === true) return;
          // Whitelist: preserva solo campi business non-PII per audit.
          const redacted = {
            _redacted: true,
            platform: payload?.platform ?? null,
            platformBookingRef: payload?.platformBookingRef ?? null,
            status: payload?.status ?? null,
            startDate: payload?.startDate ?? null,
            endDate: payload?.endDate ?? null,
            numPeople: typeof payload?.numPeople === "number" ? payload.numPeople : null,
            totalPriceCents:
              typeof payload?.totalPriceCents === "number" ? payload.totalPriceCents : null,
            currency: payload?.currency ?? null,
          };
          await db.charterBooking.update({
            where: { bookingId: row.bookingId },
            data: { rawPayload: redacted },
          });
          results.charterPayloadRedacted++;
        },
      });
      if (charterRes.hitMaxBatches) {
        logger.warn(
          { batches: charterRes.batchCount, redacted: results.charterPayloadRedacted },
          "Charter rawPayload redaction hit MAX_BATCHES — backlog remains",
        );
      }
    } catch (err) {
      errors.push("charterPayload");
      logger.error({ err }, "Charter rawPayload redaction failed");
    }

    try {
      results.weatherCacheDeleted = (
        await db.weatherForecastCache.deleteMany({
          where: { fetchedAt: { lt: fourteenDaysAgo } },
        })
      ).count;
    } catch (err) {
      errors.push("weather");
      logger.error({ err }, "Weather cache retention cleanup failed");
    }

    try {
      results.auditLogDeleted = (
        await db.auditLog.deleteMany({
          where: { timestamp: { lt: twoYearsAgo } },
        })
      ).count;
    } catch (err) {
      errors.push("auditLog");
      logger.error({ err }, "AuditLog retention cleanup failed");
    }

    const payload = { ...results, errors };
    if (errors.length > 0) {
      logger.warn(payload, "Data retention cleanup completed with partial failures");
    } else {
      logger.info(payload, "Data retention cleanup completed");
    }
    return payload;
  },
);
