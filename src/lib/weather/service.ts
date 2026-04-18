import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseIsoDay, toUtcDay } from "@/lib/dates";
import { fetchOpenMeteoForecast, type OpenMeteoForecast } from "./open-meteo";
import { assessRisk, type WeatherRisk } from "./risk-assessment";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const LOCATION_KEY = "trapani-38.0176,12.5365";
const SOURCE = "OPEN_METEO";

export type Suitability = "excellent" | "good" | "fair" | "poor" | "risky";

export interface WeatherForBooking {
  date: string;
  suitability: Suitability;
  risk: WeatherRisk;
  reasons: string[];
  forecast: OpenMeteoForecast;
}

/**
 * Legge dalla cache `WeatherForecastCache` se fresh entro 6h, altrimenti
 * fetcha Open-Meteo e persiste. Se fetch fallisce E c'e' cache stale >6h,
 * ritorna la cache stale (degraded mode) invece di null — il cron weather
 * admin usera' il log per diagnosi.
 */
async function getForecastFromCacheOrFetch(): Promise<OpenMeteoForecast[]> {
  const fresh = await db.weatherForecastCache.findMany({
    where: {
      locationKey: LOCATION_KEY,
      source: SOURCE,
      fetchedAt: { gt: new Date(Date.now() - CACHE_TTL_MS) },
    },
    orderBy: { date: "asc" },
  });
  if (fresh.length > 0) {
    return fresh.map((r) => r.forecast as unknown as OpenMeteoForecast);
  }

  try {
    const fetched = await fetchOpenMeteoForecast(16);
    const now = new Date();
    for (const f of fetched) {
      await db.weatherForecastCache.upsert({
        where: {
          date_locationKey_source: {
            date: parseIsoDay(f.date),
            locationKey: LOCATION_KEY,
            source: SOURCE,
          },
        },
        update: { forecast: f as unknown as Prisma.InputJsonValue, fetchedAt: now },
        create: {
          date: parseIsoDay(f.date),
          locationKey: LOCATION_KEY,
          source: SOURCE,
          forecast: f as unknown as Prisma.InputJsonValue,
        },
      });
    }
    logger.info({ days: fetched.length }, "Weather forecast refreshed");
    return fetched;
  } catch (err) {
    // Fallback: usa cache stale se presente (meglio dati vecchi che niente).
    const stale = await db.weatherForecastCache.findMany({
      where: { locationKey: LOCATION_KEY, source: SOURCE },
      orderBy: { date: "asc" },
    });
    if (stale.length > 0) {
      logger.warn(
        { err: (err as Error).message, staleCount: stale.length },
        "OpenMeteo unreachable — serving stale cache",
      );
      return stale.map((r) => r.forecast as unknown as OpenMeteoForecast);
    }
    throw err;
  }
}

export async function getWeatherForDate(date: Date): Promise<WeatherForBooking | null> {
  const all = await getForecastFromCacheOrFetch();
  const key = toUtcDay(date).toISOString().slice(0, 10);
  const forecast = all.find((f) => f.date === key);
  if (!forecast) return null;

  const { risk, reasons } = assessRisk(forecast);
  return {
    date: key,
    suitability: riskToSuitability(risk),
    risk,
    reasons,
    forecast,
  };
}

export async function getAllWeather(): Promise<WeatherForBooking[]> {
  const all = await getForecastFromCacheOrFetch();
  return all.map((f) => {
    const { risk, reasons } = assessRisk(f);
    return { date: f.date, suitability: riskToSuitability(risk), risk, reasons, forecast: f };
  });
}

function riskToSuitability(risk: WeatherRisk): Suitability {
  if (risk === "EXTREME") return "risky";
  if (risk === "HIGH") return "poor";
  if (risk === "MEDIUM") return "fair";
  return "excellent";
}
