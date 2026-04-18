import type { OpenMeteoForecast } from "./open-meteo";

export type WeatherRisk = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export interface RiskThresholds {
  windKmhMedium: number;
  windKmhHigh: number;
  windKmhExtreme: number;
  waveMMedium: number;
  waveMHigh: number;
  precipitationPctMedium: number;
  precipitationPctHigh: number;
  temperatureMinMedium: number;
}

/**
 * Soglie default per Mediterraneo / Egadi. Admin puo' override via env
 * (Plan 6+) ma non e' attualmente esposto.
 *
 * Note unità:
 *   - vento in km/h (Open-Meteo default). 28 km/h ~ 15 kts, 46 ~ 25 kts.
 *   - onde in metri (significant wave height marina).
 *   - pioggia come probabilità massima giornaliera %.
 */
export const DEFAULT_THRESHOLDS: RiskThresholds = {
  windKmhMedium: 28,
  windKmhHigh: 46,
  windKmhExtreme: 56,
  waveMMedium: 1.0,
  waveMHigh: 1.5,
  precipitationPctMedium: 40,
  precipitationPctHigh: 70,
  temperatureMinMedium: 18,
};

export interface RiskAssessment {
  risk: WeatherRisk;
  reasons: string[];
}

/**
 * Valuta il rischio meteo di una data giornata. La soglia "worst" tra
 * vento/onde/pioggia vince. Restituisce anche `reasons` in italiano per
 * UI rassicuranti/allert.
 */
export function assessRisk(
  forecast: OpenMeteoForecast,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS,
): RiskAssessment {
  const reasons: string[] = [];
  let level: WeatherRisk = "LOW";

  const wind = forecast.windSpeedKmh;
  if (wind >= thresholds.windKmhExtreme) {
    level = "EXTREME";
    reasons.push(`vento ${Math.round(wind)}km/h estremo`);
  } else if (wind >= thresholds.windKmhHigh) {
    level = escalate(level, "HIGH");
    reasons.push(`vento ${Math.round(wind)}km/h forte`);
  } else if (wind >= thresholds.windKmhMedium) {
    level = escalate(level, "MEDIUM");
    reasons.push(`vento ${Math.round(wind)}km/h moderato`);
  }

  const wave = forecast.waveHeightM ?? 0;
  if (wave >= thresholds.waveMHigh) {
    level = escalate(level, "HIGH");
    reasons.push(`onde ${wave.toFixed(1)}m alte`);
  } else if (wave >= thresholds.waveMMedium) {
    level = escalate(level, "MEDIUM");
    reasons.push(`onde ${wave.toFixed(1)}m moderate`);
  }

  const rain = forecast.precipitationProbability;
  if (rain >= thresholds.precipitationPctHigh) {
    level = escalate(level, "HIGH");
    reasons.push(`pioggia ${rain}% probabile`);
  } else if (rain >= thresholds.precipitationPctMedium) {
    level = escalate(level, "MEDIUM");
    reasons.push(`pioggia ${rain}% possibile`);
  }

  if (forecast.temperatureMin < thresholds.temperatureMinMedium) {
    level = escalate(level, "MEDIUM");
    reasons.push(`temperatura min ${Math.round(forecast.temperatureMin)}°C`);
  }

  return { risk: level, reasons };
}

const RISK_ORDER: readonly WeatherRisk[] = ["LOW", "MEDIUM", "HIGH", "EXTREME"];

function escalate(current: WeatherRisk, candidate: WeatherRisk): WeatherRisk {
  return RISK_ORDER.indexOf(candidate) > RISK_ORDER.indexOf(current) ? candidate : current;
}
