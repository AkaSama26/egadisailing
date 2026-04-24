import { computeCancellationRate } from "@/lib/booking/cancellation-rate";
import { env } from "@/lib/env";
import { OTA_CHANNELS } from "@/lib/booking/override-types";

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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-900 mb-3">
        Cancellation rate OTA (30gg)
      </h3>
      <p className="text-xs text-slate-500 mb-2">
        Soglie: soft {(soft * 100).toFixed(1)}% / hard {(hard * 100).toFixed(1)}%
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="pb-1">Canale</th>
            <th className="pb-1">Rate</th>
            <th className="pb-1">Override / Total</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => {
            const color =
              r.rate > hard
                ? "text-red-700 font-semibold"
                : r.rate > soft
                ? "text-amber-700 font-semibold"
                : "text-emerald-700";
            return (
              <tr key={r.channel} className="border-t border-slate-100">
                <td className="py-1">{r.channel}</td>
                <td className={`py-1 ${color}`}>
                  {(r.rate * 100).toFixed(1)}%
                </td>
                <td className="py-1 text-slate-600">
                  {r.cancelledByOverride} / {r.totalBookings}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
