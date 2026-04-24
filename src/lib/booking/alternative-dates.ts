"use server";

import { db } from "@/lib/db";

/**
 * Trova le prossime N date dove il boat+service non hanno booking attivi
 * ne' admin-block. Skip dei giorni con conflict in [PENDING,CONFIRMED].
 * Scan fino a 60gg avanti dal `aroundDate` (escluso). Stop al `limit`.
 *
 * Usato dagli email rejection/expired/superseded per suggerire alternative
 * al customer perdente.
 */
export async function findAlternativeDates(
  boatId: string,
  _serviceId: string,
  aroundDate: Date,
  limit: number,
): Promise<Date[]> {
  const results: Date[] = [];
  for (let i = 1; i <= 60 && results.length < limit; i++) {
    const candidate = new Date(aroundDate);
    candidate.setUTCDate(candidate.getUTCDate() + i);
    const conflicts = await db.booking.count({
      where: {
        boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startDate: { lte: candidate },
        endDate: { gte: candidate },
      },
    });
    if (conflicts === 0) {
      const block = await db.boatAvailability.count({
        where: { boatId, date: candidate, status: "BLOCKED", lockedByBookingId: null },
      });
      if (block === 0) results.push(candidate);
    }
  }
  return results;
}

/**
 * Come findAlternativeDates, ma ritorna date gia' formattate come ISO
 * (yyyy-mm-dd). Helper per email loser che hanno alternativeDates:
 * string[].
 */
export async function getAlternativeDatesIso(
  boatId: string,
  serviceId: string,
  aroundDate: Date,
  limit: number,
): Promise<string[]> {
  const dates = await findAlternativeDates(boatId, serviceId, aroundDate, limit);
  return dates.map((d) => d.toISOString().slice(0, 10));
}
