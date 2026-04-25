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
 * Parsa input datetime dal client (es. `new Date(dateInput).toISOString()`)
 * con intento "giorno locale Europe/Rome" e restituisce il day UTC corrispondente.
 *
 * Risolve il bug off-by-one: un cliente italiano che seleziona "7 aprile"
 * emette 2026-04-06T22:00Z — se normalizzato con `toUtcDay` diventa il 6
 * aprile. Qui riconosciamo il pattern "datetime alla mezzanotte locale
 * Europe/Rome" e restituiamo la data intesa.
 *
 * Strategia robusta: usa il day component dell'ISO string in Europe/Rome.
 */
export function parseDateLikelyLocalDay(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  // Formatta in Europe/Rome e ri-estrae YYYY-MM-DD.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const iso = fmt.format(d); // "YYYY-MM-DD"
  return parseIsoDay(iso);
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

/**
 * Aggiunge giorni a una date preservando UTC midnight normalization.
 */
export function addDays(d: Date, days: number): Date {
  const day = toUtcDay(d);
  day.setUTCDate(day.getUTCDate() + days);
  return day;
}

/**
 * Aggiunge ore a una date (non normalizzato a midnight).
 */
export function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Format date a "gg/mm/yyyy" locale IT, **timezone Europe/Rome esplicito**.
 *
 * R20-A3: `.toLocaleDateString("it-IT")` senza `timeZone` usa il TZ del
 * processo node, che in Docker prod e' UTC mentre il utente italiano vede
 * Europe/Rome. Una Date UTC midnight (es. 2026-04-07T00:00Z) formattata a
 * UTC → "7/4/2026", a Europe/Rome (UTC+2 in estate) → ancora 7 aprile OK,
 * ma una Date 2026-04-07T22:00Z (user input CEST 00:00 del 8 aprile)
 * formattata UTC → "7/4/2026", Europe/Rome → "8/4/2026". Timezone esplicito
 * garantisce consistenza.
 */
export function formatItDay(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Format date+time as "DD/MM/YYYY HH:MM" (Italian locale, Europe/Rome esplicito).
 * Uso admin/log displays sintetici. Per audit con secondi vedi `formatAdminDateTime`.
 */
export function formatItDateTime(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format date+time as "DD/MM/YYYY HH:MM:SS" — full precision per audit log /
 * sync-log displays.
 */
export function formatAdminDateTime(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

/** Alias semantico: admin date-only display (uguale a formatItDay ma firma esplicita). */
export const formatAdminDate = formatItDay;
