import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { HeroSection } from "@/components/hero-section";
import {
  ExperienceChoiceDialog,
  type ExperienceChoiceRecommendation,
  type ExperienceChoiceRecommendationKey,
} from "@/components/experience-choice-dialog";
import { LandingSections } from "./landing-sections";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  compareExperienceOrder,
  getExperienceContent,
  getExperiencePackageContents,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { formatEur } from "@/lib/pricing/cents";
import { getDisplayPriceMap, type DisplayPrice } from "@/lib/pricing/display";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";

const BOAT_SERVICE_TYPES = new Set(["BOAT_SHARED", "BOAT_EXCLUSIVE"]);

const CHOICE_RECOMMENDATION_SERVICE_IDS = {
  shared8: "boat-shared-full-day",
  private4: "boat-exclusive-afternoon",
  private8: "boat-exclusive-full-day",
  gourmet: "exclusive-experience",
  charter: "cabin-charter",
} as const satisfies Record<ExperienceChoiceRecommendationKey, string>;

function bookingExperienceKey(service: { id: string; type: string; boat: { id: string } }): string {
  if (BOAT_SERVICE_TYPES.has(service.type)) return `${service.boat.id}:${service.type}`;
  return `${service.boat.id}:${service.id}`;
}

function primaryServiceIdFromHref(href: string): string | null {
  const slug = href.split("/").filter(Boolean).at(-1);
  return slug ? resolveExperienceServiceIdFromSlug(slug) : null;
}

function lowestHeroPriceLabel(
  serviceIds: string[],
  displayPrices: Map<string, DisplayPrice>,
  locale: string,
): string | null {
  let lowest: DisplayPrice | null = null;

  for (const serviceId of serviceIds) {
    const price = displayPrices.get(serviceId);
    if (!price?.amount) continue;
    if (!lowest?.amount || price.amount.lessThan(lowest.amount)) {
      lowest = price;
    }
  }

  if (!lowest?.amount) return null;
  return locale === "en"
    ? `From ${formatEur(lowest.amount)}`
    : `A partire da ${formatEur(lowest.amount)}`;
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
      title: isEn ? "Chef on Board - Premium Experience" : "Chef a Bordo - Premium Experience",
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

function bookingHrefForService(
  service: { id: string; type: string; durationType: string; boat: { id: string } } | undefined,
  serviceId: string,
  locale: string,
): string {
  if (!service) {
    return `/${locale}/prenota?service=${getExperiencePublicSlug(serviceId)}`;
  }

  const params = new URLSearchParams({
    service: getExperiencePublicSlug(service.id),
    boat: service.boat.id,
    experience: bookingExperienceKey(service),
    durationType: service.durationType,
  });

  return `/${locale}/prenota?${params.toString()}`;
}

function recommendationImages(serviceId: string, locale: string, fallbackAlt: string) {
  const content = getExperienceContent(serviceId, locale);
  const images =
    content?.media
      .flatMap((item) =>
        item.src
          ? [
              {
                src: item.src,
                alt: item.alt,
              },
            ]
          : [],
      ) ?? [];

  return images.length > 0
    ? images
    : [
        {
          src: "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp",
          alt: fallbackAlt,
        },
      ];
}

function buildExperienceChoiceRecommendations({
  locale,
  servicesById,
  displayPrices,
}: {
  locale: string;
  servicesById: Map<
    string,
    { id: string; type: string; durationType: string; boat: { id: string } }
  >;
  displayPrices: Map<string, DisplayPrice>;
}): Record<ExperienceChoiceRecommendationKey, ExperienceChoiceRecommendation> {
  const isEn = locale === "en";
  const content = {
    shared8: {
      emoji: "🌊",
      title: isEn ? "Shared 8-hour boat tour" : "Tour condiviso 8 ore",
      boatLabel: isEn
        ? "Cigala & Bertinetti · shared seat"
        : "Cigala & Bertinetti · posto condiviso",
      reason: isEn
        ? "The most complete shared day: more time between bays, snorkelling and a relaxed Egadi rhythm."
        : "La giornata condivisa più completa: più tempo tra baie, snorkeling e ritmo lento alle Egadi.",
    },
    private4: {
      emoji: "⚡",
      title: isEn ? "Private 4-hour boat tour" : "Tour privato 4 ore",
      boatLabel: isEn
        ? "Cigala & Bertinetti · private agile boat"
        : "Cigala & Bertinetti · barca privata agile",
      reason: isEn
        ? "A private half day for your group: flexible route, swim stops and the lightness of the open boat."
        : "Mezza giornata privata per il tuo gruppo: rotta flessibile, soste bagno e leggerezza della barca open.",
    },
    private8: {
      emoji: "🚤",
      title: isEn ? "Private 8-hour boat tour" : "Tour privato 8 ore",
      boatLabel: isEn
        ? "Cigala & Bertinetti · private agile boat"
        : "Cigala & Bertinetti · barca privata agile",
      reason: isEn
        ? "A full private day with the agile boat: more bays, more time in the water and a route shaped with the skipper."
        : "Una giornata intera privata con barca agile: più baie, più tempo in acqua e rotta scelta con lo skipper.",
    },
    gourmet: {
      emoji: "🍽️",
      title: isEn ? "Gourmet Experience on the Neel 47" : "Esperienza Gourmet sul Neel 47",
      boatLabel: isEn
        ? "Neel 47 luxury · chef, skipper and hostess"
        : "Neel 47 luxury · chef, skipper e hostess",
      reason: isEn
        ? "You want the day to feel cared for: wide spaces, lunch prepared on board, privacy and a premium rhythm at anchor."
        : "Vuoi una giornata curata: spazi ampi, pranzo preparato a bordo, privacy e ritmo premium in rada.",
    },
    charter: {
      emoji: "🛏️",
      title: isEn ? "Egadi Charter on the Neel 47" : "Charter Egadi sul Neel 47",
      boatLabel: isEn
        ? "Neel 47 luxury · cabins and tailored route"
        : "Neel 47 luxury · cabine e rotta su misura",
      reason: isEn
        ? "For several days at sea: cabins, quiet anchorages and a route across Favignana, Levanzo and Marettimo."
        : "Per vivere più giorni in mare: cabine, rade tranquille e rotta tra Favignana, Levanzo e Marettimo.",
    },
  } satisfies Record<
    ExperienceChoiceRecommendationKey,
    Omit<
      ExperienceChoiceRecommendation,
      "key" | "images" | "priceLabel" | "bookingHref" | "detailHref"
    >
  >;

  const makeRecommendation = (
    key: ExperienceChoiceRecommendationKey,
  ): ExperienceChoiceRecommendation => {
    const serviceId = CHOICE_RECOMMENDATION_SERVICE_IDS[key];
    const service = servicesById.get(serviceId);

    return {
      key,
      ...content[key],
      images: recommendationImages(serviceId, locale, content[key].title),
      priceLabel: lowestHeroPriceLabel([serviceId], displayPrices, locale),
      bookingHref: bookingHrefForService(service, serviceId, locale),
      detailHref: `/${locale}/experiences/${getExperiencePublicSlug(serviceId)}`,
    };
  };

  return {
    shared8: makeRecommendation("shared8"),
    private4: makeRecommendation("private4"),
    private8: makeRecommendation("private8"),
    gourmet: makeRecommendation("gourmet"),
    charter: makeRecommendation("charter"),
  };
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
  const publicServices = services.filter((service) => isPublicBookingServiceEnabled(service.id));
  const displayPrices = await getDisplayPriceMap(publicServices.map((service) => service.id));
  const serializedServices = publicServices
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
  const servicesById = new Map(publicServices.map((service) => [service.id, service]));
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
        priceLabel: lowestHeroPriceLabel(experience.serviceIds, displayPrices, locale),
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
  const choiceRecommendations = buildExperienceChoiceRecommendations({
    locale,
    servicesById,
    displayPrices,
  });

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
      <ExperienceChoiceDialog locale={locale} recommendations={choiceRecommendations} />
      <LandingSections services={serializedServices} />
    </>
  );
}
