// @ts-nocheck - legacy schema references, refactored in Plan 5
import { db } from "@/lib/db";
import { TripCalendar } from "../../_components/trip-calendar";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) - 1 : now.getMonth();
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const trips = await db.trip.findMany({
    where: { date: { gte: startOfMonth, lte: endOfMonth } },
    include: {
      service: { select: { name: true, type: true, capacityMax: true } },
      _count: { select: { bookings: true } },
      crew: {
        include: { crewMember: { select: { name: true, role: true } } },
      },
    },
    orderBy: { date: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendario</h1>
      <TripCalendar trips={trips} month={month} year={year} />
    </div>
  );
}
