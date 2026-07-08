/**
 * Time-related constants condivisi tra booking flow + pending-gc cron.
 *
 * La retry-window resta leggermente piu breve del cutoff pending-gc: evita
 * race al bordo in cui un cliente crea un nuovo PENDING mentre il cron sta
 * cancellando il vecchio hold sullo stesso slot.
 */
export const PENDING_GC_TTL_MS = 15 * 60 * 1000;
/**
 * Finestra retry per escludere own-PENDING dal check overlap.
 * 14min: un minuto sotto `PENDING_GC_TTL_MS` (15min).
 *
 * Race residua al bordo 14-15min gestita dal GC claim pattern
 * `updateMany status=PENDING -> CANCELLED` count=0 se webhook succeeded
 * concorrente ha gia transitato lo stato.
 */
export const DIRECT_RETRY_WINDOW_MS = 14 * 60 * 1000;
