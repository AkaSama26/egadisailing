import { routing, type Locale } from "@/i18n/routing";
import {
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";

type PathLocale = Locale;

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
} as const satisfies Record<string, Record<PathLocale, string>>;

function splitHref(href: string) {
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = beforeHash.indexOf("?");
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  return { path: path || "/", query, hash };
}

function normalizedLocale(locale: string): PathLocale {
  return routing.locales.includes(locale as PathLocale)
    ? (locale as PathLocale)
    : routing.defaultLocale;
}

export function localizedPath(locale: string, href: string): string {
  const loc = normalizedLocale(locale);
  const { path, query, hash } = splitHref(href);
  const cleanPath = path === "/" ? "/" : path.replace(/\/$/, "");

  const staticPath = STATIC_PATHS[cleanPath as keyof typeof STATIC_PATHS]?.[loc];
  if (staticPath) return `/${loc}${staticPath === "/" ? "" : staticPath}${query}${hash}`;

  const segments = cleanPath.split("/").filter(Boolean);
  const [first, second, third] = segments;

  if (first === "experiences" && second) {
    const serviceId = resolveExperienceServiceIdFromSlug(second);
    const slug = getExperiencePublicSlug(serviceId, loc);
    return `/${loc}${STATIC_PATHS["/experiences"][loc]}/${slug}${query}${hash}`;
  }

  if (first === "boats" && second) {
    return `/${loc}${STATIC_PATHS["/boats"][loc]}/${second}${query}${hash}`;
  }

  if (first === "islands" && second && !third) {
    return `/${loc}${STATIC_PATHS["/islands"][loc]}/${second}${query}${hash}`;
  }

  if (first === "prenota" && second === "success" && third) {
    const successBase =
      loc === "es"
        ? "/reservar/confirmacion"
        : loc === "fr"
          ? "/reserver/confirmation"
          : loc === "de"
            ? "/buchen/bestaetigung"
            : loc === "en"
              ? "/book/confirmation"
            : "/prenota/success";
    return `/${loc}${successBase}/${third}${query}${hash}`;
  }

  if (first === "prenota" && second) {
    const serviceId = resolveExperienceServiceIdFromSlug(second);
    const slug = getExperiencePublicSlug(serviceId, loc);
    return `/${loc}${STATIC_PATHS["/prenota"][loc]}/${slug}${query}${hash}`;
  }

  if (first === "ticket" && second) {
    const ticketBase = loc === "es" ? "/billete" : loc === "fr" ? "/billet" : "/ticket";
    return `/${loc}${ticketBase}/${second}${query}${hash}`;
  }

  return `/${loc}${cleanPath === "/" ? "" : cleanPath}${query}${hash}`;
}

export function localizedPathWithoutLocale(locale: string, href: string): string {
  const localized = localizedPath(locale, href);
  const loc = normalizedLocale(locale);
  return localized === `/${loc}` ? "/" : localized.slice(loc.length + 1);
}

export function localizedAbsoluteUrl(baseUrl: string, locale: string, href: string): string {
  return `${baseUrl.replace(/\/$/, "")}${localizedPath(locale, href)}`;
}
