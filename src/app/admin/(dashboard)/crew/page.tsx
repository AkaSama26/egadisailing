import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { upsertCrewMember, toggleCrewActive } from "./actions";

type CrewRow = Awaited<ReturnType<typeof db.crewMember.findMany>>[number];

export default async function CrewPage() {
  const members = await db.crewMember.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Crew" />

      <AdminCard padding="none" className="overflow-x-auto">
        <AdminTable<CrewRow>
          caption="Elenco membri crew"
          rows={members}
          rowKey={(m) => m.id}
          emptyMessage="Nessun membro crew configurato."
          columns={[
            { label: "Nome", className: "font-medium", render: (m) => m.name },
            { label: "Ruolo", render: (m) => m.role },
            { label: "Telefono", render: (m) => m.phone ?? "-" },
            { label: "Email", render: (m) => m.email ?? "-" },
            {
              label: "Tariffa/giorno",
              align: "right",
              className: "tabular-nums",
              render: (m) => (m.dailyRate ? formatEur(m.dailyRate.toString()) : "-"),
            },
            { label: "Attivo", align: "center", render: (m) => (m.active ? "✓" : "✗") },
            {
              label: "Azioni",
              align: "right",
              render: (m) => (
                <form
                  action={async () => {
                    "use server";
                    await toggleCrewActive(m.id, !m.active);
                  }}
                >
                  <SubmitButton className="text-xs text-slate-600 hover:underline">
                    {m.active ? "Disattiva" : "Attiva"}
                  </SubmitButton>
                </form>
              ),
            },
          ]}
        />
      </AdminCard>

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
        <SubmitButton className="md:col-span-5 bg-slate-900 text-white rounded py-2 text-sm font-medium hover:bg-slate-800">
          Aggiungi membro
        </SubmitButton>
      </form>
    </div>
  );
}
