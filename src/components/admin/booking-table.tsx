import Link from "next/link";
import { formatEur } from "@/lib/pricing/cents";
import { formatItDay } from "@/lib/dates";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export interface BookingRow {
  id: string;
  confirmationCode: string;
  source: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startDate: Date;
  numPeople: number;
  totalPrice: string;
  paidAmount: string;
  status: string;
}

/**
 * Tabella prenotazioni unificata per canale. `totalPrice`/`paidAmount` arrivano
 * come stringhe Decimal-safe (no .toNumber() all'origine: evita precision loss).
 */
export function BookingTable({ rows }: { rows: BookingRow[] }) {
  return (
    <div className="bg-white rounded-xl border overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Elenco prenotazioni</caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th scope="col" className="text-left p-3">Codice</th>
            <th scope="col" className="text-left p-3">Data</th>
            <th scope="col" className="text-left p-3">Servizio</th>
            <th scope="col" className="text-left p-3">Cliente</th>
            <th scope="col" className="text-left p-3">Canale</th>
            <th scope="col" className="text-right p-3">Totale</th>
            <th scope="col" className="text-right p-3">Pagato</th>
            <th scope="col" className="text-left p-3">Stato</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-slate-50">
              <td className="p-3">
                <Link
                  href={`/admin/prenotazioni/${r.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {r.confirmationCode}
                </Link>
              </td>
              <td className="p-3">{formatItDay(r.startDate)}</td>
              <td className="p-3">{r.serviceName}</td>
              <td className="p-3">
                <div className="font-medium">{r.customerName}</div>
                <div className="text-xs text-slate-500">{r.customerEmail}</div>
              </td>
              <td className="p-3">
                <span className="px-2 py-1 rounded bg-slate-100 text-xs">
                  {labelOrRaw(BOOKING_SOURCE_LABEL, r.source)}
                </span>
              </td>
              <td className="p-3 text-right tabular-nums">{formatEur(r.totalPrice)}</td>
              <td className="p-3 text-right tabular-nums">{formatEur(r.paidAmount)}</td>
              <td className="p-3">
                <span
                  className={`text-xs font-semibold ${
                    r.status === "CONFIRMED"
                      ? "text-emerald-700"
                      : r.status === "CANCELLED"
                        ? "text-red-700"
                        : r.status === "REFUNDED"
                          ? "text-amber-700"
                          : "text-slate-700"
                  }`}
                >
                  {labelOrRaw(BOOKING_STATUS_LABEL, r.status)}
                </span>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-500">
                Nessuna prenotazione trovata
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
