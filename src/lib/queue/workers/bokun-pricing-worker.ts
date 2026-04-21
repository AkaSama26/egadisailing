import Decimal from "decimal.js";
import { createWorker, registerWorker, QUEUE_NAMES } from "@/lib/queue";
import { upsertBokunPriceOverride } from "@/lib/bokun/pricing";
import { isBokunConfigured } from "@/lib/bokun";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { parseIsoDay } from "@/lib/dates";
import { quotePrice } from "@/lib/pricing/service";
import { NotFoundError } from "@/lib/errors";
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
  const worker = createWorker<PricingJob>(
    QUEUE_NAMES.PRICING_BOKUN,
    async (job) => {
      // R23-Q-CRITICA-1: queue dedicata — no early-return drop.
      if (job.name !== "pricing.bokun.sync") {
        logger.warn(
          { jobName: job.name, queue: QUEUE_NAMES.PRICING_BOKUN },
          "Unexpected job name on Bokun pricing queue",
        );
        return;
      }
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

      // R28-CRIT-6: re-read DB via quotePrice PRIMA del POST Bokun. Prima:
      // worker usava `data.amount` congelato al momento dell'enqueue. Con
      // concurrency=2 + dedup jobId, se admin salva 120€ → poi 180€ entro
      // 200ms, il primo job gia' `active` non veniva sostituito → 2 POST
      // paralleli con amount diversi → ordine di arrivo upstream non
      // deterministico → listino Bokun/Viator/GYG mostrava PREZZO VECCHIO.
      // Revenue loss diretto €60/posto/giorno in alta stagione.
      //
      // Ora: rileggiamo PricingPeriod + HotDayRule/Override live dal DB.
      // Ultimo job eseguito = stato finale pubblicato (eventual consistency).
      const dateOnly = parseIsoDay(data.date);
      let quote;
      try {
        quote = await quotePrice(data.serviceId, dateOnly, 1);
      } catch (err) {
        if (err instanceof NotFoundError) {
          // PricingPeriod droppato tra enqueue ed execute: skip senza retry
          // (BullMQ retry non risolve finche' admin non ri-configura). Il
          // prossimo admin upsert riaccodera' il job.
          logger.warn(
            {
              serviceId: data.serviceId,
              date: data.date,
              payloadAmount: data.amount,
            },
            "PricingPeriod missing — skipping Bokun price sync",
          );
          return;
        }
        throw err; // transient DB error → BullMQ retry
      }

      const markup = new Decimal(env.BOKUN_PRICE_MARKUP);
      const freshAmount = quote.finalPricePerPerson;
      // Arrotonda per eccesso all'euro — Bokun non accetta frazioni di cent
      // diverse da quelle del proprio arrotondamento; integer e' safest.
      const bokunAmount = freshAmount
        .mul(markup)
        .toDecimalPlaces(0, Decimal.ROUND_CEIL)
        .toNumber();

      // Diagnostic log: payload diverge dal DB fresh (utile per monitorare
      // coalescenza sub-ottimale del jobId dedup).
      if (!freshAmount.equals(new Decimal(data.amount))) {
        logger.info(
          {
            serviceId: data.serviceId,
            date: data.date,
            payloadAmount: data.amount,
            freshAmount: freshAmount.toString(),
          },
          "Bokun pricing payload stale — using fresh DB value",
        );
      }

      const res = await upsertBokunPriceOverride({
        productId: service.bokunProductId,
        date: data.date,
        amount: bokunAmount,
      });

      // R28-CRIT-6: upsert invece di create. Unique(bokunExperienceId, date)
      // aggiunto via migration 20260421200500 permette idempotency su retry.
      await db.bokunPriceSync.upsert({
        where: {
          bokunExperienceId_date: {
            bokunExperienceId: service.bokunProductId,
            date: dateOnly,
          },
        },
        create: {
          bokunExperienceId: service.bokunProductId,
          bokunPriceOverrideId: res.id,
          date: dateOnly,
          amount: bokunAmount,
          status: "SYNCED",
          syncedAt: new Date(),
        },
        update: {
          bokunPriceOverrideId: res.id,
          amount: bokunAmount,
          status: "SYNCED",
          syncedAt: new Date(),
          lastError: null,
        },
      });
    },
    { concurrency: 2, limiter: { max: 5, duration: 1000 } },
  );
  registerWorker(worker);
  return worker;
}
