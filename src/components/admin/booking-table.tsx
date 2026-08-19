import Decimal from "decimal.js";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  BOOKING_SOURCE_LABEL,
  BOOKING_STATUS_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";
import { formatItDateTime, formatItDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";

export const BOOKING_SORT_KEYS = [
  "code",
  "purchaseDate",
  "experienceDate",
  "service",
  "customer",
  "channel",
  "people",
  "total",
  "paid",
  "status",
] as const;

export type BookingSortKey = (typeof BOOKING_SORT_KEYS)[number];
export type BookingSortDirection = "asc" | "desc";

export interface BookingRow {
  id: string;
  confirmationCode: string;
  source: string;
  sourceLabel?: string;
  sourceDetail?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  createdAt: Date;
  startDate: Date;
  endDate: Date;
  numPeople: number;
  totalPrice: string;
  paidAmount: string;
  paidDetail?: string;
  status: string;
}

export interface BookingTableSearchParams {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  source?: string;
  serviceId?: string;
}

interface BookingTableProps {
  rows: BookingRow[];
  sortBy: BookingSortKey;
  sortDirection: BookingSortDirection;
  searchParams: BookingTableSearchParams;
}

const DEFAULT_SORT_DIRECTION: Record<BookingSortKey, BookingSortDirection> = {
  code: "asc",
  purchaseDate: "desc",
  experienceDate: "desc",
  service: "asc",
  customer: "asc",
  channel: "asc",
  people: "desc",
  total: "desc",
  paid: "desc",
  status: "asc",
};

const IT_COLLATOR = new Intl.Collator("it-IT", {
  numeric: true,
  sensitivity: "base",
});

export function isBookingSortKey(value: string | undefined): value is BookingSortKey {
  return typeof value === "string" && (BOOKING_SORT_KEYS as readonly string[]).includes(value);
}

/** Ordina le righe gia' filtrate mantenendo Decimal e Date senza conversioni lossy. */
export function sortBookingRows(
  rows: BookingRow[],
  sortBy: BookingSortKey,
  direction: BookingSortDirection,
): BookingRow[] {
  return [...rows].sort((left, right) => {
    let comparison: number;
    switch (sortBy) {
      case "code":
        comparison = IT_COLLATOR.compare(left.confirmationCode, right.confirmationCode);
        break;
      case "purchaseDate":
        comparison = left.createdAt.getTime() - right.createdAt.getTime();
        break;
      case "experienceDate":
        comparison = left.startDate.getTime() - right.startDate.getTime();
        break;
      case "service":
        comparison = IT_COLLATOR.compare(left.serviceName, right.serviceName);
        break;
      case "customer":
        comparison = IT_COLLATOR.compare(left.customerName, right.customerName);
        break;
      case "channel":
        comparison = IT_COLLATOR.compare(sourceLabel(left), sourceLabel(right));
        break;
      case "people":
        comparison = left.numPeople - right.numPeople;
        break;
      case "total":
        comparison = new Decimal(left.totalPrice).comparedTo(right.totalPrice);
        break;
      case "paid":
        comparison = new Decimal(left.paidAmount).comparedTo(right.paidAmount);
        break;
      case "status":
        comparison = IT_COLLATOR.compare(
          labelOrRaw(BOOKING_STATUS_LABEL, left.status),
          labelOrRaw(BOOKING_STATUS_LABEL, right.status),
        );
        break;
    }

    if (comparison === 0) {
      comparison = IT_COLLATOR.compare(left.confirmationCode, right.confirmationCode);
    }
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Tabella prenotazioni unificata per canale. `totalPrice`/`paidAmount` arrivano
 * come stringhe Decimal-safe (no .toNumber() all'origine: evita precision loss).
 */
export function BookingTable({
  rows,
  sortBy,
  sortDirection,
  searchParams,
}: BookingTableProps) {
  const sortedRows = sortBookingRows(rows, sortBy, sortDirection);

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[1320px] text-sm">
        <caption className="sr-only">Elenco prenotazioni</caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <SortableHeader label="Codice" column="code" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Data acquisto" column="purchaseDate" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Data esperienza" column="experienceDate" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Servizio" column="service" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Cliente" column="customer" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Canale" column="channel" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
            <SortableHeader label="Persone" column="people" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} align="right" />
            <SortableHeader label="Totale" column="total" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} align="right" />
            <SortableHeader label="Pagato" column="paid" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} align="right" />
            <SortableHeader label="Stato" column="status" sortBy={sortBy} direction={sortDirection} searchParams={searchParams} />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id} className="border-t hover:bg-slate-50">
              <td className="p-3">
                <Link
                  href={`/admin/prenotazioni/${row.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {row.confirmationCode}
                </Link>
              </td>
              <td className="whitespace-nowrap p-3 text-xs tabular-nums text-slate-700">
                {formatItDateTime(row.createdAt)}
              </td>
              <td className="whitespace-nowrap p-3 tabular-nums">
                <div>{formatItDay(row.startDate)}</div>
                {row.endDate.getTime() !== row.startDate.getTime() && (
                  <div className="mt-0.5 text-xs text-slate-500">
                    fino al {formatItDay(row.endDate)}
                  </div>
                )}
              </td>
              <td className="p-3">{row.serviceName}</td>
              <td className="p-3">
                <div className="font-medium">{row.customerName}</div>
                <div className="text-xs text-slate-500">{row.customerEmail}</div>
                {row.customerPhone && <div className="text-xs text-slate-500">{row.customerPhone}</div>}
              </td>
              <td className="p-3">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs">
                  {sourceLabel(row)}
                </span>
                {row.sourceDetail && <div className="mt-1 text-xs text-slate-500">{row.sourceDetail}</div>}
              </td>
              <td className="p-3 text-right font-semibold tabular-nums">{row.numPeople}</td>
              <td className="p-3 text-right tabular-nums">{formatEur(row.totalPrice)}</td>
              <td className="p-3 text-right tabular-nums">
                <div>{formatEur(row.paidAmount)}</div>
                {row.paidDetail && <div className="text-xs text-slate-500">{row.paidDetail}</div>}
              </td>
              <td className="p-3">
                <StatusBadge status={row.status} kind="booking" />
              </td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={10} className="p-8 text-center text-slate-500">
                Nessuna prenotazione trovata
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sortBy,
  direction,
  searchParams,
  align = "left",
}: {
  label: string;
  column: BookingSortKey;
  sortBy: BookingSortKey;
  direction: BookingSortDirection;
  searchParams: BookingTableSearchParams;
  align?: "left" | "right";
}) {
  const active = sortBy === column;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
  const nextDirection = active
    ? direction === "asc"
      ? "desc"
      : "asc"
    : DEFAULT_SORT_DIRECTION[column];

  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={`p-2 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <Link
        href={bookingSortHref(searchParams, column, nextDirection)}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-semibold transition hover:bg-slate-200/70 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 ${
          align === "right" ? "justify-end" : "justify-start"
        } ${active ? "text-slate-950" : "text-slate-600"}`}
        title={`Ordina per ${label.toLowerCase()} ${nextDirection === "asc" ? "crescente" : "decrescente"}`}
      >
        {label}
        <Icon className={`size-3.5 ${active ? "text-blue-700" : "text-slate-400"}`} aria-hidden="true" />
      </Link>
    </th>
  );
}

function bookingSortHref(
  params: BookingTableSearchParams,
  column: BookingSortKey,
  direction: BookingSortDirection,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  search.set("sort", column);
  search.set("dir", direction);
  return `/admin/prenotazioni?${search.toString()}`;
}

function sourceLabel(row: BookingRow): string {
  return row.sourceLabel ?? labelOrRaw(BOOKING_SOURCE_LABEL, row.source);
}
