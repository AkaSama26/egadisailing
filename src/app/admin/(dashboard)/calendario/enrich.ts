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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void input;
  return new Map();
}
