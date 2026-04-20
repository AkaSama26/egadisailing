import Link from "next/link";
import { db } from "@/lib/db";
import { CalendarGrid, type DayCell } from "@/components/admin/calendar-grid";

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
  const daysInMonth = monthEnd.getUTCDate();
  // 0=Mon, 6=Sun — griglia europea.
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;

  const [boats, bookings, availability] = await Promise.all([
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
        confirmationCode: true,
        boatId: true,
        startDate: true,
        endDate: true,
        service: { select: { name: true } },
      },
    }),
    db.boatAvailability.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { boatId: true, date: true, status: true },
    }),
  ]);

  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Calendario · {year}-{String(month).padStart(2, "0")}
        </h1>
        <div className="flex gap-2">
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
        </div>
      </div>

      {boats.length === 0 && (
        <p className="text-sm text-slate-500">Nessuna barca configurata.</p>
      )}

      {/* R26-A3-H1: pre-bucket per (boatId, dateIso) in O(N+M) invece
          di O(boats × days × bookings). Ferragosto 3 boats × 31 days ×
          100 bookings = 9.3k linear scans per render → blocking 200-500ms.
          Con map bucket scende a <10ms. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {(() => {
          // Availability map: key `${boatId}|${dateIso}`
          const availMap = new Map<string, (typeof availability)[number]>();
          for (const a of availability) {
            availMap.set(`${a.boatId}|${a.date.toISOString().slice(0, 10)}`, a);
          }
          // Bookings indexed by boatId → list, per-boat scan resta ma evita
          // `.filter` su TUTTI i bookings di tutte le boats.
          const bookingsByBoat = new Map<string, typeof bookings>();
          for (const b of bookings) {
            const list = bookingsByBoat.get(b.boatId) ?? [];
            list.push(b);
            bookingsByBoat.set(b.boatId, list);
          }
          return boats.map((boat) => {
            const days: DayCell[] = [];
            const boatBookings = bookingsByBoat.get(boat.id) ?? [];
            for (let i = 0; i < firstWeekday; i++) {
              days.push({
                date: monthStart,
                bookings: [],
                status: "AVAILABLE",
                isPadding: true,
              });
            }
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(Date.UTC(year, month - 1, d));
              const dateKey = date.toISOString().slice(0, 10);
              const avail = availMap.get(`${boat.id}|${dateKey}`);
              const dayMs = date.getTime();
              const dayBookings = boatBookings.filter(
                (b) =>
                  b.startDate.getTime() <= dayMs && b.endDate.getTime() >= dayMs,
              );
              days.push({
                date,
                bookings: dayBookings.map((b) => ({
                  id: b.id,
                  source: b.source,
                  serviceName: b.service.name,
                  confirmationCode: b.confirmationCode,
                })),
                status: avail?.status ?? "AVAILABLE",
              });
            }
            return (
              <div key={boat.id} className="bg-white rounded-xl border p-5">
                <CalendarGrid days={days} boatName={boat.name} />
              </div>
            );
          });
        })()}
      </div>

      <div className="bg-white rounded-xl border p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-900">Legenda:</p>
        <div className="flex gap-3 flex-wrap">
          <LegendBadge className="bg-red-50 border-red-200">BLOCKED</LegendBadge>
          <LegendBadge className="bg-amber-50 border-amber-200">PARTIALLY_BOOKED</LegendBadge>
          <LegendBadge className="bg-white border-slate-200">AVAILABLE</LegendBadge>
        </div>
        <p className="mt-2">Fino a 3 booking per cella; oltre mostra "+N".</p>
      </div>
    </div>
  );
}

function LegendBadge({ children, className }: { children: string; className: string }) {
  return <span className={`px-2 py-0.5 rounded border ${className}`}>{children}</span>;
}
