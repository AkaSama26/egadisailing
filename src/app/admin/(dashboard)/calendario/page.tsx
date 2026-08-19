import { type DayCell } from "@/components/admin/calendar-grid";
import { PageHeader } from "@/components/admin/page-header";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { db } from "@/lib/db";
import { isoDay, toUtcDay } from "@/lib/dates";
import { getAllWeather } from "@/lib/weather/service";
import { CalendarClient, type CalendarBoatView, type CalendarWeatherSummary } from "./calendar-client";
import { enrichDayCells, type DayCellEnriched } from "./enrich";

interface Props {
  searchParams: Promise<{ month?: string; year?: string; boat?: string; view?: string }>;
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
        numPeople: true,
        startDate: true,
        endDate: true,
        service: { select: { name: true, type: true, capacityMax: true } },
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

  const legacyBoatId = sp.view?.startsWith("boat:")
    ? sp.view.slice("boat:".length)
    : undefined;
  const requestedBoatId = sp.boat ?? legacyBoatId;
  const initialBoatId = requestedBoatId && boats.some((boat) => boat.id === requestedBoatId)
    ? requestedBoatId
    : boats[0]?.id ?? null;

  const enriched = enrichDayCells({
    boats,
    bookings,
    availability,
    auditLogs,
    monthStart,
    monthEnd,
  });

  const calendars: CalendarBoatView[] = boats.map((boat) => {
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

  const todayIso = isoDay(toUtcDay(now));
  const initialDateIso = todayIso >= isoDay(monthStart) && todayIso <= isoDay(monthEnd)
    ? todayIso
    : isoDay(monthStart);
  const initialSelected = initialBoatId
    ? { boatId: initialBoatId, dateIso: initialDateIso }
    : null;
  const rawMonthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  return (
    <div>
      <PageHeader title="Calendario" />

      <CalendarClient
        key={`${year}-${month}-${initialBoatId ?? "none"}`}
        calendars={calendars}
        weather={weather}
        initialSelected={initialSelected}
        initialBoatId={initialBoatId}
        year={year}
        month={month}
        monthLabel={monthLabel}
        services={manualBookingServices}
      />
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
    days.push({
      date: monthStart,
      bookings: [],
      totalPeople: 0,
      capacityMax: null,
      hasExclusiveBooking: false,
      status: "AVAILABLE",
      isPadding: true,
    });
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
        numPeople: booking.numPeople,
        isExclusive: booking.isExclusive,
      })),
      totalPeople: day.totalPeople,
      capacityMax: day.capacityMax,
      hasExclusiveBooking: day.hasExclusiveBooking,
      status: day.status,
    });
  }
  return days;
}
