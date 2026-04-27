// @ts-nocheck - legacy schema references, refactored in Plan 2-5
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { LandingSections } from "./landing-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { HERO_VIDEO_POSTER_SRC } from "@/lib/public-assets";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/",
    locale,
  });
}

export default async function HomePage() {
  const services = await db.service.findMany({
    where: { active: true },
    include: {
      boat: { select: { id: true, name: true } },
      pricingPeriods: { orderBy: { pricePerPerson: "asc" }, take: 1 },
    },
    orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
  });

  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    boatId: s.boat.id,
    boatName: s.boat.name,
    durationType: s.durationType,
    durationHours: s.durationHours,
    capacityMax: s.capacityMax,
    pricingUnit: s.pricingUnit,
    description: s.description as Record<string, string>,
    minPrice: s.pricingPeriods[0]?.pricePerPerson?.toString() ?? null,
  }));

  return (
    <>
      <link rel="preload" as="image" href={HERO_VIDEO_POSTER_SRC} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TouristAttraction",
            name: "Egadisailing",
            description: "Boat experiences in the Egadi Islands, Sicily",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Trapani",
              addressRegion: "Sicilia",
              addressCountry: "IT",
            },
            url: "https://egadisailing.com",
          }),
        }}
      />
      <HeroSection services={serializedServices} />
      <LandingSections services={serializedServices} />
    </>
  );
}
