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
  seasonKey?: string;
  seasonLabel?: string;
  startDate?: Date;
  endDate?: Date;
  priceBucket?: string;
  legacyFallback: boolean;
}

function labelForAmount(amount: Decimal | null, locale?: string | null): string {
  if (!amount) {
    if (locale === "fr") return "Prix sur demande";
    if (locale === "es") return "Precio bajo petición";
    return locale === "en" ? "Price on request" : "Prezzo su richiesta";
  }
  if (locale === "fr") return `À partir de ${formatEur(amount, locale)}`;
  if (locale === "es") return `Desde ${formatEur(amount, locale)}`;
  return locale === "en" ? `From ${formatEur(amount, locale)}` : `Da ${formatEur(amount, locale)}`;
}

export async function getDisplayPrice(
  serviceId: string,
  year = 2026,
  locale?: string | null,
): Promise<DisplayPrice> {
  const prices = await db.servicePrice.findMany({
    where: { serviceId, year },
    select: { amount: true },
    orderBy: { amount: "asc" },
    take: 1,
  });
  if (prices[0]) {
    const amount = new Decimal(prices[0].amount.toString());
    return { amount, label: labelForAmount(amount, locale), legacyFallback: false };
  }

  const legacy = await db.pricingPeriod.findFirst({
    where: { serviceId, year },
    select: { pricePerPerson: true },
    orderBy: { pricePerPerson: "asc" },
  });
  const amount = legacy ? new Decimal(legacy.pricePerPerson.toString()) : null;
  return { amount, label: labelForAmount(amount, locale), legacyFallback: Boolean(legacy) };
}

export async function getDisplayPriceMap(
  serviceIds: string[],
  year = 2026,
  locale?: string | null,
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
      label: labelForAmount(amount, locale),
      legacyFallback: false,
    });
  }

  for (const price of legacyPrices) {
    if (result.has(price.serviceId)) continue;
    const amount = new Decimal(price.pricePerPerson.toString());
    result.set(price.serviceId, {
      amount,
      label: labelForAmount(amount, locale),
      legacyFallback: true,
    });
  }

  for (const serviceId of uniqueIds) {
    if (!result.has(serviceId)) {
      result.set(serviceId, {
        amount: null,
        label: labelForAmount(null, locale),
        legacyFallback: false,
      });
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
  const [seasons, prices] = await Promise.all([
    db.season.findMany({
      where: { year },
      orderBy: { startDate: "asc" },
    }),
    db.servicePrice.findMany({
      where: { serviceId, year, durationDays: { not: null } },
      select: { durationDays: true, priceBucket: true, amount: true },
      orderBy: [{ durationDays: "asc" }, { priceBucket: "asc" }],
    }),
  ]);

  const seasonalPrices = prices.filter(
    (price): price is typeof price & { durationDays: number; priceBucket: string } =>
      price.durationDays != null && price.priceBucket != null,
  );

  if (seasonalPrices.length > 0 && seasons.length > 0) {
    const priceByDurationBucket = new Map(
      seasonalPrices.map((price) => [
        `${price.durationDays}:${price.priceBucket}`,
        new Decimal(price.amount.toString()),
      ]),
    );
    const durations = Array.from(new Set(seasonalPrices.map((price) => price.durationDays))).sort(
      (a, b) => a - b,
    );

    const rows: CharterDurationDisplayPrice[] = [];
    for (const durationDays of durations) {
      for (const season of seasons) {
        const amount = priceByDurationBucket.get(`${durationDays}:${season.priceBucket}`);
        if (!amount) continue;
        rows.push({
          durationDays,
          amount,
          seasonKey: season.key,
          seasonLabel: season.label,
          startDate: season.startDate,
          endDate: season.endDate,
          priceBucket: season.priceBucket,
          legacyFallback: false,
        });
      }
    }
    return rows;
  }

  return prices
    .filter(
      (price): price is typeof price & { durationDays: number; priceBucket: null } =>
        price.durationDays != null && price.priceBucket == null,
    )
    .map((price) => ({
      durationDays: price.durationDays,
      amount: new Decimal(price.amount.toString()),
      legacyFallback: true,
    }));
}
