import Link from "next/link";
import { AdminCard } from "@/components/admin/admin-card";
import { type DayCell } from "@/components/admin/calendar-grid";
import { PageHeader } from "@/components/admin/page-header";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { db } from "@/lib/db";
import { isoDay, toUtcDay } from "@/lib/dates";
import { getAllWeather } from "@/lib/weather/service";
import { CalendarClient, type CalendarBoatView, type CalendarWeatherSummary } from "./calendar-client";
import { enrichDayCells, type DayCellEnriched } from "./enrich";

interface Props {
  searchParams: Promise<{ month?: string; year?: string; view?: string }>;
}

interface FilterOption {
  value: string;
  label: string;
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
  const firstWeekday = (monthStart.getUTCDay() + 6) % 7;

  const [boats, activeServices, bookings, availability, auditLogs, weatherRows] = await Promise.all([
    db.boat.findMany({
      where: {
        OR: [
          { services: { some: { active: true } } },
          {
            bookings: {
              some: {
                status: { in: ["CONFIRMED", "PENDING"] },
                startDate: { lte: monthEnd },
                endDate: { gte: monthStart },
              },
            },
          },
          { availability: { some: { date: { gte: monthStart, lte: monthEnd } } } },
        ],
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        type: true,
        priority: true,
        boatId: true,
        capacityMax: true,
        boat: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
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
        serviceId: true,
        startDate: true,
        endDate: true,
        service: { select: { name: true, type: true } },
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
    getAllWeather().catch(() => []),
  ]);

  const requestedView = sp.view ?? "all";
  const serviceViews = new Set(activeServices.map((service) => `service:${service.id}`));
  const boatViews = new Set(boats.map((boat) => `boat:${boat.id}`));
  const selectedView =
    requestedView === "all" || serviceViews.has(requestedView) || boatViews.has(requestedView)
      ? requestedView
      : "all";

  const selectedServiceId = selectedView.startsWith("service:")
    ? selectedView.slice("service:".length)
    : null;
  const selectedBoatId = selectedView.startsWith("boat:")
    ? selectedView.slice("boat:".length)
    : null;
  const selectedService = selectedServiceId
    ? activeServices.find((service) => service.id === selectedServiceId)
    : null;

  const visibleBoatIds = new Set<string>();
  if (selectedService) {
    visibleBoatIds.add(selectedService.boatId);
  } else if (selectedBoatId) {
    visibleBoatIds.add(selectedBoatId);
  } else {
    for (const boat of boats) visibleBoatIds.add(boat.id);
  }

  const visibleBoats = boats.filter((boat) => visibleBoatIds.has(boat.id));
  const visibleBookings = bookings.filter((booking) => visibleBoatIds.has(booking.boatId));

  const enriched = enrichDayCells({
    boats: visibleBoats,
    bookings: visibleBookings,
    availability,
    auditLogs,
    monthStart,
    monthEnd,
  });

  const calendars: CalendarBoatView[] = visibleBoats.map((boat) => {
    const boatEnriched = enriched.get(boat.id) ?? [];
    return {
      boatId: boat.id,
      boatName: boat.name,
      days: buildCalendarDays(firstWeekday, monthStart, boatEnriched),
      enriched: boatEnriched,
    };
  });

  const manualBookingServices = activeServices.map((service) => ({
    id: service.id,
    name: service.name,
    type: service.type,
    boatId: service.boatId,
    capacityMax: service.capacityMax,
  }));

  const weather = weatherRows.map<CalendarWeatherSummary>((row) => ({
    date: row.date,
    risk: row.risk,
    reasons: row.reasons,
    forecast: {
      temperatureMax: row.forecast.temperatureMax,
      temperatureMin: row.forecast.temperatureMin,
      windSpeedKmh: row.forecast.windSpeedKmh,
      windGustKmh: row.forecast.windGustKmh,
      precipitationProbability: row.forecast.precipitationProbability,
      precipitationMm: row.forecast.precipitationMm,
      waveHeightM: row.forecast.waveHeightM,
    },
  }));

  const prev = month === 1 ? { m: 12, y: year - 1 } : { m: month - 1, y: year };
  const next = month === 12 ? { m: 1, y: year + 1 } : { m: month + 1, y: year };
  const todayIso = isoDay(toUtcDay(now));
  const initialDateIso = todayIso >= isoDay(monthStart) && todayIso <= isoDay(monthEnd)
    ? todayIso
    : isoDay(monthStart);
  const initialSelected = calendars[0]
    ? { boatId: calendars[0].boatId, dateIso: initialDateIso }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Calendario · ${year}-${String(month).padStart(2, "0")}`}
        subtitle="Seleziona esperienza o barca, poi usa il dettaglio della giornata a destra."
        actions={
          <>
            <Link
              href={calendarHref({ year: prev.y, month: prev.m, view: selectedView })}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              Prec
            </Link>
            <Link
              href={calendarHref({ view: selectedView })}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              Oggi
            </Link>
            <Link
              href={calendarHref({ year: next.y, month: next.m, view: selectedView })}
              className="rounded border bg-white px-3 py-1 text-sm hover:bg-slate-50"
            >
              Succ
            </Link>
          </>
        }
      />

      <AdminCard padding="sm">
        <form action="/admin/calendario" className="flex flex-col gap-3 md:flex-row md:items-end">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <label className="flex-1 text-sm font-medium text-slate-700">
            Esperienza o barca
            <select
              name="view"
              defaultValue={selectedView}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">Tutte le esperienze</option>
              <optgroup label="Esperienze attive">
                {activeServices.map((service) => (
                  <option key={service.id} value={`service:${service.id}`}>
                    {service.name} · {service.boat.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Barche">
                {boats.map((boat) => (
                  <option key={boat.id} value={`boat:${boat.id}`}>
                    {boat.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Applica filtro
          </button>
        </form>
      </AdminCard>

      <CalendarClient
        calendars={calendars}
        weather={weather}
        initialSelected={initialSelected}
        services={manualBookingServices}
        initialServiceId={selectedServiceId}
      />

      <AdminCard padding="sm" className="space-y-1 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">Legenda:</p>
        <div className="flex flex-wrap gap-3">
          <LegendBadge className="bg-red-50 border-red-200">Bloccato / prenotato</LegendBadge>
          <LegendBadge className="bg-amber-50 border-amber-200">Parzialmente prenotato</LegendBadge>
          <LegendBadge className="bg-white border-slate-200">Disponibile</LegendBadge>
        </div>
        <p className="mt-2">Fino a 3 booking per cella; oltre mostra +N.</p>
      </AdminCard>
    </div>
  );
}

function buildCalendarDays(
  firstWeekday: number,
  monthStart: Date,
  enriched: DayCellEnriched[],
): DayCell[] {
  const days: DayCell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    days.push({ date: monthStart, bookings: [], status: "AVAILABLE", isPadding: true });
  }
  for (const day of enriched) {
    days.push({
      date: day.date,
      bookings: day.bookings.map((booking) => ({
        id: booking.id,
        source: booking.source,
        serviceName: booking.serviceName,
        serviceType: booking.serviceType,
        confirmationCode: booking.confirmationCode,
      })),
      status: day.status,
    });
  }
  return days;
}

function calendarHref({
  year,
  month,
  view,
}: {
  year?: number;
  month?: number;
  view?: string;
}): string {
  const search = new URLSearchParams();
  if (year) search.set("year", String(year));
  if (month) search.set("month", String(month));
  if (view && view !== "all") search.set("view", view);
  const qs = search.toString();
  return qs ? `/admin/calendario?${qs}` : "/admin/calendario";
}

function LegendBadge({ children, className }: { children: string; className: string }) {
  return <span className={`rounded border px-2 py-0.5 ${className}`}>{children}</span>;
}
