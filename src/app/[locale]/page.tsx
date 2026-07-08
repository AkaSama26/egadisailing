export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/hero-section";
import { DeferredExperienceChoiceDialog } from "@/components/deferred-experience-choice-dialog";
import type {
  ExperienceChoiceRecommendationKey,
  ExperienceChoiceRecommendationSeed,
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
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import {
  displayPriceMapFromSerialized,
  getSerializedDisplayPrices,
  type DisplayPrice,
} from "@/lib/pricing/display";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GEO,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
  WHATSAPP_CONTACTS,
} from "@/lib/public-contact";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";
import { localizedPath } from "@/lib/i18n/paths";

const BOAT_SERVICE_TYPES = new Set(["BOAT_SHARED", "BOAT_EXCLUSIVE"]);

const CHOICE_RECOMMENDATION_SERVICE_IDS = {
  shared8: "boat-shared-full-day",
  private4: "boat-exclusive-morning",
  private8: "boat-exclusive-full-day",
  gourmet: "exclusive-experience",
  charter: "cabin-charter",
  fishing: "fishing-full-day",
} as const satisfies Record<ExperienceChoiceRecommendationKey, string>;

const getCachedHomeServices = unstable_cache(
  async () =>
    db.service.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        type: true,
        durationType: true,
        durationHours: true,
        capacityMax: true,
        pricingUnit: true,
        boat: { select: { id: true, name: true } },
      },
      orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
    }),
  ["home-active-services-v1"],
  { tags: ["public-services"], revalidate: 3600 },
);

const getCachedHomeDisplayPrices = unstable_cache(
  async (serviceIds: string[], year: number, locale: string) => {
    const uniqueServiceIds = Array.from(new Set(serviceIds)).sort();
    return getSerializedDisplayPrices(uniqueServiceIds, year, locale);
  },
  ["home-display-prices-v1"],
  { tags: ["public-prices"], revalidate: 3600 },
);

const HOME_SEO_COPY = {
  it: {
    title: "Tour in barca Egadi da Trapani | Egadi Sailing",
    description:
      "Tour in barca alle Egadi da Trapani con barche private o condivise, trimarano con comfort da catamarano, snorkeling, pranzo a bordo, Favignana e Levanzo.",
  },
  en: {
    title: "Egadi Islands Boat Tours from Trapani | Egadi Sailing",
    description:
      "Egadi Islands boat tours and boat trips from Trapani to Favignana and Levanzo: shared or private tours, snorkelling, lunch on board and trimaran charters.",
  },
  es: {
    title: "Paseos en barco desde Trapani a las Islas Egadi | Egadi Sailing",
    description:
      "Paseos y excursiones en barco desde Trapani a las Islas Egadi: Favignana y Levanzo, tour compartido o privado, snorkel, almuerzo a bordo y charter en trimarán.",
  },
  fr: {
    title: "Excursions bateau aux Égades depuis Trapani | Egadi Sailing",
    description:
      "Excursions bateau depuis Trapani vers les îles Égades : Favignana et Levanzo, sorties privées ou partagées, snorkeling, déjeuner à bord et charter en trimaran.",
  },
  de: {
    title: "Bootstouren ab Trapani zu den Ägadischen Inseln | Egadi Sailing",
    description:
      "Bootstouren ab Trapani zu den Ägadischen Inseln: Favignana und Levanzo, geteilte oder private Ausfahrten, Schnorcheln, Mittagessen an Bord und Trimaran-Charter.",
  },
} as const;

function homeSeoCopy(locale: string) {
  return HOME_SEO_COPY[locale as keyof typeof HOME_SEO_COPY] ?? HOME_SEO_COPY.it;
}

const HOME_SCHEMA_TOPICS = {
  it: {
    about: [
      "Tour in barca alle Egadi da Trapani",
      "Catamarani Egadi e trimarano",
      "Noleggio catamarano Egadi",
      "Charter Egadi in trimarano",
      "Favignana e Levanzo in barca",
      "Egadi navigazione",
    ],
    keywords: [
      "tour in barca egadi",
      "escursioni egadi da trapani",
      "catamarani egadi",
      "noleggio catamarano egadi",
      "charter egadi",
      "favignana e levanzo in barca",
      "egadi navigazione",
    ],
  },
  en: {
    about: [
      "Egadi Islands boat tours from Trapani",
      "Egadi boats",
      "Egadi boat tour",
      "Boat tour Egadi Islands",
      "Egadi Islands yacht charter",
      "Egadi Islands boat trip",
      "Favignana and Levanzo boat tours",
    ],
    keywords: [
      "egadi islands boat tours",
      "egadi boats",
      "egadi boat tour",
      "boat tour egadi islands",
      "egadi islands boat trip",
      "trapani boat trips",
      "egadi islands yacht charter",
      "boat trips from trapani",
      "favignana and levanzo boat tour",
    ],
  },
  es: {
    about: [
      "Paseos en barco desde Trapani a las Islas Egadi",
      "Paseos y excursiones en barco Trapani",
      "Excursiones en barco a Favignana y Levanzo",
      "Charter en trimaran en las Islas Egadi",
      "Snorkel en las Islas Egadi",
    ],
    keywords: [
      "paseos en barco trapani",
      "excursiones en barco egadi",
      "favignana levanzo en barco",
      "charter islas egadi",
    ],
  },
  fr: {
    about: [
      "Excursions bateau depuis Trapani",
      "Excursions bateau aux Egades depuis Trapani",
      "Excursions bateau a Favignana et Levanzo",
      "Charter en trimaran aux iles Egades",
      "Snorkeling aux iles Egades",
    ],
    keywords: [
      "excursion bateau egades",
      "excursion bateau trapani",
      "favignana levanzo bateau",
      "charter iles egades",
    ],
  },
  de: {
    about: [
      "Bootstour Trapani",
      "Bootstouren ab Trapani zu den Ägadischen Inseln",
      "Bootstour Favignana und Levanzo",
      "Trimaran-Charter zu den Ägadischen Inseln",
      "Schnorcheln auf den Ägadischen Inseln",
    ],
    keywords: [
      "bootstour trapani",
      "bootstour ägadische inseln",
      "favignana levanzo bootstour",
      "trimaran charter ägadische inseln",
    ],
  },
} as const;

function homeSchemaTopics(locale: string) {
  return HOME_SCHEMA_TOPICS[locale as keyof typeof HOME_SCHEMA_TOPICS] ?? HOME_SCHEMA_TOPICS.it;
}

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
  const lowest = lowestDisplayPrice(serviceIds, displayPrices);
  if (!lowest?.amount) return null;
  if (locale === "fr") return `À partir de ${formatEur(lowest.amount, locale)}`;
  if (locale === "es") return `Desde ${formatEur(lowest.amount, locale)}`;
  if (locale === "de") return `Ab ${formatEur(lowest.amount, locale)}`;
  return locale === "en"
    ? `From ${formatEur(lowest.amount, locale)}`
    : `A partire da ${formatEur(lowest.amount, locale)}`;
}

function lowestDisplayPrice(
  serviceIds: string[],
  displayPrices: Map<string, DisplayPrice>,
): DisplayPrice | null {
  let lowest: DisplayPrice | null = null;

  for (const serviceId of serviceIds) {
    const price = displayPrices.get(serviceId);
    if (!price?.amount) continue;
    if (!lowest?.amount || price.amount.lessThan(lowest.amount)) {
      lowest = price;
    }
  }

  return lowest;
}

function departurePropertyValue(locale: string) {
  if (locale === "es") return "Via dei Gladioli 15, Puerto de Trapani";
  if (locale === "fr") return "Via dei Gladioli 15, port de Trapani";
  if (locale === "de") return "Via dei Gladioli 15, Hafen von Trapani";
  return locale === "en"
    ? "Via dei Gladioli 15, Trapani harbour"
    : "Via dei Gladioli 15, Porto di Trapani";
}

function packagePills(input: {
  packageKey: string;
  capacityMax: number;
  durationLabel: string;
  detailLabel: string;
  locale: string;
}): string[] {
  const isEn = input.locale === "en";
  const isEs = input.locale === "es";
  const isFr = input.locale === "fr";
  const isDe = input.locale === "de";
  const featureByPackage: Record<string, string> = {
    "esperienza-gourmet-trimarano": isEs ? "Comida incluida" : isFr ? "Déjeuner inclus" : isDe ? "Mittagessen inklusive" : isEn ? "Lunch included" : "Pranzo incluso",
    "charter-egadi": isEs ? "Ruta a medida" : isFr ? "Route sur mesure" : isDe ? "Route nach Maß" : isEn ? "Tailored route" : "Itinerario su misura",
    "tour-barca-egadi-4-ore": isEs ? "Baños flexibles" : isFr ? "Baignades flexibles" : isDe ? "Flexible Badestopps" : isEn ? "Flexible swim stops" : "Soste bagno flessibili",
    "tour-barca-egadi-8-ore": isEs ? "Snorkel" : isDe ? "Schnorcheln" : isEn ? "Snorkelling" : "Snorkeling",
    "charter-pesca-egadi": isEs ? "Equipo profesional" : isFr ? "Matériel professionnel" : isDe ? "Profi-Ausrüstung" : isEn ? "Professional gear" : "Attrezzatura pro",
  };

  return [
    isEs ? `Hasta ${input.capacityMax} huéspedes` : isFr ? `Jusqu'à ${input.capacityMax} hôtes` : isDe ? `Bis zu ${input.capacityMax} Gäste` : isEn ? `Up to ${input.capacityMax} guests` : `Max ${input.capacityMax} persone`,
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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const copyByPackage: Record<string, { title: string; subtitle: string }> = {
    "esperienza-gourmet-trimarano": {
      title: isEs
        ? "Almuerzo a bordo en trimarán en las Islas Egadi"
        : isFr
        ? "Déjeuner à bord en trimaran aux îles Égades"
        : isDe
        ? "Mittagessen an Bord auf dem Trimaran zu den Ägadischen Inseln"
        : isEn
        ? "Lunch on board in a trimaran in the Egadi Islands"
        : "Pranzo a bordo in trimarano alle Egadi",
      subtitle: isEs
        ? "Trimarán privado, comida y tripulación dedicada."
        : isFr
        ? "Trimaran privé, déjeuner et équipage dédié."
        : isDe
        ? "Privater Trimaran, Mittagessen und dedizierte Crew."
        : isEn
        ? "Private trimaran, lunch and dedicated crew."
        : "Trimarano privato, pranzo e crew dedicata.",
    },
    "charter-egadi": {
      title: isEs ? "Charter Islas Egadi en trimarán" : isFr ? "Charter aux îles Égades en trimaran" : isDe ? "Charter Ägadische Inseln im Trimaran" : isEn ? "Egadi Islands yacht charter" : "Charter Egadi in trimarano",
      subtitle: isEs
        ? "3-7 días entre Favignana, Levanzo y Marettimo, con confort de catamarán."
        : isFr
        ? "3-7 jours entre Favignana, Levanzo et Marettimo, avec confort de catamaran."
        : isDe
        ? "3-7 Tage zwischen Favignana, Levanzo und Marettimo, mit Katamaran-Komfort."
        : isEn
        ? "3-7 days around Favignana, Levanzo and Marettimo, with catamaran-style comfort."
        : "3-7 giornate tra Favignana, Levanzo e Marettimo, con comfort da catamarano.",
    },
    "tour-barca-egadi-8-ore": {
      title: isEs
        ? "Tour en barco Favignana y Levanzo desde Trapani"
        : isFr
        ? "Tour en bateau Favignana et Levanzo depuis Trapani"
        : isDe
        ? "Bootstour Favignana und Levanzo ab Trapani"
        : isEn
        ? "Favignana and Levanzo boat tour from Trapani"
        : "Tour in barca Favignana e Levanzo da Trapani",
      subtitle: isEs
        ? "Día completo, snorkel y tiempo en Favignana."
        : isFr
        ? "Journée complète, snorkeling et temps à Favignana."
        : isDe
        ? "Ganzer Tag, Schnorcheln und Zeit auf Favignana."
        : isEn
        ? "Full day, snorkelling and lunch in Favignana."
        : "Giornata completa, snorkeling e pranzo a Favignana.",
    },
    "tour-barca-egadi-4-ore": {
      title: isEs
        ? "Excursión en barco 4 horas a las Islas Egadi"
        : isFr
        ? "Excursion en bateau 4 heures aux îles Égades"
        : isDe
        ? "4-Stunden-Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "4-hour Egadi Islands boat tour"
        : "Escursione in barca 4 ore alle Egadi",
      subtitle: isEs
        ? "Medio día ágil entre baños y calas protegidas."
        : isFr
        ? "Demi-journée agile entre baignades et criques protégées."
        : isDe
        ? "Ein agiler halber Tag zwischen Baden und geschützten Buchten."
        : isEn
        ? "A compact half day of swimming and sheltered coves."
        : "Mezza giornata agile tra bagno e cale riparate.",
    },
    "charter-pesca-egadi": {
      title: isEs ? "Charter de pesca Egadi en neumática" : isFr ? "Charter de pêche Égades en semi-rigide" : isDe ? "Angelcharter Ägadische Inseln im RIB" : isEn ? "Egadi fishing charter by RIB" : "Charter pesca Egadi in gommone",
      subtitle: isEs
        ? "Neumática privada, equipo profesional y técnicas mixtas."
        : isFr
        ? "Semi-rigide privé, matériel professionnel et techniques mixtes."
        : isDe
        ? "Privates Angel-RIB, Profi-Ausrüstung und gemischte Techniken."
        : isEn
        ? "Private Fishing RIB, professional gear and mixed techniques."
        : "Gommone privato, attrezzatura professionale e tecniche miste.",
    },
  };

  return copyByPackage[packageKey] ?? fallback;
}

function heroCardImagesForPackage(packageKey: string, locale: string): Array<{ src: string; alt: string }> | null {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const imagesByPackage: Record<string, { src: string; alt: string }> = {
    "tour-barca-egadi-4-ore": {
      src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-frontale.webp",
      alt: isEs
        ? "Barca Egadi Sailing para una excursión en barco de 4 horas a las Islas Egadi"
        : isFr
        ? "Barca Egadi Sailing pour une excursion en bateau de 4 heures aux îles Égades"
        : isDe
        ? "Barca Egadi Sailing für eine 4-Stunden-Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "Barca Egadi Sailing for a 4-hour Egadi Islands boat tour"
        : "Barca Egadi Sailing per escursione in barca 4 ore alle Egadi",
    },
    "tour-barca-egadi-8-ore": {
      src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-drone.webp",
      alt: isEs
        ? "Tour en barco Favignana y Levanzo desde Trapani visto desde dron"
        : isFr
        ? "Tour en bateau Favignana et Levanzo depuis Trapani vu par drone"
        : isDe
        ? "Bootstour Favignana und Levanzo ab Trapani aus der Drohnenperspektive"
        : isEn
        ? "Favignana and Levanzo boat tour from Trapani seen by drone"
        : "Tour in barca Favignana e Levanzo da Trapani visto dal drone",
    },
    "esperienza-gourmet-trimarano": {
      src: "/images/boats/neel-47/trimarano-pasta-saltata.webp",
      alt: isEs
        ? "Almuerzo a bordo en trimarán durante una experiencia gourmet en las Islas Egadi"
        : isFr
        ? "Déjeuner à bord en trimaran pendant une expérience gourmet aux îles Égades"
        : isDe
        ? "Mittagessen an Bord auf dem Trimaran während eines Gourmet-Erlebnisses zu den Ägadischen Inseln"
        : isEn
        ? "Lunch on board a trimaran during an Egadi Islands gourmet experience"
        : "Pranzo a bordo in trimarano durante esperienza gourmet alle Egadi",
    },
    "charter-egadi": {
      src: "/images/boats/neel-47/trimarano-relax-rete.webp",
      alt: isEs
        ? "Charter Egadi en trimarán con relax en la red frente al mar"
        : isFr
        ? "Charter aux Égades en trimaran avec détente sur le filet face à la mer"
        : isDe
        ? "Egadi Charter im Trimaran mit Entspannung im Netz am Meer"
        : isEn
        ? "Egadi Islands yacht charter with relaxing on the trimaran net at sea"
        : "Charter Egadi in trimarano con relax sulla rete in mare",
    },
  };
  const image = imagesByPackage[packageKey];
  return image ? [image] : null;
}

function bookingHrefForService(
  service: { id: string; type: string; durationType: string; boat: { id: string } } | undefined,
  serviceId: string,
  locale: string,
): string {
  if (!service) {
    return localizedPath(locale, `/prenota?service=${getExperiencePublicSlug(serviceId, locale)}`);
  }

  const params = new URLSearchParams({
    service: getExperiencePublicSlug(service.id, locale),
    boat: service.boat.id,
    experience: bookingExperienceKey(service),
    durationType: service.durationType,
  });

  return localizedPath(locale, `/prenota?${params.toString()}`);
}

function buildExperienceChoiceRecommendationSeed({
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
}): ExperienceChoiceRecommendationSeed {
  const makeRecommendationSeed = (key: ExperienceChoiceRecommendationKey) => {
    const serviceId = CHOICE_RECOMMENDATION_SERVICE_IDS[key];
    const service = servicesById.get(serviceId);

    return {
      priceLabel: lowestHeroPriceLabel([serviceId], displayPrices, locale),
      bookingHref: bookingHrefForService(service, serviceId, locale),
      detailHref: localizedPath(locale, `/experiences/${getExperiencePublicSlug(serviceId, locale)}`),
    };
  };

  return {
    shared8: makeRecommendationSeed("shared8"),
    private4: makeRecommendationSeed("private4"),
    private8: makeRecommendationSeed("private8"),
    gourmet: makeRecommendationSeed("gourmet"),
    charter: makeRecommendationSeed("charter"),
    fishing: makeRecommendationSeed("fishing"),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = homeSeoCopy(locale);
  const metadata = buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: "/",
    locale,
  });
  metadata.title = { absolute: seo.title };
  return metadata;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [services, tHero] = await Promise.all([
    getCachedHomeServices(),
    getTranslations({ locale, namespace: "hero" }),
  ]);
  const publicServices = services.filter((service) => isPublicBookingServiceEnabled(service.id));
  const publicServiceIds = publicServices.map((service) => service.id).sort();
  const displayPriceRows = await getCachedHomeDisplayPrices(publicServiceIds, 2026, locale);
  const displayPrices = displayPriceMapFromSerialized(displayPriceRows);
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
      priceAmount: displayPrices.get(s.id)?.amount?.toString() ?? null,
      priceLabel: lowestHeroPriceLabel([s.id], displayPrices, locale),
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
        service: getExperiencePublicSlug(service.id, locale),
        boat: service.boat.id,
        experience: bookingExperienceKey(service),
        durationType: service.durationType,
      });
      const heroCopy = heroCardCopy(experience.key, locale, {
        title: experience.title,
        subtitle: experience.subtitle,
      });
      const images = experience.media
        .filter((item): item is { caption: string; alt: string; color: string; src: string } =>
          Boolean(item.src),
        )
        .map((item) => ({
          src: item.src,
          alt: item.alt,
        }));
      const fallbackHeroImages =
        images.length > 0
          ? images
          : [
              {
                src: "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp",
                alt: heroCopy.title,
              },
            ];
      const heroImages = heroCardImagesForPackage(experience.key, locale) ?? fallbackHeroImages;

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
        bookingHref: localizedPath(locale, `/prenota?${params.toString()}`),
      };
    })
    .filter((experience): experience is NonNullable<typeof experience> => Boolean(experience));
  const choiceRecommendationSeed = buildExperienceChoiceRecommendationSeed({
    locale,
    servicesById,
    displayPrices,
  });
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${siteBase}${localizedPath(locale, "/")}`;
  const seo = homeSeoCopy(locale);
  const schemaTopics = homeSchemaTopics(locale);
  const areaServed = ["Isole Egadi", "Favignana", "Levanzo", "Marettimo", "Trapani"];
  const boardingAddress = PUBLIC_CONTACT_POSTAL_ADDRESS;
  const homepageExperienceItems = Object.entries(CHOICE_RECOMMENDATION_SERVICE_IDS).map(
    ([key, serviceId], index) => {
      const recommendationKey = key as ExperienceChoiceRecommendationKey;
      const content = getExperienceContent(serviceId, locale);
      const url = `${siteBase}${choiceRecommendationSeed[recommendationKey].detailHref}`;

      return {
        "@type": "ListItem",
        position: index + 1,
        name: content?.seoTitle ?? content?.title ?? serviceId,
        url,
      };
    },
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteBase}/#website`,
        name: "Egadi Sailing",
        alternateName: "Egadisailing",
        url: siteBase,
        inLanguage: locale,
        publisher: { "@id": `${siteBase}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: seo.title,
        description: seo.description,
        isPartOf: { "@id": `${siteBase}/#website` },
        about: [
          { "@id": `${siteBase}/#organization` },
          ...schemaTopics.about.map((name) => ({ "@type": "Thing", name })),
        ],
        keywords: schemaTopics.keywords.join(", "),
        inLanguage: locale,
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteBase}/og-default.jpg`,
        },
      },
      {
        "@type": ["Organization", "LocalBusiness", "TravelAgency"],
        "@id": `${siteBase}/#organization`,
        name: "Egadi Sailing",
        legalName: PUBLIC_COMPANY_LEGAL.name,
        alternateName: "Egadisailing",
        description: seo.description,
        url: siteBase,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
        taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
        priceRange: "€€€",
        image: `${siteBase}/og-default.jpg`,
        sameAs: [PUBLIC_REVIEW_LINKS.google, ...PUBLIC_REVIEW_LINKS.tripadvisorProfiles],
        hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
        address: boardingAddress,
        geo: PUBLIC_CONTACT_GEO,
        openingHoursSpecification: PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
        location: {
          "@type": "Place",
          name: departurePropertyValue(locale),
          address: boardingAddress,
          geo: PUBLIC_CONTACT_GEO,
          hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
        },
        contactPoint: WHATSAPP_CONTACTS.map((contact) => ({
          "@type": "ContactPoint",
          telephone: `+${contact.phoneE164}`,
          contactType: "customer service",
          availableLanguage: contact.key === "en" ? ["en", "it"] : ["it"],
          areaServed: "IT",
        })),
        areaServed,
        knowsAbout: schemaTopics.about,
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#homepage-experiences`,
        name: seo.title,
        itemListElement: homepageExperienceItems,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HeroSection
        experiences={heroExperiences}
        locale={locale}
        title={tHero("seoTitle")}
        subtitle={tHero("seoSubtitle")}
      />
      <DeferredExperienceChoiceDialog
        locale={locale}
        recommendationSeed={choiceRecommendationSeed}
      />
      <LandingSections locale={locale} services={serializedServices} />
    </>
  );
}
