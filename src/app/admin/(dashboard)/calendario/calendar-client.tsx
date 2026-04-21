"use client";

import { useState, useMemo, useEffect } from "react";
import { CalendarGrid, type DayCell } from "@/components/admin/calendar-grid";
import { DayActionsModal } from "@/components/admin/day-actions-modal";
import type { DayCellEnriched } from "./enrich";

export interface CalendarClientProps {
  boatId: string;
  boatName: string;
  days: DayCell[];
  enriched: DayCellEnriched[];
}

export function CalendarClient({ boatId, boatName, days, enriched }: CalendarClientProps) {
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);

  const enrichedByIso = useMemo(() => {
    const map = new Map<string, DayCellEnriched>();
    for (const e of enriched) map.set(e.dateIso, e);
    return map;
  }, [enriched]);

  const dataVersion = useMemo(
    () => enriched.map((d) => `${d.dateIso}:${d.status}:${d.bookings.length}`).join("|"),
    [enriched],
  );

  // R29-calendar: post-revalidatePath → enriched prop cambia → dataVersion
  // cambia → chiudiamo il modal eventualmente aperto.
  useEffect(() => {
    setSelectedDateIso(null);
  }, [dataVersion]);

  const selectedDay = selectedDateIso ? enrichedByIso.get(selectedDateIso) ?? null : null;

  return (
    <>
      <CalendarGrid
        days={days}
        boatName={boatName}
        boatId={boatId}
        onDayClick={(dateIso) => setSelectedDateIso(dateIso)}
      />
      {selectedDay && (
        <DayActionsModal
          boatId={boatId}
          boatName={boatName}
          day={selectedDay}
          onClose={() => setSelectedDateIso(null)}
        />
      )}
    </>
  );
}
