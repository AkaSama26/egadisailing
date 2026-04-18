import { db } from "@/lib/db";

export default async function ServiziPage() {
  const services = await db.service.findMany({
    include: { boat: { select: { name: true } } },
    orderBy: { name: "asc" },
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
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Barca</th>
              <th className="text-left p-3">Durata</th>
              <th className="text-center p-3">Capacity</th>
              <th className="text-left p-3">Payment</th>
              <th className="text-center p-3">Deposit %</th>
              <th className="text-left p-3">Bokun ID</th>
              <th className="text-center p-3">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{s.type}</td>
                <td className="p-3">{s.boat.name}</td>
                <td className="p-3">
                  {s.durationType}
                  {s.durationType !== "WEEK" ? ` (${s.durationHours}h)` : ""}
                </td>
                <td className="p-3 text-center tabular-nums">{s.capacityMax}</td>
                <td className="p-3">{s.defaultPaymentSchedule}</td>
                <td className="p-3 text-center tabular-nums">
                  {s.defaultDepositPercentage ?? "-"}
                </td>
                <td className="p-3 text-xs font-mono">
                  {s.bokunProductId ? (
                    s.bokunProductId
                  ) : (
                    <span className="text-red-500">non mappato</span>
                  )}
                </td>
                <td className="p-3 text-center">{s.active ? "✓" : "✗"}</td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500">
                  Nessun servizio configurato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
