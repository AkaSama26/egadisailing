/**
 * Time-related constants condivisi tra booking flow + pending-gc cron.
 *
 * R20-A1-1: la retry-window di `createPendingDirectBooking` e il cutoff di
 * `pending-gc` erano entrambi 30min — stessa soglia = race reale al bordo.
 * Timeline incident plausibile:
 *   T0: user paga, PI#1 fallisce (card_declined). PENDING booking creato.
 *   T+29:50: pending-gc parte (ogni 15min), filtra `createdAt < 30m ago` → PI#1 NON preso.
 *   T+29:59: user clicca "Usa altro metodo". Check retry-window `createdAt >= 30m ago` → OK, crea nuovo PENDING.
 *   T+30:01: pending-gc prossimo tick, ora PI#1 matura → cancelPaymentIntent + updateMany CANCELLED + releaseDates.
 *              Ma releaseDates su quello slot colpisce anche il nuovo PENDING (stesso boatId+date).
 * Fix: retry-window **stretta** (15min) + cutoff GC **esteso** (45min) = buffer 30min
 * durante il quale il primo PENDING non e' ancora GC'd ma non matcha il filter retry.
 */
export const PENDING_GC_TTL_MS = 45 * 60 * 1000;
/**
 * Finestra retry per escludere own-PENDING dal check overlap.
 * 44min: un minuto sotto `PENDING_GC_TTL_MS` (45min).
 *
 * R20-P2-BASSA: era 15min → creava "limbo UX" 15-45min in cui cliente vedeva
 * "dates not available" per il proprio PENDING vecchio. Con 44min il limbo
 * residuo e' 1min (PENDING tra 44-45min): al limite GC cancella prima del
 * retry → query overlap non matcha piu' → retry OK.
 *
 * Race residua al bordo 44-45min gestita dal GC claim pattern
 * `updateMany status=PENDING → CANCELLED` count=0 se webhook succeeded
 * concorrente ha gia' transitato lo stato.
 */
export const DIRECT_RETRY_WINDOW_MS = 44 * 60 * 1000;
