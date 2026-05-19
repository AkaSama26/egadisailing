import Link from "next/link";
import { Download, Eye, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { isoDay } from "@/lib/dates";
import { getReceiptViewModel } from "@/lib/receipts/view-model";
import { cancelReceiptFromForm, updateReceiptFromForm } from "../actions";
import { ReceiptForm } from "../_components/receipt-form";
import { ReceiptStatusPill } from "../_components/receipt-status-pill";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceiptViewModel(id).catch((err) => {
    if ((err as Error & { code?: string }).code === "NOT_FOUND") notFound();
    throw err;
  });
  const updateAction = updateReceiptFromForm.bind(null, receipt.id);
  const cancelAction = cancelReceiptFromForm.bind(null, receipt.id);
  const isActive = receipt.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <PageHeader
        title={receipt.number}
        subtitle={`${receipt.origin === "PAYMENT" ? "Da pagamenti" : "Custom"} · ${receipt.totalLabel}`}
        backHref="/admin/ricevute"
        backLabel="Ricevute"
        actions={
          <>
            <Link
              href={`/admin/ricevute/${receipt.id}/preview`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye className="size-4" />
              Anteprima
            </Link>
            <a
              href={`/api/admin/receipts/${receipt.id}/pdf`}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Download className="size-4" />
              PDF
            </a>
          </>
        }
      />

      {receipt.status === "CANCELLED" && (
        <AdminCard tone="warn">
          <div className="font-semibold text-amber-950">Ricevuta annullata</div>
          <div className="text-sm text-amber-900">
            Numero mantenuto nello storico: {receipt.number}
          </div>
        </AdminCard>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Kpi label="Data" value={receipt.issueDateLabel} />
        <Kpi label="Lingua" value={receipt.language} />
        <Kpi label="Origine" value={receipt.origin === "PAYMENT" ? "Pagamenti" : "Custom"} />
        <AdminCard>
          <div className="text-xs font-semibold uppercase text-slate-500">Stato</div>
          <div className="mt-2">
            <ReceiptStatusPill status={receipt.status} />
          </div>
        </AdminCard>
        <Kpi label="Totale" value={receipt.totalLabel} />
      </div>

      {receipt.booking && (
        <AdminCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Prenotazione</h2>
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-mono">{receipt.booking.confirmationCode}</span>
                {" · "}
                {receipt.booking.serviceName}
                {" · "}
                {receipt.booking.startDateLabel} / {receipt.booking.endDateLabel}
              </div>
            </div>
            <Link
              href={`/admin/prenotazioni/${receipt.booking.id}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apri booking
            </Link>
          </div>
        </AdminCard>
      )}

      {receipt.payments.length > 0 && (
        <AdminCard>
          <h2 className="mb-3 font-semibold text-slate-900">Pagamenti collegati</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {receipt.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between py-2">
                <span className="text-slate-600">
                  <span className="font-mono text-slate-900">{payment.paymentId.slice(0, 10)}</span>
                  {" · "}
                  {payment.typeLabel} · {payment.methodLabel}
                  {payment.processedAtLabel ? ` · ${payment.processedAtLabel}` : ""}
                </span>
                <span className="font-mono font-semibold">{payment.amountLabel}</span>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      <AdminCard>
        {isActive ? (
          <ReceiptForm
            action={updateAction}
            origin={receipt.origin}
            submitLabel="Salva ricevuta"
            initialValues={{
              language: receipt.language,
              issueDate: isoDay(receipt.issueDate),
              recipientName: receipt.recipient.name,
              recipientEmail: receipt.recipient.email,
              recipientAddress: receipt.recipient.address,
              recipientTaxId: receipt.recipient.taxId,
              note: receipt.note,
              manualPaymentSummary:
                receipt.origin === "CUSTOM" && receipt.paymentSummary
                  ? {
                      depositPaid: receipt.paymentSummary.depositPaid,
                      balancePaid: receipt.paymentSummary.balancePaid,
                      fullPaid: receipt.paymentSummary.fullPaid,
                    }
                  : undefined,
              lineItems: receipt.lineItems.map((line) => ({
                id: line.id,
                description: line.description,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                vatTreatment: line.vatTreatment,
              })),
            }}
          />
        ) : (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Righe ricevuta</h2>
            <ul className="divide-y divide-slate-100 text-sm">
              {receipt.lineItems.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <span className="font-medium text-slate-900">{line.description}</span>
                    <span className="block text-xs text-slate-500">
                      {line.quantity} × {line.unitPriceLabel} · {line.vatLabel}
                    </span>
                  </span>
                  <span className="font-mono font-semibold">{line.lineTotalLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminCard>

      {isActive && (
        <AdminCard tone="alert">
          <form action={cancelAction} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-red-950">Annulla ricevuta</div>
              <div className="text-sm text-red-900">
                La ricevuta resta nello storico con lo stesso numero.
              </div>
            </div>
            <SubmitButton
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              pendingLabel="Annullamento..."
              confirmMessage={`Confermi l'annullamento della ricevuta ${receipt.number}?`}
            >
              <XCircle className="size-4" />
              Annulla
            </SubmitButton>
          </form>
        </AdminCard>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <AdminCard>
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </AdminCard>
  );
}
