import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { toUtcDay } from "@/lib/dates";
import { PRICING_UNITS, effectivePricingUnit, type PricingUnit } from "./units";
import {
  normalizePassengerBreakdown,
  paidUnitsForService,
  type PassengerBreakdown,
} from "@/lib/booking/passengers";

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
  seasonKey?: string;
  priceBucket?: string;
  durationDays?: number;
  legacyFallback: boolean;
}

export interface QuotePriceOptions {
  durationDays?: number;
  passengers?: Partial<PassengerBreakdown> | null;
}

interface PriceSource {
  amount: Prisma.Decimal;
  pricingUnit: PricingUnit;
  seasonKey?: string;
  priceBucket?: string;
  durationDays?: number;
  legacyFallback: boolean;
}

type QuoteService = {
  id: string;
  type: string;
  boatId: string;
  durationType: string;
  durationHours: number;
  pricingUnit: string | null;
};

function resolveCharterDurationDays(service: QuoteService, durationDays?: number): number {
  const resolved = durationDays ?? Math.max(3, Math.min(7, Math.ceil(service.durationHours / 24)));
  if (!Number.isInteger(resolved) || resolved < 3 || resolved > 7) {
    throw new Error("durationDays must be between 3 and 7 for cabin charter");
  }
  return resolved;
}

async function findSeasonalPriceSource(params: {
  service: QuoteService;
  dateOnly: Date;
  durationDays?: number;
}): Promise<PriceSource | null> {
  const { service, dateOnly, durationDays } = params;
  const year = dateOnly.getUTCFullYear();

  if (service.type === "CABIN_CHARTER") {
    const resolvedDurationDays = resolveCharterDurationDays(service, durationDays);
    const price = await db.servicePrice.findFirst({
      where: {
        serviceId: service.id,
        year,
        priceBucket: null,
        durationDays: resolvedDurationDays,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!price) return null;
    return {
      amount: price.amount,
      pricingUnit: effectivePricingUnit({ type: service.type, pricingUnit: price.pricingUnit }),
      durationDays: resolvedDurationDays,
      legacyFallback: false,
    };
  }

  const season = await db.season.findFirst({
    where: {
      year,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
    orderBy: { startDate: "desc" },
  });
  if (!season) return null;

  const price = await db.servicePrice.findFirst({
    where: {
      serviceId: service.id,
      year,
      priceBucket: season.priceBucket,
      durationDays: null,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!price) return null;

  return {
    amount: price.amount,
    pricingUnit: effectivePricingUnit({ type: service.type, pricingUnit: price.pricingUnit }),
    seasonKey: season.key,
    priceBucket: season.priceBucket,
    legacyFallback: false,
  };
}

async function findLegacyPriceSource(params: {
  service: QuoteService;
  dateOnly: Date;
}): Promise<PriceSource | null> {
  const { service, dateOnly } = params;
  const period = await db.pricingPeriod.findFirst({
    where: {
      serviceId: service.id,
      startDate: { lte: dateOnly },
      endDate: { gte: dateOnly },
    },
    orderBy: { startDate: "desc" },
    include: {
      service: { select: { type: true, pricingUnit: true } },
    },
  });
  if (!period) return null;

  return {
    amount: period.pricePerPerson,
    pricingUnit: effectivePricingUnit(period.service),
    legacyFallback: true,
  };
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

  const source =
    (await findSeasonalPriceSource({
      service,
      dateOnly,
      durationDays: options.durationDays,
    })) ?? (await findLegacyPriceSource({ service, dateOnly }));

  if (!source) {
    throw new NotFoundError("ServicePrice", `${serviceId} @ ${dateOnly.toISOString()}`);
  }

  const basePrice = new Decimal(source.amount.toString());
  const finalPrice = basePrice;
  const pricingUnit = source.pricingUnit;
  const passengers = normalizePassengerBreakdown(options.passengers, numPeople);
  const paidUnits = paidUnitsForService(service.type, passengers);
  const total =
    pricingUnit === PRICING_UNITS.PER_PACKAGE ? finalPrice : finalPrice.mul(paidUnits);

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
    seasonKey: source.seasonKey,
    priceBucket: source.priceBucket,
    durationDays: source.durationDays,
    legacyFallback: source.legacyFallback,
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
    seasonKey: q.seasonKey,
    priceBucket: q.priceBucket,
    durationDays: q.durationDays,
    legacyFallback: q.legacyFallback,
  };
}
