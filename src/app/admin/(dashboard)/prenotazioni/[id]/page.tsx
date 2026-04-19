import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { SubmitButton } from "@/components/admin/submit-button";
import {
  cancelBooking,
  addBookingNote,
  registerManualPayment,
} from "../actions";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      service: { select: { name: true, type: true } },
      boat: { select: { name: true, id: true } },
      payments: { orderBy: { createdAt: "asc" } },
      bookingNotes: { orderBy: { createdAt: "desc" } },
      directBooking: true,
      bokunBooking: { select: { bokunBookingId: true, channelName: true } },
      charterBooking: { select: { platformName: true, platformBookingRef: true } },
    },
  });
  if (!booking) notFound();

  const cancelAction = cancelBooking.bind(null, booking.id);
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "REFUNDED";
  const isNonDirect = booking.source !== "DIRECT";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Prenotazione <span className="font-mono">{booking.confirmationCode}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Source: <strong>{booking.source}</strong> · Status:{" "}
            <strong className={statusClass(booking.status)}>{booking.status}</strong>
          </p>
        </div>
        {canCancel && (
          <form action={cancelAction}>
            <SubmitButton
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              confirmMessage={`Confermi la cancellazione di ${booking.confirmationCode}?\n\nVerranno rimborsati tutti i pagamenti SUCCEEDED su Stripe e rilasciate le date sul calendario. Operazione irreversibile.`}
              pendingLabel="Annullamento in corso..."
            >
              Cancella + refund
            </SubmitButton>
          </form>
        )}
      </div>

      {isNonDirect && canCancel && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Attenzione</strong> — questo booking proviene da{" "}
          <strong>{booking.source}</strong>. La cancellazione qui rilascia l'availability
          interna e crea un ManualAlert per ricordarti di cancellare anche sul pannello
          OTA esterno (Bokun UI, Boataround, ecc). L'API release NON cancella il booking
          upstream.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border p-5 space-y-2">
          <h2 className="font-bold text-slate-900">Dettagli</h2>
          <Row label="Servizio" value={booking.service.name} />
          <Row label="Tipo" value={booking.service.type} />
          <Row label="Barca" value={booking.boat.name} />
          <Row
            label="Date"
            value={`${booking.startDate.toLocaleDateString("it-IT")} → ${booking.endDate.toLocaleDateString("it-IT")}`}
          />
          <Row label="Persone" value={String(booking.numPeople)} />
          <Row label="Totale" value={formatEur(booking.totalPrice.toString())} />
          {booking.directBooking && (
            <>
              <Row label="Payment schedule" value={booking.directBooking.paymentSchedule} />
              {booking.directBooking.balanceAmount && (
                <Row
                  label="Saldo"
                  value={`${formatEur(booking.directBooking.balanceAmount.toString())} · ${
                    booking.directBooking.balancePaidAt ? "pagato" : "pendente"
                  }`}
                />
              )}
            </>
          )}
          {booking.bokunBooking && (
            <Row
              label="Bokun"
              value={`${booking.bokunBooking.channelName} · ${booking.bokunBooking.bokunBookingId}`}
            />
          )}
          {booking.charterBooking && (
            <Row
              label="Charter platform"
              value={`${booking.charterBooking.platformName} · ${booking.charterBooking.platformBookingRef}`}
            />
          )}
        </section>

        <section className="bg-white rounded-xl border p-5 space-y-2">
          <h2 className="font-bold text-slate-900">Cliente</h2>
          <Row
            label="Nome"
            value={`${booking.customer.firstName} ${booking.customer.lastName}`.trim()}
          />
          <Row label="Email" value={booking.customer.email} />
          <Row label="Telefono" value={booking.customer.phone ?? "-"} />
          <Row label="Nazionalità" value={booking.customer.nationality ?? "-"} />
          <Row label="Lingua" value={booking.customer.language ?? "-"} />
        </section>
      </div>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">Pagamenti</h2>
        {booking.payments.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun pagamento registrato.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {booking.payments.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0"
              >
                <span>
                  <span className="font-medium">{p.type}</span> · {p.method} ·{" "}
                  <span className={p.status === "SUCCEEDED" ? "text-emerald-700" : "text-slate-500"}>
                    {p.status}
                  </span>
                  {p.processedAt && (
                    <span className="text-xs text-slate-400 ml-2">
                      {p.processedAt.toLocaleDateString("it-IT")}
                    </span>
                  )}
                </span>
                <span className="tabular-nums font-mono">{formatEur(p.amount.toString())}</span>
              </li>
            ))}
          </ul>
        )}

        <form
          action={async (fd) => {
            "use server";
            // R15-UX-22: browser IT accetta virgola come separatore decimale,
            // ma parseFloat("10,50")=10 (centesimi silently persi). Normalizza
            // prima di parse.
            const rawAmount = String(fd.get("amount") ?? "").replace(",", ".");
            await registerManualPayment({
              bookingId: booking.id,
              amountEur: parseFloat(rawAmount),
              method: fd.get("method") as "CASH" | "BANK_TRANSFER",
              type: fd.get("type") as "DEPOSIT" | "BALANCE" | "FULL",
              note: fd.get("note") ? String(fd.get("note")) : undefined,
            });
          }}
          className="mt-4 flex gap-2 flex-wrap items-end"
        >
          <label className="text-xs">
            Importo €
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
              className="block border px-3 py-2 rounded text-sm w-28"
            />
          </label>
          <label className="text-xs">
            Tipo
            <select name="type" className="block border px-3 py-2 rounded text-sm">
              <option value="DEPOSIT">Acconto</option>
              <option value="BALANCE">Saldo</option>
              <option value="FULL">Pagamento intero</option>
            </select>
          </label>
          <label className="text-xs">
            Metodo
            <select name="method" className="block border px-3 py-2 rounded text-sm">
              <option value="CASH">Contanti</option>
              <option value="BANK_TRANSFER">Bonifico</option>
            </select>
          </label>
          <SubmitButton
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
            pendingLabel="Registrazione..."
          >
            Registra pagamento
          </SubmitButton>
        </form>
      </section>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">Note interne</h2>
        <form
          action={async (fd) => {
            "use server";
            await addBookingNote(booking.id, String(fd.get("note") ?? ""));
          }}
          className="space-y-2 mb-4"
        >
          <textarea
            name="note"
            rows={3}
            maxLength={2000}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Aggiungi nota..."
          />
          <SubmitButton
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800"
            pendingLabel="Salvataggio..."
          >
            Salva nota
          </SubmitButton>
        </form>
        {booking.bookingNotes.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna nota ancora.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {booking.bookingNotes.map((n) => (
              <li key={n.id} className="border-l-2 border-slate-200 pl-3 py-1">
                <div className="text-slate-500 text-xs">
                  {n.createdAt.toLocaleString("it-IT")}
                </div>
                <div className="whitespace-pre-wrap">{n.note}</div>
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

function statusClass(status: string): string {
  return status === "CONFIRMED"
    ? "text-emerald-700"
    : status === "CANCELLED"
      ? "text-red-700"
      : status === "REFUNDED"
        ? "text-amber-700"
        : "text-slate-700";
}
