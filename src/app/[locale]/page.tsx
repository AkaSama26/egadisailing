import { db } from "@/lib/db";
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
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_PHONE_TEXT,
  WHATSAPP_CONTACTS,
} from "@/lib/public-contact";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";
import { localizedPath } from "@/lib/i18n/paths";

const BOAT_SERVICE_TYPES = new Set(["BOAT_SHARED", "BOAT_EXCLUSIVE"]);

const CHOICE_RECOMMENDATION_SERVICE_IDS = {
  shared8: "boat-shared-full-day",
  private4: "boat-exclusive-afternoon",
  private8: "boat-exclusive-full-day",
  gourmet: "exclusive-experience",
  charter: "cabin-charter",
  fishing: "fishing-full-day",
} as const satisfies Record<ExperienceChoiceRecommendationKey, string>;

const HOME_SEO_COPY = {
  it: {
    title: "Egadi Sailing | Tour in barca alle Egadi da Trapani",
    description:
      "Tour in barca alle Egadi da Trapani: Favignana e Levanzo, tour privati o condivisi, snorkeling, chef a bordo e charter in trimarano con comfort da catamarano.",
  },
  en: {
    title: "Egadi Sailing | Egadi Islands Boat Tours from Trapani",
    description:
      "Boat tours to the Egadi Islands from Trapani: Favignana and Levanzo, private or shared tours, snorkelling, chef on board and trimaran charters with catamaran-style comfort.",
  },
  es: {
    title: "Egadi Sailing | Excursiones en barco Egadi desde Trapani",
    description:
      "Excursiones en barco a las Islas Egadi desde Trapani: Favignana y Levanzo, tours privados o compartidos, snorkel, chef a bordo y charter en trimarán con confort de catamarán.",
  },
  fr: {
    title: "Egadi Sailing | Excursions bateau aux Égades depuis Trapani",
    description:
      "Excursions en bateau aux îles Égades depuis Trapani : Favignana et Levanzo, tours privés ou partagés, snorkeling, chef à bord et charter en trimaran avec confort de catamaran.",
  },
  de: {
    title: "Egadi Sailing | Bootstouren Ägadische Inseln ab Trapani",
    description:
      "Bootstouren zu den Ägadischen Inseln ab Trapani: Favignana und Levanzo, private oder geteilte Touren, Schnorcheln, Chef an Bord und Trimaran-Charter mit Katamaran-Komfort.",
  },
} as const;

function homeSeoCopy(locale: string) {
  return HOME_SEO_COPY[locale as keyof typeof HOME_SEO_COPY] ?? HOME_SEO_COPY.it;
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

function structuredDurationLabel(key: ExperienceChoiceRecommendationKey, locale: string): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  if (key === "private4") {
    return isEs ? "4 horas" : isFr ? "4 heures" : isDe ? "4 Stunden" : isEn ? "4 hours" : "4 ore";
  }
  if (key === "charter") {
    return isEs ? "3-7 días" : isFr ? "3-7 jours" : isDe ? "3-7 Tage" : isEn ? "3-7 days" : "3-7 giornate";
  }
  return isEs ? "8 horas" : isFr ? "8 heures" : isDe ? "8 Stunden" : isEn ? "8 hours" : "8 ore";
}

function departurePropertyValue(locale: string) {
  if (locale === "es") return "Via dei Gladioli 15, Puerto de Trapani";
  if (locale === "fr") return "Via dei Gladioli 15, port de Trapani";
  if (locale === "de") return "Via dei Gladioli 15, Hafen von Trapani";
  return locale === "en"
    ? "Via dei Gladioli 15, Trapani harbour"
    : "Via dei Gladioli 15, Porto di Trapani";
}

function structuredPackageDetails(key: ExperienceChoiceRecommendationKey, locale: string) {
  const duration = structuredDurationLabel(key, locale);
  const departure = departurePropertyValue(locale);
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const formulaByKey: Record<ExperienceChoiceRecommendationKey, string> = {
    shared8: isEs
      ? "Tour compartido 8 horas"
      : isFr
        ? "Tour partagé 8 heures"
        : isDe
          ? "Geteilte 8-Stunden-Tour"
          : isEn
            ? "Shared 8-hour tour"
            : "Tour condiviso 8 ore",
    private4: isEs
      ? "Tour privado 4 horas"
      : isFr
        ? "Tour privé 4 heures"
        : isDe
          ? "Private 4-Stunden-Tour"
          : isEn
            ? "Private 4-hour tour"
            : "Tour privato 4 ore",
    private8: isEs
      ? "Tour privado 8 horas"
      : isFr
        ? "Tour privé 8 heures"
        : isDe
          ? "Private 8-Stunden-Tour"
          : isEn
            ? "Private 8-hour tour"
            : "Tour privato 8 ore",
    gourmet: isEs
      ? "Experiencia privada en trimarán con chef a bordo"
      : isFr
        ? "Expérience privée en trimaran avec chef à bord"
        : isDe
          ? "Privates Trimaran-Erlebnis mit Chef an Bord"
          : isEn
            ? "Private trimaran experience with chef on board"
            : "Esperienza privata in trimarano con chef a bordo",
    charter: isEs
      ? "Charter privado en trimarán 3-7 días"
      : isFr
        ? "Charter privé en trimaran 3-7 jours"
        : isDe
          ? "Privater Trimaran-Charter 3-7 Tage"
          : isEn
            ? "Private 3-7 day trimaran charter"
            : "Charter privato in trimarano 3-7 giorni",
    fishing: isEs
      ? "Pesca deportiva privada"
      : isFr
        ? "Pêche sportive privée"
        : isDe
          ? "Private Sportangel-Tour"
          : isEn
            ? "Private sport fishing"
            : "Pesca sportiva privata",
  };
  const includedByKey: Record<ExperienceChoiceRecommendationKey, string> = {
    shared8: isEs
      ? "patrón, snorkel, bebidas, combustible, paradas para bañarte y pausa en Favignana"
      : isFr
        ? "skipper, snorkeling, boissons, carburant, arrêts baignade et pause à Favignana"
        : isDe
          ? "Skipper, Schnorcheln, Getränke, Treibstoff, Badestopps und Pause auf Favignana"
          : isEn
            ? "skipper, snorkelling, drinks, fuel, swim stops and a Favignana stop"
            : "skipper, snorkeling, bevande, carburante, soste bagno e pausa a Favignana",
    private4: isEs
      ? "barco privado, patrón, snorkel, bebidas, combustible y paradas para bañarte"
      : isFr
        ? "bateau privé, skipper, snorkeling, boissons, carburant et arrêts baignade"
        : isDe
          ? "privates Boot, Skipper, Schnorcheln, Getränke, Treibstoff und Badestopps"
          : isEn
            ? "private boat, skipper, snorkelling, drinks, fuel and swim stops"
            : "barca privata, skipper, snorkeling, bevande, carburante e soste bagno",
    private8: isEs
      ? "barco privado, patrón, snorkel, bebidas, combustible y ruta flexible"
      : isFr
        ? "bateau privé, skipper, snorkeling, boissons, carburant et route flexible"
        : isDe
          ? "privates Boot, Skipper, Schnorcheln, Getränke, Treibstoff und flexible Route"
          : isEn
            ? "private boat, skipper, snorkelling, drinks, fuel and flexible route"
            : "barca privata, skipper, snorkeling, bevande, carburante e rotta flessibile",
    gourmet: isEs
      ? "trimarán con confort de catamarán, patrón, azafata, chef a bordo, comida, snorkel y combustible"
      : isFr
        ? "trimaran avec confort de catamaran, skipper, hôtesse, chef à bord, déjeuner, snorkeling et carburant"
        : isDe
          ? "Trimaran mit Katamaran-Komfort, Skipper, Hostess, Chef an Bord, Mittagessen, Schnorcheln und Treibstoff"
          : isEn
            ? "trimaran with catamaran-style comfort, skipper, hostess, chef on board, lunch, snorkelling and fuel"
            : "trimarano con comfort da catamarano, skipper, hostess, chef a bordo, pranzo, snorkeling e carburante",
    charter: isEs
      ? "trimarán con confort de catamarán, patrón, cabinas, cocina, snorkel y planificación meteorológica"
      : isFr
        ? "trimaran avec confort de catamaran, skipper, cabines, cuisine, snorkeling et planification météo"
        : isDe
          ? "Trimaran mit Katamaran-Komfort, Skipper, Kabinen, Küche, Schnorcheln und Wetterplanung"
          : isEn
            ? "trimaran with catamaran-style comfort, skipper, cabins, galley, snorkelling and weather-aware planning"
            : "trimarano con comfort da catamarano, skipper, cabine, cucina, snorkeling e pianificazione meteo",
    fishing: isEs
      ? "patrón/guía, cañas, carretes, cebos, combustible, agua y snack"
      : isFr
        ? "skipper/guide, cannes, moulinets, appâts, carburant, eau et snack"
        : isDe
          ? "Skipper/Guide, Ruten, Rollen, Köder, Treibstoff, Wasser und Snack"
          : isEn
            ? "skipper/guide, rods, reels, bait, fuel, water and snacks"
            : "skipper/guida, canne, mulinelli, esche, carburante, acqua e snack",
  };

  return [
    { "@type": "PropertyValue", name: "Duration", value: duration },
    { "@type": "PropertyValue", name: "Departure", value: departure },
    { "@type": "PropertyValue", name: "Formula", value: formulaByKey[key] },
    { "@type": "PropertyValue", name: "Included", value: includedByKey[key] },
  ];
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
        ? "Chef a bordo en trimarán en las Islas Egadi"
        : isFr
        ? "Chef à bord en trimaran aux îles Égades"
        : isDe
        ? "Chef an Bord auf dem Trimaran zu den Ägadischen Inseln"
        : isEn
        ? "Chef on board in a trimaran in the Egadi Islands"
        : "Chef a bordo in trimarano alle Egadi",
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
      title: isEs ? "Charter Islas Egadi en trimarán" : isFr ? "Charter aux îles Égades en trimaran" : isDe ? "Charter Ägadische Inseln im Trimaran" : isEn ? "Egadi trimaran charter" : "Charter Egadi in trimarano",
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
        ? "Chef a bordo en trimarán durante una experiencia gourmet en las Islas Egadi"
        : isFr
        ? "Chef à bord en trimaran pendant une expérience gourmet aux îles Égades"
        : isDe
        ? "Chef an Bord auf dem Trimaran während eines Gourmet-Erlebnisses zu den Ägadischen Inseln"
        : isEn
        ? "Chef on board a trimaran during an Egadi Islands gourmet experience"
        : "Chef a bordo in trimarano durante esperienza gourmet alle Egadi",
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
        ? "Egadi trimaran charter with relaxing on the net at sea"
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
  const isDe = locale === "de";
  const content = {
    shared8: {
      emoji: "🌊",
      title: isEs
        ? "Tour en barco Favignana y Levanzo desde Trapani"
        : isFr
        ? "Tour en bateau Favignana et Levanzo depuis Trapani"
        : isDe
        ? "Bootstour Favignana und Levanzo ab Trapani"
        : isEn
        ? "Favignana and Levanzo boat tour from Trapani"
        : "Tour in barca Favignana e Levanzo da Trapani",
      boatLabel: isEs
        ? "Barca Egadi Sailing · plaza compartida"
        : isFr
        ? "Barca Egadi Sailing · place partagée"
        : isDe
        ? "Barca Egadi Sailing · geteiltes Ticket"
        : isEn
        ? "Barca Egadi Sailing · shared seat"
        : "Barca Egadi Sailing · posto condiviso",
      reason: isEs
        ? "El día compartido más completo: más tiempo entre calas, snorkel y un ritmo relajado por las Islas Egadi."
        : isFr
        ? "La journée partagée la plus complète : plus de temps entre les criques, snorkeling et rythme détendu aux îles Égades."
        : isDe
        ? "Der vollständigste geteilte Tag: mehr Zeit zwischen Buchten, Schnorcheln und ein entspannter Rhythmus auf den Ägadischen Inseln."
        : isEn
        ? "The most complete shared day: more time between bays, snorkelling and a relaxed Egadi Islands rhythm."
        : "La giornata condivisa più completa: più tempo tra baie, snorkeling e ritmo lento alle Egadi.",
    },
    private4: {
      emoji: "⚡",
      title: isEs
        ? "Excursión en barco 4 horas a las Islas Egadi"
        : isFr
        ? "Excursion en bateau 4 heures aux îles Égades"
        : isDe
        ? "4-Stunden-Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "4-hour Egadi Islands boat tour"
        : "Escursione in barca 4 ore alle Egadi",
      boatLabel: isEs
        ? "Barca Egadi Sailing · barco privado ágil"
        : isFr
        ? "Barca Egadi Sailing · bateau privé agile"
        : isDe
        ? "Barca Egadi Sailing · agiles Privatboot"
        : isEn
        ? "Barca Egadi Sailing · private agile boat"
        : "Barca Egadi Sailing · barca privata agile",
      reason: isEs
	        ? "Medio día privado para tu grupo: ruta flexible, baños y la ligereza del barco abierto."
        : isFr
        ? "Une demi-journée privée pour votre groupe : route flexible, baignades et légèreté du bateau ouvert."
        : isDe
        ? "Ein privater halber Tag für Ihre Gruppe: flexible Route, Badestopps und die Leichtigkeit des offenen Boots."
        : isEn
        ? "A private half-day for your group: flexible route, swim stops and the lightness of the open boat."
        : "Mezza giornata privata per il tuo gruppo: rotta flessibile, soste bagno e leggerezza della barca open.",
    },
    private8: {
      emoji: "🚤",
      title: isEs
        ? "Tour privado a las Islas Egadi 8 horas desde Trapani"
        : isFr
        ? "Tour privé aux îles Égades 8 heures depuis Trapani"
        : isDe
        ? "Private Bootstour Ägadische Inseln 8 Stunden ab Trapani"
        : isEn
        ? "Private Egadi Islands 8-hour boat tour from Trapani"
        : "Tour privato alle Egadi 8 ore da Trapani",
      boatLabel: isEs
        ? "Barca Egadi Sailing · barco privado ágil"
        : isFr
        ? "Barca Egadi Sailing · bateau privé agile"
        : isDe
        ? "Barca Egadi Sailing · agiles Privatboot"
        : isEn
        ? "Barca Egadi Sailing · private agile boat"
        : "Barca Egadi Sailing · barca privata agile",
      reason: isEs
        ? "Un día completo privado: más calas, más tiempo en el agua y una ruta diseñada con el patrón."
        : isFr
        ? "Une journée complète privée : plus de criques, plus de temps dans l'eau et une route conçue avec le skipper."
        : isDe
        ? "Ein ganzer privater Tag mit dem agilen Boot: mehr Buchten, mehr Zeit im Wasser und eine Route mit dem Skipper."
        : isEn
        ? "A full private day with the agile boat: more bays, more time in the water and a route shaped with the skipper."
        : "Una giornata intera privata con barca agile: più baie, più tempo in acqua e rotta scelta con lo skipper.",
    },
    gourmet: {
      emoji: "🍽️",
      title: isEs
        ? "Chef a bordo en trimarán en las Islas Egadi"
        : isFr
        ? "Chef à bord en trimaran aux îles Égades"
        : isDe
        ? "Chef an Bord auf dem Trimaran zu den Ägadischen Inseln"
        : isEn
        ? "Chef on board in a trimaran in the Egadi Islands"
        : "Chef a bordo in trimarano alle Egadi",
      boatLabel: isEs
	        ? "Trimarán · confort de catamarán, chef y patrón"
        : isFr
        ? "Trimaran · confort de catamaran, chef et skipper"
        : isDe
        ? "Trimaran · Katamaran-Komfort, Chef und Skipper"
        : isEn
        ? "Trimaran · catamaran-style comfort, chef and skipper"
        : "Trimarano · comfort da catamarano, chef e skipper",
      reason: isEs
	        ? "Buscas un día cuidado: espacios amplios, comida preparada a bordo, privacidad y ritmo premium al fondeo."
        : isFr
        ? "Vous cherchez une journée soignée : grands espaces, déjeuner préparé à bord, intimité et rythme premium au mouillage."
        : isDe
        ? "Sie wünschen sich einen kuratierten Tag: viel Raum, an Bord zubereitetes Mittagessen, Privatsphäre und Premium-Rhythmus vor Anker."
        : isEn
        ? "You want a day that feels cared for: wide spaces, lunch prepared on board, privacy and a premium rhythm at anchor."
        : "Vuoi una giornata curata: spazi ampi, pranzo preparato a bordo, privacy e ritmo premium in rada.",
    },
    charter: {
      emoji: "🛏️",
      title: isEs ? "Charter Islas Egadi en trimarán" : isFr ? "Charter aux îles Égades en trimaran" : isDe ? "Charter Ägadische Inseln im Trimaran" : isEn ? "Egadi trimaran charter" : "Charter Egadi in trimarano",
      boatLabel: isEs
	        ? "Trimarán · confort de catamarán y ruta a medida"
        : isFr
        ? "Trimaran · confort de catamaran et route sur mesure"
        : isDe
        ? "Trimaran · Katamaran-Komfort und Route nach Maß"
        : isEn
        ? "Trimaran · catamaran-style comfort and tailored route"
        : "Trimarano · comfort da catamarano e rotta su misura",
      reason: isEs
        ? "Para varios días en el mar: camarotes, fondeos tranquilos y ruta por Favignana, Levanzo y Marettimo."
        : isFr
        ? "Pour plusieurs jours en mer : cabines, mouillages calmes et route entre Favignana, Levanzo et Marettimo."
        : isDe
        ? "Für mehrere Tage auf See: Kabinen, ruhige Ankerplätze und eine Route zwischen Favignana, Levanzo und Marettimo."
        : isEn
        ? "For several days at sea: cabins, quiet anchorages and a route across Favignana, Levanzo and Marettimo."
        : "Per vivere più giorni in mare: cabine, rade tranquille e rotta tra Favignana, Levanzo e Marettimo.",
    },
    fishing: {
      emoji: "🎣",
      title: isEs ? "Charter de pesca Egadi en neumática" : isFr ? "Charter de pêche Égades en semi-rigide" : isDe ? "Angelcharter Ägadische Inseln im RIB" : isEn ? "Egadi fishing charter by RIB" : "Charter pesca Egadi in gommone",
      boatLabel: isEs
        ? "Neumática de pesca · equipo profesional"
        : isFr
        ? "Semi-rigide de pêche · matériel professionnel"
        : isDe
        ? "Angel-RIB · Profi-Ausrüstung"
        : isEn
        ? "Fishing RIB · professional gear"
        : "Gommone Pesca · attrezzatura professionale",
      reason: isEs
        ? "Para aficionados: 8 horas privadas con cañas profesionales, técnicas mixtas y ruta elegida por el patrón según mar, temporada y normativa."
        : isFr
        ? "Pour passionnés : 8 heures privées avec cannes professionnelles, techniques mixtes et route choisie par le skipper selon mer, saison et règles."
        : isDe
        ? "Für Angelbegeisterte: 8 private Stunden mit professionellen Ruten, gemischten Techniken und Route nach Meer, Saison und Regeln."
        : isEn
        ? "For fishing enthusiasts: 8 private hours with professional rods, mixed techniques and a route chosen by the skipper according to sea, season and rules."
        : "Per appassionati: 8 ore private con canne professionali, tecniche miste e rotta scelta dallo skipper in base a mare, stagione e regole.",
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
    fishing: makeRecommendation("fishing"),
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
                src: "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp",
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
  const choiceRecommendations = buildExperienceChoiceRecommendations({
    locale,
    servicesById,
    displayPrices,
  });
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${siteBase}${localizedPath(locale, "/")}`;
  const seo = homeSeoCopy(locale);
  const areaServed = ["Isole Egadi", "Favignana", "Levanzo", "Marettimo", "Trapani"];
  const boardingAddress = {
    "@type": "PostalAddress",
    streetAddress: "Via dei Gladioli 15",
    postalCode: "91100",
    addressLocality: "Trapani",
    addressRegion: "Sicilia",
    addressCountry: "IT",
  };
  const homepageOffers = Object.values(choiceRecommendations).map((recommendation) => {
    const serviceId = CHOICE_RECOMMENDATION_SERVICE_IDS[recommendation.key];
    const price = lowestDisplayPrice([serviceId], displayPrices);
    const url = `${siteBase}${recommendation.detailHref}`;

    return {
      "@type": "Offer",
      url,
      availability: "https://schema.org/InStock",
      priceCurrency: "EUR",
      ...(price?.amount ? { price: price.amount.toFixed(2) } : {}),
      seller: { "@id": `${siteBase}/#organization` },
      areaServed,
      itemOffered: {
        "@type": "Service",
        name: recommendation.title,
        description: recommendation.reason,
        url,
        provider: { "@id": `${siteBase}/#organization` },
        areaServed,
        additionalProperty: structuredPackageDetails(recommendation.key, locale),
      },
    };
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteBase}/#website`,
        name: "Egadisailing",
        alternateName: "Egadi Sailing",
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
        about: { "@id": `${siteBase}/#organization` },
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
        telephone: PUBLIC_CONTACT_PHONE_TEXT,
        taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
        priceRange: "€€€",
        image: `${siteBase}/og-default.jpg`,
        sameAs: [PUBLIC_REVIEW_LINKS.google, PUBLIC_REVIEW_LINKS.tripadvisor],
        hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
        address: boardingAddress,
        location: {
          "@type": "Place",
          name: departurePropertyValue(locale),
          address: boardingAddress,
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
        knowsAbout: [
          "Boat tours in the Egadi Islands",
          "Favignana and Levanzo boat tours from Trapani",
          "Private boat charter",
          "Sailing experiences in Sicily",
          "Chef on board boat experiences",
        ],
        makesOffer: homepageOffers,
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#homepage-experiences`,
        name: seo.title,
        itemListElement: Object.values(choiceRecommendations).map((recommendation, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: homepageOffers[index],
        })),
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
      <HeroSection experiences={heroExperiences} />
      <ExperienceChoiceDialog locale={locale} recommendations={choiceRecommendations} />
      <LandingSections services={serializedServices} />
    </>
  );
}
