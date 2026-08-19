import {
  AVAILABILITY_STATUS_LABEL,
  labelOrRaw,
} from "@/lib/admin/labels";

export interface DayCellBooking {
  id: string;
  source: string;
  serviceName: string;
  serviceType?: string | null;
  confirmationCode: string;
  numPeople: number;
  isExclusive: boolean;
}

export interface DayCell {
  date: Date;
  bookings: DayCellBooking[];
  totalPeople: number;
  capacityMax: number | null;
  hasExclusiveBooking: boolean;
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  isPadding?: boolean;
}

export interface CalendarGridProps {
  days: DayCell[];
  boatName: string;
  boatId?: string;
  selectedDateIso?: string;
  onDayClick?: (dateIso: string) => void;
}

function dayTone(day: DayCell): string {
  if (day.hasExclusiveBooking) return "border-fuchsia-200 bg-fuchsia-50";
  const fillRatio = day.capacityMax ? day.totalPeople / day.capacityMax : 0;
  if (fillRatio >= 1) return "border-rose-200 bg-rose-50";
  if (fillRatio >= 0.65) return "border-amber-200 bg-amber-50";
  if (day.totalPeople > 0) return "border-emerald-200 bg-emerald-50";
  if (day.status === "BLOCKED") return "border-red-200 bg-red-50";
  return "border-slate-200 bg-white";
}

function bookingCountLabel(count: number): string {
  return `${count} ${count === 1 ? "prenotazione" : "prenotazioni"}`;
}

interface CalendarDayEntry {
  day: DayCell;
  index: number;
}

export interface CalendarDayGroup {
  entries: CalendarDayEntry[];
  charterBooking: DayCellBooking | null;
}

function cabinCharterBooking(day: DayCell): DayCellBooking | null {
  return day.bookings.find((booking) => booking.serviceType === "CABIN_CHARTER") ?? null;
}

/**
 * Raggruppa le giornate consecutive dello stesso cabin charter senza mai
 * attraversare il limite domenica/lunedi'. Il risultato puo' quindi essere
 * renderizzato come un solo elemento CSS Grid esteso su piu' colonne.
 */
export function groupCalendarDays(days: DayCell[]): CalendarDayGroup[] {
  const groups: CalendarDayGroup[] = [];
  let index = 0;

  while (index < days.length) {
    const day = days[index];
    const charterBooking = day.isPadding ? null : cabinCharterBooking(day);
    if (!charterBooking) {
      groups.push({ entries: [{ day, index }], charterBooking: null });
      index += 1;
      continue;
    }

    const entries: CalendarDayEntry[] = [{ day, index }];
    const weekEndExclusive = Math.min(days.length, index + (7 - (index % 7)));
    let cursor = index + 1;
    while (cursor < weekEndExclusive) {
      const nextDay = days[cursor];
      const nextCharter = nextDay.isPadding ? null : cabinCharterBooking(nextDay);
      if (nextCharter?.id !== charterBooking.id) break;
      entries.push({ day: nextDay, index: cursor });
      cursor += 1;
    }

    groups.push({ entries, charterBooking });
    index = cursor;
  }

  return groups;
}

export function CalendarGrid({
  days,
  boatName,
  boatId,
  selectedDateIso,
  onDayClick,
}: CalendarGridProps) {
  const groups = groupCalendarDays(days);

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((dayName) => (
        <div key={dayName} className="px-1 py-1.5 text-center font-semibold text-slate-500">
          {dayName}
        </div>
      ))}
      {groups.map((group) =>
        group.charterBooking ? (
          <CharterDayGroup
            key={`charter-${group.charterBooking.id}-${group.entries[0].index}`}
            group={group}
            boatName={boatName}
            boatId={boatId}
            selectedDateIso={selectedDateIso}
            onDayClick={onDayClick}
          />
        ) : (
          <RegularDayCell
            key={`day-${group.entries[0].index}`}
            entry={group.entries[0]}
            boatName={boatName}
            boatId={boatId}
            selectedDateIso={selectedDateIso}
            onDayClick={onDayClick}
          />
        ),
      )}
    </div>
  );
}

function CharterDayGroup({
  group,
  boatName,
  boatId,
  selectedDateIso,
  onDayClick,
}: {
  group: CalendarDayGroup;
  boatName: string;
  boatId?: string;
  selectedDateIso?: string;
  onDayClick?: (dateIso: string) => void;
}) {
  const charterBooking = group.charterBooking;
  if (!charterBooking) return null;

  const hasSelectedDate = group.entries.some(
    ({ day }) => day.date.toISOString().slice(0, 10) === selectedDateIso,
  );

  return (
    <div
      className={`relative grid h-[clamp(4.25rem,9vh,5.25rem)] overflow-hidden rounded border border-fuchsia-300 bg-fuchsia-50 transition-shadow 2xl:h-[min(5.75rem,9.6vh)] ${
        onDayClick ? "hover:shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-600" : ""
      } ${hasSelectedDate ? "ring-2 ring-fuchsia-700 ring-offset-1" : ""}`}
      style={{
        gridColumn: `span ${group.entries.length}`,
        gridTemplateColumns: `repeat(${group.entries.length}, minmax(0, 1fr))`,
      }}
    >
      <span className="pointer-events-none absolute inset-x-1 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center px-1 pt-2 text-center">
        <span className="text-[10px] font-black uppercase tracking-wide text-fuchsia-900 sm:text-xs">
          Charter
        </span>
        <span className="mt-0.5 line-clamp-1 text-[8px] leading-tight text-fuchsia-700 sm:text-[9px]">
          {charterBooking.serviceName}
        </span>
      </span>

      {group.entries.map(({ day }, entryIndex) => {
        const dayNum = day.date.getUTCDate();
        const dateIso = day.date.toISOString().slice(0, 10);
        const cellId = boatId ? `cell-${boatId}-${dateIso}` : undefined;
        const isSelected = selectedDateIso === dateIso;
        return (
          <button
            key={dateIso}
            id={cellId}
            type="button"
            onClick={() => onDayClick?.(dateIso)}
            disabled={!onDayClick}
            className={`relative z-10 h-full p-1.5 text-left transition-colors ${
              entryIndex > 0 ? "border-l border-fuchsia-200/80" : ""
            } ${
              onDayClick
                ? "cursor-pointer hover:bg-fuchsia-100/60 focus:outline-none"
                : "cursor-default"
            }`}
            aria-label={`${boatName}, giorno ${dayNum}: Charter, ${charterBooking.serviceName}, ${bookingCountLabel(day.bookings.length)}`}
          >
            <span className="absolute left-1.5 top-1.5 text-[11px] font-semibold text-fuchsia-950">
              {dayNum}
            </span>
            {isSelected && (
              <span
                className="absolute inset-x-1.5 bottom-1 h-0.5 rounded-full bg-fuchsia-700"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function RegularDayCell({
  entry,
  boatName,
  boatId,
  selectedDateIso,
  onDayClick,
}: {
  entry: CalendarDayEntry;
  boatName: string;
  boatId?: string;
  selectedDateIso?: string;
  onDayClick?: (dateIso: string) => void;
}) {
  const { day, index } = entry;
  if (day.isPadding) {
    return (
      <div
        className="h-[clamp(4.25rem,9vh,5.25rem)] rounded bg-slate-50/50 2xl:h-[min(5.75rem,9.6vh)]"
        aria-hidden="true"
      />
    );
  }

  const dayNum = day.date.getUTCDate();
  const dateIso = day.date.toISOString().slice(0, 10);
  const cellId = boatId ? `cell-${boatId}-${dateIso}` : undefined;
  const isSelected = selectedDateIso === dateIso;
  const exclusiveBooking = day.bookings.find((booking) => booking.isExclusive);
  const statusLabel = labelOrRaw(AVAILABILITY_STATUS_LABEL, day.status);
  const displayLabel = day.hasExclusiveBooking
    ? "Exclusive"
    : day.totalPeople > 0
      ? `${day.totalPeople} persone`
      : statusLabel;

  return (
    <button
      key={`${dateIso}-${index}`}
      id={cellId}
      type="button"
      onClick={() => onDayClick?.(dateIso)}
      disabled={!onDayClick}
      className={`relative h-[clamp(4.25rem,9vh,5.25rem)] overflow-hidden rounded border p-1.5 text-left transition 2xl:h-[min(5.75rem,9.6vh)] ${dayTone(day)} ${
        onDayClick
          ? "cursor-pointer hover:-translate-y-px hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          : "cursor-default"
      } ${isSelected ? "ring-2 ring-slate-700 ring-offset-1" : ""}`}
      aria-label={`${boatName}, giorno ${dayNum}: ${displayLabel}, ${bookingCountLabel(day.bookings.length)}`}
    >
      <span className="absolute left-1.5 top-1.5 text-[11px] font-semibold text-slate-600">
        {dayNum}
      </span>

      {day.hasExclusiveBooking ? (
        <span className="flex h-full flex-col items-center justify-center px-1 pt-3 text-center">
          <span className="text-[10px] font-black uppercase tracking-wide text-fuchsia-800 sm:text-xs">
            Exclusive
          </span>
          {exclusiveBooking && (
            <span className="mt-1 line-clamp-1 text-[8px] leading-tight text-fuchsia-700 sm:text-[9px]">
              {exclusiveBooking.serviceName}
            </span>
          )}
        </span>
      ) : day.totalPeople > 0 ? (
        <span className="flex h-full flex-col items-center justify-center pt-2 text-center">
          <span className="text-xl font-black leading-none tabular-nums text-slate-950 sm:text-2xl">
            {day.totalPeople}
          </span>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[9px]">
            persone
          </span>
          <span className="mt-1 text-[8px] text-slate-500 sm:text-[9px]">
            {day.bookings.length} prenot.
          </span>
        </span>
      ) : day.status === "BLOCKED" ? (
        <span className="flex h-full items-center justify-center pt-2 text-center text-[9px] font-bold uppercase tracking-wide text-red-700 sm:text-[10px]">
          Bloccato
        </span>
      ) : null}
    </button>
  );
}
