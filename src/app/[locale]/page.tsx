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
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { getDisplayPriceMap, type DisplayPrice } from "@/lib/pricing/display";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL, WHATSAPP_CONTACTS } from "@/lib/public-contact";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";
import { localizedPath } from "@/lib/i18n/paths";

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
  if (locale === "fr") return `À partir de ${formatEur(lowest.amount, locale)}`;
  if (locale === "es") return `Desde ${formatEur(lowest.amount, locale)}`;
  return locale === "en"
    ? `From ${formatEur(lowest.amount, locale)}`
    : `A partire da ${formatEur(lowest.amount, locale)}`;
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
  const featureByPackage: Record<string, string> = {
    "esperienza-gourmet-trimarano": isEs ? "Comida incluida" : isFr ? "Déjeuner inclus" : isEn ? "Lunch included" : "Pranzo incluso",
    "charter-egadi": isEs ? "Ruta a medida" : isFr ? "Route sur mesure" : isEn ? "Tailored route" : "Itinerario su misura",
    "tour-barca-egadi-4-ore": isEs ? "Baños flexibles" : isFr ? "Baignades flexibles" : isEn ? "Flexible swim stops" : "Soste bagno flessibili",
    "tour-barca-egadi-8-ore": isEs ? "Snorkel" : isEn ? "Snorkelling" : "Snorkeling",
  };

  return [
    isEs ? `Hasta ${input.capacityMax} huéspedes` : isFr ? `Jusqu'à ${input.capacityMax} hôtes` : isEn ? `Up to ${input.capacityMax} guests` : `Max ${input.capacityMax} persone`,
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
  const copyByPackage: Record<string, { title: string; subtitle: string }> = {
    "esperienza-gourmet-trimarano": {
      title: isEs ? "Chef a Bordo - Premium Experience" : isFr ? "Chef à Bord - Premium Experience" : isEn ? "Chef on board - premium experience" : "Chef a Bordo - Premium Experience",
      subtitle: isEs
        ? "Trimarán privado, comida y tripulación dedicada."
        : isFr
        ? "Trimaran privé, déjeuner et équipage dédié."
        : isEn
        ? "Private trimaran, lunch and dedicated crew."
        : "Trimarano privato, pranzo e crew dedicata.",
    },
    "charter-egadi": {
      title: isEs ? "Charter Islas Egadi" : isFr ? "Charter aux îles Égades" : isEn ? "Egadi charter" : "Charter Egadi",
      subtitle: isEs
        ? "3-7 días entre Favignana, Levanzo y Marettimo."
        : isFr
        ? "3-7 jours entre Favignana, Levanzo et Marettimo."
        : isEn
        ? "3-7 days around Favignana, Levanzo and Marettimo."
        : "3-7 giornate tra Favignana, Levanzo e Marettimo.",
    },
    "tour-barca-egadi-8-ore": {
      title: isEs ? "Excursión en barco 8 horas" : isFr ? "Excursion en bateau 8 heures" : isEn ? "8-hour boat tour" : "Barca 8 ore",
      subtitle: isEs
        ? "Día completo, snorkel y tiempo en Favignana."
        : isFr
        ? "Journée complète, snorkeling et temps à Favignana."
        : isEn
        ? "Full day, snorkelling and lunch in Favignana."
        : "Giornata completa, snorkeling e pranzo a Favignana.",
    },
    "tour-barca-egadi-4-ore": {
      title: isEs ? "Excursión privada 4 horas" : isFr ? "Excursion privée 4 heures" : isEn ? "4-hour boat tour" : "Barca 4 ore",
      subtitle: isEs
        ? "Medio día ágil entre baños y calas protegidas."
        : isFr
        ? "Demi-journée agile entre baignades et criques protégées."
        : isEn
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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const content = {
    shared8: {
      emoji: "🌊",
      title: isEs ? "Excursión compartida 8 horas" : isFr ? "Excursion partagée 8 heures" : isEn ? "Shared 8-hour boat tour" : "Tour condiviso 8 ore",
      boatLabel: isEs
        ? "Cigala & Bertinetti · plaza compartida"
        : isFr
        ? "Cigala & Bertinetti · place partagée"
        : isEn
        ? "Cigala & Bertinetti · shared seat"
        : "Cigala & Bertinetti · posto condiviso",
      reason: isEs
        ? "El día compartido más completo: más tiempo entre calas, snorkel y un ritmo relajado por las Islas Egadi."
        : isFr
        ? "La journée partagée la plus complète : plus de temps entre les criques, snorkeling et rythme détendu aux îles Égades."
        : isEn
        ? "The most complete shared day: more time between bays, snorkelling and a relaxed Egadi Islands rhythm."
        : "La giornata condivisa più completa: più tempo tra baie, snorkeling e ritmo lento alle Egadi.",
    },
    private4: {
      emoji: "⚡",
      title: isEs ? "Excursión privada 4 horas" : isFr ? "Excursion privée 4 heures" : isEn ? "Private 4-hour boat tour" : "Tour privato 4 ore",
      boatLabel: isEs
        ? "Cigala & Bertinetti · barco privado ágil"
        : isFr
        ? "Cigala & Bertinetti · bateau privé agile"
        : isEn
        ? "Cigala & Bertinetti · private agile boat"
        : "Cigala & Bertinetti · barca privata agile",
      reason: isEs
	        ? "Medio día privado para tu grupo: ruta flexible, baños y la ligereza del barco abierto."
        : isFr
        ? "Une demi-journée privée pour votre groupe : route flexible, baignades et légèreté du bateau ouvert."
        : isEn
        ? "A private half-day for your group: flexible route, swim stops and the lightness of the open boat."
        : "Mezza giornata privata per il tuo gruppo: rotta flessibile, soste bagno e leggerezza della barca open.",
    },
    private8: {
      emoji: "🚤",
      title: isEs ? "Excursión privada 8 horas" : isFr ? "Excursion privée 8 heures" : isEn ? "Private 8-hour boat tour" : "Tour privato 8 ore",
      boatLabel: isEs
        ? "Cigala & Bertinetti · barco privado ágil"
        : isFr
        ? "Cigala & Bertinetti · bateau privé agile"
        : isEn
        ? "Cigala & Bertinetti · private agile boat"
        : "Cigala & Bertinetti · barca privata agile",
      reason: isEs
        ? "Un día completo privado: más calas, más tiempo en el agua y una ruta diseñada con el patrón."
        : isFr
        ? "Une journée complète privée : plus de criques, plus de temps dans l'eau et une route conçue avec le skipper."
        : isEn
        ? "A full private day with the agile boat: more bays, more time in the water and a route shaped with the skipper."
        : "Una giornata intera privata con barca agile: più baie, più tempo in acqua e rotta scelta con lo skipper.",
    },
    gourmet: {
      emoji: "🍽️",
      title: isEs ? "Chef a Bordo - Premium Experience" : isFr ? "Chef à Bord - Premium Experience" : isEn ? "Gourmet Experience on the Trimarano" : "Esperienza Gourmet sul Trimarano",
      boatLabel: isEs
	        ? "Neel 47 de lujo · chef, patrón y azafata"
        : isFr
        ? "Neel 47 luxury · chef, skipper et hôtesse"
        : isEn
        ? "Luxury Trimarano · chef, skipper and hostess"
        : "Trimarano luxury · chef, skipper e hostess",
      reason: isEs
	        ? "Buscas un día cuidado: espacios amplios, comida preparada a bordo, privacidad y ritmo premium al fondeo."
        : isFr
        ? "Vous cherchez une journée soignée : grands espaces, déjeuner préparé à bord, intimité et rythme premium au mouillage."
        : isEn
        ? "You want a day that feels cared for: wide spaces, lunch prepared on board, privacy and a premium rhythm at anchor."
        : "Vuoi una giornata curata: spazi ampi, pranzo preparato a bordo, privacy e ritmo premium in rada.",
    },
    charter: {
      emoji: "🛏️",
      title: isEs ? "Charter Islas Egadi en Neel 47" : isFr ? "Charter aux îles Égades sur Neel 47" : isEn ? "Egadi Charter on the Trimarano" : "Charter Egadi sul Trimarano",
      boatLabel: isEs
	        ? "Neel 47 de lujo · camarotes y ruta a medida"
        : isFr
        ? "Neel 47 luxury · cabines et route sur mesure"
        : isEn
        ? "Luxury Trimarano · cabins and tailored route"
        : "Trimarano luxury · cabine e rotta su misura",
      reason: isEs
        ? "Para varios días en el mar: camarotes, fondeos tranquilos y ruta por Favignana, Levanzo y Marettimo."
        : isFr
        ? "Pour plusieurs jours en mer : cabines, mouillages calmes et route entre Favignana, Levanzo et Marettimo."
        : isEn
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
      detailHref: localizedPath(locale, `/experiences/${getExperiencePublicSlug(serviceId, locale)}`),
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
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  return buildPageMetadata({
    title: isEs
      ? "Excursiones en barco a las Islas Egadi desde Trapani"
      : isFr
      ? "Excursions en bateau aux îles Égades depuis Trapani"
      : isEn
      ? "Egadi Islands Boat Tours from Trapani"
      : "Tour in barca alle Isole Egadi da Trapani",
    description: isEs
      ? "Reserva excursiones en barco a las Islas Egadi desde Trapani: tours privados y compartidos, chef a bordo, trimarán Neel 47 y charter de varios días."
      : isFr
      ? "Réservez des excursions en bateau aux îles Égades depuis Trapani : tours privés et partagés, chef à bord, trimaran Neel 47 et charter de plusieurs jours."
      : isEn
      ? "Book Egadi Islands boat tours from Trapani: private and shared tours, chef on board, Neel 47 trimaran experiences and multi-day charters."
      : "Prenota tour in barca alle Egadi da Trapani: esperienze private e condivise, chef a bordo, trimarano Neel 47 e charter di più giorni.",
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
  const displayPrices = await getDisplayPriceMap(
    publicServices.map((service) => service.id),
    2026,
    locale,
  );
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
        service: getExperiencePublicSlug(service.id, locale),
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
        bookingHref: localizedPath(locale, `/prenota?${params.toString()}`),
      };
    })
    .filter((experience): experience is NonNullable<typeof experience> => Boolean(experience));
  const choiceRecommendations = buildExperienceChoiceRecommendations({
    locale,
    servicesById,
    displayPrices,
  });
  const siteBase = env.APP_URL.replace(/\/$/, "");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["Organization", "LocalBusiness", "TravelAgency"],
            name: PUBLIC_COMPANY_LEGAL.name,
            alternateName: "Egadi Sailing",
            description: "Boat experiences in the Egadi Islands, Sicily",
            email: PUBLIC_CONTACT_EMAIL,
            taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
            priceRange: "€€€",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Via Calipso 42",
              postalCode: "91100",
              addressLocality: "Trapani",
              addressRegion: "Sicilia",
              addressCountry: "IT",
            },
            contactPoint: WHATSAPP_CONTACTS.map((contact) => ({
              "@type": "ContactPoint",
              telephone: `+${contact.phoneE164}`,
              contactType: "customer service",
              availableLanguage: contact.key === "en" ? ["en", "it"] : ["it"],
              areaServed: "IT",
            })),
            areaServed: [
              "Isole Egadi",
              "Favignana",
              "Levanzo",
              "Marettimo",
              "Trapani",
            ],
            knowsAbout: [
              "Boat tours in the Egadi Islands",
              "Private boat charter",
              "Sailing experiences in Sicily",
            ],
            url: siteBase,
          }),
        }}
      />
      <HeroSection experiences={heroExperiences} />
      <ExperienceChoiceDialog locale={locale} recommendations={choiceRecommendations} />
      <LandingSections services={serializedServices} />
    </>
  );
}
