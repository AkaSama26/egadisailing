import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { AdminCard } from "@/components/admin/admin-card";
import { BOOKING_SOURCE_LABEL, labelOrRaw } from "@/lib/admin/labels";

export default async function FinanzaPage() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [monthAgg, yearAgg, bySource, byService, services, refundsYear] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
        processedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
        processedAt: { gte: yearStart },
      },
      _sum: { amount: true },
    }),
    db.booking.groupBy({
      by: ["source"],
      where: { status: { in: ["CONFIRMED", "REFUNDED"] }, createdAt: { gte: yearStart } },
      _sum: { totalPrice: true },
      _count: true,
    }),
    db.booking.groupBy({
      by: ["serviceId"],
      where: { status: "CONFIRMED", createdAt: { gte: yearStart } },
      _sum: { totalPrice: true },
      _count: true,
    }),
    db.service.findMany({ select: { id: true, name: true } }),
    db.payment.aggregate({
      where: { status: "REFUNDED", processedAt: { gte: yearStart } },
      _sum: { amount: true },
    }),
  ]);

  const svcName = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  const monthRevenue = new Decimal(monthAgg._sum.amount?.toString() ?? "0");
  const yearRevenue = new Decimal(yearAgg._sum.amount?.toString() ?? "0");
  const yearRefunds = new Decimal(refundsYear._sum.amount?.toString() ?? "0");
  const netYear = yearRevenue.minus(yearRefunds);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Finanza</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi label="Revenue mese" value={formatEur(monthRevenue)} />
        <Kpi label="Revenue anno (lordo)" value={formatEur(yearRevenue)} />
        <Kpi
          label="Anno netto refund"
          value={formatEur(netYear)}
          hint={`Refund: ${formatEur(yearRefunds)}`}
        />
      </div>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Per canale (YTD)</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {bySource.map((s) => (
            <li key={s.source} className="flex justify-between py-2">
              <span>
                <strong>{labelOrRaw(BOOKING_SOURCE_LABEL, s.source)}</strong> · {s._count} prenotazioni
              </span>
              <span className="tabular-nums font-mono">
                {formatEur(new Decimal(s._sum.totalPrice?.toString() ?? "0"))}
              </span>
            </li>
          ))}
          {bySource.length === 0 && (
            <li className="text-slate-500 py-2">Nessun dato.</li>
          )}
        </ul>
      </AdminCard>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Per servizio (YTD)</h2>
        <ul className="text-sm divide-y divide-slate-100">
          {byService.map((s) => (
            <li key={s.serviceId} className="flex justify-between py-2">
              <span>
                <strong>{svcName(s.serviceId)}</strong> · {s._count} prenotazioni
              </span>
              <span className="tabular-nums font-mono">
                {formatEur(new Decimal(s._sum.totalPrice?.toString() ?? "0"))}
              </span>
            </li>
          ))}
          {byService.length === 0 && (
            <li className="text-slate-500 py-2">Nessun dato.</li>
          )}
        </ul>
      </AdminCard>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <AdminCard>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </AdminCard>
  );
}
