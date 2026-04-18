/**
 * Utility per lavorare con "giorni di calendario" (senza time).
 *
 * Tutto lo stack (BoatAvailability, HotDayOverride, PricingPeriod) usa date
 * normalizzate a UTC midnight. Queste funzioni sono la source of truth —
 * ogni bug qui impatta idempotency keys, unique constraints, pricing.
 */

/**
 * Normalizza una Date a UTC midnight (00:00:00.000 UTC), mantenendo
 * year/month/day dalla Date originale (in UTC).
 *
 * Esempio: input 2026-07-15T14:30:00Z → output 2026-07-15T00:00:00Z
 */
export function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Restituisce la rappresentazione ISO "YYYY-MM-DD" di una Date.
 * Usa la parte UTC.
 */
export function isoDay(d: Date): string {
  return toUtcDay(d).toISOString().slice(0, 10);
}

/**
 * Parsa una stringa "YYYY-MM-DD" in una Date UTC midnight.
 * Throws se il formato è invalido.
 */
export function parseIsoDay(s: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`Invalid ISO day format: ${s}`);
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${s}`);
  }
  return d;
}

/**
 * Generator che yielda ogni giorno UTC tra start ed end inclusi.
 */
export function* eachUtcDayInclusive(start: Date, end: Date): Generator<Date> {
  const cursor = toUtcDay(start);
  const final = toUtcDay(end);
  while (cursor.getTime() <= final.getTime()) {
    yield new Date(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}

/**
 * Numero di giorni tra due date (inclusivo).
 */
export function daysBetween(start: Date, end: Date): number {
  const ms = toUtcDay(end).getTime() - toUtcDay(start).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}
