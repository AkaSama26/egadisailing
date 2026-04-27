import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { toUtcDay } from "@/lib/dates";
import { PRICING_UNITS, effectivePricingUnit, type PricingUnit } from "./units";

export interface PriceQuote {
  basePricePerPerson: Decimal;
  finalPricePerPerson: Decimal;
  baseUnitPrice: Decimal;
  finalUnitPrice: Decimal;
  pricingUnit: PricingUnit;
  hotDayApplied: boolean;
  hotDayMultiplier: number;
  hotDaySource: string;
  hotDayRuleName?: string;
  totalPrice: Decimal;
}

export interface QuotePriceOptions {
  durationDays?: number;
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
  options: QuotePriceOptions = {},
): Promise<PriceQuote> {
  if (numPeople < 1) {
    throw new Error("numPeople must be >= 1");
  }

  const dateOnly = toUtcDay(date);

  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      type: true,
      boatId: true,
      durationType: true,
      durationHours: true,
      pricingUnit: true,
    },
  });
  if (!service) {
    throw new NotFoundError("Service", serviceId);
  }

  let period = await db.pricingPeriod.findFirst({
    where: {
      serviceId,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
    orderBy: { startDate: "desc" },
    include: {
      service: { select: { type: true, pricingUnit: true } },
    },
  });

  let derivedHalfDayMultiplier = 1;
  if (
    service.type.startsWith("BOAT_") &&
    (service.durationType === "HALF_DAY_MORNING" ||
      service.durationType === "HALF_DAY_AFTERNOON")
  ) {
    const fullDayService = await db.service.findFirst({
      where: {
        boatId: service.boatId,
        type: service.type,
        pricingUnit: service.pricingUnit,
        durationType: "FULL_DAY",
        active: true,
      },
      select: { id: true },
    });
    if (fullDayService) {
      const fullDayPeriod = await db.pricingPeriod.findFirst({
        where: {
          serviceId: fullDayService.id,
          startDate: { lte: dateOnly },
          endDate: { gte: dateOnly },
        },
        orderBy: { startDate: "desc" },
        include: {
          service: { select: { type: true, pricingUnit: true } },
        },
      });
      if (fullDayPeriod) {
        period = fullDayPeriod;
        derivedHalfDayMultiplier = 0.75;
      }
    }
  }

  if (!period) {
    throw new NotFoundError("PricingPeriod", `${serviceId} @ ${dateOnly.toISOString()}`);
  }

  const basePrice = new Decimal(period.pricePerPerson.toString()).mul(derivedHalfDayMultiplier);
  const finalPrice = basePrice;
  const pricingUnit = effectivePricingUnit(period.service);
  const billableDays =
    service.type === "CABIN_CHARTER"
      ? Math.max(3, Math.min(7, options.durationDays ?? Math.ceil(service.durationHours / 24)))
      : 1;
  const unitTotal = finalPrice.mul(billableDays);
  const total = pricingUnit === PRICING_UNITS.PER_PACKAGE ? unitTotal : unitTotal.mul(numPeople);

  return {
    basePricePerPerson: basePrice,
    finalPricePerPerson: finalPrice,
    baseUnitPrice: basePrice,
    finalUnitPrice: finalPrice,
    pricingUnit,
    hotDayApplied: false,
    hotDayMultiplier: 1,
    hotDaySource: "NONE",
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
    baseUnitPrice: q.baseUnitPrice.toNumber(),
    finalUnitPrice: q.finalUnitPrice.toNumber(),
    pricingUnit: q.pricingUnit,
    hotDayApplied: q.hotDayApplied,
    hotDayMultiplier: q.hotDayMultiplier,
    hotDaySource: q.hotDaySource,
    hotDayRuleName: q.hotDayRuleName,
    totalPrice: q.totalPrice.toNumber(),
  };
}
