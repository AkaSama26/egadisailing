// @ts-nocheck - legacy schema references, refactored in Plan 2-5
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { LandingSections } from "./landing-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";

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
      pricingPeriods: { orderBy: { pricePerPerson: "asc" }, take: 1 },
    },
  });

  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    durationType: s.durationType,
    description: s.description as Record<string, string>,
    minPrice: s.pricingPeriods[0]?.pricePerPerson?.toString() ?? null,
  }));

  return (
    <>
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
      <HeroSection />
      <LandingSections services={serializedServices} />
    </>
  );
}
