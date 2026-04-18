import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import {
  upsertPricingPeriod,
  upsertHotDayRule,
  deleteHotDayRule,
} from "./actions";

export default async function PrezziPage() {
  const [services, periods, hotDayRules] = await Promise.all([
    db.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.pricingPeriod.findMany({
      include: { service: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { startDate: "asc" }],
    }),
    db.hotDayRule.findMany({ orderBy: [{ priority: "desc" }, { dateRangeStart: "asc" }] }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Prezzi</h1>

      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Pricing periods (€/pax base)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left p-2">Servizio</th>
                <th className="text-left p-2">Label</th>
                <th className="text-left p-2">Anno</th>
                <th className="text-left p-2">Da</th>
                <th className="text-left p-2">A</th>
                <th className="text-right p-2">€/pax</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.service.name}</td>
                  <td className="p-2">{p.label}</td>
                  <td className="p-2 tabular-nums">{p.year}</td>
                  <td className="p-2">{p.startDate.toLocaleDateString("it-IT")}</td>
                  <td className="p-2">{p.endDate.toLocaleDateString("it-IT")}</td>
                  <td className="p-2 text-right tabular-nums font-mono">
                    {formatEur(p.pricePerPerson.toString())}
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Nessun period configurato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form
          action={async (fd) => {
            "use server";
            await upsertPricingPeriod({
              serviceId: String(fd.get("serviceId")),
              label: String(fd.get("label")),
              startDate: String(fd.get("startDate")),
              endDate: String(fd.get("endDate")),
              pricePerPerson: parseFloat(String(fd.get("pricePerPerson"))),
              year: parseInt(String(fd.get("year")), 10),
            });
          }}
          className="grid grid-cols-1 md:grid-cols-6 gap-2 border-t pt-4"
        >
          <select name="serviceId" className="border rounded px-2 py-1 text-sm" required>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            name="label"
            placeholder="alta/media/bassa"
            className="border rounded px-2 py-1 text-sm"
            required
            maxLength={32}
          />
          <input
            name="startDate"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input name="endDate" type="date" className="border rounded px-2 py-1 text-sm" required />
          <input
            name="pricePerPerson"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="€/pax"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input
            name="year"
            type="number"
            min="2020"
            max="2100"
            defaultValue={new Date().getFullYear()}
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <button className="md:col-span-6 bg-slate-900 text-white rounded py-2 text-sm font-medium hover:bg-slate-800">
            Aggiungi period
          </button>
        </form>
      </section>

      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Hot day rules (moltiplicatori)</h2>
        <ul className="space-y-2 text-sm">
          {hotDayRules.map((r) => (
            <li
              key={r.id}
              className="flex justify-between items-center gap-3 border-b border-slate-100 pb-2 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-500">
                  {r.dateRangeStart.toLocaleDateString("it-IT")} →{" "}
                  {r.dateRangeEnd.toLocaleDateString("it-IT")} · ×{r.multiplier.toString()} · round
                  €{r.roundTo} · priority {r.priority}
                  {r.weekdays.length > 0 && ` · weekdays ${r.weekdays.join(",")}`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    r.active ? "text-emerald-700" : "text-slate-400"
                  }`}
                >
                  {r.active ? "ATTIVA" : "OFF"}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await deleteHotDayRule(r.id);
                  }}
                >
                  <button className="text-xs text-red-600 hover:underline">Elimina</button>
                </form>
              </div>
            </li>
          ))}
          {hotDayRules.length === 0 && (
            <li className="text-slate-500 text-sm">Nessuna hot day rule configurata.</li>
          )}
        </ul>

        <form
          action={async (fd) => {
            "use server";
            const weekdaysStr = String(fd.get("weekdays") ?? "").trim();
            const weekdays = weekdaysStr
              ? weekdaysStr
                  .split(",")
                  .map((n) => parseInt(n.trim(), 10))
                  .filter((n) => !isNaN(n))
              : [];
            await upsertHotDayRule({
              name: String(fd.get("name")),
              dateRangeStart: String(fd.get("dateRangeStart")),
              dateRangeEnd: String(fd.get("dateRangeEnd")),
              weekdays,
              multiplier: parseFloat(String(fd.get("multiplier"))),
              roundTo: parseInt(String(fd.get("roundTo")), 10),
              priority: parseInt(String(fd.get("priority")), 10),
              active: fd.get("active") === "on",
            });
          }}
          className="grid grid-cols-1 md:grid-cols-6 gap-2 border-t pt-4"
        >
          <input
            name="name"
            placeholder="Nome (es. Ferragosto)"
            className="border rounded px-2 py-1 text-sm md:col-span-2"
            required
            maxLength={64}
          />
          <input
            name="dateRangeStart"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input
            name="dateRangeEnd"
            type="date"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input
            name="multiplier"
            type="number"
            step="0.01"
            defaultValue="1.25"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input
            name="roundTo"
            type="number"
            min="0"
            max="1000"
            defaultValue="10"
            className="border rounded px-2 py-1 text-sm"
            required
          />
          <input
            name="weekdays"
            placeholder="Weekdays es. 6,0 (sab,dom) o vuoto per tutti"
            className="border rounded px-2 py-1 text-sm md:col-span-3"
          />
          <input
            name="priority"
            type="number"
            defaultValue="10"
            className="border rounded px-2 py-1 text-sm"
          />
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="active" defaultChecked /> Attiva
          </label>
          <button className="md:col-span-6 bg-slate-900 text-white rounded py-2 text-sm font-medium hover:bg-slate-800">
            Aggiungi regola
          </button>
        </form>
      </section>
    </div>
  );
}
