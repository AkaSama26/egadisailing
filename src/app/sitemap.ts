import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://egadisailing.com";
  const pages = [
    "",
    "/experiences",
    "/boats",
    "/islands",
    "/about",
    "/contacts",
    "/faq",
    "/experiences/social-boating",
    "/experiences/exclusive-experience",
    "/experiences/cabin-charter",
    "/experiences/boat-shared-full",
    "/experiences/boat-shared-morning",
    "/experiences/boat-exclusive-full",
    "/experiences/boat-exclusive-morning",
    "/islands/favignana",
    "/islands/levanzo",
    "/islands/marettimo",
  ];

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

  return entries;
}
