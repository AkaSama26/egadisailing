"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import type { ReceiptLanguage, ReceiptOrigin, ReceiptVatTreatment } from "@/generated/prisma/enums";

export interface ReceiptFormLine {
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatTreatment: ReceiptVatTreatment;
}

export interface ReceiptFormManualPaymentSummary {
  depositPaid?: string | null;
  balancePaid?: string | null;
  fullPaid?: string | null;
}

export interface ReceiptFormValues {
  language: ReceiptLanguage;
  issueDate: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientAddress?: string | null;
  recipientTaxId?: string | null;
  note?: string | null;
  manualPaymentSummary?: ReceiptFormManualPaymentSummary | null;
  lineItems: ReceiptFormLine[];
}

export function ReceiptForm({
  action,
  initialValues,
  origin,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initialValues: ReceiptFormValues;
  origin: ReceiptOrigin;
  submitLabel: string;
}) {
  const [rows, setRows] = useState(() =>
    initialValues.lineItems.map((line, index) => ({
      ...line,
      key: line.id ?? `line-${index}`,
    })),
  );
  const [manualSummary, setManualSummary] = useState(() => ({
    depositPaid: initialValues.manualPaymentSummary?.depositPaid ?? "",
    balancePaid: initialValues.manualPaymentSummary?.balancePaid ?? "",
    fullPaid: initialValues.manualPaymentSummary?.fullPaid ?? "",
  }));
  const amountsLocked = origin === "PAYMENT";
  const showManualPaymentSummary = origin === "CUSTOM";
  const totalValue = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = parseMoneyInput(row.quantity);
      const unit = parseMoneyInput(row.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(unit)) return sum;
      return sum + qty * unit;
    }, 0);
  }, [rows]);
  const total = formatEuro(totalValue);
  const manualPaidValue = useMemo(() => {
    return (
      parseMoneyInput(manualSummary.depositPaid) +
      parseMoneyInput(manualSummary.balancePaid) +
      parseMoneyInput(manualSummary.fullPaid)
    );
  }, [manualSummary]);
  const manualResidual = Math.max(totalValue - manualPaidValue, 0);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          Lingua
          <select
            name="language"
            defaultValue={initialValues.language}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="IT">Italiano</option>
            <option value="EN">English</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Data emissione
          <input
            name="issueDate"
            type="date"
            required
            defaultValue={initialValues.issueDate}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-xs font-medium uppercase text-slate-500">Totale</div>
          <div className="mt-1 font-mono text-lg font-semibold text-slate-900">{total}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Destinatario
          <input
            name="recipientName"
            required
            maxLength={160}
            defaultValue={initialValues.recipientName}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            name="recipientEmail"
            type="email"
            maxLength={254}
            defaultValue={initialValues.recipientEmail ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Indirizzo
          <input
            name="recipientAddress"
            maxLength={500}
            defaultValue={initialValues.recipientAddress ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Codice fiscale / P.IVA
          <input
            name="recipientTaxId"
            maxLength={64}
            defaultValue={initialValues.recipientTaxId ?? ""}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Righe</h2>
          {!amountsLocked && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    key: `line-${crypto.randomUUID()}`,
                    description: "",
                    quantity: "1",
                    unitPrice: "0.00",
                    vatTreatment: "VAT_INCLUDED",
                  },
                ])
              }
            >
              <Plus className="size-4" />
              Aggiungi
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Descrizione</th>
                <th className="w-24 px-3 py-2">Quantità</th>
                <th className="w-32 px-3 py-2">Prezzo</th>
                <th className="w-40 px-3 py-2">IVA</th>
                <th className="w-14 px-3 py-2 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td className="px-3 py-2 align-top">
                    <input type="hidden" name="lineId" value={row.id ?? ""} />
                    <textarea
                      name="description"
                      required
                      maxLength={300}
                      rows={2}
                      value={row.description}
                      onChange={(event) => updateRow(index, { description: event.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      name="quantity"
                      required
                      inputMode="decimal"
                      readOnly={amountsLocked}
                      value={row.quantity}
                      onChange={(event) => updateRow(index, { quantity: event.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      name="unitPrice"
                      required
                      inputMode="decimal"
                      readOnly={amountsLocked}
                      value={row.unitPrice}
                      onChange={(event) => updateRow(index, { unitPrice: event.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      name="vatTreatment"
                      value={row.vatTreatment}
                      onChange={(event) =>
                        updateRow(index, {
                          vatTreatment: event.target.value as ReceiptVatTreatment,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <option value="VAT_INCLUDED">IVA inclusa</option>
                      <option value="VAT_EXEMPT">IVA esente</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    {!amountsLocked && rows.length > 1 && (
                      <button
                        type="button"
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                        title="Rimuovi riga"
                        onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showManualPaymentSummary && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-slate-900">Acconto e saldo</h2>
            <p className="text-sm text-slate-500">
              Valori manuali indicativi per ricevute custom non collegate a una prenotazione.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Acconto registrato
              <input
                name="manualDepositPaid"
                inputMode="decimal"
                value={manualSummary.depositPaid}
                onChange={(event) =>
                  setManualSummary((current) => ({
                    ...current,
                    depositPaid: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Saldo registrato
              <input
                name="manualBalancePaid"
                inputMode="decimal"
                value={manualSummary.balancePaid}
                onChange={(event) =>
                  setManualSummary((current) => ({
                    ...current,
                    balancePaid: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Pagamento intero registrato
              <input
                name="manualFullPaid"
                inputMode="decimal"
                value={manualSummary.fullPaid}
                onChange={(event) =>
                  setManualSummary((current) => ({
                    ...current,
                    fullPaid: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryMetric label="Totale documento" value={formatEuro(totalValue)} />
            <SummaryMetric label="Totale pagato indicato" value={formatEuro(manualPaidValue)} />
            <SummaryMetric label="Residuo da pagare" value={formatEuro(manualResidual)} />
          </div>
        </div>
      )}

      <label className="block text-sm font-medium text-slate-700">
        Note
        <textarea
          name="note"
          rows={4}
          maxLength={2000}
          defaultValue={initialValues.note ?? ""}
          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex justify-end">
        <SubmitButton
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          pendingLabel="Salvataggio..."
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );

  function updateRow(index: number, patch: Partial<ReceiptFormLine>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
}



function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function parseMoneyInput(value: string) {
  const parsed = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
