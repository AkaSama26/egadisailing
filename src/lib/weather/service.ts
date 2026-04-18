import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseIsoDay, toUtcDay } from "@/lib/dates";
import { fetchOpenMeteoForecast, type OpenMeteoForecast } from "./open-meteo";
import { assessRisk, type WeatherRisk } from "./risk-assessment";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const LOCATION_KEY = "trapani-38.0176,12.5365";
const SOURCE = "OPEN_METEO";
const FETCH_LEASE_NAME = "weather:fetch:trapani";
const FETCH_LEASE_TTL_SECONDS = 30;
const STAMPEDE_WAIT_MS = 500;
const STAMPEDE_MAX_WAITS = 6; // ~3s totali di attesa

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
async function readFreshCache(): Promise<OpenMeteoForecast[] | null> {
  const fresh = await db.weatherForecastCache.findMany({
    where: {
      locationKey: LOCATION_KEY,
      source: SOURCE,
      fetchedAt: { gt: new Date(Date.now() - CACHE_TTL_MS) },
    },
    orderBy: { date: "asc" },
  });
  if (fresh.length === 0) return null;
  return fresh.map((r) => r.forecast as unknown as OpenMeteoForecast);
}

/**
 * R12-C6: cache stampede protection. Se la cache e' scaduta e arrivano N
 * richieste concorrenti (es. pagina homepage + /meteo + cron), solo UN
 * processo fa il fetch Open-Meteo; gli altri attendono brevemente e
 * rileggono la cache appena popolata. Il TTL del lease (30s) e' short
 * perche' il fetch Open-Meteo impiega ~2-3s in condizioni normali.
 */
async function getForecastFromCacheOrFetch(): Promise<OpenMeteoForecast[]> {
  const cached = await readFreshCache();
  if (cached) return cached;

  const leased = await tryAcquireLease(FETCH_LEASE_NAME, FETCH_LEASE_TTL_SECONDS);
  if (!leased) {
    // Altro processo sta fetchando. Poll la cache brevemente.
    for (let i = 0; i < STAMPEDE_MAX_WAITS; i++) {
      await new Promise((r) => setTimeout(r, STAMPEDE_WAIT_MS));
      const after = await readFreshCache();
      if (after) return after;
    }
    // Lease attivo ma cache ancora vuota → procedi senza lease (edge case,
    // es. fetch upstream lento). Se Open-Meteo e' giu' il catch prende stale.
    logger.warn("Weather fetch lease held by another process but cache still empty; proceeding");
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
  } finally {
    if (leased) {
      await releaseLease(FETCH_LEASE_NAME).catch((err) =>
        logger.warn({ err: (err as Error).message }, "Failed to release weather fetch lease"),
      );
    }
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
