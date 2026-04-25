/**
 * Helper condivisi per notification templates.
 */

/**
 * Sanitize una stringa multi-line per uso in subject email o text body
 * single-line. Rimuove newline + trim. Idempotent.
 */
export function safePlain(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}
