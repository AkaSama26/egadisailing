import { db } from "@/lib/db";
import { routing } from "@/i18n/routing";
import { getExperienceContent } from "@/data/catalog/experiences";

export interface ExperienceItineraryDisplayStep {
  time: string;
  title?: string;
  location?: string;
  text: string;
}

export interface ExperienceItineraryTranslation {
  locale: string;
  time: string;
  title: string;
  location: string;
  text: string;
}

export interface ExperienceItineraryEditorStep {
  id?: string;
  sortOrder: number;
  translations: ExperienceItineraryTranslation[];
  active: boolean;
}

export interface ItineraryLocaleOption {
  code: string;
  label: string;
  isDefault: boolean;
}

export const DEFAULT_ITINERARY_LOCALE = routing.defaultLocale;

export function getItineraryLocales(): string[] {
  return Array.from(routing.locales);
}

export function getItineraryLocaleOptions(): ItineraryLocaleOption[] {
  const displayNames = new Intl.DisplayNames(["it"], { type: "language" });
  return getItineraryLocales().map((locale) => {
    const label = displayNames.of(locale) ?? locale;
    return {
      code: locale,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      isDefault: locale === DEFAULT_ITINERARY_LOCALE,
    };
  });
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function optionalLocalized(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string | undefined {
  const value = primary?.trim();
  if (value) return value;
  const fallbackValue = fallback?.trim();
  return fallbackValue || undefined;
}

function requiredLocalized(
  primary: string | null | undefined,
  fallback: string | null | undefined,
): string {
  return optionalLocalized(primary, fallback) ?? "";
}

function emptyTranslation(locale: string): ExperienceItineraryTranslation {
  return {
    locale,
    time: "",
    title: "",
    location: "",
    text: "",
  };
}

function normalizeEditorTranslations(
  translations: ExperienceItineraryTranslation[],
): ExperienceItineraryTranslation[] {
  const byLocale = new Map(translations.map((translation) => [translation.locale, translation]));
  return getItineraryLocales().map((locale) => byLocale.get(locale) ?? emptyTranslation(locale));
}

export async function getDbExperienceItinerary(
  serviceId: string,
  locale: string,
): Promise<ExperienceItineraryDisplayStep[]> {
  const targetLocale = locale || DEFAULT_ITINERARY_LOCALE;
  const rows = await db.experienceItineraryStep.findMany({
    where: { serviceId, active: true },
    include: {
      translations: {
        where: { locale: { in: [targetLocale, DEFAULT_ITINERARY_LOCALE] } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.flatMap((row): ExperienceItineraryDisplayStep[] => {
    const byLocale = new Map(row.translations.map((translation) => [translation.locale, translation]));
    const primary = byLocale.get(targetLocale);
    const fallback = byLocale.get(DEFAULT_ITINERARY_LOCALE);
    const time = requiredLocalized(primary?.time, fallback?.time);
    const text = requiredLocalized(primary?.text, fallback?.text);

    if (!time || !text) return [];

    const title = optionalLocalized(primary?.title, fallback?.title);
    const location = optionalLocalized(primary?.location, fallback?.location);
    const displayStep: ExperienceItineraryDisplayStep = {
      time,
      text,
    };
    if (title) displayStep.title = title;
    if (location) displayStep.location = location;
    return [displayStep];
  });
}

export async function getExperienceItinerary(
  serviceId: string,
  locale: string,
  fallback: ExperienceItineraryDisplayStep[],
): Promise<ExperienceItineraryDisplayStep[]> {
  const dbSteps = await getDbExperienceItinerary(serviceId, locale);
  return dbSteps.length > 0 ? dbSteps : fallback;
}

export async function getExperienceItineraryEditorSteps(
  serviceId: string,
): Promise<ExperienceItineraryEditorStep[]> {
  const rows = await db.experienceItineraryStep.findMany({
    where: { serviceId },
    include: { translations: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    translations: normalizeEditorTranslations(
      row.translations.map((translation) => ({
        locale: translation.locale,
        time: trimOrEmpty(translation.time),
        title: trimOrEmpty(translation.title),
        location: trimOrEmpty(translation.location),
        text: trimOrEmpty(translation.text),
      })),
    ),
    active: row.active,
  }));
}

export async function getCopyableItinerarySteps(
  serviceId: string,
): Promise<ExperienceItineraryEditorStep[]> {
  const dbSteps = await getExperienceItineraryEditorSteps(serviceId);
  if (dbSteps.length > 0) return dbSteps;

  const locales = getItineraryLocales();
  const contentsByLocale = new Map(
    locales.map((locale) => [locale, getExperienceContent(serviceId, locale)]),
  );
  const defaultContent = contentsByLocale.get(DEFAULT_ITINERARY_LOCALE);
  if (!defaultContent) return [];

  return defaultContent.itinerary.map((_, index) => ({
    sortOrder: index,
    translations: locales.map((locale) => {
      const step = contentsByLocale.get(locale)?.itinerary[index];
      return {
        locale,
        time: step?.time ?? "",
        title: step?.title ?? "",
        location: step?.location ?? "",
        text: step?.text ?? "",
      };
    }),
    active: true,
  }));
}
