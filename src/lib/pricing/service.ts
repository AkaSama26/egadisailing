import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { resolveHotDay, applyHotDay } from "./hot-days";
import { NotFoundError } from "@/lib/errors";
import { toUtcDay } from "@/lib/dates";

export interface PriceQuote {
  basePricePerPerson: Decimal;
  finalPricePerPerson: Decimal;
  hotDayApplied: boolean;
  hotDayMultiplier: number;
  hotDaySource: string;
  hotDayRuleName?: string;
  totalPrice: Decimal;
}

/**
 * Calcola il prezzo finale per (servizio, data, persone).
 * Tiene tutto in Decimal per evitare errori di floating point.
 *
 * La conversione a number va fatta SOLO al confine API (JSON response).
 */
export async function quotePrice(
  serviceId: string,
  date: Date,
  numPeople: number,
): Promise<PriceQuote> {
  if (numPeople < 1) {
    throw new Error("numPeople must be >= 1");
  }

  const dateOnly = toUtcDay(date);

  const period = await db.pricingPeriod.findFirst({
    where: {
      serviceId,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
    orderBy: { startDate: "desc" },
  });

  if (!period) {
    throw new NotFoundError("PricingPeriod", `${serviceId} @ ${dateOnly.toISOString()}`);
  }

  const basePrice = new Decimal(period.pricePerPerson.toString());
  const hotDay = await resolveHotDay(dateOnly, serviceId);
  const finalPrice = applyHotDay(basePrice, hotDay);
  const total = finalPrice.mul(numPeople);

  return {
    basePricePerPerson: basePrice,
    finalPricePerPerson: finalPrice,
    hotDayApplied: hotDay.applied,
    hotDayMultiplier: hotDay.multiplier,
    hotDaySource: hotDay.source,
    hotDayRuleName: hotDay.ruleName,
    totalPrice: total,
  };
}

/**
 * Serializza un PriceQuote per JSON response (perdita precisione accettata
 * solo al boundary presentazione).
 */
export function quoteToJson(q: PriceQuote) {
  return {
    basePricePerPerson: q.basePricePerPerson.toNumber(),
    finalPricePerPerson: q.finalPricePerPerson.toNumber(),
    hotDayApplied: q.hotDayApplied,
    hotDayMultiplier: q.hotDayMultiplier,
    hotDaySource: q.hotDaySource,
    hotDayRuleName: q.hotDayRuleName,
    totalPrice: q.totalPrice.toNumber(),
  };
}
