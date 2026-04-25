import Link from "next/link";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientiPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim();

  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienti"
        actions={
          <Link
            href="/api/admin/customers/export"
            className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            Esporta CSV
          </Link>
        }
      />

      <form className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Cerca per nome, cognome o email…"
          className="flex-1 max-w-md border rounded px-3 py-2 text-sm"
        />
        <SubmitButton className="bg-slate-900 text-white rounded px-4 py-2 text-sm">
          Cerca
        </SubmitButton>
        {q && (
          <Link href="/admin/clienti" className="text-sm text-slate-500 self-center">
            reset
          </Link>
        )}
      </form>

      <p className="text-xs text-slate-500">
        {customers.length} risultati {q ? `per "${q}"` : "(ultimi 200)"}.
      </p>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Telefono</th>
              <th className="text-left p-3">Nazionalità</th>
              <th className="text-center p-3">Prenotazioni</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="p-3">
                  <Link
                    href={`/admin/clienti/${c.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="p-3">{c.email}</td>
                <td className="p-3">{c.phone ?? "-"}</td>
                <td className="p-3">{c.nationality ?? "-"}</td>
                <td className="p-3 text-center tabular-nums">{c._count.bookings}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <EmptyState message="Nessun cliente trovato." colSpan={5} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
