import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Servizi</h1>
      <p className="text-sm text-slate-500">
        Catalogo in sola lettura: i servizi sono popolati dal seed DB. Per modifiche strutturali
        contattare il team tech.
      </p>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="text-left p-3">Nome</th>
              <th scope="col" className="text-left p-3">Classe</th>
              <th scope="col" className="text-left p-3">Barca</th>
              <th scope="col" className="text-left p-3">Durata</th>
              <th scope="col" className="text-center p-3">Capacity</th>
              <th scope="col" className="text-left p-3">Pagamento</th>
              <th scope="col" className="text-center p-3">Deposit %</th>
              <th scope="col" className="text-left p-3">Bokun ID</th>
              <th scope="col" className="text-center p-3">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => {
              const typeInfo = SERVICE_TYPE_LABEL[s.type] ?? {
                label: s.type,
                className: "bg-slate-100 text-slate-700 border-slate-200",
              };
              const durationLabel = DURATION_LABEL[s.durationType] ?? s.durationType;
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${typeInfo.className}`}
                    >
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="p-3">{s.boat.name}</td>
                  <td className="p-3">
                    {durationLabel}
                    {s.durationType !== "WEEK" ? ` · ${s.durationHours}h` : ""}
                  </td>
                  <td className="p-3 text-center tabular-nums">
                    {s.capacityMax}
                    {s.minPaying ? (
                      <span
                        className="block text-xs text-slate-500"
                        title="Soglia minima per ordine singolo"
                      >
                        min {s.minPaying}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {PAYMENT_LABEL[s.defaultPaymentSchedule] ?? s.defaultPaymentSchedule}
                  </td>
                  <td className="p-3 text-center tabular-nums">
                    {s.defaultDepositPercentage != null ? `${s.defaultDepositPercentage}%` : "-"}
                  </td>
                  <td className="p-3 text-xs font-mono">
                    {s.bokunProductId ? (
                      s.bokunProductId
                    ) : (
                      <span className="text-slate-400 italic">non mappato</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {s.active ? (
                      <span aria-label="Attivo" className="text-emerald-600">
                        ✓
                      </span>
                    ) : (
                      <span aria-label="Disattivato" className="text-slate-400">
                        ✗
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {services.length === 0 && (
              <EmptyState message="Nessun servizio configurato." colSpan={9} />
            )}
          </tbody>
        </table>
      </div>

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
