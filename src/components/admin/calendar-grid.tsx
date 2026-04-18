export interface DayCellBooking {
  id: string;
  source: string;
  serviceName: string;
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

export function CalendarGrid({ days, boatName }: { days: DayCell[]; boatName: string }) {
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
          const bg =
            day.status === "BLOCKED"
              ? "bg-red-50 border-red-200"
              : day.status === "PARTIALLY_BOOKED"
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-slate-200";
          return (
            <div
              key={i}
              className={`aspect-square border rounded p-1 flex flex-col ${bg}`}
            >
              <div className="text-slate-600 text-[11px] font-medium">{dayNum}</div>
              <div className="flex-1 flex flex-col gap-0.5 mt-1 overflow-hidden">
                {day.bookings.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className={`px-1 rounded text-[9px] truncate ${sourceColors[b.source] ?? "bg-slate-100 text-slate-700"}`}
                    title={`${b.confirmationCode} · ${b.serviceName}`}
                  >
                    {b.source.slice(0, 3)}
                  </span>
                ))}
                {day.bookings.length > 3 && (
                  <span className="text-[9px] text-slate-500">+{day.bookings.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
