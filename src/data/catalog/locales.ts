export const CATALOG_LOCALES = ["it", "en", "es", "fr", "de"] as const;

export type CatalogLocale = (typeof CATALOG_LOCALES)[number];
export type LocalizedString = Record<"it" | "en", string> & Partial<Record<"es" | "fr" | "de", string>>;

export const DEFAULT_CATALOG_LOCALE: CatalogLocale = "it";

export function resolveCatalogLocale(locale?: string | null): CatalogLocale {
  return locale === "en" || locale === "es" || locale === "fr" || locale === "de" ? locale : DEFAULT_CATALOG_LOCALE;
}

export function localize(value: LocalizedString, locale?: string | null): string {
  const resolved = resolveCatalogLocale(locale);
  if (resolved === "de") return value.de ?? value.en ?? value.it;
  if (resolved === "fr") return value.fr ?? value.en ?? value.it;
  if (resolved === "es") return value.es ?? value.en ?? value.it;
  return resolved === "en" ? value.en : value.it;
}
