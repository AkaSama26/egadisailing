import type { ReceiptViewModel } from "@/lib/receipts/view-model";

export function ReceiptDocument({ receipt }: { receipt: ReceiptViewModel }) {
  const totalTitle = receipt.paymentSummary
    ? receipt.paymentSummary.totalTitle
    : receipt.language === "EN"
      ? "Total"
      : "Totale";

  return (
    <main className="mx-auto max-w-4xl rounded-lg bg-white p-10 shadow-sm print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="flex items-start justify-between gap-8 border-b border-slate-200 pb-6">
        <div>
          <div className="text-xl font-bold text-slate-950">{receipt.company.name}</div>
          <div className="mt-2 text-sm text-slate-600">{receipt.company.legalAddress}</div>
          <div className="text-sm text-slate-600">P.IVA {receipt.company.vatNumber}</div>
          <div className="text-sm text-slate-600">{receipt.company.email}</div>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-normal text-slate-950">
            {receipt.language === "EN" ? "Internal receipt" : "Ricevuta interna"}
          </h1>
          <div className="mt-2 font-mono text-sm font-semibold text-slate-700">
            {receipt.number}
          </div>
          <div className="text-sm text-slate-600">{receipt.issueDateLabel}</div>
          {receipt.status === "CANCELLED" && (
            <div className="mt-2 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
              {receipt.language === "EN" ? "Cancelled" : "Annullata"}
            </div>
          )}
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
        {receipt.disclaimer}
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase text-slate-500">
            {receipt.language === "EN" ? "Recipient" : "Destinatario"}
          </h2>
          <div className="mt-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">{receipt.recipient.name}</div>
            {receipt.recipient.email && <div>{receipt.recipient.email}</div>}
            {receipt.recipient.address && <div>{receipt.recipient.address}</div>}
            {receipt.recipient.taxId && (
              <div>
                {receipt.language === "EN" ? "Tax/VAT ID" : "Codice fiscale / P.IVA"}: {" "}
                {receipt.recipient.taxId}
              </div>
            )}
          </div>
        </div>
        {receipt.booking && (
          <div>
            <h2 className="text-xs font-semibold uppercase text-slate-500">
              {receipt.language === "EN" ? "Booking" : "Prenotazione"}
            </h2>
            <div className="mt-3 text-sm text-slate-700">
              <div className="font-mono font-semibold text-slate-950">
                {receipt.booking.confirmationCode}
              </div>
              <div>{receipt.booking.serviceName}</div>
              <div>
                {receipt.booking.startDateLabel} / {receipt.booking.endDateLabel}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <table className="w-full text-sm">
          <thead className="bg-slate-950 text-left text-white">
            <tr>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">
                {receipt.language === "EN" ? "Description" : "Descrizione"}
              </th>
              <th className="px-3 py-2">{receipt.language === "EN" ? "Qty" : "Qta"}</th>
              <th className="px-3 py-2">{receipt.language === "EN" ? "Unit" : "Prezzo"}</th>
              <th className="px-3 py-2">IVA</th>
              <th className="px-3 py-2 text-right">
                {receipt.language === "EN" ? "Total" : "Totale"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipt.lineItems.map((line) => (
              <tr
                key={line.id}
                className={line.lineType === "PAYMENT_RECEIVED" ? "bg-emerald-50/50" : undefined}
              >
                <td className="px-3 py-3 text-xs font-semibold uppercase text-slate-500">
                  {line.lineTypeLabel}
                </td>
                <td className="px-3 py-3">
                  <div>{line.description}</div>
                  {line.paymentMetaLabel && (
                    <div className="mt-1 text-xs text-slate-500">{line.paymentMetaLabel}</div>
                  )}
                </td>
                <td className="px-3 py-3 font-mono">
                  {line.lineType === "PAYMENT_RECEIVED" ? "-" : line.quantity}
                </td>
                <td className="px-3 py-3 font-mono">{line.unitPriceLabel}</td>
                <td className="px-3 py-3 text-xs text-slate-500">{line.vatLabel}</td>
                <td className="px-3 py-3 text-right font-mono font-semibold">
                  {line.lineTotalLabel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 flex justify-end">
          <div className="w-64 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase text-slate-500">{totalTitle}</div>
            <div className="mt-1 text-2xl font-bold text-slate-950">{receipt.totalLabel}</div>
          </div>
        </div>
      </section>

      {receipt.paymentSummary && (
        <section className="mt-8">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                {receipt.paymentSummary.sectionTitle}
              </h2>
              <span className="text-xs text-slate-500">
                {receipt.paymentSummary.snapshotAtLabel}
              </span>
            </div>
            <dl className="mt-3 divide-y divide-slate-100 text-sm">
              {receipt.paymentSummary.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-2">
                  <dt className={row.emphasis ? "font-semibold text-slate-900" : "text-slate-600"}>
                    {row.label}
                  </dt>
                  <dd className="font-mono font-semibold text-slate-950">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {receipt.note && (
        <section className="mt-8 text-sm text-slate-700">
          <h2 className="text-xs font-semibold uppercase text-slate-500">Note</h2>
          <p className="mt-2 whitespace-pre-wrap">{receipt.note}</p>
        </section>
      )}

      <footer className="mt-12 border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500">
        {receipt.disclaimer}
      </footer>
    </main>
  );
}
