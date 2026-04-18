import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { upsertCrewMember, toggleCrewActive } from "./actions";

export default async function CrewPage() {
  const members = await db.crewMember.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Crew</h1>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Ruolo</th>
              <th className="text-left p-3">Telefono</th>
              <th className="text-left p-3">Email</th>
              <th className="text-right p-3">Tariffa/giorno</th>
              <th className="text-center p-3">Attivo</th>
              <th className="text-right p-3">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-3 font-medium">{m.name}</td>
                <td className="p-3">{m.role}</td>
                <td className="p-3">{m.phone ?? "-"}</td>
                <td className="p-3">{m.email ?? "-"}</td>
                <td className="p-3 text-right tabular-nums">
                  {m.dailyRate ? formatEur(m.dailyRate.toString()) : "-"}
                </td>
                <td className="p-3 text-center">{m.active ? "✓" : "✗"}</td>
                <td className="p-3 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await toggleCrewActive(m.id, !m.active);
                    }}
                  >
                    <button className="text-xs text-slate-600 hover:underline">
                      {m.active ? "Disattiva" : "Attiva"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Nessun membro crew configurato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        action={async (fd) => {
          "use server";
          const dailyRateStr = String(fd.get("dailyRate") ?? "").trim();
          await upsertCrewMember({
            name: String(fd.get("name")),
            role: fd.get("role") as "SKIPPER" | "CHEF" | "HOSTESS",
            phone: String(fd.get("phone") ?? "").trim() || undefined,
            email: String(fd.get("email") ?? "").trim() || undefined,
            dailyRateEur: dailyRateStr ? parseFloat(dailyRateStr) : undefined,
            active: true,
          });
        }}
        className="bg-white rounded-xl border p-5 grid grid-cols-1 md:grid-cols-5 gap-2"
      >
        <input
          name="name"
          placeholder="Nome"
          className="border rounded px-3 py-2 text-sm"
          required
          maxLength={128}
        />
        <select name="role" className="border rounded px-3 py-2 text-sm">
          <option value="SKIPPER">Skipper</option>
          <option value="CHEF">Chef</option>
          <option value="HOSTESS">Hostess</option>
        </select>
        <input
          name="phone"
          placeholder="Telefono"
          className="border rounded px-3 py-2 text-sm"
          maxLength={32}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="border rounded px-3 py-2 text-sm"
          maxLength={256}
        />
        <input
          name="dailyRate"
          type="number"
          step="0.01"
          min="0"
          placeholder="€/giorno"
          className="border rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="md:col-span-5 bg-slate-900 text-white rounded py-2 text-sm font-medium hover:bg-slate-800"
        >
          Aggiungi membro
        </button>
      </form>
    </div>
  );
}
