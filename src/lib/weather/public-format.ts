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
  es: {
    LOW: "Condiciones favorables",
    MEDIUM: "A vigilar",
    HIGH: "Atención meteorológica",
    EXTREME: "Condiciones críticas",
  },
  fr: {
    LOW: "Conditions favorables",
    MEDIUM: "À surveiller",
    HIGH: "Vigilance météo",
    EXTREME: "Conditions critiques",
  },
  de: {
    LOW: "Günstige Bedingungen",
    MEDIUM: "Zu beobachten",
    HIGH: "Wetter aufmerksam prüfen",
    EXTREME: "Kritische Bedingungen",
  },
} satisfies Record<"it" | "en" | "es" | "fr" | "de", Record<WeatherRisk, string>>;

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
  es: {
    LOW: "La previsión parece favorable para la salida.",
    MEDIUM: "La previsión es buena, con algunos valores que conviene vigilar.",
    HIGH: "La previsión requiere una revisión cuidadosa del skipper.",
    EXTREME: "La previsión indica condiciones potencialmente no adecuadas.",
  },
  fr: {
    LOW: "La prévision semble favorable pour la sortie.",
    MEDIUM: "La prévision est bonne, avec quelques valeurs à surveiller.",
    HIGH: "La prévision nécessite une vérification attentive du skipper.",
    EXTREME: "La prévision indique des conditions potentiellement inadaptées.",
  },
  de: {
    LOW: "Die Vorhersage sieht für die Ausfahrt günstig aus.",
    MEDIUM: "Die Vorhersage ist nutzbar, einige Werte sollten aber beobachtet werden.",
    HIGH: "Die Vorhersage erfordert eine sorgfältige Prüfung durch den Skipper.",
    EXTREME: "Die Vorhersage zeigt potenziell ungeeignete Bedingungen.",
  },
} satisfies Record<"it" | "en" | "es" | "fr" | "de", Record<WeatherRisk, string>>;

const NOTES = {
  it: "Previsione indicativa aggiornata automaticamente. Rotta e partenza vengono sempre confermate dallo skipper in base alle condizioni reali.",
  en: "Automatic forecast for guidance only. Route and departure are always confirmed by the skipper based on real sea conditions.",
  es: "Previsión automática solo orientativa. La ruta y la salida siempre las confirma el skipper según las condiciones reales del mar.",
  fr: "Prévision automatique donnée à titre indicatif. La route et le départ sont toujours confirmés par le skipper selon les conditions réelles en mer.",
  de: "Automatische Vorhersage nur zur Orientierung. Route und Abfahrt werden immer vom Skipper anhand der tatsächlichen Seebedingungen bestätigt.",
};

function lang(locale: string): "it" | "en" | "es" | "fr" | "de" {
  if (locale.toLowerCase().startsWith("es")) return "es";
  if (locale.toLowerCase().startsWith("fr")) return "fr";
  if (locale.toLowerCase().startsWith("de")) return "de";
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
  const l = lang(locale);
  if (l === "it") return "nodi";
  if (l === "es") return "nudos";
  if (l === "fr") return "nœuds";
  if (l === "de") return "kn";
  return "kn";
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
    if (l === "es") {
      const tone =
        wind[2] === "estremo" ? "extremo" : wind[2] === "forte" ? "fuerte" : "moderado";
      return `viento ${tone} ${formatWind(kmh, locale, unitSystem)}`;
    }
    if (l === "fr") {
      const tone =
        wind[2] === "estremo" ? "extrême" : wind[2] === "forte" ? "fort" : "modéré";
      return `vent ${tone} ${formatWind(kmh, locale, unitSystem)}`;
    }
    if (l === "de") {
      const tone =
        wind[2] === "estremo" ? "extrem" : wind[2] === "forte" ? "stark" : "mäßig";
      return `${tone}er Wind ${formatWind(kmh, locale, unitSystem)}`;
    }
    const tone =
      wind[2] === "estremo" ? "extreme" : wind[2] === "forte" ? "strong" : "moderate";
    return `${tone} wind ${formatWind(kmh, locale, unitSystem)}`;
  }

  const waves = reason.match(/^onde ([\d.]+)m (alte|moderate)$/);
  if (waves) {
    const meters = Number(waves[1]);
    if (l === "it") return `onde ${formatWaves(meters, locale, unitSystem)} ${waves[2]}`;
    if (l === "es") {
      const tone = waves[2] === "alte" ? "alto" : "moderado";
      return `oleaje ${tone} ${formatWaves(meters, locale, unitSystem)}`;
    }
    if (l === "fr") {
      const tone = waves[2] === "alte" ? "forte" : "modérée";
      return `houle ${tone} ${formatWaves(meters, locale, unitSystem)}`;
    }
    if (l === "de") {
      const tone = waves[2] === "alte" ? "hoher" : "mäßiger";
      return `${tone} Seegang ${formatWaves(meters, locale, unitSystem)}`;
    }
    const tone = waves[2] === "alte" ? "high" : "moderate";
    return `${tone} waves ${formatWaves(meters, locale, unitSystem)}`;
  }

  const rain = reason.match(/^pioggia (\d+)% (probabile|possibile)$/);
  if (rain) {
    if (l === "it") return reason;
    if (l === "es") {
      const tone = rain[2] === "probabile" ? "probable" : "posible";
      return `lluvia ${tone} ${rain[1]}%`;
    }
    if (l === "fr") {
      const tone = rain[2] === "probabile" ? "probable" : "possible";
      return `pluie ${tone} ${rain[1]}%`;
    }
    if (l === "de") {
      const tone = rain[2] === "probabile" ? "wahrscheinlich" : "möglich";
      return `Regen ${tone} ${rain[1]}%`;
    }
    const tone = rain[2] === "probabile" ? "likely" : "possible";
    return `${tone} rain ${rain[1]}%`;
  }

  const temperature = reason.match(/^temperatura min (-?\d+)°C$/);
  if (temperature) {
    const celsius = Number(temperature[1]);
    if (unitSystem === "imperial") {
      const value = `${Math.round(celsiusToFahrenheit(celsius))}°F (${temperature[1]}°C)`;
      if (l === "es") return `temperatura mínima ${value}`;
      if (l === "fr") return `température minimale ${value}`;
      if (l === "de") return `Mindesttemperatur ${value}`;
      return l === "it" ? `temperatura min ${value}` : `minimum temperature ${value}`;
    }
    if (l === "es") return `temperatura mínima ${temperature[1]}°C`;
    if (l === "fr") return `température minimale ${temperature[1]}°C`;
    if (l === "de") return `Mindesttemperatur ${temperature[1]}°C`;
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
        if (l === "es") {
          if (axis === "vento") return "viento";
          if (axis === "onde") return "oleaje";
          if (axis === "pioggia") return "lluvia";
          if (axis === "temperatura") return "temperatura";
        }
        if (l === "fr") {
          if (axis === "vento") return "vent";
          if (axis === "onde") return "houle";
          if (axis === "pioggia") return "pluie";
          if (axis === "temperatura") return "température";
        }
        if (l === "de") {
          if (axis === "vento") return "Wind";
          if (axis === "onde") return "Seegang";
          if (axis === "pioggia") return "Regen";
          if (axis === "temperatura") return "Temperatur";
        }
        if (axis === "vento") return "wind";
        if (axis === "onde") return "waves";
        if (axis === "pioggia") return "rain";
        if (axis === "temperatura") return "temperature";
        return axis;
      })
      .join(", ");
    if (l === "es") return `datos parciales: ${axes}`;
    if (l === "fr") return `données partielles : ${axes}`;
    if (l === "de") return `Teildaten: ${axes}`;
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
