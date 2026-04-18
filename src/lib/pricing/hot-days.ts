import { db } from "@/lib/db";
import Decimal from "decimal.js";
import { roundUpTo } from "./rounding";
import { toUtcDay } from "@/lib/dates";

export interface HotDayResult {
  applied: boolean;
  multiplier: number;
  absolutePrice?: number;
  roundTo: number;
  ruleName?: string;
  source: "NONE" | "RULE" | "OVERRIDE";
}

/**
 * Valuta quale hot day si applica a (date, serviceId).
 * Priorita':
 *   1. Override manuale per il servizio specifico
 *   2. Override globale (serviceId null) per la data
 *   3. Rule attive con priority piu' alta (tie-break: createdAt DESC)
 */
export async function resolveHotDay(
  date: Date,
  serviceId: string,
): Promise<HotDayResult> {
  const dateOnly = toUtcDay(date);

  // 3 query in parallelo: la priorita' e' nel return, non nell'ordine di fetch.
  const [specificOverride, globalOverride, rules] = await Promise.all([
    db.hotDayOverride.findUnique({
      where: { date_serviceId: { date: dateOnly, serviceId } },
    }),
    db.hotDayOverride.findFirst({
      where: { date: dateOnly, serviceId: null },
      orderBy: { createdAt: "desc" },
    }),
    db.hotDayRule.findMany({
      where: {
        active: true,
        dateRangeStart: { lte: dateOnly },
        dateRangeEnd: { gte: dateOnly },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (specificOverride) {
    return {
      applied: true,
      multiplier: specificOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: specificOverride.absolutePrice?.toNumber(),
      roundTo: specificOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  if (globalOverride) {
    return {
      applied: true,
      multiplier: globalOverride.multiplier?.toNumber() ?? 1,
      absolutePrice: globalOverride.absolutePrice?.toNumber(),
      roundTo: globalOverride.roundTo,
      source: "OVERRIDE",
    };
  }

  const weekday = dateOnly.getUTCDay();

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
 * Applica un hot day a un prezzo base mantenendo precisione Decimal fino
 * all'arrotondamento finale.
 */
export function applyHotDay(basePrice: number | Decimal | string, hotDay: HotDayResult): Decimal {
  const base = new Decimal(basePrice);
  if (!hotDay.applied) return base;

  if (hotDay.absolutePrice !== undefined) {
    return new Decimal(roundUpTo(hotDay.absolutePrice, hotDay.roundTo));
  }

  const raw = base.mul(hotDay.multiplier);
  return new Decimal(roundUpTo(raw.toNumber(), hotDay.roundTo));
}
