import { routing, type Locale } from "@/i18n/routing";

const STATIC_PATHS = {
  "/": { it: "/", en: "/", es: "/", fr: "/", de: "/" },
  "/about": { it: "/chi-siamo", en: "/about", es: "/sobre-nosotros", fr: "/a-propos", de: "/ueber-uns" },
  "/boats": { it: "/barche", en: "/boats", es: "/barcos", fr: "/bateaux", de: "/boote" },
  "/b/sessione": { it: "/b/sessione", en: "/b/sessione", es: "/b/sesion", fr: "/b/session", de: "/b/buchung" },
  "/contacts": { it: "/contatti", en: "/contact", es: "/contacto", fr: "/contact", de: "/kontakt" },
  "/cookie-policy": {
    it: "/cookie-policy",
    en: "/cookie-policy",
    es: "/politica-de-cookies",
    fr: "/politique-de-cookies",
    de: "/cookie-richtlinie",
  },
  "/experiences": { it: "/esperienze", en: "/experiences", es: "/experiencias", fr: "/experiences", de: "/erlebnisse" },
  "/faq": { it: "/faq", en: "/faq", es: "/preguntas-frecuentes", fr: "/questions-frequentes", de: "/haeufige-fragen" },
  "/islands": { it: "/isole", en: "/islands", es: "/islas", fr: "/iles", de: "/inseln" },
  "/prenota": { it: "/prenota", en: "/book", es: "/reservar", fr: "/reserver", de: "/buchen" },
  "/privacy": { it: "/privacy", en: "/privacy", es: "/privacidad", fr: "/confidentialite", de: "/datenschutz" },
  "/recupera-prenotazione": {
    it: "/recupera-prenotazione",
    en: "/find-booking",
    es: "/recuperar-reserva",
    fr: "/retrouver-reservation",
    de: "/buchung-finden",
  },
  "/terms": { it: "/terms", en: "/terms", es: "/terminos-y-condiciones", fr: "/conditions-generales", de: "/agb" },
} as const satisfies Record<string, Record<Locale, string>>;

function normalizedLocale(locale: string): Locale {
  return routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;
}

export function localizedStaticPath(locale: string, path: keyof typeof STATIC_PATHS): string {
  const loc = normalizedLocale(locale);
  const localized = STATIC_PATHS[path][loc];
  return `/${loc}${localized === "/" ? "" : localized}`;
}
