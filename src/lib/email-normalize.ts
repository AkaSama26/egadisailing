/**
 * Normalizza un indirizzo email per dedup/rate-limit.
 *
 * NON per autenticazione — gli alias Gmail sono indistinguibili solo lato
 * provider, ma tecnicamente sono email diverse. Usa questa normalizzazione
 * solo dove la collisione tra alias vuole essere evitata (es. rate limit
 * per evitare bypass, customer upsert per non moltiplicare record).
 *
 * Regole:
 * - Tutto lowercase
 * - Per `@gmail.com`/`@googlemail.com`: rimuovi punti nel local-part, taglia
 *   tutto dopo `+`, normalizza dominio a `gmail.com`.
 * - Altri provider: solo lowercase (il trattamento di alias non e'
 *   universalmente standardizzato — evita falsi positivi).
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const atIdx = trimmed.lastIndexOf("@");
  if (atIdx <= 0) return trimmed;

  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const beforePlus = local.split("+")[0];
    const noDots = beforePlus.replace(/\./g, "");
    return `${noDots}@gmail.com`;
  }

  return trimmed;
}
