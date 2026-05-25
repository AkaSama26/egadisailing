import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";
import {
  getExperiencePackageServiceIds,
  getExperiencePublicSlug,
  getListedExperienceIds,
} from "@/data/catalog/experiences";
import { getPublicBoatSlugs } from "@/data/catalog/boats";
import { favignanaGuideSlugPairs } from "@/data/favignana-guides";
import { levanzoGuideSlugPairs } from "@/data/levanzo-guides";
import { marettimoGuideSlugPairs } from "@/data/marettimo-guides";
import { env } from "@/lib/env";
import { localizedAbsoluteUrl, localizedPathWithoutLocale } from "@/lib/i18n/paths";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];
type SitemapEntryOptions = Pick<SitemapEntry, "changeFrequency" | "priority" | "lastModified">;
type LocalizedPaths = Record<(typeof routing.locales)[number], string>;

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
  const now = new Date();
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
  const lowPriorityPages = new Set(["/privacy", "/terms", "/cookie-policy"]);

  const listedExperienceIds = Array.from(
    new Set([...getListedExperienceIds(), ...getExperiencePackageServiceIds()]),
  );
  let serviceLastModifiedById = new Map(
    listedExperienceIds.map((id) => [id, now] as const),
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
        services.find((service) => service.id === id)?.updatedAt ?? now,
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
        lastModified: now,
        changeFrequency: lowPriorityPages.has(page) ? "monthly" : "weekly",
        priority: page === "" ? 1 : lowPriorityPages.has(page) ? 0.3 : 0.8,
      },
    );
  }

  for (const slug of getPublicBoatSlugs().filter((boatSlug) => boatSlug === "catamarano-egadi-trimarano-da-trapani")) {
    addLocalizedEntries(
      entries,
      baseUrl,
      sameLocalizedPath(`/boats/${slug}`),
      {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.75,
      },
    );
  }

  for (const slugs of favignanaGuideSlugPairs) {
    addLocalizedEntries(
      entries,
      baseUrl,
      {
        it: `/isole/favignana/${slugs.it}`,
        en: `/islands/favignana/${slugs.en}`,
        es: `/islas/favignana/${slugs.es}`,
        fr: `/iles/favignana/${slugs.fr}`,
        de: `/inseln/favignana/${slugs.de}`,
      },
      {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.78,
      },
    );
  }

  for (const slugs of levanzoGuideSlugPairs) {
    addLocalizedEntries(
      entries,
      baseUrl,
      {
        it: `/isole/levanzo/${slugs.it}`,
        en: `/islands/levanzo/${slugs.en}`,
        es: `/islas/levanzo/${slugs.es}`,
        fr: `/iles/levanzo/${slugs.fr}`,
        de: `/inseln/levanzo/${slugs.de}`,
      },
      {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.76,
      },
    );
  }

  for (const slugs of marettimoGuideSlugPairs) {
    addLocalizedEntries(
      entries,
      baseUrl,
      {
        it: `/isole/marettimo/${slugs.it}`,
        en: `/islands/marettimo/${slugs.en}`,
        es: `/islas/marettimo/${slugs.es}`,
        fr: `/iles/marettimo/${slugs.fr}`,
        de: `/inseln/marettimo/${slugs.de}`,
      },
      {
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.76,
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
        lastModified: serviceLastModifiedById.get(serviceId) ?? now,
        changeFrequency: "weekly",
        priority: 0.8,
      },
    );
  }

  return entries;
}
