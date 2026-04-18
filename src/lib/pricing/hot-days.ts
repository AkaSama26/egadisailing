import { db } from "@/lib/db";
import Decimal from "decimal.js";
import { roundUpTo } from "./rounding";

export interface HotDayResult {
  applied: boolean;
  multiplier: number;
  absolutePrice?: number;
  roundTo: number;
  ruleName?: string;
  source: "NONE" | "RULE" | "OVERRIDE";
}

/**
 * Valuta quale hot day (se esiste) si applica a questa data/servizio.
 * - Override manuale (stessa data + serviceId) ha priorità assoluta
 * - Altrimenti rule attiva con priority più alta
 */
export async function resolveHotDay(
  date: Date,
  serviceId: string,
): Promise<HotDayResult> {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  // 1. Override per il servizio specifico
  const specificOverride = await db.hotDayOverride.findUnique({
    where: { date_serviceId: { date: dateOnly, serviceId } },
  });
  if (specificOverride) {
    return {
      applied: true,
      multiplier: specificOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: specificOverride.absolutePrice?.toNumber(),
      roundTo: specificOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  // 2. Override globale (serviceId null)
  const globalOverride = await db.hotDayOverride.findFirst({
    where: { date: dateOnly, serviceId: null },
  });
  if (globalOverride) {
    return {
      applied: true,
      multiplier: globalOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: globalOverride.absolutePrice?.toNumber(),
      roundTo: globalOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  // 3. Rule attive che coprono questa data
  const weekday = dateOnly.getUTCDay();
  const rules = await db.hotDayRule.findMany({
    where: {
      active: true,
      dateRangeStart: { lte: dateOnly },
      dateRangeEnd: { gte: dateOnly },
    },
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    if (rule.weekdays.length === 0 || rule.weekdays.includes(weekday)) {
      return {
        applied: true,
        multiplier: rule.multiplier.toNumber(),
        roundTo: rule.roundTo,
        ruleName: rule.name,
        source: "RULE",
      };
    }
  }

  return { applied: false, multiplier: 1, roundTo: 1, source: "NONE" };
}

/**
 * Applica un hot day result a un prezzo base e arrotonda.
 */
export function applyHotDay(basePrice: number | Decimal, hotDay: HotDayResult): number {
  const base = new Decimal(basePrice);
  if (!hotDay.applied) return base.toNumber();

  if (hotDay.absolutePrice !== undefined) {
    return roundUpTo(hotDay.absolutePrice, hotDay.roundTo);
  }

  const raw = base.mul(hotDay.multiplier).toNumber();
  return roundUpTo(raw, hotDay.roundTo);
}
