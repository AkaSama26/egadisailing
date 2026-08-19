import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Plus,
  ReceiptText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { formatEur, formatEurCents } from "@/lib/pricing/cents";
import { SubmitButton } from "@/components/admin/submit-button";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  formatItDateTime,
  formatItDay,
  isoDay,
  parseDateLikelyLocalDay,
} from "@/lib/dates";
import { TimeIso } from "@/components/ui/time-iso";
import { BOAT_EXCLUSIVE_SERVICE_TYPES } from "@/lib/booking/cross-channel-conflicts";
import { buildBookingPaymentAccount } from "@/lib/booking/payment-account";
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
  cancelBookingFromForm,
  addBookingNote,
  registerManualPayment,
} from "../actions";
import { createReceiptFromPaymentsFromForm } from "../../ricevute/actions";

const EXTERNAL_PAID_STATUSES = new Set(["PAID", "PAID_IN_FULL", "COMPLETED", "CAPTURED"]);

function jsonStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

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
      payments: {
        orderBy: { createdAt: "asc" },
        include: {
          receiptLink: {
            include: { receipt: { select: { id: true, number: true, status: true } } },
          },
        },
      },
      bookingNotes: { orderBy: { createdAt: "desc" } },
      directBooking: true,
      billingDetails: true,
      bokunBooking: {
        select: {
          bokunBookingId: true,
          channelName: true,
          rawPayload: true,
          commissionAmount: true,
          netAmount: true,
        },
      },
      charterBooking: { select: { platformName: true, platformBookingRef: true } },
      checkedInBy: { select: { name: true, email: true } },
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

  const cancelAction = cancelBookingFromForm.bind(null, booking.id);
  const canCancel = booking.status !== "CANCELLED" && booking.status !== "REFUNDED";
  const isNonDirect = booking.source !== "DIRECT";
  const hasConflicts = conflicts.length > 0;
  const receiptablePayments = booking.payments.filter(
    (payment) =>
      payment.status === "SUCCEEDED" &&
      payment.type !== "REFUND" &&
      !payment.receiptLink,
  );
  const bookingSourceLabel = booking.bokunBooking?.channelName
    ? `${booking.bokunBooking.channelName} via Bokun`
    : booking.charterBooking?.platformName
      ? `${booking.charterBooking.platformName} via ${labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}`
      : labelOrRaw(BOOKING_SOURCE_LABEL, booking.source);
  const externalPaymentStatus = jsonStringField(booking.bokunBooking?.rawPayload, "paymentStatus");
  const externalPaidAmount =
    externalPaymentStatus && EXTERNAL_PAID_STATUSES.has(externalPaymentStatus)
      ? formatEur(booking.bokunBooking?.netAmount?.toString() ?? booking.totalPrice.toString())
      : undefined;
  const externalCommissionAmount = booking.bokunBooking?.commissionAmount
    ? formatEur(booking.bokunBooking.commissionAmount.toString())
    : undefined;
  const externallyPaidInFull = Boolean(
    externalPaymentStatus && EXTERNAL_PAID_STATUSES.has(externalPaymentStatus),
  );
  const accountClosed = booking.status === "CANCELLED" || booking.status === "REFUNDED";
  const paymentAccount = buildBookingPaymentAccount({
    totalPrice: booking.totalPrice.toString(),
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      type: payment.type,
      status: payment.status,
    })),
    externallyPaidInFull,
    accountClosed,
  });
  const accountLines = new Map(
    paymentAccount.lines.map((line) => [line.paymentId, line]),
  );
  const lastLocalBalanceCents = paymentAccount.lines.at(-1)?.runningBalanceCents
    ?? paymentAccount.totalCents;
  const externalBalanceCents = Math.max(
    lastLocalBalanceCents - paymentAccount.externalCreditCents,
    0,
  );
  const paymentState = accountClosed
    ? labelOrRaw(BOOKING_STATUS_LABEL, booking.status)
    : paymentAccount.outstandingCents === 0
      ? "Pagata"
      : paymentAccount.collectedCents > 0
        ? "Parzialmente pagata"
        : "Da pagare";
  const canRegisterPayment = !accountClosed && paymentAccount.outstandingCents > 0;
  const defaultPaymentType = booking.source !== "DIRECT"
    ? "DEPOSIT"
    : paymentAccount.collectedCents > 0
      ? "BALANCE"
      : "FULL";
  const todayInput = isoDay(parseDateLikelyLocalDay(new Date()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 id="main" className="text-3xl font-bold text-slate-900">
            Prenotazione <span className="font-mono">{booking.confirmationCode}</span>
          </h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              Canale: <strong>{bookingSourceLabel}</strong>
            </span>
            <span>·</span>
            <StatusBadge status={booking.status} kind="booking" />
          </div>
        </div>
        {canCancel && (
          <form action={cancelAction} className="flex flex-col gap-2 sm:w-72">
            <label className="text-xs font-medium text-slate-600" htmlFor="cancel-confirmation-code">
              Digita {booking.confirmationCode} per cancellare e rimborsare
            </label>
            <input
              id="cancel-confirmation-code"
              name="confirmationCode"
              type="text"
              autoComplete="off"
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-mono"
            />
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              Dopo la cancellazione la data torna disponibile. Controlla i portali
              non collegati via API e riapri manualmente la data dove necessario.
            </p>
            <SubmitButton
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              confirmMessage={`Confermi la cancellazione di ${booking.confirmationCode}?\n\nVerranno rimborsati tutti i pagamenti completati su Stripe e rilasciate le date sul calendario. Dopo dovrai controllare i portali non collegati via API e riaprire manualmente la data dove necessario. Operazione irreversibile.`}
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
            Questo booking è in conflitto con{" "}
            <strong>{conflicts.length}</strong>{" "}
            {conflicts.length === 1 ? "altra prenotazione" : "altre prenotazioni"}{" "}
            sulla stessa barca, stesse date, da canali diversi. Serve azione admin
            per decidere quale mantenere + rimborsare/notificare l’altro cliente.
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
            Se cancelli questo booking da qui, il cliente riceverà un’email di
            scuse con informazioni rimborso e contatti diretti (template
            overbooking apology).
          </p>
        </div>
      )}

      {isNonDirect && canCancel && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <strong>Attenzione</strong> — questo booking proviene da{" "}
          <strong>{bookingSourceLabel}</strong>. La cancellazione qui rilascia l’availability
          interna e crea un promemoria operativo per ricordarti di cancellare anche sul
          pannello esterno (Bokun, Boataround, ecc). Il sito non cancella automaticamente
          la prenotazione sul portale esterno.
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
          <DetailRow
            label="Check-in"
            value={
              booking.checkedInAt
                ? `${formatItDateTime(booking.checkedInAt)} · ${booking.checkedInBy?.name ?? "staff"}`
                : "Non registrato"
            }
          />
          <DetailRow label="Totale" value={formatEur(booking.totalPrice.toString())} />
          {booking.directBooking && (
            <>
              <DetailRow
                label="Tipo pagamento"
                value={labelOrRaw(PAYMENT_SCHEDULE_LABEL, booking.directBooking.paymentSchedule)}
              />
              {booking.directBooking.balanceAmount && (
                <DetailRow
                  label="Saldo in loco"
                  value={`${formatEur(booking.directBooking.balanceAmount.toString())} · ${
                    booking.directBooking.balancePaidAt ? "pagato" : "in attesa"
                  }`}
                />
              )}
            </>
          )}
          {booking.bokunBooking && (
            <>
              <DetailRow
                label="Bokun"
                value={`${booking.bokunBooking.channelName} via Bokun · #${booking.bokunBooking.bokunBookingId}`}
              />
              <DetailRow
                label="Pagamento esterno"
                value={
                  externalPaymentStatus
                    ? `${externalPaymentStatus} · retail ${formatEur(booking.totalPrice.toString())}`
                    : "Gestito su Bokun"
                }
              />
              {externalCommissionAmount && (
                <DetailRow label="Commissione canale" value={externalCommissionAmount} />
              )}
              {externalPaidAmount && (
                <DetailRow label="Netto previsto" value={externalPaidAmount} />
              )}
            </>
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

      <AdminCard padding="sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900">Dati di fatturazione</h2>
              {booking.billingDetails && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Completi
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Snapshot associato a questa prenotazione</p>
          </div>
        </div>
        {booking.billingDetails ? (
          <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-5">
            <BillingDetail
              label="Intestatario"
              value={`${booking.billingDetails.firstName} ${booking.billingDetails.lastName}`.trim()}
            />
            <BillingDetail
              label="Codice fiscale / Tax ID"
              value={booking.billingDetails.taxId ?? "-"}
              mono
            />
            <BillingDetail
              label="Indirizzo"
              value={[booking.billingDetails.addressLine1, booking.billingDetails.addressLine2]
                .filter(Boolean)
                .join(", ")}
            />
            <BillingDetail
              label="Località"
              value={`${booking.billingDetails.postalCode} ${booking.billingDetails.city}${
                booking.billingDetails.province ? ` (${booking.billingDetails.province})` : ""
              }`}
            />
            <BillingDetail
              label="Paese · Nazionalità"
              value={`${booking.billingDetails.countryCode} · ${booking.billingDetails.nationality}`}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Dati di fatturazione non disponibili per questa prenotazione.
          </p>
        )}
      </AdminCard>

      <div className="grid gap-3 md:grid-cols-3">
        <PaymentSummaryCard
          icon={ReceiptText}
          label="Totale prenotazione"
          value={formatEurCents(paymentAccount.totalCents)}
          detail="Importo concordato"
        />
        <PaymentSummaryCard
          icon={Banknote}
          label="Incassato"
          value={formatEurCents(paymentAccount.collectedCents)}
          detail={paymentState}
          tone="success"
        />
        <PaymentSummaryCard
          icon={CreditCard}
          label="Da pagare"
          value={formatEurCents(paymentAccount.outstandingCents)}
          detail={accountClosed ? "Conto chiuso" : "Saldo residuo"}
          tone={paymentAccount.outstandingCents > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <AdminCard padding="none" className="overflow-hidden">
          <form action={createReceiptFromPaymentsFromForm}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Conto cliente</h2>
                <p className="text-xs text-slate-500">
                  Dovuto, incassato e saldo progressivo della prenotazione
                </p>
              </div>
              <Link
                href={`/admin/ricevute/nuova?booking=${encodeURIComponent(booking.confirmationCode)}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FileText className="size-3.5" aria-hidden="true" />
                Nuova ricevuta
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Data</th>
                    <th className="px-4 py-2.5">Descrizione</th>
                    <th className="px-4 py-2.5">Riferimento</th>
                    <th className="px-4 py-2.5 text-right">Dovuto</th>
                    <th className="px-4 py-2.5 text-right">Incassato</th>
                    <th className="px-4 py-2.5 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  <tr>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                      {formatItDay(booking.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">Totale prenotazione</p>
                      <p className="text-[10px] text-slate-500">
                        {booking.service.name} · {booking.boat.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {booking.confirmationCode}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">
                      {formatEurCents(paymentAccount.totalCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">—</td>
                    <td className="px-4 py-3 text-right font-black tabular-nums text-amber-700">
                      {formatEurCents(paymentAccount.totalCents)}
                    </td>
                  </tr>

                  {booking.payments.map((payment) => {
                    const line = accountLines.get(payment.id);
                    if (!line) return null;
                    const canReceipt =
                      payment.status === "SUCCEEDED" &&
                      payment.type !== "REFUND" &&
                      !payment.receiptLink;
                    const movementTone = line.movement === "REFUND"
                      ? "text-red-700"
                      : line.movement === "PAYMENT"
                        ? "text-emerald-700"
                        : "text-slate-400";

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                          {formatItDay(payment.processedAt ?? payment.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {labelOrRaw(PAYMENT_TYPE_LABEL, payment.type)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {labelOrRaw(PAYMENT_METHOD_LABEL, payment.method)}
                            {payment.note ? ` · ${payment.note}` : ""}
                          </p>
                          <span
                            className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${
                              payment.status === "SUCCEEDED"
                                ? "text-emerald-700"
                                : payment.status === "FAILED"
                                  ? "text-red-700"
                                  : "text-slate-500"
                            }`}
                          >
                            {payment.status === "SUCCEEDED" && (
                              <Check className="size-3" aria-hidden="true" />
                            )}
                            {labelOrRaw(PAYMENT_STATUS_LABEL, payment.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {payment.receiptLink ? (
                            <Link
                              href={`/admin/ricevute/${payment.receiptLink.receipt.id}`}
                              className="font-mono text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                            >
                              {payment.receiptLink.receipt.number}
                              {payment.receiptLink.receipt.status === "CANCELLED"
                                ? " (annullata)"
                                : ""}
                            </Link>
                          ) : canReceipt ? (
                            <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-blue-700">
                              <input
                                type="checkbox"
                                name="paymentId"
                                value={payment.id}
                                className="rounded border-slate-300"
                              />
                              Da emettere
                            </label>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">—</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${movementTone}`}>
                          {line.movement === "IGNORED"
                            ? "—"
                            : `${line.movement === "REFUND" ? "− " : "+ "}${formatEurCents(line.amountCents)}`}
                        </td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-slate-950">
                          {formatEurCents(line.runningBalanceCents)}
                        </td>
                      </tr>
                    );
                  })}

                  {paymentAccount.externalCreditCents > 0 && (
                    <tr className="bg-blue-50/40">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {formatItDay(booking.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">Pagamento gestito dal canale</p>
                        <p className="text-[10px] text-slate-500">
                          {bookingSourceLabel} · {externalPaymentStatus}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-blue-700">
                        {booking.bokunBooking?.bokunBookingId ?? "Esterno"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">—</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">
                        + {formatEurCents(paymentAccount.externalCreditCents)}
                      </td>
                      <td className="px-4 py-3 text-right font-black tabular-nums text-slate-950">
                        {formatEurCents(externalBalanceCents)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {receiptablePayments.length > 0 && (
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="max-w-md text-[11px] text-slate-500">
                  Seleziona uno o più pagamenti “Da emettere” per creare una ricevuta.
                </p>
                <div className="flex items-end gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Lingua
                    <select
                      name="language"
                      defaultValue="IT"
                      className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <option value="IT">Italiano</option>
                      <option value="EN">English</option>
                    </select>
                  </label>
                  <SubmitButton
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    pendingLabel="Creazione..."
                  >
                    Crea ricevuta
                  </SubmitButton>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-950 px-4 py-3 text-white">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {accountClosed ? "Conto chiuso" : "Saldo cliente"}
                </p>
                <p className="text-xs text-slate-300">
                  {accountClosed ? paymentState : "Importo ancora da incassare"}
                </p>
              </div>
              <p className="text-2xl font-black tabular-nums">
                {formatEurCents(paymentAccount.outstandingCents)}
              </p>
            </div>
          </form>
        </AdminCard>

        <AdminCard padding="none" className="h-fit overflow-hidden border-slate-300 shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Registra pagamento</h2>
                <p className="text-xs text-slate-500">Aggiungi un movimento al conto cliente</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Plus className="size-4" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="p-4">
            {canRegisterPayment ? (
              <form
                action={async (formData) => {
                  "use server";
                  const rawAmount = String(formData.get("amount") ?? "").replace(",", ".");
                  await registerManualPayment({
                    bookingId: booking.id,
                    amountEur: parseFloat(rawAmount),
                    method: formData.get("method") as "CASH" | "BANK_TRANSFER",
                    type: formData.get("type") as "DEPOSIT" | "BALANCE" | "FULL",
                    processedAtDay: String(formData.get("processedAtDay") ?? ""),
                    note: formData.get("note") ? String(formData.get("note")) : undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                      Saldo residuo
                    </span>
                    <span className="text-lg font-black tabular-nums text-amber-800">
                      {formatEurCents(paymentAccount.outstandingCents)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${paymentAccount.totalCents > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (paymentAccount.collectedCents / paymentAccount.totalCents) * 100,
                              ),
                            )
                          : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-amber-700">
                    {formatEurCents(paymentAccount.collectedCents)} già incassati su{" "}
                    {formatEurCents(paymentAccount.totalCents)}
                  </p>
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Importo
                  <input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    defaultValue={(paymentAccount.outstandingCents / 100)
                      .toFixed(2)
                      .replace(".", ",")}
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base font-bold text-slate-950"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Tipo
                    <select
                      name="type"
                      defaultValue={defaultPaymentType}
                      className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {booking.source === "DIRECT" ? (
                        <>
                          <option value="DEPOSIT">Acconto</option>
                          <option value="BALANCE">Saldo</option>
                          <option value="FULL">Pagamento intero</option>
                        </>
                      ) : (
                        <option value="DEPOSIT">Pagamento parziale</option>
                      )}
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Data
                    <input
                      name="processedAtDay"
                      type="date"
                      defaultValue={todayInput}
                      max={todayInput}
                      required
                      className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    />
                  </label>
                </div>

                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Metodo
                  <select
                    name="method"
                    defaultValue="BANK_TRANSFER"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="BANK_TRANSFER">Bonifico</option>
                    <option value="CASH">Contanti</option>
                  </select>
                </label>

                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Nota interna · facoltativa
                  <input
                    name="note"
                    type="text"
                    maxLength={2000}
                    placeholder="Es. saldo esperienza"
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-800"
                  />
                </label>

                <SubmitButton
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800"
                  pendingLabel="Registrazione..."
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Registra pagamento
                </SubmitButton>
                <p className="text-center text-[10px] leading-4 text-slate-500">
                  Incassato e saldo residuo verranno ricalcolati automaticamente.
                </p>
              </form>
            ) : (
              <div
                className={`rounded-xl border p-4 ${
                  accountClosed
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                <CheckCircle2 className="size-6" aria-hidden="true" />
                <h3 className="mt-3 font-bold">
                  {accountClosed ? "Conto chiuso" : "Prenotazione saldata"}
                </h3>
                <p className="mt-1 text-xs leading-5">
                  {accountClosed
                    ? `Non è possibile registrare nuovi pagamenti su una prenotazione ${paymentState.toLowerCase()}.`
                    : "Il totale risulta incassato. Non ci sono altri importi da pagare."}
                </p>
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="font-bold text-slate-900 mb-3">Note interne</h2>
        <form
          action={async (fd) => {
            "use server";
            const res = await addBookingNote({
              bookingId: booking.id,
              note: String(fd.get("note") ?? ""),
            });
            if (!res.ok) throw new Error(res.message);
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
                  <TimeIso datetime={n.createdAt} />
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

function BillingDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`truncate text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function PaymentSummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning";
}) {
  const style = {
    default: {
      bar: "bg-slate-950",
      icon: "bg-slate-100 text-slate-600",
      value: "text-slate-950",
    },
    success: {
      bar: "bg-emerald-500",
      icon: "bg-emerald-50 text-emerald-700",
      value: "text-emerald-700",
    },
    warning: {
      bar: "bg-amber-500",
      icon: "bg-amber-50 text-amber-700",
      value: "text-amber-700",
    },
  }[tone];

  return (
    <AdminCard padding="sm" className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${style.bar}`} />
      <div className="flex items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`truncate text-2xl font-black tracking-tight tabular-nums ${style.value}`}>
            {value}
          </p>
          <p className="truncate text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
    </AdminCard>
  );
}
