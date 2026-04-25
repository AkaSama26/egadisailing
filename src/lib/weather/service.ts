import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { parseIsoDay, toUtcDay } from "@/lib/dates";
import { fetchOpenMeteoForecast, type OpenMeteoForecast } from "./open-meteo";
import { assessRisk, type WeatherRisk } from "./risk-assessment";
import { tryAcquireLease, releaseLease } from "@/lib/lease/redis-lease";
import { LEASE_KEYS } from "@/lib/lease/keys";
import { ExternalServiceError } from "@/lib/errors";
import { TTL } from "@/lib/timing";

const CACHE_TTL_MS = TTL.WEATHER_FORECAST * 1000; // 6h
const LOCATION_KEY = "trapani-38.0176,12.5365";
const SOURCE = "OPEN_METEO";
const FETCH_LEASE_NAME = LEASE_KEYS.WEATHER_FETCH_TRAPANI;
const FETCH_LEASE_TTL_SECONDS = TTL.WEATHER_FETCH_LEASE;
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
const STALE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * R14-REG-A2: stale cache bounded a 48h + date futuribili. Senza bound,
 * `readStaleCache` poteva servire forecast vecchi fino a 14gg (retention
 * cron), totalmente scorrelati dal meteo reale. Meglio throw che servire
 * dati obsoleti per un risk assessment.
 */
async function readStaleCache(): Promise<OpenMeteoForecast[] | null> {
  const stale = await db.weatherForecastCache.findMany({
    where: {
      locationKey: LOCATION_KEY,
      source: SOURCE,
      fetchedAt: { gt: new Date(Date.now() - STALE_MAX_AGE_MS) },
    },
    orderBy: { date: "asc" },
  });
  if (stale.length === 0) return null;
  return stale.map((r) => r.forecast as unknown as OpenMeteoForecast);
}

async function getForecastFromCacheOrFetch(): Promise<OpenMeteoForecast[]> {
  const cached = await readFreshCache();
  if (cached) return cached;

  const lease = await tryAcquireLease(FETCH_LEASE_NAME, FETCH_LEASE_TTL_SECONDS);
  if (!lease) {
    // Altro processo sta fetchando. Poll la cache brevemente.
    for (let i = 0; i < STAMPEDE_MAX_WAITS; i++) {
      await new Promise((r) => setTimeout(r, STAMPEDE_WAIT_MS));
      const after = await readFreshCache();
      if (after) return after;
    }
    // R13-A2: il leader non ha scritto cache entro 3s (crash, Open-Meteo
    // lento, OOM). Invece di partire tutti insieme a fetchare (regredendo
    // il fix stampede), ritorniamo stale se presente o throw. Evita
    // thundering herd di 6+ follower verso Open-Meteo.
    logger.warn("Weather fetch lease held but cache still empty after polling");
    const stale = await readStaleCache();
    if (stale) {
      logger.warn({ staleCount: stale.length }, "Weather: serving stale cache (stampede fallback)");
      return stale;
    }
    throw new ExternalServiceError("OpenMeteo", "forecast_unavailable_cold_start");
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
    const stale = await readStaleCache();
    if (stale) {
      logger.warn(
        { err: (err as Error).message, staleCount: stale.length },
        "OpenMeteo unreachable — serving stale cache",
      );
      return stale;
    }
    throw err;
  } finally {
    await releaseLease(lease);
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
