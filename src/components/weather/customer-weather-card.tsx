"use client";

import { useState } from "react";
import { CloudSun, Droplets, Thermometer, Waves, Wind } from "lucide-react";
import type { PublicWeatherSummary, WeatherUnitSystem } from "@/lib/weather/public-format";

interface CustomerWeatherCardProps {
  summary: PublicWeatherSummary;
  title?: string;
  locale?: string;
  compact?: boolean;
}

const RISK_CLASSES: Record<PublicWeatherSummary["risk"], string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-800",
  HIGH: "border-orange-200 bg-orange-50 text-orange-800",
  EXTREME: "border-red-200 bg-red-50 text-red-800",
};

export function CustomerWeatherCard({
  summary,
  title,
  locale = "it",
  compact = false,
}: CustomerWeatherCardProps) {
  const l = locale.toLowerCase().startsWith("es")
    ? "es"
    : locale.toLowerCase().startsWith("fr")
      ? "fr"
    : locale.toLowerCase().startsWith("en")
      ? "en"
      : "it";
  const [unitSystem, setUnitSystem] = useState<WeatherUnitSystem>(
    summary.defaultUnitSystem ?? "metric",
  );
  const resolvedTitle =
    title ??
    (l === "es"
      ? "Previsión meteorológica"
      : l === "fr"
        ? "Prévisions météo"
        : l === "en"
          ? "Weather forecast"
          : "Meteo previsto");
  const labels = METRIC_LABELS[l];
  const selectedUnits = summary.units?.[unitSystem] ?? {
    metrics: summary.metrics,
    reasons: summary.reasons,
  };

  return (
    <section
      className={`rounded-lg border border-sky-100 bg-sky-50/80 p-3 text-slate-800 ${
        compact ? "text-sm" : "text-sm shadow-sm"
      }`}
      aria-label={resolvedTitle}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sky-800">
            <CloudSun className="size-4 shrink-0" aria-hidden="true" />
            {resolvedTitle}
          </p>
          <p className="mt-1 font-semibold text-slate-950">{summary.headline}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${RISK_CLASSES[summary.risk]}`}
          >
            {summary.riskLabel}
          </span>
          <div
            className="inline-flex rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-bold"
            role="group"
            aria-label={labels.units}
          >
            <UnitButton
              active={unitSystem === "metric"}
              label={labels.metric}
              onClick={() => setUnitSystem("metric")}
            />
            <UnitButton
              active={unitSystem === "imperial"}
              label={labels.imperial}
              onClick={() => setUnitSystem("imperial")}
            />
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <WeatherMetric icon={Wind} label={labels.wind} value={selectedUnits.metrics.wind} />
        <WeatherMetric icon={Wind} label={labels.gusts} value={selectedUnits.metrics.gusts} />
        <WeatherMetric icon={Waves} label={labels.waves} value={selectedUnits.metrics.waves} />
        <WeatherMetric icon={Droplets} label={labels.rain} value={selectedUnits.metrics.rain} />
        <WeatherMetric
          icon={Thermometer}
          label={labels.temperature}
          value={selectedUnits.metrics.temperature}
        />
      </dl>

      {selectedUnits.reasons.length > 0 && (
        <p className="mt-3 rounded-md bg-white/70 px-2.5 py-2 text-xs leading-5 text-slate-600">
          {selectedUnits.reasons.join(" · ")}
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-500">{summary.note}</p>
    </section>
  );
}

const METRIC_LABELS = {
  it: {
    wind: "Vento",
    gusts: "Raffiche",
    waves: "Onde",
    rain: "Pioggia",
    temperature: "Temp.",
    units: "Unità",
    metric: "Metrico",
    imperial: "Imperiale",
  },
  en: {
    wind: "Wind",
    gusts: "Gusts",
    waves: "Waves",
    rain: "Rain",
    temperature: "Temp.",
    units: "Units",
    metric: "Metric",
    imperial: "Imperial",
  },
  es: {
    wind: "Viento",
    gusts: "Rachas",
    waves: "Oleaje",
    rain: "Lluvia",
    temperature: "Temp.",
    units: "Unidades",
    metric: "Métrico",
    imperial: "Imperial",
  },
  fr: {
    wind: "Vent",
    gusts: "Rafales",
    waves: "Houle",
    rain: "Pluie",
    temperature: "Temp.",
    units: "Unités",
    metric: "Métrique",
    imperial: "Impérial",
  },
};

function UnitButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

function WeatherMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-white/80 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-bold tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}
