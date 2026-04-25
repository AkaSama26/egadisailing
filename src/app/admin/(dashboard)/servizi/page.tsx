import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/admin/page-header";

// Classi di servizio con label IT + badge color-coded per distinguere
// shared/exclusive/charter a colpo d'occhio.
const SERVICE_TYPE_LABEL: Record<string, { label: string; className: string }> = {
  SOCIAL_BOATING: {
    label: "Social Boating",
    className: "bg-sky-100 text-sky-800 border-sky-200",
  },
  EXCLUSIVE_EXPERIENCE: {
    label: "Exclusive Experience",
    className: "bg-amber-100 text-amber-900 border-amber-300",
  },
  CABIN_CHARTER: {
    label: "Cabin Charter",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  BOAT_SHARED: {
    label: "Boat Shared",
    className: "bg-cyan-100 text-cyan-800 border-cyan-200",
  },
  BOAT_EXCLUSIVE: {
    label: "Boat Exclusive",
    className: "bg-orange-100 text-orange-900 border-orange-300",
  },
};

const DURATION_LABEL: Record<string, string> = {
  FULL_DAY: "Giornata intera",
  HALF_DAY_MORNING: "Mezza giornata · mattino",
  HALF_DAY_AFTERNOON: "Mezza giornata · pomeriggio",
  WEEK: "Settimana",
};

const PAYMENT_LABEL: Record<string, string> = {
  FULL: "Saldo totale",
  DEPOSIT_BALANCE: "Acconto + saldo",
};

export default async function ServiziPage() {
  const services = await db.service.findMany({
    include: { boat: { select: { name: true } } },
    orderBy: [{ priority: "desc" }, { name: "asc" }],
  });

  type ServiceRow = (typeof services)[number];
  const columns: AdminTableColumn<ServiceRow>[] = [
    { label: "Nome", className: "font-medium", render: (s) => s.name },
    {
      label: "Classe",
      render: (s) => {
        const typeInfo = SERVICE_TYPE_LABEL[s.type] ?? {
          label: s.type,
          className: "bg-slate-100 text-slate-700 border-slate-200",
        };
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${typeInfo.className}`}
          >
            {typeInfo.label}
          </span>
        );
      },
    },
    { label: "Barca", render: (s) => s.boat.name },
    {
      label: "Durata",
      render: (s) => {
        const durationLabel = DURATION_LABEL[s.durationType] ?? s.durationType;
        return (
          <>
            {durationLabel}
            {s.durationType !== "WEEK" ? ` · ${s.durationHours}h` : ""}
          </>
        );
      },
    },
    {
      label: "Capacity",
      align: "center",
      className: "tabular-nums",
      render: (s) => (
        <>
          {s.capacityMax}
          {s.minPaying ? (
            <span
              className="block text-xs text-slate-500"
              title="Soglia minima per ordine singolo"
            >
              min {s.minPaying}
            </span>
          ) : null}
        </>
      ),
    },
    {
      label: "Pagamento",
      render: (s) =>
        PAYMENT_LABEL[s.defaultPaymentSchedule] ?? s.defaultPaymentSchedule,
    },
    {
      label: "Deposit %",
      align: "center",
      className: "tabular-nums",
      render: (s) =>
        s.defaultDepositPercentage != null ? `${s.defaultDepositPercentage}%` : "-",
    },
    {
      label: "Bokun ID",
      className: "text-xs font-mono",
      render: (s) =>
        s.bokunProductId ? (
          s.bokunProductId
        ) : (
          <span className="text-slate-400 italic">non mappato</span>
        ),
    },
    {
      label: "Attivo",
      align: "center",
      render: (s) =>
        s.active ? (
          <span aria-label="Attivo" className="text-emerald-600">
            ✓
          </span>
        ) : (
          <span aria-label="Disattivato" className="text-slate-400">
            ✗
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servizi"
        subtitle="Catalogo in sola lettura: i servizi sono popolati dal seed DB. Per modifiche strutturali contattare il team tech."
      />

      <AdminCard padding="none" className="overflow-x-auto">
        <AdminTable<ServiceRow>
          caption="Catalogo servizi"
          rows={services}
          rowKey={(s) => s.id}
          emptyMessage="Nessun servizio configurato."
          columns={columns}
        />
      </AdminCard>

      {/* Legenda classi per chiarire la distinzione in vista admin. */}
      <AdminCard padding="sm" className="text-xs text-slate-600 space-y-2">
        <p className="font-semibold text-slate-900">Classi di servizio</p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <li>
            <strong>Social Boating</strong>: tour condiviso — soglia minima paganti per
            ordine (es. 11), pagamento FULL al checkout.
          </li>
          <li>
            <strong>Exclusive Experience</strong>: barca intera per gruppo privato, giornata,
            acconto 30% + saldo 7gg prima.
          </li>
          <li>
            <strong>Cabin Charter</strong>: settimana sab→sab, 8 cabine, acconto + saldo.
          </li>
          <li>
            <strong>Boat Shared</strong>: motoscafo condiviso (tour giornaliero a slot).
          </li>
          <li>
            <strong>Boat Exclusive</strong>: motoscafo riservato al gruppo, giornata, acconto +
            saldo.
          </li>
        </ul>
      </AdminCard>
    </div>
  );
}
