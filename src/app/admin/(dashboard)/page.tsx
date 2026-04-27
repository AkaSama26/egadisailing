import Link from "next/link";
import { Euro, Calendar, Clock, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { formatEur } from "@/lib/pricing/cents";
import { CancellationRateKpi } from "@/components/admin/cancellation-rate-kpi";
import { PageHeader } from "@/components/admin/page-header";
import { getDashboardKpi } from "@/lib/queries/dashboard-kpi";
import {
  MANUAL_ALERT_ACTION_LABEL,
  MANUAL_ALERT_CHANNEL_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export default async function DashboardHome() {
  const kpi = await getDashboardKpi();

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Entrate del mese" value={formatEur(kpi.monthRevenue)} icon={Euro} />
        <KpiCard
          label="Prenotazioni del mese"
          value={String(kpi.bookingsCount)}
          icon={Calendar}
          hint="Confermate + In attesa"
        />
        <KpiCard
          label="Uscite future"
          value={String(kpi.upcomingCount)}
          icon={Clock}
          hint="Confermate con data successiva a oggi"
        />
        <KpiCard
          label="Saldi pendenti"
          value={formatEur(kpi.pendingBalances)}
          icon={AlertTriangle}
          tone={kpi.pendingBalances.gt(0) ? "warn" : "default"}
          hint="Acconto versato, saldo ancora da incassare"
        />
        <KpiCard
          label="Override approvati questo mese"
          value={String(kpi.overrideMonthlyApproved)}
          icon={AlertTriangle}
          hint={kpi.overrideMonthlyApproved > 3 ? "Soft warning: > 3/mese" : undefined}
          tone={kpi.overrideMonthlyApproved > 3 ? "warn" : "default"}
        />
        <KpiCard
          label="Richieste priorita' pending"
          value={String(kpi.overridePending)}
          icon={AlertTriangle}
          tone={kpi.overridePending > 0 ? "warn" : "default"}
        />
      </div>

      <section>
        <CancellationRateKpi />
      </section>

      {kpi.pendingAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="size-5" aria-hidden="true" />
              <span className="sr-only">Attenzione:</span>
              Azioni da completare ({kpi.pendingAlerts.length})
            </h2>
            <Link href="/admin/sync-log" className="text-red-700 hover:underline text-sm font-medium">
              Vedi cosa fare
            </Link>
          </div>
          <p className="mb-3 text-sm text-red-800">
            Il sito ha trovato una situazione che richiede un controllo umano, di solito su
            un portale esterno come Bokun, Boataround, Click&Boat o Nautal.
          </p>
          <ul className="space-y-1 text-sm text-red-900">
            {kpi.pendingAlerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  <strong>{labelOrRaw(MANUAL_ALERT_CHANNEL_LABEL, a.channel)}</strong> —{" "}
                  {labelOrRaw(MANUAL_ALERT_ACTION_LABEL, a.action)} il{" "}
                  {a.date.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
            {kpi.pendingAlerts.length > 5 && (
              <li className="text-xs text-red-700">+ altri {kpi.pendingAlerts.length - 5}</li>
            )}
          </ul>
        </div>
      )}

    </div>
  );
}
