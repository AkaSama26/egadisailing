import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import { LandingSections } from "./landing-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  compareExperienceOrder,
  getExperiencePackageContents,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";

const BOAT_SERVICE_TYPES = new Set(["BOAT_SHARED", "BOAT_EXCLUSIVE"]);

function bookingExperienceKey(service: { id: string; type: string; boat: { id: string } }): string {
  if (BOAT_SERVICE_TYPES.has(service.type)) return `${service.boat.id}:${service.type}`;
  return `${service.boat.id}:${service.id}`;
}

function primaryServiceIdFromHref(href: string): string | null {
  const slug = href.split("/").filter(Boolean).at(-1);
  return slug ? resolveExperienceServiceIdFromSlug(slug) : null;
}

function packagePills(input: {
  packageKey: string;
  capacityMax: number;
  durationLabel: string;
  detailLabel: string;
  locale: string;
}): string[] {
  const isEn = input.locale === "en";
  const featureByPackage: Record<string, string> = {
    "esperienza-gourmet-trimarano": isEn ? "Lunch included" : "Pranzo incluso",
    "charter-egadi": isEn ? "Tailored route" : "Itinerario su misura",
    "tour-barca-egadi-4-ore": isEn ? "Flexible swim stops" : "Soste bagno flessibili",
    "tour-barca-egadi-8-ore": isEn ? "Snorkelling" : "Snorkeling",
  };

  return [
    isEn ? `Up to ${input.capacityMax} guests` : `Max ${input.capacityMax} persone`,
    input.durationLabel,
    featureByPackage[input.packageKey] ?? input.detailLabel,
  ];
}

function heroCardCopy(
  packageKey: string,
  locale: string,
  fallback: { title: string; subtitle: string },
) {
  const isEn = locale === "en";
  const copyByPackage: Record<string, { title: string; subtitle: string }> = {
    "esperienza-gourmet-trimarano": {
      title: isEn ? "Chef on board" : "Chef a bordo",
      subtitle: isEn
        ? "Private trimaran, lunch and dedicated crew."
        : "Trimarano privato, pranzo e crew dedicata.",
    },
    "charter-egadi": {
      title: isEn ? "Egadi charter" : "Charter Egadi",
      subtitle: isEn
        ? "3-7 days around Favignana, Levanzo and Marettimo."
        : "3-7 giornate tra Favignana, Levanzo e Marettimo.",
    },
    "tour-barca-egadi-8-ore": {
      title: isEn ? "8-hour boat tour" : "Barca 8 ore",
      subtitle: isEn
        ? "Full day, snorkelling and lunch in Favignana."
        : "Giornata completa, snorkeling e pranzo a Favignana.",
    },
    "tour-barca-egadi-4-ore": {
      title: isEn ? "4-hour boat tour" : "Barca 4 ore",
      subtitle: isEn
        ? "A compact half day of swimming and sheltered coves."
        : "Mezza giornata agile tra bagno e cale riparate.",
    },
  };

  return copyByPackage[packageKey] ?? fallback;
}

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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const services = await db.service.findMany({
    where: { active: true },
    include: {
      boat: { select: { id: true, name: true } },
    },
    orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
  });
  const serializedServices = services
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      boatId: s.boat.id,
      boatName: s.boat.name,
      durationType: s.durationType,
      durationHours: s.durationHours,
      capacityMax: s.capacityMax,
      pricingUnit: s.pricingUnit,
    }))
    .sort((a, b) => compareExperienceOrder(a.id, b.id));
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const heroExperiences = getExperiencePackageContents(locale)
    .map((experience) => {
      const preferredServiceId = primaryServiceIdFromHref(experience.primaryHref);
      const service =
        (preferredServiceId ? servicesById.get(preferredServiceId) : undefined) ??
        experience.serviceIds.map((serviceId) => servicesById.get(serviceId)).find(Boolean);

      if (!service) return null;

      const params = new URLSearchParams({
        service: getExperiencePublicSlug(service.id),
        boat: service.boat.id,
        experience: bookingExperienceKey(service),
        durationType: service.durationType,
      });
      const images = experience.media
        .filter((item): item is { caption: string; alt: string; color: string; src: string } =>
          Boolean(item.src),
        )
        .map((item) => ({
          src: item.src,
          alt: item.alt,
        }));
      const heroImages =
        images.length > 0
          ? images
          : [
              {
                src: "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp",
                alt: experience.title,
              },
            ];
      const heroCopy = heroCardCopy(experience.key, locale, {
        title: experience.title,
        subtitle: experience.subtitle,
      });

      return {
        key: experience.key,
        title: heroCopy.title,
        subtitle: heroCopy.subtitle,
        images: heroImages,
        pills: packagePills({
          packageKey: experience.key,
          capacityMax: service.capacityMax,
          durationLabel: experience.durationLabel,
          detailLabel: experience.detailLabel,
          locale,
        }),
        bookingHref: `/${locale}/prenota?${params.toString()}`,
      };
    })
    .filter((experience): experience is NonNullable<typeof experience> => Boolean(experience));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: PUBLIC_COMPANY_LEGAL.name,
            alternateName: "Egadi Sailing",
            description: "Boat experiences in the Egadi Islands, Sicily",
            email: PUBLIC_CONTACT_EMAIL,
            taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
            address: {
              "@type": "PostalAddress",
              streetAddress: "Via Calipso 42",
              postalCode: "91100",
              addressLocality: "Trapani",
              addressRegion: "Sicilia",
              addressCountry: "IT",
            },
            url: "https://egadisailing.com",
          }),
        }}
      />
      <HeroSection experiences={heroExperiences} />
      <LandingSections services={serializedServices} />
    </>
  );
}
