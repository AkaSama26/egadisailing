import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import {
  getExperiencePackageServiceIds,
  getExperiencePublicSlug,
  getListedExperienceIds,
} from "@/data/catalog/experiences";
import { getPublicBoatDetailSlugs } from "@/data/catalog/boats";
import { env } from "@/lib/env";
import { localizedAbsoluteUrl, localizedPathWithoutLocale } from "@/lib/i18n/paths";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];
type SitemapEntryOptions = Pick<SitemapEntry, "lastModified">;
type LocalizedPaths = Record<(typeof routing.locales)[number], string>;

const CATALOG_CONTENT_LAST_MODIFIED = new Date("2026-06-22T00:00:00.000Z");

function localizedUrl(baseUrl: string, locale: string, path: string): string {
  return localizedAbsoluteUrl(baseUrl, locale, path);
}

function localizedAlternates(baseUrl: string, paths: LocalizedPaths): SitemapEntry["alternates"] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = localizedUrl(baseUrl, locale, paths[locale]);
  }
  languages["x-default"] = localizedUrl(
    baseUrl,
    routing.defaultLocale,
    paths[routing.defaultLocale],
  );
  return { languages };
}

function sameLocalizedPath(path: string): LocalizedPaths {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, localizedPathWithoutLocale(locale, path)]),
  ) as LocalizedPaths;
}

function addLocalizedEntries(
  entries: MetadataRoute.Sitemap,
  baseUrl: string,
  paths: LocalizedPaths,
  options: SitemapEntryOptions,
) {
  const alternates = localizedAlternates(baseUrl, paths);
  for (const locale of routing.locales) {
    entries.push({
      url: localizedUrl(baseUrl, locale, paths[locale]),
      alternates,
      ...options,
    });
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const pages = [
    "",
    "/experiences",
    "/boats",
    "/islands",
    "/about",
    "/contacts",
    "/prenota",
    "/faq",
    "/privacy",
    "/terms",
    "/cookie-policy",
    "/islands/favignana",
    "/islands/levanzo",
    "/islands/marettimo",
  ];
  const listedExperienceIds = Array.from(
    new Set([...getListedExperienceIds(), ...getExperiencePackageServiceIds()]),
  );
  let serviceLastModifiedById = new Map(
    listedExperienceIds.map((id) => [id, CATALOG_CONTENT_LAST_MODIFIED] as const),
  );

  try {
    const services = await db.service.findMany({
      where: { active: true, id: { in: listedExperienceIds } },
      select: { id: true, updatedAt: true },
      orderBy: { priority: "desc" },
    });
    serviceLastModifiedById = new Map(
      listedExperienceIds.map((id) => [
        id,
        services.find((service) => service.id === id)?.updatedAt ?? CATALOG_CONTENT_LAST_MODIFIED,
      ] as const),
    );
  } catch (err) {
    if (process.env.NEXT_PHASE !== "phase-production-build") {
      console.error("[sitemap] falling back to static catalog", err);
    }
  }

  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    addLocalizedEntries(
      entries,
      baseUrl,
      sameLocalizedPath(page),
      {
        lastModified: CATALOG_CONTENT_LAST_MODIFIED,
      },
    );
  }

  for (const slug of getPublicBoatDetailSlugs()) {
    addLocalizedEntries(
      entries,
      baseUrl,
      sameLocalizedPath(`/boats/${slug}`),
      {
        lastModified: CATALOG_CONTENT_LAST_MODIFIED,
      },
    );
  }

  for (const serviceId of listedExperienceIds) {
    addLocalizedEntries(
      entries,
      baseUrl,
      {
        it: localizedPathWithoutLocale("it", `/experiences/${getExperiencePublicSlug(serviceId, "it")}`),
        en: localizedPathWithoutLocale("en", `/experiences/${getExperiencePublicSlug(serviceId, "en")}`),
        es: localizedPathWithoutLocale("es", `/experiences/${getExperiencePublicSlug(serviceId, "es")}`),
        fr: localizedPathWithoutLocale("fr", `/experiences/${getExperiencePublicSlug(serviceId, "fr")}`),
        de: localizedPathWithoutLocale("de", `/experiences/${getExperiencePublicSlug(serviceId, "de")}`),
      },
      {
        lastModified: serviceLastModifiedById.get(serviceId) ?? CATALOG_CONTENT_LAST_MODIFIED,
      },
    );
  }

  return entries;
}
