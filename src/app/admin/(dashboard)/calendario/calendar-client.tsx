"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  ExternalLink,
  Lock,
  Plus,
  Unlock,
  Users,
} from "lucide-react";
import { CalendarGrid, type DayCell } from "@/components/admin/calendar-grid";
import { DayActionsModal } from "@/components/admin/day-actions-modal";
import {
  ManualBookingModal,
  type ManualBookingServiceOption,
} from "@/components/admin/manual-booking-modal";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  AVAILABILITY_STATUS_LABEL,
  BOOKING_SOURCE_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";
import { formatItDay } from "@/lib/dates";
import type { DayCellEnriched } from "./enrich";

export interface CalendarWeatherSummary {
  date: string;
  risk: string;
  reasons: string[];
  forecast: {
    temperatureMax: number;
    temperatureMin: number;
    windSpeedKmh: number;
    windGustKmh: number;
    precipitationProbability: number;
    precipitationMm: number;
    waveHeightM: number | null;
  };
}

export interface CalendarBoatView {
  boatId: string;
  boatName: string;
  days: DayCell[];
  enriched: DayCellEnriched[];
}

export interface CalendarClientProps {
  calendars: CalendarBoatView[];
  weather: CalendarWeatherSummary[];
  initialSelected?: { boatId: string; dateIso: string } | null;
  initialBoatId?: string | null;
  year: number;
  month: number;
  monthLabel: string;
  services: ManualBookingServiceOption[];
  initialServiceId?: string | null;
}

export function CalendarClient({
  calendars,
  weather,
  initialSelected,
  initialBoatId,
  year,
  month,
  monthLabel,
  services,
  initialServiceId,
}: CalendarClientProps) {
  const fallbackSelected = useMemo(() => {
    if (initialSelected) return initialSelected;
    const firstCalendar = calendars[0];
    const firstDay = firstCalendar?.enriched[0];
    return firstCalendar && firstDay
      ? { boatId: firstCalendar.boatId, dateIso: firstDay.dateIso }
      : null;
  }, [calendars, initialSelected]);

  const [activeBoatId, setActiveBoatId] = useState(
    initialBoatId ?? fallbackSelected?.boatId ?? calendars[0]?.boatId ?? null,
  );
  const [selected, setSelected] = useState<{ boatId: string; dateIso: string } | null>(fallbackSelected);
  const [actionDay, setActionDay] = useState<{
    boatId: string;
    boatName: string;
    day: DayCellEnriched;
  } | null>(null);
  const [manualBookingDay, setManualBookingDay] = useState<{
    boatId: string;
    boatName: string;
    day: DayCellEnriched;
  } | null>(null);

  const enrichedByKey = useMemo(() => {
    const map = new Map<string, { boatId: string; boatName: string; day: DayCellEnriched }>();
    for (const calendar of calendars) {
      for (const day of calendar.enriched) {
        map.set(`${calendar.boatId}|${day.dateIso}`, {
          boatId: calendar.boatId,
          boatName: calendar.boatName,
          day,
        });
      }
    }
    return map;
  }, [calendars]);

  const weatherByDate = useMemo(() => {
    const map = new Map<string, CalendarWeatherSummary>();
    for (const item of weather) map.set(item.date, item);
    return map;
  }, [weather]);

  const activeCalendar = calendars.find((calendar) => calendar.boatId === activeBoatId) ?? null;

  const selectedRecord = selected
    ? enrichedByKey.get(`${selected.boatId}|${selected.dateIso}`) ?? null
    : null;
  const selectedWeather = selectedRecord
    ? weatherByDate.get(selectedRecord.day.dateIso)
    : undefined;

  const prev = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const next = month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };

  function selectBoat(boatId: string) {
    const calendar = calendars.find((item) => item.boatId === boatId);
    if (!calendar) return;

    const requestedDate = selected?.dateIso;
    const dateIso = requestedDate && calendar.enriched.some((day) => day.dateIso === requestedDate)
      ? requestedDate
      : calendar.enriched[0]?.dateIso;

    setActiveBoatId(boatId);
    if (dateIso) setSelected({ boatId, dateIso });
    setActionDay(null);
    setManualBookingDay(null);

    const url = new URL(window.location.href);
    url.searchParams.set("boat", boatId);
    url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
      <div>
        {!activeCalendar ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Nessun mezzo disponibile per questo periodo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center border-b border-slate-200 px-3 py-2">
              <Link
                href={calendarHref(prev.year, prev.month, activeBoatId)}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Mese precedente"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Link>
              <h2 className="text-center text-base font-bold capitalize text-slate-950">
                {monthLabel}
              </h2>
              <Link
                href={calendarHref(next.year, next.month, activeBoatId)}
                className="inline-flex size-8 items-center justify-center justify-self-end rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Mese successivo"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div
              role="tablist"
              aria-label="Seleziona il mezzo"
              className="flex gap-1.5 overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-3 py-2"
            >
              {calendars.map((calendar) => {
                const summaryDate = selected?.dateIso ?? calendar.enriched[0]?.dateIso;
                const summaryDay = calendar.enriched.find((day) => day.dateIso === summaryDate);
                const summary = summaryDay?.hasExclusiveBooking
                  ? "Exclusive"
                  : `${summaryDay?.totalPeople ?? 0} persone`;
                const isActive = calendar.boatId === activeCalendar.boatId;

                return (
                  <button
                    key={calendar.boatId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectBoat(calendar.boatId)}
                    className={`min-w-max rounded-lg border px-3 py-1.5 text-left transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-xs font-semibold">{calendar.boatName}</span>
                    <span className={`block text-[10px] ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {summary}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 sm:p-3">
              <CalendarGrid
                days={activeCalendar.days}
                boatName={activeCalendar.boatName}
                boatId={activeCalendar.boatId}
                selectedDateIso={selected?.boatId === activeCalendar.boatId ? selected.dateIso : undefined}
                onDayClick={(dateIso) =>
                  setSelected({ boatId: activeCalendar.boatId, dateIso })
                }
              />
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200 px-3 py-2 text-[10px] text-slate-600">
              <LegendItem className="bg-emerald-100" label="Bassa affluenza" />
              <LegendItem className="bg-amber-100" label="Media affluenza" />
              <LegendItem className="bg-rose-100" label="Alta affluenza" />
              <LegendItem className="bg-fuchsia-100" label="Exclusive / Charter" />
              <LegendItem className="bg-red-100" label="Bloccato" />
            </div>
          </div>
        )}
      </div>

      <aside className="xl:sticky xl:top-16">
        <DayDetail
          selected={selectedRecord}
          weather={selectedWeather}
          onOpenActions={(payload) => setActionDay(payload)}
          onOpenManualBooking={(payload) => setManualBookingDay(payload)}
        />
      </aside>

      {actionDay && (
        <DayActionsModal
          boatId={actionDay.boatId}
          boatName={actionDay.boatName}
          day={actionDay.day}
          onClose={() => setActionDay(null)}
        />
      )}

      {manualBookingDay && (
        <ManualBookingModal
          boatId={manualBookingDay.boatId}
          boatName={manualBookingDay.boatName}
          date={manualBookingDay.day.date}
          dateIso={manualBookingDay.day.dateIso}
          services={services}
          initialServiceId={initialServiceId}
          onClose={() => setManualBookingDay(null)}
        />
      )}
    </div>
  );
}

function DayDetail({
  selected,
  weather,
  onOpenActions,
  onOpenManualBooking,
}: {
  selected: { boatId: string; boatName: string; day: DayCellEnriched } | null;
  weather?: CalendarWeatherSummary;
  onOpenActions: (payload: { boatId: string; boatName: string; day: DayCellEnriched }) => void;
  onOpenManualBooking: (payload: { boatId: string; boatName: string; day: DayCellEnriched }) => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Seleziona un giorno nel calendario per vedere dettagli e azioni.
      </div>
    );
  }

  const { boatId, day, boatName } = selected;
  const statusClass =
    day.status === "BLOCKED"
      ? "border-red-200 bg-red-50 text-red-800"
      : day.status === "PARTIALLY_BOOKED"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {boatName}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{formatItDay(day.date)}</h2>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
          {labelOrRaw(AVAILABILITY_STATUS_LABEL, day.status)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
            <Users className="size-3.5" aria-hidden="true" />
            Persone prenotate
          </p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-slate-950">{day.totalPeople}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[10px] font-medium text-slate-500">Prenotazioni</p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-slate-950">
            {day.bookings.length}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <WeatherPanel weather={weather} />
      </div>

      {day.hasExclusiveBooking && (
        <div className="mt-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-800">
          Esperienza Exclusive
        </div>
      )}

      <div className="mt-3 flex flex-1 flex-col gap-3">

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-900">Prenotazioni del giorno</h3>
          {day.bookings.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
              Nessuna prenotazione su questa data.
            </p>
          ) : (
            <div className="space-y-1.5">
              {day.bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/admin/prenotazioni/${booking.id}`}
                  className="block rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-blue-700">
                        {booking.confirmationCode}
                      </p>
                      <p className="mt-0.5 truncate font-medium text-slate-900">
                        {booking.serviceName}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {booking.customerName} · {labelOrRaw(BOOKING_SOURCE_LABEL, booking.source)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <Users className="size-3" aria-hidden="true" />
                        {booking.numPeople} {booking.numPeople === 1 ? "persona" : "persone"}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} kind="booking" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-auto space-y-2">
          <h3 className="text-xs font-semibold text-slate-900">Azioni rapide</h3>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onOpenActions({ boatId, boatName, day })}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              {day.status === "BLOCKED" ? (
                <Unlock className="size-4" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )}
              {day.status === "BLOCKED" ? "Sblocca" : "Blocca giorno"}
            </button>
            <Link
              href={`/admin/prenotazioni?dateFrom=${encodeURIComponent(day.dateIso)}&dateTo=${encodeURIComponent(day.dateIso)}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Apri prenotazioni
            </Link>
            <button
              type="button"
              onClick={() => onOpenManualBooking({ boatId, boatName, day })}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nuova prenotazione
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function calendarHref(year: number, month: number, boatId: string | null): string {
  const search = new URLSearchParams({ year: String(year), month: String(month) });
  if (boatId) search.set("boat", boatId);
  return `/admin/calendario?${search.toString()}`;
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${className}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function WeatherPanel({ weather }: { weather?: CalendarWeatherSummary }) {
  if (!weather) {
    return (
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-500">
        <h3 className="font-semibold text-slate-900">Meteo</h3>
        <p className="mt-0.5">Dati non disponibili per questa data.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
          <CloudSun className="size-3.5 text-slate-500" aria-hidden="true" />
          Meteo
        </h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
          {weather.risk}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-4 gap-2 text-[10px] text-slate-600">
        <Metric label="Vento" value={`${Math.round(weather.forecast.windSpeedKmh)} km/h`} />
        <Metric label="Raffiche" value={`${Math.round(weather.forecast.windGustKmh)} km/h`} />
        <Metric label="Onde" value={weather.forecast.waveHeightM === null ? "n/d" : `${weather.forecast.waveHeightM.toFixed(1)} m`} />
        <Metric label="Pioggia" value={`${weather.forecast.precipitationProbability}%`} />
      </dl>
      {weather.reasons[0] && <p className="mt-2 text-[10px] text-slate-500">{weather.reasons[0]}</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
