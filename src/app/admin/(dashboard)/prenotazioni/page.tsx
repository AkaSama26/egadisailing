import Decimal from "decimal.js";
import Link from "next/link";
import { Search } from "lucide-react";
import { BookingSource, BookingStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { BookingTable, type BookingRow } from "@/components/admin/booking-table";
import { PageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import {
  BOOKING_SOURCE_LABEL,
  BOOKING_STATUS_LABEL,
} from "@/lib/admin/labels";

interface Props {
  searchParams: Promise<{
    source?: string;
    status?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    serviceId?: string;
  }>;
}

const SOURCES: BookingSource[] = [
  "DIRECT",
  "BOKUN",
  "BOATAROUND",
  "SAMBOAT",
  "CLICKANDBOAT",
  "NAUTAL",
];
const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"];

function isSource(v: string | undefined): v is BookingSource {
  return typeof v === "string" && (SOURCES as string[]).includes(v);
}
function isStatus(v: string | undefined): v is BookingStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v);
}
function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T00:00:00Z`);
}

const EXTERNAL_PAID_STATUSES = new Set(["PAID", "PAID_IN_FULL", "COMPLETED", "CAPTURED"]);

function jsonStringField(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" && field.trim() ? field.trim() : undefined;
}

export default async function PrenotazioniPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sourceFilter = isSource(sp.source) ? sp.source : undefined;
  const statusFilter = isStatus(sp.status) ? sp.status : undefined;
  const q = sp.q?.trim();
  const dateFrom = parseDateParam(sp.dateFrom);
  const dateTo = parseDateParam(sp.dateTo);
  const serviceId = sp.serviceId?.trim() || undefined;
  const filters: Prisma.BookingWhereInput[] = [];

  if (sourceFilter) filters.push({ source: sourceFilter });
  if (statusFilter) filters.push({ status: statusFilter });
  if (serviceId) filters.push({ serviceId });
  if (dateFrom || dateTo) {
    filters.push({
      startDate: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }
  if (q) {
    filters.push({
      OR: [
        { confirmationCode: { contains: q, mode: "insensitive" } },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  const [services, bookings] = await Promise.all([
    db.service.findMany({
      where: { active: true },
      select: { id: true, name: true, boat: { select: { name: true } } },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    db.booking.findMany({
      where: filters.length > 0 ? { AND: filters } : undefined,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
        service: { select: { name: true } },
        payments: { select: { status: true, type: true, amount: true } },
        bokunBooking: {
          select: {
            bokunBookingId: true,
            channelName: true,
            rawPayload: true,
            commissionAmount: true,
            netAmount: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: 200,
    }),
  ]);

  const rows: BookingRow[] = bookings.map((b) => {
    const paid = b.payments
      .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
      .reduce((acc, p) => acc.plus(p.amount.toString()), new Decimal(0));
    const externalPaymentStatus = jsonStringField(b.bokunBooking?.rawPayload, "paymentStatus");
    const externalPaid =
      externalPaymentStatus && EXTERNAL_PAID_STATUSES.has(externalPaymentStatus)
        ? new Decimal(b.bokunBooking?.netAmount?.toString() ?? b.totalPrice.toString())
        : new Decimal(0);
    return {
      id: b.id,
      confirmationCode: b.confirmationCode,
      source: b.source,
      sourceLabel: b.bokunBooking?.channelName ?? BOOKING_SOURCE_LABEL[b.source],
      sourceDetail: b.bokunBooking?.bokunBookingId
        ? `Bokun #${b.bokunBooking.bokunBookingId}`
        : undefined,
      customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
      customerEmail: b.customer.email,
      customerPhone: b.customer.phone,
      serviceName: b.service.name,
      startDate: b.startDate,
      numPeople: b.numPeople,
      totalPrice: b.totalPrice.toString(),
      paidAmount: paid.gt(0) ? paid.toString() : externalPaid.toString(),
      paidDetail: externalPaymentStatus ? `Bokun: ${externalPaymentStatus}` : undefined,
      status: b.status,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Prenotazioni" />

      <form
        action="/admin/prenotazioni"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(180px,1.4fr)_repeat(5,minmax(130px,1fr))_auto]"
      >
        <label className="relative text-sm font-medium text-slate-700">
          Cerca
          <Search className="pointer-events-none absolute bottom-2.5 left-3 size-4 text-slate-400" aria-hidden="true" />
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Codice, cliente, email, telefono"
            className="mt-1 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Da
          <input
            name="dateFrom"
            type="date"
            defaultValue={sp.dateFrom ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          A
          <input
            name="dateTo"
            type="date"
            defaultValue={sp.dateTo ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Stato
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tutti</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Fonte
          <select
            name="source"
            defaultValue={sourceFilter ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tutte</option>
            {SOURCES.map((source) => (
              <option key={source} value={source}>
                {BOOKING_SOURCE_LABEL[source]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Esperienza
          <select
            name="serviceId"
            defaultValue={serviceId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tutte</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.boat.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filtra
          </button>
          <Link
            href="/admin/prenotazioni"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            Reset
          </Link>
        </div>
      </form>

      <p className="text-xs text-slate-500">
        Mostrati i {rows.length} risultati piu' recenti (limite 200)
        {q ? ` per "${q}"` : ""}. Usa i filtri per ridurre lo scope.
      </p>

      <BookingTable rows={rows} />
    </div>
  );
}
