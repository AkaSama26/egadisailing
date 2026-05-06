import Link from "next/link";
import { db } from "@/lib/db";
import { addDays, formatItDay, parseDateLikelyLocalDay } from "@/lib/dates";
import { getAllWeather } from "@/lib/weather/service";
import type { WeatherRisk } from "@/lib/weather/risk-assessment";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

const RISK_LABELS: Record<WeatherRisk, string> = {
  LOW: "Rischio basso",
  MEDIUM: "Da monitorare",
  HIGH: "Rischio alto",
  EXTREME: "Rischio estremo",
};

const RISK_CLASSES: Record<WeatherRisk, string> = {
  LOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  EXTREME: "bg-red-50 text-red-700 border-red-200",
};

function formatWave(value: number | null) {
  return value == null ? "onde n/d" : `onde ${value.toFixed(1)} m`;
}

export default async function MeteoPage() {
  const today = parseDateLikelyLocalDay(new Date());
  const weekEnd = addDays(today, 7);

  const [bookings, weatherResult] = await Promise.all([
    db.booking.findMany({
      where: { status: "CONFIRMED", startDate: { gte: today, lte: weekEnd } },
      include: { service: { select: { name: true } }, boat: { select: { name: true } } },
      orderBy: { startDate: "asc" },
    }),
    getAllWeather()
      .then((items) => ({ items, error: null as string | null }))
      .catch((err) => ({ items: [], error: (err as Error).message })),
  ]);
  const forecastByDate = new Map(weatherResult.items.map((item) => [item.date, item]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meteo · prossimi 7 giorni"
        subtitle="Controllo operativo delle uscite confermate con previsioni Open-Meteo e dati marini."
      />

      {weatherResult.error && (
        <AdminCard tone="warn" className="text-sm text-amber-900">
          Open-Meteo non è raggiungibile in questo momento. Se disponibile, il sistema userà la
          cache recente; altrimenti le previsioni resteranno vuote fino al prossimo aggiornamento.
        </AdminCard>
      )}

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Uscite confermate</h2>
        {bookings.length === 0 ? (
          <EmptyState message="Nessuna uscita nei prossimi 7 giorni." />
        ) : (
          <ul className="space-y-2 text-sm divide-y divide-slate-100">
            {bookings.map((b) => {
              const dateKey = b.startDate.toISOString().slice(0, 10);
              const weather = forecastByDate.get(dateKey);

              return (
                <li
                  key={b.id}
                  className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/prenotazioni/${b.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      {b.confirmationCode}
                    </Link>
                    {" · "}
                    {b.service.name} · {b.boat.name} ·{" "}
                    <span className="text-slate-500">{formatItDay(b.startDate)}</span>
                  </div>
                  <div className="shrink-0 text-xs text-slate-600 md:text-right">
                    {weather ? (
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <span
                          className={`rounded-full border px-2.5 py-1 font-semibold ${RISK_CLASSES[weather.risk]}`}
                        >
                          {RISK_LABELS[weather.risk]}
                        </span>
                        <span>vento {Math.round(weather.forecast.windSpeedKmh)} km/h</span>
                        <span>raffiche {Math.round(weather.forecast.windGustKmh)} km/h</span>
                        <span>{formatWave(weather.forecast.waveHeightM)}</span>
                        <span>
                          pioggia {weather.forecast.precipitationProbability}% ·{" "}
                          {weather.forecast.precipitationMm.toFixed(1)} mm
                        </span>
                        <span>
                          {Math.round(weather.forecast.temperatureMin)}-
                          {Math.round(weather.forecast.temperatureMax)}°C
                        </span>
                        {weather.reasons.length > 0 && (
                          <span className="basis-full text-slate-500 md:text-right">
                            {weather.reasons.join(" · ")}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">previsione non disponibile</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
