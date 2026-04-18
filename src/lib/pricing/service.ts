import { db } from "@/lib/db";
import { resolveHotDay, applyHotDay } from "./hot-days";
import { NotFoundError } from "@/lib/errors";

export interface PriceQuote {
  basePricePerPerson: number;
  finalPricePerPerson: number;
  hotDayApplied: boolean;
  hotDayMultiplier: number;
  hotDaySource: string;
  totalPrice: number;
}

/**
 * Calcola il prezzo finale per una combinazione servizio+data+persone
 * considerando prezzo stagionale base + hot day.
 */
export async function quotePrice(
  serviceId: string,
  date: Date,
  numPeople: number,
): Promise<PriceQuote> {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

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

  const basePrice = period.pricePerPerson.toNumber();
  const hotDay = await resolveHotDay(dateOnly, serviceId);
  const finalPrice = applyHotDay(basePrice, hotDay);

  return {
    basePricePerPerson: basePrice,
    finalPricePerPerson: finalPrice,
    hotDayApplied: hotDay.applied,
    hotDayMultiplier: hotDay.multiplier,
    hotDaySource: hotDay.source,
    totalPrice: finalPrice * numPeople,
  };
}
