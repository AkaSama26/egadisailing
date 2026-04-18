import { defineRouting } from "next-intl/routing";

/**
 * Locali supportati. MANTIENI SOLO quelli con file `messages/{locale}.json`
 * effettivamente tradotti, altrimenti il sitemap e gli URL `/{locale}/...`
 * servono copia italiana fallback → contenuto duplicato + penalty SEO
 * (Round 11 SEO-C1).
 *
 * Per aggiungere una nuova lingua: (1) creare `messages/<locale>.json`,
 * (2) aggiungere il codice qui. Senza il JSON, NON aggiungere il locale.
 */
export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
});

export type Locale = (typeof routing.locales)[number];
