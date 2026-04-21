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

/**
 * Estrae reason + blockedAt + range date da un AuditLog MANUAL_BLOCK.
 * Ritorna null se il log non e' un admin-block valido. Il range puo' essere
 * assente (log redatto dal retention cron): in quel caso `startDate`/`endDate`
 * sono undefined e il merge usa un fallback per-boat (attach solo blockedAt
 * a celle admin-block che non hanno un entry piu' specifico).
 */
export function extractAuditBlockInfo(
  log: EnrichInput["auditLogs"][number],
):
  | { reason?: string; blockedAt: string; startDate?: string; endDate?: string }
  | null {
  const after = log.after as Record<string, unknown> | null;
  if (!after || typeof after !== "object") return null;
  const result: {
    reason?: string;
    blockedAt: string;
    startDate?: string;
    endDate?: string;
  } = {
    blockedAt: log.timestamp.toISOString(),
  };
  if (typeof after.reason === "string" && after.reason.trim()) {
    result.reason = after.reason;
  }
  if (typeof after.startDate === "string") result.startDate = after.startDate;
  if (typeof after.endDate === "string") result.endDate = after.endDate;
  return result;
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

  // Ordina audit logs per timestamp desc: il piu' recente vince sui
  // duplicati (entry successive non sovrascrivono quelli gia' mappati).
  const sortedLogs = [...input.auditLogs].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  // Pass 1: logs con range esplicito → attach a ogni cella (boatId, dateIso).
  const blockInfoByKey = new Map<string, { reason?: string; blockedAt: string }>();
  // Pass 2 fallback: logs senza range (redatti retention) → attach a qualsiasi
  // cella admin-block del boat non gia' mappata in pass 1.
  const fallbackByBoat = new Map<string, { reason?: string; blockedAt: string }>();

  for (const log of sortedLogs) {
    const info = extractAuditBlockInfo(log);
    if (!info) continue;
    const from = info.startDate ? new Date(info.startDate) : null;
    const to = info.endDate ? new Date(info.endDate) : from;
    if (from && to) {
      const cursor = new Date(from);
      while (cursor.getTime() <= to.getTime()) {
        const key = `${log.entityId}|${cursor.toISOString().slice(0, 10)}`;
        if (!blockInfoByKey.has(key)) {
          blockInfoByKey.set(key, { reason: info.reason, blockedAt: info.blockedAt });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      // Log redatto (retention cron ha rimosso startDate/endDate/reason):
      // conserviamo il blockedAt come fallback per-boat. Il piu' recente
      // vince (sortedLogs desc), quindi set solo se non gia' presente.
      if (!fallbackByBoat.has(log.entityId)) {
        fallbackByBoat.set(log.entityId, {
          reason: info.reason,
          blockedAt: info.blockedAt,
        });
      }
    }
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
      const blockInfo = isAdminBlock
        ? (blockInfoByKey.get(`${boat.id}|${dateIso}`) ??
          fallbackByBoat.get(boat.id))
        : undefined;
      days.push({
        date: new Date(cursor),
        dateIso,
        status: avail?.status ?? "AVAILABLE",
        bookings: dayBookings,
        isAdminBlock,
        adminBlockInfo: blockInfo,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    result.set(boat.id, days);
  }

  return result;
}
