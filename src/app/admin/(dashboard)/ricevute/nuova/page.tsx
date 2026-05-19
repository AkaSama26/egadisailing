import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { SubmitButton } from "@/components/admin/submit-button";
import { db } from "@/lib/db";
import { formatItDay, isoDay } from "@/lib/dates";
import { formatEur, formatEurCents, toCents } from "@/lib/pricing/cents";
import {
  BOOKING_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TYPE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";
import { createCustomReceiptFromForm, createReceiptFromPaymentsFromForm } from "../actions";
import { ReceiptForm } from "../_components/receipt-form";
import { registerManualPayment } from "../../prenotazioni/actions";

export default async function NewReceiptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const bookingQuery = single(params.booking)?.trim();
  const booking = bookingQuery
    ? await db.booking.findFirst({
        where: {
          confirmationCode: { equals: bookingQuery, mode: "insensitive" },
        },
        include: {
          customer: true,
          service: { select: { name: true, type: true } },
          boat: { select: { name: true } },
          directBooking: {
            select: {
              paymentSchedule: true,
              balanceAmount: true,
              balancePaidAt: true,
            },
          },
          payments: {
            orderBy: { createdAt: "asc" },
            include: {
              receiptLink: {
                include: {
                  receipt: { select: { id: true, number: true, status: true } },
                },
              },
            },
          },
        },
      })
    : null;

  const receiptablePayments =
    booking?.payments.filter(
      (payment) =>
        payment.status === "SUCCEEDED" &&
        payment.type !== "REFUND" &&
        !payment.receiptLink,
    ) ?? [];
  const successfulPayments =
    booking?.payments.filter(
      (payment) => payment.status === "SUCCEEDED" && payment.type !== "REFUND",
    ) ?? [];
  const bookingTotalCents = booking ? toCents(booking.totalPrice) : 0;
  const paidCents = successfulPayments.reduce(
    (sum, payment) => sum + toCents(payment.amount),
    0,
  );
  const remainingCents = Math.max(bookingTotalCents - paidCents, 0);
  const registerPaymentAction = booking
    ? registerReceiptPagePayment.bind(null, booking.id, booking.confirmationCode)
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuova ricevuta"
        subtitle="Crea una ricevuta interna da prenotazione/pagamenti oppure un documento custom."
        backHref="/admin/ricevute"
        backLabel="Ricevute"
      />

      <AdminCard className="space-y-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Ricevuta da prenotazione
          </h2>
          <p className="text-sm text-slate-500">
            Cerca il codice prenotazione, registra acconto o saldo, poi genera il documento dai pagamenti selezionati.
          </p>
        </div>

        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Codice prenotazione
            <input
              name="booking"
              defaultValue={bookingQuery ?? ""}
              placeholder="ES. ABC123"
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cerca
          </button>
        </form>

        {bookingQuery && !booking && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Nessuna prenotazione trovata con codice <strong>{bookingQuery}</strong>.
          </div>
        )}

        {booking && (
          <div className="space-y-5 border-t border-slate-100 pt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="font-mono text-base font-semibold text-slate-900">
                  {booking.confirmationCode}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {booking.service.name} · {booking.boat.name} · {formatItDay(booking.startDate)}
                  {booking.startDate.getTime() !== booking.endDate.getTime()
                    ? ` → ${formatItDay(booking.endDate)}`
                    : ""}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {`${booking.customer.firstName} ${booking.customer.lastName}`.trim() ||
                    booking.customer.email}{" "}
                  · {labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}
                </div>
              </div>
              <Link
                href={`/admin/prenotazioni/${booking.id}`}
                className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
              >
                Apri scheda prenotazione
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Totale prenotazione" value={formatEur(booking.totalPrice)} />
              <Metric label="Totale pagato registrato" value={formatEurCents(paidCents)} />
              <Metric label="Residuo da pagare" value={formatEurCents(remainingCents)} />
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="font-semibold text-slate-900">Registra acconto o saldo</h3>
              <form action={registerPaymentAction} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="text-xs font-medium text-slate-700">
                  Importo €
                  <input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]+([.,][0-9]{1,2})?"
                    placeholder="0,00"
                    required
                    className="mt-1 block w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Tipo
                  <select
                    name="type"
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="DEPOSIT">Acconto</option>
                    <option value="BALANCE" disabled={booking.source !== "DIRECT"}>
                      Saldo
                    </option>
                    <option value="FULL" disabled={booking.source !== "DIRECT"}>
                      Pagamento intero
                    </option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Metodo
                  <select
                    name="method"
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="CASH">Contanti</option>
                    <option value="BANK_TRANSFER">Bonifico</option>
                  </select>
                </label>
                <label className="min-w-48 flex-1 text-xs font-medium text-slate-700">
                  Nota
                  <input
                    name="note"
                    maxLength={2000}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <SubmitButton
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  pendingLabel="Registrazione..."
                >
                  Registra pagamento
                </SubmitButton>
              </form>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="font-semibold text-slate-900">Genera ricevuta dai pagamenti</h3>
              {booking.payments.length === 0 ? (
                <EmptyState message="Nessun pagamento registrato per questa prenotazione." />
              ) : (
                <form action={createReceiptFromPaymentsFromForm} className="mt-3 space-y-3">
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
                    {booking.payments.map((payment) => {
                      const canReceipt =
                        payment.status === "SUCCEEDED" &&
                        payment.type !== "REFUND" &&
                        !payment.receiptLink;
                      return (
                        <li
                          key={payment.id}
                          className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <label className="flex min-w-0 items-start gap-2">
                            {canReceipt && (
                              <input
                                type="checkbox"
                                name="paymentId"
                                value={payment.id}
                                className="mt-1 rounded border-slate-300"
                              />
                            )}
                            <span>
                              <span className="font-medium">
                                {labelOrRaw(PAYMENT_TYPE_LABEL, payment.type)}
                              </span>
                              {" · "}
                              {labelOrRaw(PAYMENT_METHOD_LABEL, payment.method)} ·{" "}
                              <span
                                className={
                                  payment.status === "SUCCEEDED"
                                    ? "text-emerald-700"
                                    : "text-slate-500"
                                }
                              >
                                {labelOrRaw(PAYMENT_STATUS_LABEL, payment.status)}
                              </span>
                              {payment.processedAt && (
                                <span className="ml-2 text-xs text-slate-400">
                                  {formatItDay(payment.processedAt)}
                                </span>
                              )}
                              {payment.receiptLink && (
                                <Link
                                  href={`/admin/ricevute/${payment.receiptLink.receipt.id}`}
                                  className="ml-2 font-mono text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
                                >
                                  {payment.receiptLink.receipt.number}
                                  {payment.receiptLink.receipt.status === "CANCELLED"
                                    ? " (annullata)"
                                    : ""}
                                </Link>
                              )}
                            </span>
                          </label>
                          <span className="font-mono font-semibold tabular-nums">
                            {formatEur(payment.amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {receiptablePayments.length > 0 ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-xs font-medium text-slate-700">
                        Lingua ricevuta
                        <select
                          name="language"
                          defaultValue="IT"
                          className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                          <option value="IT">Italiano</option>
                          <option value="EN">English</option>
                        </select>
                      </label>
                      <label className="text-xs font-medium text-slate-700">
                        Data emissione
                        <input
                          name="issueDate"
                          type="date"
                          defaultValue={isoDay(new Date())}
                          className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                      <SubmitButton
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        pendingLabel="Creazione..."
                      >
                        Crea ricevuta
                      </SubmitButton>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Non ci sono pagamenti completati senza ricevuta.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Ricevuta custom manuale
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Documento interno non collegato a una prenotazione.
          </p>
        </div>
        <ReceiptForm
          action={createCustomReceiptFromForm}
          origin="CUSTOM"
          submitLabel="Crea ricevuta custom"
          initialValues={{
            language: "IT",
            issueDate: isoDay(new Date()),
            recipientName: "",
            recipientEmail: "",
            recipientAddress: "",
            recipientTaxId: "",
            note: "",
            lineItems: [
              {
                description: "",
                quantity: "1",
                unitPrice: "0.00",
                vatTreatment: "VAT_INCLUDED",
              },
            ],
          }}
        />
      </AdminCard>
    </div>
  );
}

async function registerReceiptPagePayment(
  bookingId: string,
  confirmationCode: string,
  formData: FormData,
) {
  "use server";

  const rawAmount = String(formData.get("amount") ?? "").replace(",", ".");
  await registerManualPayment({
    bookingId,
    amountEur: parseFloat(rawAmount),
    method: formData.get("method") as "CASH" | "BANK_TRANSFER",
    type: formData.get("type") as "DEPOSIT" | "BALANCE" | "FULL",
    note: formData.get("note") ? String(formData.get("note")) : undefined,
  });
  redirect(`/admin/ricevute/nuova?booking=${encodeURIComponent(confirmationCode)}`);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
