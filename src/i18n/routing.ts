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
  locales: ["it", "en", "es", "fr"],
  defaultLocale: "it",
  pathnames: {
    "/": "/",
    "/about": {
      it: "/about",
      en: "/about",
      es: "/sobre-nosotros",
      fr: "/a-propos",
    },
    "/boats": {
      it: "/boats",
      en: "/boats",
      es: "/barcos",
      fr: "/bateaux",
    },
    "/boats/[slug]": {
      it: "/boats/[slug]",
      en: "/boats/[slug]",
      es: "/barcos/[slug]",
      fr: "/bateaux/[slug]",
    },
    "/b/sessione": {
      it: "/b/sessione",
      en: "/b/sessione",
      es: "/b/sesion",
      fr: "/b/session",
    },
    "/contacts": {
      it: "/contacts",
      en: "/contacts",
      es: "/contacto",
      fr: "/contact",
    },
    "/cookie-policy": {
      it: "/cookie-policy",
      en: "/cookie-policy",
      es: "/politica-de-cookies",
      fr: "/politique-de-cookies",
    },
    "/experiences": {
      it: "/experiences",
      en: "/experiences",
      es: "/experiencias",
      fr: "/experiences",
    },
    "/experiences/[slug]": {
      it: "/experiences/[slug]",
      en: "/experiences/[slug]",
      es: "/experiencias/[slug]",
      fr: "/experiences/[slug]",
    },
    "/faq": {
      it: "/faq",
      en: "/faq",
      es: "/preguntas-frecuentes",
      fr: "/questions-frequentes",
    },
    "/islands": {
      it: "/islands",
      en: "/islands",
      es: "/islas",
      fr: "/iles",
    },
    "/islands/[slug]": {
      it: "/islands/[slug]",
      en: "/islands/[slug]",
      es: "/islas/[slug]",
      fr: "/iles/[slug]",
    },
    "/islands/favignana/[guideSlug]": {
      it: "/islands/favignana/[guideSlug]",
      en: "/islands/favignana/[guideSlug]",
      es: "/islas/favignana/[guideSlug]",
      fr: "/iles/favignana/[guideSlug]",
    },
    "/islands/levanzo/[guideSlug]": {
      it: "/islands/levanzo/[guideSlug]",
      en: "/islands/levanzo/[guideSlug]",
      es: "/islas/levanzo/[guideSlug]",
      fr: "/iles/levanzo/[guideSlug]",
    },
    "/islands/marettimo/[guideSlug]": {
      it: "/islands/marettimo/[guideSlug]",
      en: "/islands/marettimo/[guideSlug]",
      es: "/islas/marettimo/[guideSlug]",
      fr: "/iles/marettimo/[guideSlug]",
    },
    "/prenota": {
      it: "/prenota",
      en: "/prenota",
      es: "/reservar",
      fr: "/reserver",
    },
    "/prenota/[slug]": {
      it: "/prenota/[slug]",
      en: "/prenota/[slug]",
      es: "/reservar/[slug]",
      fr: "/reserver/[slug]",
    },
    "/prenota/success/[code]": {
      it: "/prenota/success/[code]",
      en: "/prenota/success/[code]",
      es: "/reservar/confirmacion/[code]",
      fr: "/reserver/confirmation/[code]",
    },
    "/privacy": {
      it: "/privacy",
      en: "/privacy",
      es: "/privacidad",
      fr: "/confidentialite",
    },
    "/recupera-prenotazione": {
      it: "/recupera-prenotazione",
      en: "/recupera-prenotazione",
      es: "/recuperar-reserva",
      fr: "/retrouver-reservation",
    },
    "/terms": {
      it: "/terms",
      en: "/terms",
      es: "/terminos-y-condiciones",
      fr: "/conditions-generales",
    },
    "/ticket/[code]": {
      it: "/ticket/[code]",
      en: "/ticket/[code]",
      es: "/billete/[code]",
      fr: "/billet/[code]",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
