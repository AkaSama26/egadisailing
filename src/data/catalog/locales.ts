export const CATALOG_LOCALES = ["it", "en"] as const;

export type CatalogLocale = (typeof CATALOG_LOCALES)[number];
export type LocalizedString = Record<CatalogLocale, string>;

export const DEFAULT_CATALOG_LOCALE: CatalogLocale = "it";

export function resolveCatalogLocale(locale?: string | null): CatalogLocale {
  return locale === "en" ? "en" : DEFAULT_CATALOG_LOCALE;
}

export function localize(value: LocalizedString, locale?: string | null): string {
  const resolved = resolveCatalogLocale(locale);
  return value[resolved] || value[DEFAULT_CATALOG_LOCALE];
}
