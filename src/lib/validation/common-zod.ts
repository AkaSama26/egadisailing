import { z } from "zod";

/**
 * Shared Zod validators per evitare drift (es. email max-length 256 vs 320
 * vs 254). Standardizziamo su RFC-5321 (max 254 caratteri totali).
 */

// RFC-5321: max email length is 254 characters total. Trim + lowercase via
// `normalizeEmail` upstream of consumers (invariant #17). Schema only validates.
export const emailSchema = z
  .string()
  .min(3)
  .max(254)
  .email();

/** Nome persona — alfabeto latino esteso, max 100, no HTML chars. */
export function personNameSchema(maxLen = 100) {
  return z
    .string()
    .min(1)
    .max(maxLen)
    .regex(/^[^<>]*$/, "Caratteri non validi");
}

/** Phone E.164-style hint. Max 32 (E.164 absolute max is 15 digits + formatting). */
export const phoneSchema = z
  .string()
  .max(32)
  .regex(/^[+0-9\s\-().]+$/, "Numero non valido");

/** Free-text input (notes, descriptions). Default ban < and > to prevent HTML. */
export function freeTextSchema(opts: { min?: number; max: number; banHtml?: boolean } = { max: 500 }) {
  let s = z.string().min(opts.min ?? 0).max(opts.max);
  if (opts.banHtml ?? true) {
    s = s.regex(/^[^<>]*$/, "Caratteri non validi");
  }
  return s;
}
