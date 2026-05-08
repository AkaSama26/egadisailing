import { getExperienceContent } from "@/data/catalog/experiences";

export type EmailLocale = "it" | "en" | "es" | "fr";

const LOCALE_TAGS: Record<EmailLocale, string> = {
  it: "it-IT",
  en: "en-GB",
  es: "es-ES",
  fr: "fr-FR",
};

export function resolveEmailLocale(locale?: string | null): EmailLocale {
  return locale === "en" || locale === "es" || locale === "fr" ? locale : "it";
}

export function formatEmailDay(date: Date, locale?: string | null): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[resolveEmailLocale(locale)], {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function emailGreeting(locale: EmailLocale, customerName: string): string {
  if (locale === "en") return `Hello ${customerName},`;
  if (locale === "es") return `Hola ${customerName},`;
  if (locale === "fr") return `Bonjour ${customerName},`;
  return `Ciao ${customerName},`;
}

export function genericExperienceName(locale: EmailLocale): string {
  if (locale === "en") return "your experience";
  if (locale === "es") return "tu experiencia";
  if (locale === "fr") return "votre expérience";
  return "la tua esperienza";
}

export function emailServiceName(
  serviceId: string | null | undefined,
  fallbackName: string | null | undefined,
  locale?: string | null,
): string {
  const resolvedLocale = resolveEmailLocale(locale);
  if (serviceId) {
    const localized = getExperienceContent(serviceId, resolvedLocale)?.title;
    if (localized) return localized;
  }
  return fallbackName || genericExperienceName(resolvedLocale);
}
