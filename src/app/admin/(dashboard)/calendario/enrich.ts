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

  for (const boat of input.boats) {
    const days: DayCellEnriched[] = [];
    const cursor = new Date(input.monthStart);
    while (cursor.getTime() <= input.monthEnd.getTime()) {
      const dateIso = cursor.toISOString().slice(0, 10);
      days.push({
        date: new Date(cursor),
        dateIso,
        status: "AVAILABLE",
        bookings: [],
        isAdminBlock: false,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    result.set(boat.id, days);
  }

  return result;
}
