import Link from "next/link";
import { db } from "@/lib/db";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { type DayCell } from "@/components/admin/calendar-grid";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { enrichDayCells } from "./enrich";
import { CalendarClient } from "./calendar-client";

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function CalendarioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const now = new Date();
  const rawMonth = sp.month ? parseInt(sp.month, 10) : now.getMonth() + 1;
  const rawYear = sp.year ? parseInt(sp.year, 10) : now.getFullYear();
  const month = Math.min(12, Math.max(1, isNaN(rawMonth) ? now.getMonth() + 1 : rawMonth));
  const year = Math.min(2100, Math.max(2020, isNaN(rawYear) ? now.getFullYear() : rawYear));

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  // 0=Mon, 6=Sun — griglia europea.
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;

  const [boats, bookings, availability, auditLogs] = await Promise.all([
    db.boat.findMany({ orderBy: { name: "asc" } }),
    db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: {
        id: true,
        source: true,
        status: true,
        confirmationCode: true,
        boatId: true,
        startDate: true,
        endDate: true,
        service: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    db.boatAvailability.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: {
        boatId: true,
        date: true,
        status: true,
        lockedByBookingId: true,
      },
    }),
    // Batch audit logs MANUAL_BLOCK per arricchire le celle admin-block
    // con reason + blockedAt. Finestra 90gg indietro: la maggior parte dei
    // blocchi recenti e' entro questa finestra; oltre scade retention.
    db.auditLog.findMany({
      where: {
        action: AUDIT_ACTIONS.MANUAL_BLOCK,
        entity: "Boat",
        timestamp: {
          gte: new Date(monthStart.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
      },
      select: { entityId: true, after: true, timestamp: true },
      orderBy: { timestamp: "desc" },
      take: 500,
    }),
  ]);

  const enriched = enrichDayCells({
    boats,
    bookings,
    availability,
    auditLogs,
    monthStart,
    monthEnd,
  });

  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Calendario · ${year}-${String(month).padStart(2, "0")}`}
        actions={
          <>
            <Link
              href={`/admin/calendario?year=${prev.y}&month=${prev.m}`}
              className="px-3 py-1 border rounded text-sm bg-white hover:bg-slate-50"
            >
              ← Prec
            </Link>
            <Link
              href="/admin/calendario"
              className="px-3 py-1 border rounded text-sm bg-white hover:bg-slate-50"
            >
              Oggi
            </Link>
            <Link
              href={`/admin/calendario?year=${next.y}&month=${next.m}`}
              className="px-3 py-1 border rounded text-sm bg-white hover:bg-slate-50"
            >
              Succ →
            </Link>
          </>
        }
      />

      {boats.length === 0 && (
        <p className="text-sm text-slate-500">Nessuna barca configurata.</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {boats.map((boat) => {
          const boatEnriched = enriched.get(boat.id) ?? [];
          // Costruisci DayCell[] (shape legacy con padding) per CalendarGrid.
          // Il padding cells + DayCellEnriched[] sono complementari: padding e' solo
          // per allineare la griglia Lun-Dom; le celle vere arrivano dal enriched.
          const days: DayCell[] = [];
          for (let i = 0; i < firstWeekday; i++) {
            days.push({
              date: monthStart,
              bookings: [],
              status: "AVAILABLE",
              isPadding: true,
            });
          }
          for (const e of boatEnriched) {
            days.push({
              date: e.date,
              bookings: e.bookings.map((b) => ({
                id: b.id,
                source: b.source,
                serviceName: b.serviceName,
                confirmationCode: b.confirmationCode,
              })),
              status: e.status,
            });
          }
          return (
            <AdminCard key={boat.id} className="space-y-4">
              <CalendarClient
                boatId={boat.id}
                boatName={boat.name}
                days={days}
                enriched={boatEnriched}
              />
            </AdminCard>
          );
        })}
      </div>

      <AdminCard padding="sm" className="text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-900">Legenda:</p>
        <div className="flex gap-3 flex-wrap">
          <LegendBadge className="bg-red-50 border-red-200">Prenotato</LegendBadge>
          <LegendBadge className="bg-amber-50 border-amber-200">Parzialmente prenotato</LegendBadge>
          <LegendBadge className="bg-white border-slate-200">Disponibile</LegendBadge>
        </div>
        <p className="mt-2">Fino a 3 booking per cella; oltre mostra "+N".</p>
      </AdminCard>
    </div>
  );
}

function LegendBadge({ children, className }: { children: string; className: string }) {
  return <span className={`px-2 py-0.5 rounded border ${className}`}>{children}</span>;
}
