import type { Metadata } from "next";
import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { normalizeConfirmationCode } from "@/lib/booking/helpers";
import { buildTicketUrl, ticketSlotLabel } from "@/lib/booking/ticket";
import { createQrSvg } from "@/lib/qr-code";
import { formatEur, formatEurCents } from "@/lib/pricing/cents";
import { formatItDateTime, formatItDay } from "@/lib/dates";
import { PrintTicketButton } from "./print-button";

export const metadata: Metadata = {
  title: "Biglietto Egadisailing",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  CANCELLED: "Cancellato",
  REFUNDED: "Rimborsato",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const booking = await db.booking.findUnique({
    where: { confirmationCode: normalizeConfirmationCode(code) },
    include: {
      boat: true,
      customer: true,
      service: true,
      payments: true,
    },
  });
  if (!booking) notFound();

  const ticketUrl = buildTicketUrl(booking.confirmationCode, locale);
  const qrSvg = createQrSvg(ticketUrl, { scale: 5, border: 4 });
  const paid = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((acc, p) => acc.plus(p.amount.toString()), new Decimal(0));
  const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status;
  const isValid = booking.status === "CONFIRMED";
  const paidCents = paid.mul(100).toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);
  const guestBreakdown = [
    booking.adultCount ? `${booking.adultCount} adulti` : null,
    booking.childCount ? `${booking.childCount} bambini 5-9` : null,
    booking.freeChildSeatCount ? `${booking.freeChildSeatCount} bimbi 3-4` : null,
    booking.infantCount ? `${booking.infantCount} neonati 0-2` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const bookingRows: Array<[string, string]> = [
    ["Codice", booking.confirmationCode],
    ["Canale", booking.source],
    ["Data prenotazione", formatItDateTime(booking.createdAt)],
    ["Totale", formatEur(booking.totalPrice)],
    ["Pagato", formatEur(paid)],
  ];
  if (balanceCents > 0) {
    bookingRows.push([
      "Saldo in loco",
      `${formatEurCents(balanceCents)} · da pagare prima della partenza, contanti preferiti`,
    ]);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            href={`/${locale}/b/sessione`}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Area prenotazioni
          </Link>
          <PrintTicketButton />
        </div>

        <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white print:bg-white print:text-slate-950">
            <p className="text-xs font-semibold uppercase text-amber-300 print:text-slate-500">
              Egadisailing
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Biglietto</h1>
                <p className="text-sm text-white/75 print:text-slate-600">
                  Codice prenotazione {booking.confirmationCode}
                </p>
              </div>
              <div
                className={`w-fit rounded px-3 py-1 text-sm font-semibold ${
                  isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <div
                className="mx-auto w-fit rounded border border-slate-200 bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-center text-xs text-slate-500">
                Presenta questo QR al check-in.
              </p>
              {!isValid && (
                <p className="rounded bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Questo biglietto non risulta confermato.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <TicketBlock
                title="Esperienza"
                rows={[
                  ["Esperienza", booking.service.name],
                  ["Mezzo", booking.boat.name],
                  ["Data esperienza", formatItDay(booking.startDate)],
                  ["Orario", ticketSlotLabel(booking.service.durationType)],
                  ["Ospiti", guestBreakdown || String(booking.numPeople)],
                  ["Posti occupati", String(booking.numPeople)],
                ]}
              />
              <TicketBlock title="Prenotazione" rows={bookingRows} />
              <TicketBlock
                title="Intestatario"
                rows={[
                  ["Nome", customerName],
                  ["Email", booking.customer.email],
                  ["Telefono", booking.customer.phone || "Non indicato"],
                ]}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function TicketBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase text-slate-500">
        {title}
      </h2>
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
