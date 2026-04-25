import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { SubmitButton } from "@/components/admin/submit-button";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { anonymizeCustomerAction } from "./actions";
import { formatItDay } from "@/lib/dates";

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

  // Customer e' gia' stato anonymized? Non mostriamo piu' il bottone.
  const isAnonymized =
    customer.email.startsWith("anon-") && customer.email.endsWith("@deleted.local");
  // Customer ha booking futuri attivi? Il button e' disabled (helper throws).
  const hasActiveFutureBookings = customer.bookings.some(
    (b) =>
      (b.status === "PENDING" || b.status === "CONFIRMED") &&
      b.startDate >= new Date(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        backHref="/admin/clienti"
        backLabel="Clienti"
      />

      <AdminCard className="space-y-2">
        <DetailRow label="Email" value={customer.email} />
        <DetailRow label="Telefono" value={customer.phone ?? "-"} />
        <DetailRow label="Nazionalità" value={customer.nationality ?? "-"} />
        <DetailRow label="Lingua preferita" value={customer.language ?? "-"} />
        <DetailRow label="Prenotazioni totali" value={String(customer.bookings.length)} />
        <DetailRow label="Speso totale (netto refund)" value={formatEur(totalSpent)} />
        <DetailRow
          label="Cliente dal"
          value={formatItDay(customer.createdAt)}
        />
      </AdminCard>

      {/* GDPR art. 17 section — solo se customer non gia' anonymized */}
      {!isAnonymized && (
        <AdminCard tone="alert">
          <h2 className="font-bold text-red-900 mb-2">Dati personali — GDPR</h2>
          <p className="text-sm text-slate-600 mb-3">
            Richiesta di cancellazione (art. 17 GDPR). Mantiene il record per
            audit fiscale 10 anni (art. 2220 c.c.) ma rimuove email, nome,
            cognome, telefono, nazionalità, lingua e dati dei consensi.
            <strong> L'operazione e' irreversibile.</strong>
          </p>
          {hasActiveFutureBookings ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Questo cliente ha prenotazioni future in attesa o confermate.
              Cancella o rimborsa prima le prenotazioni attive, poi potrai
              anonimizzare.
            </p>
          ) : (
            <form action={anonymizeCustomerAction.bind(null, customer.id)}>
              <SubmitButton
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
                confirmMessage={`ATTENZIONE: anonimizzazione irreversibile di ${customer.firstName} ${customer.lastName}. Confermi?`}
              >
                Anonimizza (GDPR art. 17)
              </SubmitButton>
            </form>
          )}
        </AdminCard>
      )}

      {isAnonymized && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          Cliente anonimizzato (GDPR art. 17). Dati PII mascherati, record
          preservato per retention fiscale.
        </div>
      )}

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Storico prenotazioni</h2>
        {customer.bookings.length === 0 ? (
          <EmptyState message="Nessuna prenotazione." />
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
                    {formatItDay(b.startDate)}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-3 tabular-nums">
                  <span className="font-mono">{formatEur(b.totalPrice.toString())}</span>
                  <StatusBadge status={b.status} kind="booking" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
