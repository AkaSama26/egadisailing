import type { WeatherForBooking } from "@/lib/weather/service";
import { getReassuranceMessage } from "@/lib/weather/reassurance";

const riskStyles: Record<string, string> = {
  LOW: "bg-emerald-50 border-emerald-200 text-emerald-900",
  MEDIUM: "bg-amber-50 border-amber-200 text-amber-900",
  HIGH: "bg-orange-50 border-orange-200 text-orange-900",
  EXTREME: "bg-red-50 border-red-200 text-red-900",
};

export function WeatherInfoCard({ weather }: { weather: WeatherForBooking }) {
  const msg = getReassuranceMessage(weather.risk);
  return (
    <div className={`border rounded-xl p-4 ${riskStyles[weather.risk] ?? riskStyles.LOW}`}>
      <h3 className="font-bold text-lg">{msg.title}</h3>
      <p className="text-sm mt-1">{msg.body}</p>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Stat
          label="Temperatura"
          value={`${Math.round(weather.forecast.temperatureMin)}° / ${Math.round(
            weather.forecast.temperatureMax,
          )}°`}
        />
        <Stat label="Vento" value={`${Math.round(weather.forecast.windSpeedKmh)} km/h`} />
        <Stat
          label="Onde"
          value={
            weather.forecast.waveHeightM !== null
              ? `${weather.forecast.waveHeightM.toFixed(1)} m`
              : "—"
          }
        />
        <Stat label="Pioggia" value={`${weather.forecast.precipitationProbability}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
