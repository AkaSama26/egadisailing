import type { BookingSource, BookingStatus } from "@/generated/prisma/enums";

export interface DayCellEnriched {
  date: Date;
  dateIso: string;
  status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
  bookings: Array<{
    id: string;
    confirmationCode: string;
    source: BookingSource;
    status: BookingStatus;
    serviceName: string;
    customerName: string;
  }>;
  isAdminBlock: boolean;
  adminBlockInfo?: {
    reason?: string;
    blockedAt: string;
  };
}

export interface EnrichInput {
  boats: Array<{ id: string; name: string }>;
  bookings: Array<{
    id: string;
    confirmationCode: string;
    source: BookingSource;
    status: BookingStatus;
    boatId: string;
    startDate: Date;
    endDate: Date;
    service: { name: string };
    customer: { firstName: string; lastName: string };
  }>;
  availability: Array<{
    boatId: string;
    date: Date;
    status: "AVAILABLE" | "BLOCKED" | "PARTIALLY_BOOKED";
    lockedByBookingId: string | null;
  }>;
  auditLogs: Array<{
    entityId: string;
    after: unknown;
    timestamp: Date;
  }>;
  monthStart: Date;
  monthEnd: Date;
}

export function enrichDayCells(input: EnrichInput): Map<string, DayCellEnriched[]> {
  const result = new Map<string, DayCellEnriched[]>();

  // Availability map: key `${boatId}|${dateIso}`
  const availMap = new Map<string, (typeof input.availability)[number]>();
  for (const a of input.availability) {
    const key = `${a.boatId}|${a.date.toISOString().slice(0, 10)}`;
    availMap.set(key, a);
  }

  // Bookings indexed by boatId → evita scan O(boats × bookings) per cella.
  const bookingsByBoat = new Map<string, EnrichInput["bookings"]>();
  for (const b of input.bookings) {
    const list = bookingsByBoat.get(b.boatId) ?? [];
    list.push(b);
    bookingsByBoat.set(b.boatId, list);
  }

  for (const boat of input.boats) {
    const days: DayCellEnriched[] = [];
    const boatBookings = bookingsByBoat.get(boat.id) ?? [];
    const cursor = new Date(input.monthStart);
    while (cursor.getTime() <= input.monthEnd.getTime()) {
      const dateIso = cursor.toISOString().slice(0, 10);
      const avail = availMap.get(`${boat.id}|${dateIso}`);
      const isAdminBlock =
        !!avail && avail.status === "BLOCKED" && avail.lockedByBookingId === null;
      const dayMs = cursor.getTime();
      const dayBookings = boatBookings
        .filter(
          (b) => b.startDate.getTime() <= dayMs && b.endDate.getTime() >= dayMs,
        )
        .slice(0, 20) // cap R17 perf: la UI mostra max 3 + "+N" label
        .map((b) => ({
          id: b.id,
          confirmationCode: b.confirmationCode,
          source: b.source,
          status: b.status,
          serviceName: b.service.name,
          customerName: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
        }));
      days.push({
        date: new Date(cursor),
        dateIso,
        status: avail?.status ?? "AVAILABLE",
        bookings: dayBookings,
        isAdminBlock,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    result.set(boat.id, days);
  }

  return result;
}
