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
  locales: ["it", "en", "es", "fr", "de"],
  defaultLocale: "it",
  pathnames: {
    "/": "/",
    "/about": {
      it: "/about",
      en: "/about",
      es: "/sobre-nosotros",
      fr: "/a-propos",
      de: "/ueber-uns",
    },
    "/boats": {
      it: "/boats",
      en: "/boats",
      es: "/barcos",
      fr: "/bateaux",
      de: "/boote",
    },
    "/boats/[slug]": {
      it: "/boats/[slug]",
      en: "/boats/[slug]",
      es: "/barcos/[slug]",
      fr: "/bateaux/[slug]",
      de: "/boote/[slug]",
    },
    "/b/sessione": {
      it: "/b/sessione",
      en: "/b/sessione",
      es: "/b/sesion",
      fr: "/b/session",
      de: "/b/buchung",
    },
    "/contacts": {
      it: "/contacts",
      en: "/contacts",
      es: "/contacto",
      fr: "/contact",
      de: "/kontakt",
    },
    "/cookie-policy": {
      it: "/cookie-policy",
      en: "/cookie-policy",
      es: "/politica-de-cookies",
      fr: "/politique-de-cookies",
      de: "/cookie-richtlinie",
    },
    "/experiences": {
      it: "/esperienze",
      en: "/experiences",
      es: "/experiencias",
      fr: "/experiences",
      de: "/erlebnisse",
    },
    "/experiences/[slug]": {
      it: "/esperienze/[slug]",
      en: "/experiences/[slug]",
      es: "/experiencias/[slug]",
      fr: "/experiences/[slug]",
      de: "/erlebnisse/[slug]",
    },
    "/faq": {
      it: "/faq",
      en: "/faq",
      es: "/preguntas-frecuentes",
      fr: "/questions-frequentes",
      de: "/haeufige-fragen",
    },
    "/islands": {
      it: "/islands",
      en: "/islands",
      es: "/islas",
      fr: "/iles",
      de: "/inseln",
    },
    "/islands/[slug]": {
      it: "/islands/[slug]",
      en: "/islands/[slug]",
      es: "/islas/[slug]",
      fr: "/iles/[slug]",
      de: "/inseln/[slug]",
    },
    "/islands/favignana/[guideSlug]": {
      it: "/islands/favignana/[guideSlug]",
      en: "/islands/favignana/[guideSlug]",
      es: "/islas/favignana/[guideSlug]",
      fr: "/iles/favignana/[guideSlug]",
      de: "/inseln/favignana/[guideSlug]",
    },
    "/islands/levanzo/[guideSlug]": {
      it: "/islands/levanzo/[guideSlug]",
      en: "/islands/levanzo/[guideSlug]",
      es: "/islas/levanzo/[guideSlug]",
      fr: "/iles/levanzo/[guideSlug]",
      de: "/inseln/levanzo/[guideSlug]",
    },
    "/islands/marettimo/[guideSlug]": {
      it: "/islands/marettimo/[guideSlug]",
      en: "/islands/marettimo/[guideSlug]",
      es: "/islas/marettimo/[guideSlug]",
      fr: "/iles/marettimo/[guideSlug]",
      de: "/inseln/marettimo/[guideSlug]",
    },
    "/prenota": {
      it: "/prenota",
      en: "/prenota",
      es: "/reservar",
      fr: "/reserver",
      de: "/buchen",
    },
    "/prenota/[slug]": {
      it: "/prenota/[slug]",
      en: "/prenota/[slug]",
      es: "/reservar/[slug]",
      fr: "/reserver/[slug]",
      de: "/buchen/[slug]",
    },
    "/prenota/success/[code]": {
      it: "/prenota/success/[code]",
      en: "/prenota/success/[code]",
      es: "/reservar/confirmacion/[code]",
      fr: "/reserver/confirmation/[code]",
      de: "/buchen/bestaetigung/[code]",
    },
    "/privacy": {
      it: "/privacy",
      en: "/privacy",
      es: "/privacidad",
      fr: "/confidentialite",
      de: "/datenschutz",
    },
    "/recupera-prenotazione": {
      it: "/recupera-prenotazione",
      en: "/recupera-prenotazione",
      es: "/recuperar-reserva",
      fr: "/retrouver-reservation",
      de: "/buchung-finden",
    },
    "/terms": {
      it: "/terms",
      en: "/terms",
      es: "/terminos-y-condiciones",
      fr: "/conditions-generales",
      de: "/agb",
    },
    "/ticket/[code]": {
      it: "/ticket/[code]",
      en: "/ticket/[code]",
      es: "/billete/[code]",
      fr: "/billet/[code]",
      de: "/ticket/[code]",
    },
  },
});

export type Locale = (typeof routing.locales)[number];
