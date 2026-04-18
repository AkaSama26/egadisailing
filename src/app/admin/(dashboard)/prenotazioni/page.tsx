import Decimal from "decimal.js";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  BookingSource,
  BookingStatus,
} from "@/generated/prisma/enums";
import { BookingTable, type BookingRow } from "@/components/admin/booking-table";

interface Props {
  searchParams: Promise<{ source?: string; status?: string }>;
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

export default async function PrenotazioniPage({ searchParams }: Props) {
  const sp = await searchParams;
  const sourceFilter = isSource(sp.source) ? sp.source : undefined;
  const statusFilter = isStatus(sp.status) ? sp.status : undefined;

  const bookings = await db.booking.findMany({
    where: {
      ...(sourceFilter ? { source: sourceFilter } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      service: { select: { name: true } },
      payments: { select: { status: true, type: true, amount: true } },
    },
    orderBy: { startDate: "desc" },
    take: 200,
  });

  const rows: BookingRow[] = bookings.map((b) => {
    const paid = b.payments
      .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
      .reduce((acc, p) => acc.plus(p.amount.toString()), new Decimal(0));
    return {
      id: b.id,
      confirmationCode: b.confirmationCode,
      source: b.source,
      customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
      customerEmail: b.customer.email,
      serviceName: b.service.name,
      startDate: b.startDate,
      numPeople: b.numPeople,
      totalPrice: b.totalPrice.toString(),
      paidAmount: paid.toString(),
      status: b.status,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Prenotazioni</h1>

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 self-center mr-1">SOURCE:</span>
          <FilterChip href="/admin/prenotazioni" label="Tutte" active={!sourceFilter} />
          {SOURCES.map((s) => (
            <FilterChip
              key={s}
              href={`/admin/prenotazioni?source=${s}${statusFilter ? `&status=${statusFilter}` : ""}`}
              label={s}
              active={sourceFilter === s}
            />
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 self-center mr-1">STATUS:</span>
          <FilterChip
            href={sourceFilter ? `/admin/prenotazioni?source=${sourceFilter}` : "/admin/prenotazioni"}
            label="Tutti"
            active={!statusFilter}
          />
          {STATUSES.map((s) => (
            <FilterChip
              key={s}
              href={`/admin/prenotazioni?${sourceFilter ? `source=${sourceFilter}&` : ""}status=${s}`}
              label={s}
              active={statusFilter === s}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Mostrati i {rows.length} risultati più recenti (limite 200). Filtrare per ridurre lo scope.
      </p>

      <BookingTable rows={rows} />
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-full text-xs border transition ${
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
      }`}
    >
      {label}
    </Link>
  );
}
