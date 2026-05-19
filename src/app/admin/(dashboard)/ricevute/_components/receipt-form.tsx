"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/admin/submit-button";
import type {
  PaymentMethod,
  PaymentType,
  ReceiptLanguage,
  ReceiptLineType,
  ReceiptOrigin,
  ReceiptVatTreatment,
} from "@/generated/prisma/enums";

export interface ReceiptFormLine {
  id?: string;
  clientKey?: string;
  lineType?: ReceiptLineType;
  description: string;
  quantity: string;
  unitPrice: string;
  vatTreatment: ReceiptVatTreatment;
  paymentType?: PaymentType | null;
  paymentMethod?: PaymentMethod | null;
  paymentDate?: string | null;
  productLineKey?: string | null;
}

export interface ReceiptFormValues {
  language: ReceiptLanguage;
  issueDate: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientAddress?: string | null;
  recipientTaxId?: string | null;
  note?: string | null;
  lineItems: ReceiptFormLine[];
}

type ReceiptFormRow = ReceiptFormLine & {
  key: string;
  lineType: ReceiptLineType;
};

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
  const [rows, setRows] = useState<ReceiptFormRow[]>(() =>
    initialValues.lineItems.map((line, index) => ({
      ...line,
      key: line.clientKey ?? line.id ?? `line-${index}`,
      lineType: line.lineType ?? "PRODUCT",
      paymentType: line.paymentType ?? "DEPOSIT",
      paymentMethod: line.paymentMethod ?? "CASH",
      paymentDate: line.paymentDate ?? "",
      productLineKey: line.productLineKey ?? "",
    })),
  );
  const amountsLocked = origin === "PAYMENT";
  const productOptions = useMemo(
    () => rows.filter((row) => row.lineType === "PRODUCT"),
    [rows],
  );
  const totals = useMemo(() => {
    return rows.reduce(
      (sum, row) => {
        if (row.lineType === "PRODUCT") {
          const qty = parseMoneyInput(row.quantity);
          const unit = parseMoneyInput(row.unitPrice);
          if (Number.isFinite(qty) && Number.isFinite(unit)) {
            sum.products += qty * unit;
          }
          return sum;
        }
        const amount = parseMoneyInput(row.unitPrice);
        if (Number.isFinite(amount)) sum.payments += amount;
        return sum;
      },
      { products: 0, payments: 0 },
    );
  }, [rows]);
  const residual = Math.max(totals.products - totals.payments, 0);

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
        <SummaryMetric label="Totale prodotti" value={formatEuro(totals.products)} />
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

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Totale prodotti/servizi" value={formatEuro(totals.products)} />
        <SummaryMetric label="Pagamenti ricevuti" value={formatEuro(totals.payments)} />
        <SummaryMetric label="Residuo da pagare" value={formatEuro(residual)} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Righe</h2>
          {!amountsLocked && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setRows((current) => [...current, newProductRow()])}
              >
                <Plus className="size-4" />
                Prodotto
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setRows((current) => [...current, newPaymentRow(current)])}
              >
                <Plus className="size-4" />
                Pagamento ricevuto
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className={`rounded-lg border p-3 ${
                row.lineType === "PAYMENT_RECEIVED"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input type="hidden" name="lineId" value={row.id ?? ""} />
              <input type="hidden" name="lineKey" value={row.key} />
              <input type="hidden" name="lineType" value={row.lineType} />

              <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-start">
                <div>
                  <div className="text-xs font-medium uppercase text-slate-500">Tipo riga</div>
                  {amountsLocked ? (
                    <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {row.lineType === "PRODUCT" ? "Prodotto/servizio" : "Pagamento ricevuto"}
                    </div>
                  ) : (
                    <select
                      value={row.lineType}
                      onChange={(event) =>
                        updateRow(index, normalizeRowForType(row, event.target.value as ReceiptLineType))
                      }
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="PRODUCT">Prodotto/servizio</option>
                      <option value="PAYMENT_RECEIVED">Pagamento ricevuto</option>
                    </select>
                  )}
                </div>

                {row.lineType === "PRODUCT" ? (
                  <ProductFields
                    row={row}
                    index={index}
                    amountsLocked={amountsLocked}
                    updateRow={updateRow}
                  />
                ) : (
                  <PaymentFields
                    row={row}
                    index={index}
                    amountsLocked={amountsLocked}
                    productOptions={productOptions}
                    updateRow={updateRow}
                  />
                )}

                <div className="flex justify-end">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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

  function updateRow(index: number, patch: Partial<ReceiptFormRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
}

function ProductFields({
  row,
  index,
  amountsLocked,
  updateRow,
}: {
  row: ReceiptFormRow;
  index: number;
  amountsLocked: boolean;
  updateRow: (index: number, patch: Partial<ReceiptFormRow>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_92px_130px_150px]">
      <input type="hidden" name="paymentType" value="" />
      <input type="hidden" name="paymentMethod" value="" />
      <input type="hidden" name="paymentDate" value="" />
      <input type="hidden" name="productLineKey" value="" />

      <label className="text-sm font-medium text-slate-700">
        Descrizione
        <textarea
          name="description"
          required
          maxLength={300}
          rows={2}
          value={row.description}
          onChange={(event) => updateRow(index, { description: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Quantità
        <input
          name="quantity"
          required
          inputMode="decimal"
          readOnly={amountsLocked}
          value={row.quantity}
          onChange={(event) => updateRow(index, { quantity: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Prezzo
        <input
          name="unitPrice"
          required
          inputMode="decimal"
          readOnly={amountsLocked}
          value={row.unitPrice}
          onChange={(event) => updateRow(index, { unitPrice: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        IVA
        <select
          name="vatTreatment"
          value={row.vatTreatment}
          onChange={(event) => updateRow(index, { vatTreatment: event.target.value as ReceiptVatTreatment })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
        >
          <option value="VAT_INCLUDED">IVA inclusa</option>
          <option value="VAT_EXEMPT">IVA esente</option>
        </select>
      </label>
    </div>
  );
}

function PaymentFields({
  row,
  index,
  amountsLocked,
  productOptions,
  updateRow,
}: {
  row: ReceiptFormRow;
  index: number;
  amountsLocked: boolean;
  productOptions: ReceiptFormRow[];
  updateRow: (index: number, patch: Partial<ReceiptFormRow>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_120px_140px_140px_140px_1fr]">
      <input type="hidden" name="quantity" value="1" />
      <input type="hidden" name="vatTreatment" value="VAT_INCLUDED" />
      <input type="hidden" name="paymentType" value={row.paymentType ?? "DEPOSIT"} />
      <input type="hidden" name="paymentMethod" value={row.paymentMethod ?? "CASH"} />
      <input type="hidden" name="paymentDate" value={row.paymentDate ?? ""} />
      <input type="hidden" name="productLineKey" value={row.productLineKey ?? ""} />

      <label className="text-sm font-medium text-slate-700">
        Descrizione
        <textarea
          name="description"
          required
          maxLength={300}
          rows={2}
          readOnly={amountsLocked}
          value={row.description}
          onChange={(event) => updateRow(index, { description: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Importo
        <input
          name="unitPrice"
          required
          inputMode="decimal"
          readOnly={amountsLocked}
          value={row.unitPrice}
          onChange={(event) => updateRow(index, { unitPrice: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Tipo pagamento
        <select
          value={row.paymentType ?? "DEPOSIT"}
          disabled={amountsLocked}
          onChange={(event) => updateRow(index, { paymentType: event.target.value as PaymentType })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        >
          <option value="DEPOSIT">Acconto</option>
          <option value="BALANCE">Saldo</option>
          <option value="FULL">Pagamento intero</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Metodo
        <select
          value={row.paymentMethod ?? "CASH"}
          disabled={amountsLocked}
          onChange={(event) => updateRow(index, { paymentMethod: event.target.value as PaymentMethod })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        >
          <option value="CASH">Contanti</option>
          <option value="BANK_TRANSFER">Bonifico</option>
          <option value="STRIPE">Stripe</option>
          <option value="EXTERNAL">Esterno</option>
        </select>
      </label>
      <label className="text-sm font-medium text-slate-700">
        Data
        <input
          type="date"
          value={row.paymentDate ?? ""}
          readOnly={amountsLocked}
          onChange={(event) => updateRow(index, { paymentDate: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 read-only:bg-slate-50"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Prodotto collegato
        <select
          value={row.productLineKey ?? ""}
          disabled={amountsLocked}
          onChange={(event) => updateRow(index, { productLineKey: event.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50"
        >
          <option value="">Nessuno</option>
          {productOptions.map((product) => (
            <option key={product.key} value={product.key}>
              {product.description || "Prodotto senza descrizione"}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function newProductRow(): ReceiptFormRow {
  return {
    key: `line-${crypto.randomUUID()}`,
    clientKey: undefined,
    lineType: "PRODUCT",
    description: "",
    quantity: "1",
    unitPrice: "0.00",
    vatTreatment: "VAT_INCLUDED",
    paymentType: null,
    paymentMethod: null,
    paymentDate: "",
    productLineKey: "",
  };
}

function newPaymentRow(currentRows: ReceiptFormRow[]): ReceiptFormRow {
  const firstProduct = currentRows.find((row) => row.lineType === "PRODUCT");
  return {
    key: `line-${crypto.randomUUID()}`,
    clientKey: undefined,
    lineType: "PAYMENT_RECEIVED",
    description: "Acconto ricevuto",
    quantity: "1",
    unitPrice: "0.00",
    vatTreatment: "VAT_INCLUDED",
    paymentType: "DEPOSIT",
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().slice(0, 10),
    productLineKey: firstProduct?.key ?? "",
  };
}

function normalizeRowForType(row: ReceiptFormRow, lineType: ReceiptLineType): Partial<ReceiptFormRow> {
  if (lineType === "PRODUCT") {
    return {
      lineType,
      description: row.description,
      quantity: row.quantity || "1",
      unitPrice: row.unitPrice || "0.00",
      vatTreatment: row.vatTreatment || "VAT_INCLUDED",
      paymentType: null,
      paymentMethod: null,
      paymentDate: "",
      productLineKey: "",
    };
  }
  return {
    lineType,
    description: row.description || "Acconto ricevuto",
    quantity: "1",
    unitPrice: row.unitPrice || "0.00",
    vatTreatment: "VAT_INCLUDED",
    paymentType: row.paymentType ?? "DEPOSIT",
    paymentMethod: row.paymentMethod ?? "CASH",
    paymentDate: row.paymentDate || new Date().toISOString().slice(0, 10),
  };
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
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
