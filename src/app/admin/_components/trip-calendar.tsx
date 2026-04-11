"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const serviceColors: Record<string, string> = {
  SOCIAL_BOATING: "bg-blue-100 text-blue-800",
  EXCLUSIVE_EXPERIENCE: "bg-purple-100 text-purple-800",
  CABIN_CHARTER: "bg-amber-100 text-amber-800",
  BOAT_SHARED: "bg-green-100 text-green-800",
  BOAT_EXCLUSIVE: "bg-teal-100 text-teal-800",
};

interface TripCalendarProps {
  trips: {
    id: string;
    date: Date;
    departureTime: string;
    returnTime: string;
    availableSpots: number;
    status: string;
    service: { name: string; type: string; capacityMax: number };
    _count: { bookings: number };
    crew: { crewMember: { name: string; role: string } }[];
  }[];
  month: number; // 0-indexed
  year: number;
}

function getCalendarGrid(month: number, year: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // getDay() returns 0=Sun, we need 0=Mon
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];

  // Padding before
  for (let i = 0; i < startDow; i++) {
    cells.push(null);
  }

  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  // Padding after to fill last row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function navHref(month: number, year: number) {
  // month is 0-indexed internally, URL uses 1-indexed
  let m = month;
  let y = year;
  if (m < 0) {
    m = 11;
    y -= 1;
  } else if (m > 11) {
    m = 0;
    y += 1;
  }
  return `/admin/calendar?month=${m + 1}&year=${y}`;
}

export function TripCalendar({ trips, month, year }: TripCalendarProps) {
  const cells = getCalendarGrid(month, year);
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();

  // Group trips by day
  const tripsByDay = new Map<number, TripCalendarProps["trips"]>();
  for (const trip of trips) {
    const d = new Date(trip.date).getDate();
    if (!tripsByDay.has(d)) {
      tripsByDay.set(d, []);
    }
    tripsByDay.get(d)!.push(trip);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" render={<Link href={navHref(month - 1, year)} />}>
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="icon" render={<Link href={navHref(month + 1, year)} />}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted overflow-hidden">
        {/* Day headers */}
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, idx) => {
          const dayTrips = day ? tripsByDay.get(day) ?? [] : [];
          const isToday = isCurrentMonth && day === todayDate;

          return (
            <div
              key={idx}
              className={`min-h-28 bg-background p-1.5 ${
                day === null ? "bg-muted/50" : ""
              }`}
            >
              {day !== null && (
                <>
                  <div
                    className={`mb-1 text-xs font-medium ${
                      isToday
                        ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTrips.map((trip) => {
                      const colors =
                        serviceColors[trip.service.type] ??
                        "bg-gray-100 text-gray-800";
                      return (
                        <div
                          key={trip.id}
                          className={`rounded px-1.5 py-0.5 text-[10px] leading-tight ${colors}`}
                        >
                          <div className="truncate font-medium">
                            {trip.service.name}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span>
                              {trip._count.bookings}/{trip.service.capacityMax}
                            </span>
                            <span>{trip.departureTime}</span>
                          </div>
                          {trip.crew.length > 0 && (
                            <div className="truncate text-[9px] opacity-75">
                              {trip.crew
                                .map((c) => c.crewMember.name)
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
