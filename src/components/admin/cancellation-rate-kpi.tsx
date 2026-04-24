import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { computeCancellationRate } from "@/lib/booking/cancellation-rate";
import { env } from "@/lib/env";
import { OTA_CHANNELS } from "@/lib/booking/override-types";
import { AdminCard } from "@/components/admin/admin-card";

export async function CancellationRateKpi() {
  const soft = env.OVERRIDE_CANCELLATION_RATE_SOFT_WARN;
  const hard = env.OVERRIDE_CANCELLATION_RATE_HARD_BLOCK;
  const rates = await Promise.all(
    OTA_CHANNELS.map(async (ch) => {
      const r = await computeCancellationRate(ch, 30);
      return { channel: ch, ...r };
    }),
  );

  return (
    <AdminCard title="Cancellation rate OTA (30gg)">
      <p className="text-xs text-slate-500 mb-2">
        Soglie: soft {(soft * 100).toFixed(1)}% / hard {(hard * 100).toFixed(1)}%
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="pb-1" scope="col">Canale</th>
            <th className="pb-1" scope="col">Rate</th>
            <th className="pb-1" scope="col">Override / Total</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => {
            const isHard = r.rate > hard;
            const isSoft = !isHard && r.rate > soft;
            const color = isHard
              ? "text-red-700 font-semibold"
              : isSoft
              ? "text-amber-700 font-semibold"
              : "text-emerald-700";
            const stateName = isHard
              ? "oltre hard block"
              : isSoft
              ? "vicino soft warn"
              : "ok";
            const Icon = isHard ? AlertCircle : isSoft ? AlertTriangle : CheckCircle;
            const iconColor = isHard
              ? "text-red-700"
              : isSoft
              ? "text-amber-700"
              : "text-emerald-700";
            const ratePercent = (r.rate * 100).toFixed(1);
            return (
              <tr key={r.channel} className="border-t border-slate-100">
                <td className="py-1">{r.channel}</td>
                <td
                  className={`py-1 ${color}`}
                  aria-label={`${ratePercent}% — ${stateName}`}
                >
                  <Icon className={`inline size-4 mr-1 ${iconColor}`} aria-hidden="true" />
                  {ratePercent}%
                </td>
                <td className="py-1 text-slate-600">
                  {r.cancelledByOverride} / {r.totalBookings}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminCard>
  );
}
