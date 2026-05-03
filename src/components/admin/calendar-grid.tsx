import {
  AVAILABILITY_STATUS_LABEL,
  labelOrRaw,
  serviceBookingCode,
} from "@/lib/admin/labels";

export interface DayCellBooking {
  id: string;
  source: string;
  serviceName: string;
  serviceType?: string | null;
  confirmationCode: string;
}

export interface DayCell {
  date: Date;
  bookings: DayCellBooking[];
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  isPadding?: boolean;
}

const sourceColors: Record<string, string> = {
  DIRECT: "bg-blue-100 text-blue-800",
  BOKUN: "bg-purple-100 text-purple-800",
  BOATAROUND: "bg-emerald-100 text-emerald-800",
  SAMBOAT: "bg-cyan-100 text-cyan-800",
  CLICKANDBOAT: "bg-amber-100 text-amber-800",
  NAUTAL: "bg-rose-100 text-rose-800",
};

const serviceTypeColors: Record<string, string> = {
  EXCLUSIVE_EXPERIENCE: "bg-fuchsia-100 text-fuchsia-800",
  CABIN_CHARTER: "bg-indigo-100 text-indigo-800",
  BOAT_SHARED: "bg-emerald-100 text-emerald-800",
  BOAT_EXCLUSIVE: "bg-orange-100 text-orange-800",
  SOCIAL_BOATING: "bg-cyan-100 text-cyan-800",
};

export interface CalendarGridProps {
  days: DayCell[];
  boatName: string;
  boatId?: string;
  onDayClick?: (dateIso: string) => void;
}

export function CalendarGrid({ days, boatName, boatId, onDayClick }: CalendarGridProps) {
  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-3">{boatName}</h2>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
          <div key={d} className="text-center font-semibold text-slate-500 p-2">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (day.isPadding) {
            return <div key={i} className="aspect-square bg-slate-50/40 rounded" />;
          }
          const dayNum = day.date.getUTCDate();
          const dateIso = day.date.toISOString().slice(0, 10);
          const cellId = boatId ? `cell-${boatId}-${dateIso}` : undefined;
          const bg =
            day.status === "BLOCKED"
              ? "bg-red-50 border-red-200"
              : day.status === "PARTIALLY_BOOKED"
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200";
          const isInteractive = !!onDayClick;
          const interactiveCls = isInteractive
            ? "cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
            : "";
          const bookingCodes = day.bookings.map((booking) =>
            serviceBookingCode({
              type: booking.serviceType,
              name: booking.serviceName,
            }),
          );

          const content = (
            <>
              <div className="text-slate-600 text-[11px] font-medium">{dayNum}</div>
              <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                {day.bookings.slice(0, 3).map((b) => {
                  const bookingCode = serviceBookingCode({
                    type: b.serviceType,
                    name: b.serviceName,
                  });
                  return (
                    <span
                      key={b.id}
                      className={`inline-flex h-4 max-w-full items-center rounded px-1 text-[9px] font-bold leading-none ${
                        serviceTypeColors[b.serviceType ?? ""] ??
                        sourceColors[b.source] ??
                        "bg-slate-100 text-slate-700"
                      }`}
                      title={`${bookingCode} · ${b.confirmationCode} · ${b.serviceName} · ${b.source}`}
                    >
                      <span className="truncate">{bookingCode}</span>
                    </span>
                  );
                })}
                {day.bookings.length > 3 && (
                  <span className="text-[9px] text-slate-500">
                    +{day.bookings.length - 3}
                  </span>
                )}
              </div>
            </>
          );

          if (!isInteractive) {
            return (
              <div
                key={i}
                id={cellId}
                className={`aspect-square border rounded p-1 flex flex-col ${bg}`}
              >
                {content}
              </div>
            );
          }
          return (
            <button
              key={i}
              id={cellId}
              type="button"
              onClick={() => onDayClick?.(dateIso)}
              className={`aspect-square border rounded p-1 flex flex-col text-left ${bg} ${interactiveCls}`}
              aria-label={`${dayNum} — ${labelOrRaw(AVAILABILITY_STATUS_LABEL, day.status)}, ${day.bookings.length} prenotazioni${
                bookingCodes.length ? `: ${bookingCodes.join(", ")}` : ""
              }`}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
