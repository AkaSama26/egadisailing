import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { generateIcal, type IcalEvent } from "./formatter";

const ICAL_WINDOW_MONTHS = 24;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Genera il feed iCal per una barca leggendo `BoatAvailability` BLOCKED
 * nei prossimi 24 mesi e raggruppando date contigue per `lockedByBookingId`
 * in un singolo VEVENT.
 *
 * Uso: endpoint pubblico sottoscritto da SamBoat / Airbnb / portali iCal.
 *
 * @throws NotFoundError se il boatId non esiste.
 */
export async function generateBoatIcal(boatId: string): Promise<string> {
  const boat = await db.boat.findUnique({
    where: { id: boatId },
    select: { id: true, name: true },
  });
  if (!boat) throw new NotFoundError("Boat", boatId);

  const now = new Date();
  const limit = new Date(now);
  limit.setUTCMonth(limit.getUTCMonth() + ICAL_WINDOW_MONTHS);

  const availability = await db.boatAvailability.findMany({
    where: {
      boatId,
      status: "BLOCKED",
      date: { gte: now, lte: limit },
    },
    orderBy: { date: "asc" },
    select: { date: true, lockedByBookingId: true, updatedAt: true },
  });

  interface DayRange {
    start: Date;
    end: Date;
    bookingId: string | null;
    lastModified: Date;
  }
  const ranges: DayRange[] = [];
  for (const day of availability) {
    const last = ranges[ranges.length - 1];
    const contiguous = last && last.end.getTime() + DAY_MS === day.date.getTime();
    const sameBooking = last && last.bookingId === day.lockedByBookingId;
    if (last && contiguous && sameBooking) {
      last.end = day.date;
      if (day.updatedAt > last.lastModified) last.lastModified = day.updatedAt;
    } else {
      ranges.push({
        start: day.date,
        end: day.date,
        bookingId: day.lockedByBookingId,
        lastModified: day.updatedAt,
      });
    }
  }

  const events: IcalEvent[] = ranges.map((r, idx) => {
    // UID DEVE essere unico per ogni VEVENT (RFC5545 §3.8.4.7): includiamo
    // SEMPRE start-date e index per evitare collision quando un singolo
    // booking produce range non-contigui (es. cancellazione parziale 15-17
    // poi 19-22 stesso bookingId). Altrimenti Google Calendar silently-drop
    // il secondo VEVENT.
    const startKey = r.start.toISOString().slice(0, 10);
    const uid = r.bookingId
      ? `egadisailing-${r.bookingId}-${startKey}-${idx}@egadisailing.com`
      : `egadisailing-manual-${boatId}-${startKey}-${idx}@egadisailing.com`;
    return {
      uid,
      summary: "Prenotato",
      startDate: r.start,
      endDate: r.end,
      // GDPR data minimization: niente ID interno esposto a partner OTA.
      // "Prenotato" e' gia' sufficiente per bloccare lo slot lato consumer.
      description: "Prenotato",
      lastModified: r.lastModified,
    };
  });

  return generateIcal({
    prodId: "-//Egadisailing//Availability v2//IT",
    name: `${boat.name} Availability`,
    events,
  });
}
