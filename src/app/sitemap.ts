import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://egadisailing.com";
  const pages = [
    "",
    "/experiences",
    "/boats",
    "/islands",
    "/about",
    "/contacts",
    "/faq",
    "/islands/favignana",
    "/islands/levanzo",
    "/islands/marettimo",
  ];

  const services = await db.service.findMany({
    where: { active: true },
    select: { id: true, updatedAt: true },
    orderBy: { priority: "desc" },
  });

  const entries: MetadataRoute.Sitemap = [];

  for (const page of pages) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: page === "" ? 1 : 0.8,
      });
    }
  }

  for (const service of services) {
    for (const locale of routing.locales) {
      entries.push({
        url: `${baseUrl}/${locale}/experiences/${service.id}`,
        lastModified: service.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
