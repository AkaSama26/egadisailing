import Link from "next/link";
import { db } from "@/lib/db";
import { CalendarGrid, type DayCell } from "@/components/admin/calendar-grid";
import { SubmitButton } from "@/components/admin/submit-button";
import { manualBlockRange, manualReleaseRange } from "./actions";
import { enrichDayCells } from "./enrich";

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
        action: "MANUAL_BLOCK",
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
  // TODO Chunk 2: pass `enriched` to CalendarClient for interactive grid.
  void enriched;

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
              <div key={boat.id} className="bg-white rounded-xl border p-5 space-y-4">
                <CalendarGrid days={days} boatName={boat.name} />
                <ManualAvailabilityActions boatId={boat.id} boatName={boat.name} />
              </div>
            );
          });
        })()}
      </div>

      <div className="bg-white rounded-xl border p-4 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-900">Legenda:</p>
        <div className="flex gap-3 flex-wrap">
          <LegendBadge className="bg-red-50 border-red-200">Prenotato</LegendBadge>
          <LegendBadge className="bg-amber-50 border-amber-200">Parzialmente prenotato</LegendBadge>
          <LegendBadge className="bg-white border-slate-200">Disponibile</LegendBadge>
        </div>
        <p className="mt-2">Fino a 3 booking per cella; oltre mostra "+N".</p>
      </div>
    </div>
  );
}

/**
 * Form collapsibile per blocco/rilascio manuale range date. Unificato qui
 * (prima era pagina separata `/admin/disponibilita`) per evitare context-
 * switch admin: vedi calendario → agisci sullo stesso boat senza navigare.
 */
function ManualAvailabilityActions({
  boatId,
  boatName,
}: {
  boatId: string;
  boatName: string;
}) {
  return (
    <details className="border-t pt-3 -mx-5 px-5 group">
      <summary className="cursor-pointer text-sm font-medium text-slate-700 select-none list-none flex items-center justify-between hover:text-slate-900">
        <span>Azioni manuali (blocca / rilascia range)</span>
        <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">
          ▼
        </span>
      </summary>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <form
          action={async (fd) => {
            "use server";
            await manualBlockRange(
              boatId,
              String(fd.get("startDate")),
              String(fd.get("endDate")),
              String(fd.get("reason") ?? ""),
            );
          }}
          className="space-y-2 p-3 border rounded-lg bg-red-50/40 border-red-200"
        >
          <h3 className="font-semibold text-red-800 text-sm">Blocca range</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Da
              <input
                name="startDate"
                type="date"
                className="block w-full border rounded px-2 py-1 text-sm"
                required
              />
            </label>
            <label className="text-xs">
              A
              <input
                name="endDate"
                type="date"
                className="block w-full border rounded px-2 py-1 text-sm"
                required
              />
            </label>
          </div>
          <input
            name="reason"
            placeholder="Motivo (manutenzione, ferie...)"
            maxLength={500}
            className="w-full border rounded px-2 py-1 text-sm"
          />
          <SubmitButton
            className="w-full bg-red-600 text-white rounded py-1.5 text-sm font-medium hover:bg-red-700"
            confirmMessage={`Confermi il blocco del range su ${boatName}? Verranno bloccate le date su tutti i canali esterni.`}
            pendingLabel="Blocco in corso..."
          >
            Blocca
          </SubmitButton>
        </form>

        <form
          action={async (fd) => {
            "use server";
            await manualReleaseRange(
              boatId,
              String(fd.get("startDate")),
              String(fd.get("endDate")),
            );
          }}
          className="space-y-2 p-3 border rounded-lg bg-emerald-50/40 border-emerald-200"
        >
          <h3 className="font-semibold text-emerald-800 text-sm">Rilascia range</h3>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              Da
              <input
                name="startDate"
                type="date"
                className="block w-full border rounded px-2 py-1 text-sm"
                required
              />
            </label>
            <label className="text-xs">
              A
              <input
                name="endDate"
                type="date"
                className="block w-full border rounded px-2 py-1 text-sm"
                required
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Rende disponibili le date (bloccato se ci sono booking attivi).
          </p>
          <SubmitButton
            className="w-full bg-emerald-600 text-white rounded py-1.5 text-sm font-medium hover:bg-emerald-700"
            confirmMessage={`Confermi il rilascio del range su ${boatName}?`}
            pendingLabel="Rilascio in corso..."
          >
            Rilascia
          </SubmitButton>
        </form>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Le azioni propagano a tutti i canali esterni (Bokun, Boataround) e
        creano alert manuali per Click&Boat / Nautal. Il feed iCal SamBoat si
        aggiorna al prossimo poll (cache 60s).
      </p>
    </details>
  );
}

function LegendBadge({ children, className }: { children: string; className: string }) {
  return <span className={`px-2 py-0.5 rounded border ${className}`}>{children}</span>;
}
