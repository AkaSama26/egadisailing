import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { service: { select: { name: true } } },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.bookings
    .filter((b) => b.status !== "CANCELLED" && b.status !== "REFUNDED")
    .reduce((acc, b) => acc.plus(b.totalPrice.toString()), new Decimal(0));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/clienti" className="text-sm text-slate-500 hover:underline">
          ← Clienti
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">
          {customer.firstName} {customer.lastName}
        </h1>
      </div>

      <section className="bg-white rounded-xl border p-5 space-y-2">
        <Row label="Email" value={customer.email} />
        <Row label="Telefono" value={customer.phone ?? "-"} />
        <Row label="Nazionalità" value={customer.nationality ?? "-"} />
        <Row label="Lingua preferita" value={customer.language ?? "-"} />
        <Row label="Prenotazioni totali" value={String(customer.bookings.length)} />
        <Row label="Speso totale (netto refund)" value={formatEur(totalSpent)} />
        <Row
          label="Cliente dal"
          value={customer.createdAt.toLocaleDateString("it-IT")}
        />
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">Storico prenotazioni</h2>
        {customer.bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna prenotazione.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {customer.bookings.map((b) => (
              <li
                key={b.id}
                className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/prenotazioni/${b.id}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {b.confirmationCode}
                  </Link>
                  {" · "}
                  <span>{b.service.name}</span>
                  {" · "}
                  <span className="text-slate-500">
                    {b.startDate.toLocaleDateString("it-IT")}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-3 tabular-nums">
                  <span className="font-mono">{formatEur(b.totalPrice.toString())}</span>
                  <span
                    className={`text-xs font-semibold ${
                      b.status === "CONFIRMED"
                        ? "text-emerald-700"
                        : b.status === "CANCELLED"
                          ? "text-red-700"
                          : b.status === "REFUNDED"
                            ? "text-amber-700"
                            : "text-slate-700"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-slate-700">
      <span className="text-slate-500">{label}:</span> <strong>{value}</strong>
    </p>
  );
}
