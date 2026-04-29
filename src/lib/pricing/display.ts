import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";

export interface DisplayPrice {
  amount: Decimal | null;
  label: string;
  legacyFallback: boolean;
}

export interface SeasonalDisplayPrice {
  seasonKey: string;
  seasonLabel: string;
  startDate: Date;
  endDate: Date;
  priceBucket: string;
  amount: Decimal | null;
}

export interface CharterDurationDisplayPrice {
  durationDays: number;
  amount: Decimal;
}

function labelForAmount(amount: Decimal | null): string {
  return amount ? `Da ${formatEur(amount)}` : "Prezzo su richiesta";
}

export async function getDisplayPrice(
  serviceId: string,
  year = 2026,
): Promise<DisplayPrice> {
  const prices = await db.servicePrice.findMany({
    where: { serviceId, year },
    select: { amount: true },
    orderBy: { amount: "asc" },
    take: 1,
  });
  if (prices[0]) {
    const amount = new Decimal(prices[0].amount.toString());
    return { amount, label: labelForAmount(amount), legacyFallback: false };
  }

  const legacy = await db.pricingPeriod.findFirst({
    where: { serviceId, year },
    select: { pricePerPerson: true },
    orderBy: { pricePerPerson: "asc" },
  });
  const amount = legacy ? new Decimal(legacy.pricePerPerson.toString()) : null;
  return { amount, label: labelForAmount(amount), legacyFallback: Boolean(legacy) };
}

export async function getDisplayPriceMap(
  serviceIds: string[],
  year = 2026,
): Promise<Map<string, DisplayPrice>> {
  const uniqueIds = Array.from(new Set(serviceIds));
  const [prices, legacyPrices] = await Promise.all([
    db.servicePrice.findMany({
      where: { serviceId: { in: uniqueIds }, year },
      select: { serviceId: true, amount: true },
      orderBy: { amount: "asc" },
    }),
    db.pricingPeriod.findMany({
      where: { serviceId: { in: uniqueIds }, year },
      select: { serviceId: true, pricePerPerson: true },
      orderBy: { pricePerPerson: "asc" },
    }),
  ]);

  const result = new Map<string, DisplayPrice>();
  for (const price of prices) {
    if (result.has(price.serviceId)) continue;
    const amount = new Decimal(price.amount.toString());
    result.set(price.serviceId, {
      amount,
      label: labelForAmount(amount),
      legacyFallback: false,
    });
  }

  for (const price of legacyPrices) {
    if (result.has(price.serviceId)) continue;
    const amount = new Decimal(price.pricePerPerson.toString());
    result.set(price.serviceId, {
      amount,
      label: labelForAmount(amount),
      legacyFallback: true,
    });
  }

  for (const serviceId of uniqueIds) {
    if (!result.has(serviceId)) {
      result.set(serviceId, { amount: null, label: labelForAmount(null), legacyFallback: false });
    }
  }

  return result;
}

export async function getSeasonalDisplayPrices(
  serviceId: string,
  year = 2026,
): Promise<SeasonalDisplayPrice[]> {
  const [seasons, prices] = await Promise.all([
    db.season.findMany({
      where: { year },
      orderBy: { startDate: "asc" },
    }),
    db.servicePrice.findMany({
      where: { serviceId, year, durationDays: null },
      select: { priceBucket: true, amount: true },
    }),
  ]);

  const priceByBucket = new Map(
    prices
      .filter((price) => price.priceBucket)
      .map((price) => [price.priceBucket as string, new Decimal(price.amount.toString())]),
  );

  return seasons.map((season) => ({
    seasonKey: season.key,
    seasonLabel: season.label,
    startDate: season.startDate,
    endDate: season.endDate,
    priceBucket: season.priceBucket,
    amount: priceByBucket.get(season.priceBucket) ?? null,
  }));
}

export async function getCharterDurationDisplayPrices(
  serviceId: string,
  year = 2026,
): Promise<CharterDurationDisplayPrice[]> {
  const prices = await db.servicePrice.findMany({
    where: { serviceId, year, priceBucket: null },
    select: { durationDays: true, amount: true },
    orderBy: { durationDays: "asc" },
  });

  return prices
    .filter((price): price is typeof price & { durationDays: number } => price.durationDays != null)
    .map((price) => ({
      durationDays: price.durationDays,
      amount: new Decimal(price.amount.toString()),
    }));
}
