import Decimal from "decimal.js";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  PASSENGER_FARE_CATEGORIES,
  DEFAULT_PASSENGER_FARE_CATEGORIES,
  PASSENGER_FARE_SERVICE_TYPE,
  normalizePassengerFareCategoryPrices,
  occupiedSeatCountForPassengerCategories,
  passengerCountForCategory,
  type PassengerBreakdownLike,
  type PassengerFareCategory,
  type PassengerFareCategoryPriceConfig,
} from "./passenger-fare-rules-shared";

export interface PassengerFareSeasonPriceRow extends PassengerFareCategoryPriceConfig {
  serviceId: string;
  year: number;
  priceBucket: string;
}

type PassengerFareSeasonPriceDbRow = {
  serviceId: string;
  year: number;
  priceBucket: string;
  category: string;
  amount: Prisma.Decimal | string | number;
};

function toSeasonPriceRow(row: PassengerFareSeasonPriceDbRow): PassengerFareSeasonPriceRow | null {
  if (!PASSENGER_FARE_CATEGORIES.includes(row.category as PassengerFareCategory)) return null;
  return {
    serviceId: row.serviceId,
    year: row.year,
    priceBucket: row.priceBucket,
    category: row.category as PassengerFareCategory,
    amount: Number(row.amount.toString()),
  };
}

export async function getPassengerFareSeasonPricesForService(params: {
  serviceId: string;
  year: number;
  priceBucket?: string | null;
}): Promise<PassengerFareCategoryPriceConfig[]> {
  if (!params.priceBucket) return [];

  const rows = await db.$queryRaw<PassengerFareSeasonPriceDbRow[]>(Prisma.sql`
    SELECT "serviceId", "year", "priceBucket", "category", "amount"
    FROM "PassengerFareSeasonPrice"
    WHERE "serviceId" = ${params.serviceId}
      AND "year" = ${params.year}
      AND "priceBucket" = ${params.priceBucket}
    ORDER BY "category" ASC
  `);

  return rows.flatMap((row) => {
    const mapped = toSeasonPriceRow(row);
    return mapped ? [{ category: mapped.category, amount: mapped.amount }] : [];
  });
}

export async function getPassengerFareSeasonPricesForYear(params: {
  year: number;
  serviceIds?: string[];
}): Promise<PassengerFareSeasonPriceRow[]> {
  const rows = params.serviceIds?.length
    ? await db.$queryRaw<PassengerFareSeasonPriceDbRow[]>(Prisma.sql`
        SELECT "serviceId", "year", "priceBucket", "category", "amount"
        FROM "PassengerFareSeasonPrice"
        WHERE "year" = ${params.year}
          AND "serviceId" IN (${Prisma.join(params.serviceIds)})
        ORDER BY "serviceId" ASC, "priceBucket" ASC, "category" ASC
      `)
    : await db.$queryRaw<PassengerFareSeasonPriceDbRow[]>(Prisma.sql`
        SELECT "serviceId", "year", "priceBucket", "category", "amount"
        FROM "PassengerFareSeasonPrice"
        WHERE "year" = ${params.year}
        ORDER BY "serviceId" ASC, "priceBucket" ASC, "category" ASC
      `);

  return rows.flatMap((row) => {
    const mapped = toSeasonPriceRow(row);
    return mapped ? [mapped] : [];
  });
}

export function calculatePassengerFareTotal(params: {
  serviceType: string;
  pricingUnit: string;
  unitPrice: Decimal;
  passengers: PassengerBreakdownLike;
  categoryPrices?: PassengerFareCategoryPriceConfig[] | null;
}): Decimal {
  const { serviceType, pricingUnit, unitPrice, passengers, categoryPrices } = params;
  if (pricingUnit === "PER_PACKAGE") return unitPrice;
  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return unitPrice.mul(occupiedSeatCountForPassengerCategories(passengers));
  }

  const priceByCategory = new Map(
    normalizePassengerFareCategoryPrices(categoryPrices).map((price) => [price.category, price.amount]),
  );

  return DEFAULT_PASSENGER_FARE_CATEGORIES.reduce((sum, rule) => {
    const count = passengerCountForCategory(passengers, rule.category);
    const seasonalAmount = priceByCategory.get(rule.category);
    if (seasonalAmount !== undefined) {
      return sum.plus(new Decimal(seasonalAmount).mul(count));
    }
    if (rule.pricingMode === "FIXED") {
      return sum.plus(new Decimal(rule.fixedAmount ?? 0).mul(count));
    }
    return sum.plus(unitPrice.mul(rule.multiplier).mul(count));
  }, new Decimal(0));
}
