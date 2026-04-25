import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { SubmitButton } from "@/components/admin/submit-button";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { EmptyState } from "@/components/admin/empty-state";
import { formatItDay } from "@/lib/dates";
import { BOAT_EXCLUSIVE_SERVICE_TYPES } from "@/lib/booking/cross-channel-conflicts";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TYPE_LABEL,
  PAYMENT_SCHEDULE_LABEL,
  SERVICE_TYPE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";
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

  // R29-#3: query booking CONFLITTUALI stessa barca+range+status attivo,
  // source diversa. Se trovati → banner rosso double-booking con link
  // cliccabili al sibling. Senza, admin doveva aprire /admin/sync-log,
  // leggere notes testuali, copiare code e cercare a mano.
  const conflicts = await db.booking.findMany({
    where: {
      id: { not: booking.id },
      boatId: booking.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      source: { not: booking.source },
      startDate: { lte: booking.endDate },
      endDate: { gte: booking.startDate },
      service: { is: { type: { in: [...BOAT_EXCLUSIVE_SERVICE_TYPES] } } },
    },
    select: {
      id: true,
      confirmationCode: true,
      source: true,
      status: true,
      startDate: true,
      endDate: true,
      service: { select: { name: true } },
    },
    take: 5,
  });

  const cancelAction = cancelBooking.bind(null, booking.id);
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "REFUNDED";
  const isNonDirect = booking.source !== "DIRECT";
  const hasConflicts = conflicts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Prenotazione <span className="font-mono">{booking.confirmationCode}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Canale: <strong>{labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}</strong> · Stato:{" "}
            <strong className={statusClass(booking.status)}>
              {labelOrRaw(BOOKING_STATUS_LABEL, booking.status)}
            </strong>
          </p>
        </div>
        {canCancel && (
          <form action={cancelAction}>
            <SubmitButton
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
              confirmMessage={`Confermi la cancellazione di ${booking.confirmationCode}?\n\nVerranno rimborsati tutti i pagamenti completati su Stripe e rilasciate le date sul calendario. Operazione irreversibile.`}
              pendingLabel="Annullamento in corso..."
            >
              Cancella + refund
            </SubmitButton>
          </form>
        )}
      </div>

      {hasConflicts && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-sm text-red-900 space-y-2">
          <div className="flex items-start gap-2">
            <span className="font-bold text-base">⚠ DOUBLE-BOOKING RILEVATO</span>
          </div>
          <p>
            Questo booking e' in conflitto con{" "}
            <strong>{conflicts.length}</strong>{" "}
            {conflicts.length === 1 ? "altra prenotazione" : "altre prenotazioni"}{" "}
            sulla stessa barca, stesse date, da canali diversi. Serve azione admin
            per decidere quale mantenere + rimborsare/notificare l'altro cliente.
          </p>
          <ul className="space-y-1 mt-2">
            {conflicts.map((c) => (
              <li key={c.id} className="flex items-center gap-2 flex-wrap">
                <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-100 font-mono">
                  {labelOrRaw(BOOKING_SOURCE_LABEL, c.source)}
                </span>
                <a
                  href={`/admin/prenotazioni/${c.id}`}
                  className="font-mono font-semibold underline hover:no-underline"
                >
                  {c.confirmationCode}
                </a>
                <span className="text-xs text-red-700">
                  · {c.service.name} · {formatItDay(c.startDate)}
                  {c.startDate.getTime() !== c.endDate.getTime() &&
                    ` → ${formatItDay(c.endDate)}`}{" "}
                  · {labelOrRaw(BOOKING_STATUS_LABEL, c.status)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-700 mt-2">
            Se cancelli questo booking da qui, il cliente ricevera' un'email di
            scuse con informazioni rimborso e contatti diretti (template
            overbooking apology).
          </p>
        </div>
      )}

      {isNonDirect && canCancel && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Attenzione</strong> — questo booking proviene da{" "}
          <strong>{labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}</strong>. La cancellazione qui rilascia l'availability
          interna e crea un ManualAlert per ricordarti di cancellare anche sul pannello
          OTA esterno (Bokun UI, Boataround, ecc). L'API release NON cancella il booking
          upstream.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminCard className="space-y-2">
          <h2 className="font-bold text-slate-900">Dettagli</h2>
          <DetailRow label="Servizio" value={booking.service.name} />
          <DetailRow label="Tipo" value={labelOrRaw(SERVICE_TYPE_LABEL, booking.service.type)} />
          <DetailRow label="Barca" value={booking.boat.name} />
          <DetailRow
            label="Date"
            value={`${formatItDay(booking.startDate)} → ${formatItDay(booking.endDate)}`}
          />
          <DetailRow label="Persone" value={String(booking.numPeople)} />
          <DetailRow label="Totale" value={formatEur(booking.totalPrice.toString())} />
          {booking.directBooking && (
            <>
              <DetailRow
                label="Tipo pagamento"
                value={labelOrRaw(PAYMENT_SCHEDULE_LABEL, booking.directBooking.paymentSchedule)}
              />
              {booking.directBooking.balanceAmount && (
                <DetailRow
                  label="Saldo"
                  value={`${formatEur(booking.directBooking.balanceAmount.toString())} · ${
                    booking.directBooking.balancePaidAt ? "pagato" : "in attesa"
                  }`}
                />
              )}
            </>
          )}
          {booking.bokunBooking && (
            <DetailRow
              label="Bokun"
              value={`${booking.bokunBooking.channelName} · ${booking.bokunBooking.bokunBookingId}`}
            />
          )}
          {booking.charterBooking && (
            <DetailRow
              label="Charter platform"
              value={`${booking.charterBooking.platformName} · ${booking.charterBooking.platformBookingRef}`}
            />
          )}
        </AdminCard>

        <AdminCard className="space-y-2">
          <h2 className="font-bold text-slate-900">Cliente</h2>
          <DetailRow
            label="Nome"
            value={`${booking.customer.firstName} ${booking.customer.lastName}`.trim()}
          />
          <DetailRow label="Email" value={booking.customer.email} />
          <DetailRow label="Telefono" value={booking.customer.phone ?? "-"} />
          <DetailRow label="Nazionalità" value={booking.customer.nationality ?? "-"} />
          <DetailRow label="Lingua" value={booking.customer.language ?? "-"} />
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Pagamenti</h2>
        {booking.payments.length === 0 ? (
          <EmptyState message="Nessun pagamento registrato." />
        ) : (
          <ul className="space-y-2 text-sm">
            {booking.payments.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-0"
              >
                <span>
                  <span className="font-medium">{labelOrRaw(PAYMENT_TYPE_LABEL, p.type)}</span>
                  {" · "}
                  {labelOrRaw(PAYMENT_METHOD_LABEL, p.method)} ·{" "}
                  <span className={p.status === "SUCCEEDED" ? "text-emerald-700" : "text-slate-500"}>
                    {labelOrRaw(PAYMENT_STATUS_LABEL, p.status)}
                  </span>
                  {p.processedAt && (
                    <span className="text-xs text-slate-400 ml-2">
                      {formatItDay(p.processedAt)}
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              placeholder="0,00"
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
      </AdminCard>

      <AdminCard>
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
          <EmptyState message="Nessuna nota ancora." />
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
      </AdminCard>
    </div>
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
