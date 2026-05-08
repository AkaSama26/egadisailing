import { routing, type Locale } from "@/i18n/routing";

const STATIC_PATHS = {
  "/": { it: "/", en: "/", es: "/", fr: "/" },
  "/about": { it: "/about", en: "/about", es: "/sobre-nosotros", fr: "/a-propos" },
  "/boats": { it: "/boats", en: "/boats", es: "/barcos", fr: "/bateaux" },
  "/b/sessione": { it: "/b/sessione", en: "/b/sessione", es: "/b/sesion", fr: "/b/session" },
  "/contacts": { it: "/contacts", en: "/contacts", es: "/contacto", fr: "/contact" },
  "/cookie-policy": {
    it: "/cookie-policy",
    en: "/cookie-policy",
    es: "/politica-de-cookies",
    fr: "/politique-de-cookies",
  },
  "/experiences": { it: "/experiences", en: "/experiences", es: "/experiencias", fr: "/experiences" },
  "/faq": { it: "/faq", en: "/faq", es: "/preguntas-frecuentes", fr: "/questions-frequentes" },
  "/islands": { it: "/islands", en: "/islands", es: "/islas", fr: "/iles" },
  "/prenota": { it: "/prenota", en: "/prenota", es: "/reservar", fr: "/reserver" },
  "/privacy": { it: "/privacy", en: "/privacy", es: "/privacidad", fr: "/confidentialite" },
  "/recupera-prenotazione": {
    it: "/recupera-prenotazione",
    en: "/recupera-prenotazione",
    es: "/recuperar-reserva",
    fr: "/retrouver-reservation",
  },
  "/terms": { it: "/terms", en: "/terms", es: "/terminos-y-condiciones", fr: "/conditions-generales" },
} as const satisfies Record<string, Record<Locale, string>>;

function normalizedLocale(locale: string): Locale {
  return routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;
}

export function localizedStaticPath(locale: string, path: keyof typeof STATIC_PATHS): string {
  const loc = normalizedLocale(locale);
  const localized = STATIC_PATHS[path][loc];
  return `/${loc}${localized === "/" ? "" : localized}`;
}
