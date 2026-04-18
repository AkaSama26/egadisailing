import Decimal from "decimal.js";
import { createWorker } from "@/lib/queue";
import { upsertBokunPriceOverride } from "@/lib/bokun/pricing";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { parseIsoDay } from "@/lib/dates";
import type { BokunPricingSyncPayload } from "@/lib/queue/types";

interface PricingJob {
  type: "pricing.bokun.sync";
  data: BokunPricingSyncPayload;
}

/**
 * Worker BullMQ: consuma job "pricing.bokun.sync" — applica markup
 * configurabile sul prezzo del sito e lo pusha come price-override su Bokun.
 * Salva un `BokunPriceSync` row per audit trail (utile per rollback
 * manuale se il markup cambia).
 */
export function startBokunPricingWorker() {
  return createWorker<PricingJob>(
    "sync",
    async (job) => {
      if (job.name !== "pricing.bokun.sync") return;
      const { data } = job.data;
      if (!data) return;

      if (!isBokunConfigured()) {
        logger.warn({ serviceId: data.serviceId }, "Bokun not configured, skipping pricing sync");
        return;
      }

      const service = await db.service.findUnique({ where: { id: data.serviceId } });
      if (!service || !service.bokunProductId) {
        logger.warn(
          { serviceId: data.serviceId },
          "Service has no Bokun mapping, skipping pricing sync",
        );
        return;
      }

      const markup = new Decimal(env.BOKUN_PRICE_MARKUP);
      const siteAmount = new Decimal(data.amount);
      // Arrotonda per eccesso all'euro — Bokun non accetta frazioni di cent
      // diverse da quelle del proprio arrotondamento; integer e' safest.
      const bokunAmount = siteAmount.mul(markup).toDecimalPlaces(0, Decimal.ROUND_CEIL).toNumber();

      const res = await upsertBokunPriceOverride({
        productId: service.bokunProductId,
        date: data.date,
        amount: bokunAmount,
      });

      await db.bokunPriceSync.create({
        data: {
          bokunExperienceId: service.bokunProductId,
          bokunPriceOverrideId: res.id,
          date: parseIsoDay(data.date),
          amount: bokunAmount,
          status: "SYNCED",
          syncedAt: new Date(),
        },
      });
    },
    2,
  );
}
