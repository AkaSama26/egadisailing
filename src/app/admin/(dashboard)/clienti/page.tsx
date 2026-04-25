import Link from "next/link";
import { db } from "@/lib/db";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  nationality: string | null;
  _count: { bookings: number };
}

const customerColumns: AdminTableColumn<CustomerRow>[] = [
  {
    label: "Nome",
    render: (c) => (
      <Link
        href={`/admin/clienti/${c.id}`}
        className="text-blue-600 hover:underline"
      >
        {c.firstName} {c.lastName}
      </Link>
    ),
  },
  { label: "Email", render: (c) => c.email },
  { label: "Telefono", render: (c) => c.phone ?? "-" },
  { label: "Nazionalità", render: (c) => c.nationality ?? "-" },
  {
    label: "Prenotazioni",
    align: "center",
    className: "tabular-nums",
    render: (c) => c._count.bookings,
  },
];

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
        <AdminTable<CustomerRow>
          caption="Elenco clienti"
          columns={customerColumns}
          rows={customers}
          emptyMessage="Nessun cliente trovato."
          rowKey={(c) => c.id}
        />
      </div>
    </div>
  );
}
