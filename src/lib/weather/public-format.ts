import type { WeatherForBooking } from "./service";
import type { WeatherRisk } from "./risk-assessment";

export type WeatherUnitSystem = "metric" | "imperial";

export interface PublicWeatherMetrics {
  wind: string;
  gusts: string;
  waves: string;
  rain: string;
  temperature: string;
}

export interface PublicWeatherUnitDetails {
  metrics: PublicWeatherMetrics;
  reasons: string[];
}

export interface PublicWeatherSummary {
  date: string;
  risk: WeatherRisk;
  riskLabel: string;
  headline: string;
  defaultUnitSystem: WeatherUnitSystem;
  metrics: PublicWeatherMetrics;
  reasons: string[];
  units: Record<WeatherUnitSystem, PublicWeatherUnitDetails>;
  note: string;
}

const RISK_LABELS = {
  it: {
    LOW: "Condizioni favorevoli",
    MEDIUM: "Da monitorare",
    HIGH: "Attenzione meteo",
    EXTREME: "Condizioni critiche",
  },
  en: {
    LOW: "Favourable conditions",
    MEDIUM: "Keep an eye on it",
    HIGH: "Weather watch",
    EXTREME: "Critical conditions",
  },
} satisfies Record<"it" | "en", Record<WeatherRisk, string>>;

const HEADLINES = {
  it: {
    LOW: "Il meteo previsto è favorevole per l'uscita.",
    MEDIUM: "La previsione è buona, ma alcuni valori vanno monitorati.",
    HIGH: "La previsione richiede una valutazione attenta dello skipper.",
    EXTREME: "La previsione indica condizioni potenzialmente non adatte.",
  },
  en: {
    LOW: "The forecast looks favourable for the trip.",
    MEDIUM: "The forecast is usable, with a few values to monitor.",
    HIGH: "The forecast needs careful skipper review.",
    EXTREME: "The forecast shows potentially unsuitable conditions.",
  },
} satisfies Record<"it" | "en", Record<WeatherRisk, string>>;

const NOTES = {
  it: "Previsione indicativa aggiornata automaticamente. Rotta e partenza vengono sempre confermate dallo skipper in base alle condizioni reali.",
  en: "Automatic forecast for guidance only. Route and departure are always confirmed by the skipper based on real sea conditions.",
};

function lang(locale: string): "it" | "en" {
  return locale.toLowerCase().startsWith("en") ? "en" : "it";
}

function kmhToKnots(kmh: number): number {
  return kmh * 0.539957;
}

function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

function mmToInches(mm: number): number {
  return mm * 0.0393701;
}

function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

function safeRound(value: number): number | null {
  return Number.isFinite(value) ? Math.round(value) : null;
}

function knotLabel(locale: string): string {
  return lang(locale) === "it" ? "nodi" : "kn";
}

function formatWind(kmh: number, locale: string, unitSystem: WeatherUnitSystem): string {
  const l = lang(locale);
  const roundedKmh = safeRound(kmh);
  if (roundedKmh == null) return l === "en" ? "n/a" : "n/d";
  const knots = Math.round(kmhToKnots(kmh));
  if (unitSystem === "imperial") {
    return `${Math.round(kmhToMph(kmh))} mph (${knots} ${knotLabel(locale)})`;
  }
  return `${roundedKmh} km/h (${knots} ${knotLabel(locale)})`;
}

function formatWaves(
  meters: number | null,
  locale: string,
  unitSystem: WeatherUnitSystem,
): string {
  const l = lang(locale);
  if (meters == null || !Number.isFinite(meters)) return l === "en" ? "n/a" : "n/d";
  if (unitSystem === "imperial") {
    return `${metersToFeet(meters).toFixed(1)} ft (${meters.toFixed(1)} m)`;
  }
  return `${meters.toFixed(1)} m`;
}

function formatRain(probability: number, mm: number, unitSystem: WeatherUnitSystem): string {
  const pct = safeRound(probability);
  const safeMm = Number.isFinite(mm) ? mm : 0;
  if (unitSystem === "imperial") {
    return `${pct ?? 0}% · ${mmToInches(safeMm).toFixed(2)} in`;
  }
  return `${pct ?? 0}% · ${safeMm.toFixed(1)} mm`;
}

function formatTemperature(
  min: number,
  max: number,
  locale: string,
  unitSystem: WeatherUnitSystem,
): string {
  const l = lang(locale);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return l === "en" ? "n/a" : "n/d";
  if (unitSystem === "imperial") {
    return `${Math.round(celsiusToFahrenheit(min))}-${Math.round(celsiusToFahrenheit(max))}°F`;
  }
  return `${Math.round(min)}-${Math.round(max)}°C`;
}

function localizeReason(
  reason: string,
  locale: string,
  unitSystem: WeatherUnitSystem,
): string {
  const l = lang(locale);

  const wind = reason.match(/^vento (\d+)km\/h (estremo|forte|moderato)$/);
  if (wind) {
    const kmh = Number(wind[1]);
    if (l === "it") return `vento ${formatWind(kmh, locale, unitSystem)} ${wind[2]}`;
    const tone =
      wind[2] === "estremo" ? "extreme" : wind[2] === "forte" ? "strong" : "moderate";
    return `${tone} wind ${formatWind(kmh, locale, unitSystem)}`;
  }

  const waves = reason.match(/^onde ([\d.]+)m (alte|moderate)$/);
  if (waves) {
    const meters = Number(waves[1]);
    if (l === "it") return `onde ${formatWaves(meters, locale, unitSystem)} ${waves[2]}`;
    const tone = waves[2] === "alte" ? "high" : "moderate";
    return `${tone} waves ${formatWaves(meters, locale, unitSystem)}`;
  }

  const rain = reason.match(/^pioggia (\d+)% (probabile|possibile)$/);
  if (rain) {
    if (l === "it") return reason;
    const tone = rain[2] === "probabile" ? "likely" : "possible";
    return `${tone} rain ${rain[1]}%`;
  }

  const temperature = reason.match(/^temperatura min (-?\d+)°C$/);
  if (temperature) {
    const celsius = Number(temperature[1]);
    if (unitSystem === "imperial") {
      const value = `${Math.round(celsiusToFahrenheit(celsius))}°F (${temperature[1]}°C)`;
      return l === "it" ? `temperatura min ${value}` : `minimum temperature ${value}`;
    }
    return l === "it"
      ? `temperatura min ${temperature[1]}°C`
      : `minimum temperature ${temperature[1]}°C`;
  }

  const partial = reason.match(/^dati parziali: (.+)$/);
  if (partial) {
    if (l === "it") return reason;
    const axes = partial[1]
      .split(", ")
      .map((axis) => {
        if (axis === "vento") return "wind";
        if (axis === "onde") return "waves";
        if (axis === "pioggia") return "rain";
        if (axis === "temperatura") return "temperature";
        return axis;
      })
      .join(", ");
    return `partial data: ${axes}`;
  }

  return reason;
}

function buildUnitDetails(
  weather: WeatherForBooking,
  locale: string,
  unitSystem: WeatherUnitSystem,
): PublicWeatherUnitDetails {
  return {
    metrics: {
      wind: formatWind(weather.forecast.windSpeedKmh, locale, unitSystem),
      gusts: formatWind(weather.forecast.windGustKmh, locale, unitSystem),
      waves: formatWaves(weather.forecast.waveHeightM, locale, unitSystem),
      rain: formatRain(
        weather.forecast.precipitationProbability,
        weather.forecast.precipitationMm,
        unitSystem,
      ),
      temperature: formatTemperature(
        weather.forecast.temperatureMin,
        weather.forecast.temperatureMax,
        locale,
        unitSystem,
      ),
    },
    reasons: weather.reasons.map((reason) => localizeReason(reason, locale, unitSystem)),
  };
}

export function buildPublicWeatherSummary(
  weather: WeatherForBooking,
  locale: string,
): PublicWeatherSummary {
  const l = lang(locale);
  const metric = buildUnitDetails(weather, locale, "metric");
  const imperial = buildUnitDetails(weather, locale, "imperial");
  return {
    date: weather.date,
    risk: weather.risk,
    riskLabel: RISK_LABELS[l][weather.risk],
    headline: HEADLINES[l][weather.risk],
    defaultUnitSystem: "metric",
    metrics: metric.metrics,
    reasons: metric.reasons,
    units: { metric, imperial },
    note: NOTES[l],
  };
}
