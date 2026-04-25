import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";
import { swallow } from "@/lib/result";

export interface OpenMeteoForecast {
  date: string; // yyyy-MM-dd
  temperatureMax: number;
  temperatureMin: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  precipitationProbability: number;
  precipitationMm: number;
  weatherCode: number;
  waveHeightM: number | null;
}

const TRAPANI_LAT = 38.0176;
const TRAPANI_LON = 12.5365;
const FORECAST_TIMEOUT_MS = 10_000;

/**
 * Fetch forecast giornaliero Open-Meteo per Trapani (porto di partenza).
 * Include marine API per wave height; se marine non disponibile, waveHeightM=null.
 *
 * Nessuna API key richiesta (free tier). Rate-limit 10k req/day soft.
 * Timeout hard 10s per non bloccare worker BullMQ.
 */
export async function fetchOpenMeteoForecast(days = 16): Promise<OpenMeteoForecast[]> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(TRAPANI_LAT));
  url.searchParams.set("longitude", String(TRAPANI_LON));
  url.searchParams.set("forecast_days", String(days));
  url.searchParams.set("timezone", "Europe/Rome");
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_max",
      "temperature_2m_min",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
      "precipitation_probability_max",
      "precipitation_sum",
      "weather_code",
    ].join(","),
  );

  const marineUrl = new URL("https://marine-api.open-meteo.com/v1/marine");
  marineUrl.searchParams.set("latitude", String(TRAPANI_LAT));
  marineUrl.searchParams.set("longitude", String(TRAPANI_LON));
  marineUrl.searchParams.set("forecast_days", String(days));
  marineUrl.searchParams.set("timezone", "Europe/Rome");
  marineUrl.searchParams.set("daily", "wave_height_max");

  try {
    const [weatherRes, marineRes] = await Promise.all([
      fetch(url, { signal: AbortSignal.timeout(FORECAST_TIMEOUT_MS) }),
      fetch(marineUrl, { signal: AbortSignal.timeout(FORECAST_TIMEOUT_MS) }).catch(
        (err) => {
          swallow("open-meteo marine fetch", { url: marineUrl.toString() })(err);
          return null;
        },
      ),
    ]);
    if (!weatherRes.ok) {
      throw new ExternalServiceError("OpenMeteo", `forecast status ${weatherRes.status}`);
    }
    const weather = (await weatherRes.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        wind_speed_10m_max: number[];
        wind_gusts_10m_max: number[];
        wind_direction_10m_dominant: number[];
        precipitation_probability_max: number[];
        precipitation_sum: number[];
        weather_code: number[];
      };
    };

    let waveHeights: number[] = [];
    if (marineRes && marineRes.ok) {
      const marine = (await marineRes.json()) as { daily?: { wave_height_max?: number[] } };
      waveHeights = marine.daily?.wave_height_max ?? [];
    }

    return weather.daily.time.map((date, i) => ({
      date,
      temperatureMax: weather.daily.temperature_2m_max[i],
      temperatureMin: weather.daily.temperature_2m_min[i],
      windSpeedKmh: weather.daily.wind_speed_10m_max[i],
      windGustKmh: weather.daily.wind_gusts_10m_max[i],
      windDirectionDeg: weather.daily.wind_direction_10m_dominant[i],
      precipitationProbability: weather.daily.precipitation_probability_max[i],
      precipitationMm: weather.daily.precipitation_sum[i],
      weatherCode: weather.daily.weather_code[i],
      waveHeightM: waveHeights[i] ?? null,
    }));
  } catch (err) {
    logger.error({ err: (err as Error).message }, "OpenMeteo fetch failed");
    throw err instanceof ExternalServiceError
      ? err
      : new ExternalServiceError("OpenMeteo", (err as Error).message);
  }
}
