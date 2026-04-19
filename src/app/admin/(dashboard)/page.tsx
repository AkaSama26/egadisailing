import Link from "next/link";
import Decimal from "decimal.js";
import { Euro, Calendar, Clock, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";
import { KpiCard } from "@/components/admin/kpi-card";
import { formatEur } from "@/lib/pricing/cents";

export default async function DashboardHome() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueAgg,
    bookingsCount,
    upcomingCount,
    balancesAgg,
    pendingAlerts,
    channelStatuses,
  ] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
        processedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    db.booking.count({
      where: { createdAt: { gte: monthStart }, status: { in: ["CONFIRMED", "PENDING"] } },
    }),
    db.booking.count({
      where: { status: "CONFIRMED", startDate: { gte: now } },
    }),
    db.directBooking.aggregate({
      where: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        booking: { startDate: { gte: now }, status: "CONFIRMED" },
      },
      _sum: { balanceAmount: true },
    }),
    listPendingManualAlerts(),
    db.channelSyncStatus.findMany({
      orderBy: { channel: "asc" },
    }),
  ]);

  const revenueDec = new Decimal(revenueAgg._sum.amount?.toString() ?? "0");
  const balancesDec = new Decimal(balancesAgg._sum.balanceAmount?.toString() ?? "0");
  const anyRed = channelStatuses.some((c) => c.healthStatus === "RED");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Revenue del mese" value={formatEur(revenueDec)} icon={Euro} />
        <KpiCard
          label="Prenotazioni del mese"
          value={String(bookingsCount)}
          icon={Calendar}
          hint="CONFIRMED + PENDING"
        />
        <KpiCard
          label="Uscite future"
          value={String(upcomingCount)}
          icon={Clock}
          hint="CONFIRMED con startDate futura"
        />
        <KpiCard
          label="Saldi pendenti"
          value={formatEur(balancesDec)}
          icon={AlertTriangle}
          tone={balancesDec.gt(0) ? "warn" : "default"}
          hint="DEPOSIT_BALANCE non ancora saldati"
        />
      </div>

      {pendingAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="size-5" aria-hidden="true" />
              <span className="sr-only">Attenzione:</span>
              Alert manuali ({pendingAlerts.length})
            </h2>
            <Link href="/admin/sync-log" className="text-red-700 hover:underline text-sm font-medium">
              Vai al registro
            </Link>
          </div>
          <ul className="space-y-1 text-sm text-red-900">
            {pendingAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  <strong>{a.channel}</strong> — {a.action} {a.boatId} il{" "}
                  {a.date.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
            {pendingAlerts.length > 5 && (
              <li className="text-xs text-red-700">+ altri {pendingAlerts.length - 5}</li>
            )}
          </ul>
        </div>
      )}

      <div
        className={`bg-white rounded-xl border p-5 ${anyRed ? "border-red-200" : "border-slate-200"}`}
      >
        <h2 className="font-bold mb-3 text-slate-900">Channel health</h2>
        {channelStatuses.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun canale ancora sincronizzato.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {channelStatuses.map((c) => {
              const tone =
                c.healthStatus === "GREEN"
                  ? "bg-emerald-100 text-emerald-800"
                  : c.healthStatus === "YELLOW"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800";
              return (
                <span
                  key={c.channel}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${tone}`}
                  title={c.lastError ?? ""}
                >
                  {c.channel} · {c.healthStatus}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
