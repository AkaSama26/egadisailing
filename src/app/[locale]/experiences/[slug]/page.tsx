export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Anchor,
  ArrowLeft,
  Check,
  Clock,
  Compass,
  ShieldCheck,
  Ship,
  Users,
} from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import { ExperienceBookingDialogButton } from "@/components/experience-detail-actions";
import { ExperienceDetailFloatingOffset } from "@/components/experience-detail-floating-offset";
import { ExperiencePresenceNotice } from "@/components/experience-presence-badge";
import { ExperienceImageCarousel } from "@/components/experience-image-carousel";
import {
  getExperienceContent,
  getListedExperienceIds,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { getBoatContent } from "@/data/catalog/boats";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { getExperienceItinerary } from "@/lib/experiences/itineraries";
import { getDisplayPrice } from "@/lib/pricing/display";
import {
  EGADI_PRODUCT_BRAND,
  buildDigitalServiceShippingDetails,
  buildServiceProductCodes,
  buildServiceReturnPolicy,
} from "@/lib/seo/commerce-structured-data";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GEO,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
} from "@/lib/public-contact";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

const FALLBACK_HERO_IMAGE =
  "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp";
const EGADI_BOAT_FRONT_HERO_IMAGE =
  "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-frontale.webp";

type CarouselGalleryItem = {
  src: string;
  alt: string;
  caption?: string;
};

type PaymentBrand = {
  id: string;
  label: string;
  src: string;
};

const PAYMENT_BRANDS: PaymentBrand[] = [
  { id: "visa", label: "Visa", src: "/images/payment-icons/visa.svg" },
  { id: "mastercard", label: "Mastercard", src: "/images/payment-icons/mastercard.svg" },
  { id: "amex", label: "American Express", src: "/images/payment-icons/amex.svg" },
  { id: "paypal", label: "PayPal", src: "/images/payment-icons/paypal.svg" },
  { id: "klarna", label: "Klarna", src: "/images/payment-icons/klarna.svg" },
  { id: "google-pay", label: "Google Pay", src: "/images/payment-icons/google-pay.svg" },
  { id: "apple-pay", label: "Apple Pay", src: "/images/payment-icons/apple-pay.svg" },
];

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function isFishingService(service: { id?: string }) {
  return service.id === "fishing-full-day";
}

type ExperienceSchemaCategory = "boatTour" | "charter" | "fishing" | "gourmet";

type ExperienceSchemaTopics = {
  about: string[];
  keywords: string[];
};

const EXPERIENCE_DETAIL_SCHEMA_TOPICS = {
  it: {
    boatTour: {
      about: ["Tour in barca alle Egadi da Trapani", "Escursione Favignana e Levanzo", "Egadi navigazione", "Snorkeling alle Egadi"],
      keywords: ["tour in barca egadi", "escursioni egadi da trapani", "favignana levanzo in barca", "egadi navigazione"],
    },
    charter: {
      about: ["Charter Egadi in trimarano", "Yacht charter alle Egadi", "Noleggio catamarano Egadi con skipper", "Favignana, Levanzo e Marettimo in charter"],
      keywords: ["charter egadi", "yacht charter egadi", "noleggio catamarano egadi", "charter in catamarano egadi", "trimarano egadi"],
    },
    fishing: {
      about: ["Charter pesca Egadi da Trapani", "Pesca sportiva alle Egadi", "Uscita privata di pesca con skipper"],
      keywords: ["charter pesca egadi", "pesca sportiva egadi", "charter pesca trapani", "egadi fishing charter"],
    },
    gourmet: {
      about: ["Chef a bordo alle Egadi", "Esperienza gourmet in trimarano", "Tour privato alle Egadi con pranzo"],
      keywords: ["chef a bordo egadi", "esperienza gourmet egadi", "trimarano egadi chef", "tour privato egadi pranzo"],
    },
  },
  en: {
    boatTour: {
      about: ["Egadi Islands boat tours from Trapani", "Egadi Islands boat trip", "Favignana and Levanzo boat tour", "Snorkelling in the Egadi Islands"],
      keywords: ["egadi islands boat tours", "egadi islands boat trip", "boat trips from trapani", "favignana levanzo boat tour"],
    },
    charter: {
      about: ["Egadi Islands yacht charter", "Private trimaran charter from Trapani", "Egadi catamaran-style charter", "Favignana, Levanzo and Marettimo yacht charter"],
      keywords: ["egadi islands yacht charter", "egadi yacht charter", "egadi catamaran charter", "trapani trimaran charter", "private charter egadi islands"],
    },
    fishing: {
      about: ["Egadi fishing charter from Trapani", "Private sport fishing trip", "Fishing RIB with skipper"],
      keywords: ["egadi fishing charter", "fishing charter trapani", "sport fishing egadi", "private fishing trip egadi"],
    },
    gourmet: {
      about: ["Chef on board in the Egadi Islands", "Private gourmet trimaran experience", "Egadi private boat tour with lunch"],
      keywords: ["chef on board egadi", "egadi gourmet boat tour", "private trimaran experience egadi", "egadi boat tour with lunch"],
    },
  },
  es: {
    boatTour: {
      about: ["Paseo en barco Trapani Egadi", "Excursion en barco Favignana y Levanzo", "Paseos en barco desde Trapani", "Barco desde Trapani a Favignana", "Snorkel en las Islas Egadi"],
      keywords: ["paseo en barco trapani", "paseos en barco desde trapani", "excursion en barco egadi", "excursion en barco favignana levanzo", "barco desde trapani a favignana", "favignana levanzo en barco", "snorkel egadi"],
    },
    charter: {
      about: ["Charter Islas Egadi en trimaran", "Yacht charter Islas Egadi", "Catamaran Egadi con patron"],
      keywords: ["charter islas egadi", "yacht charter egadi", "catamaran egadi", "trimaran trapani"],
    },
    fishing: {
      about: ["Charter de pesca Egadi", "Pesca deportiva en las Egadi", "Salida privada de pesca desde Trapani"],
      keywords: ["charter pesca egadi", "pesca deportiva egadi", "pesca trapani", "fishing charter egadi"],
    },
    gourmet: {
      about: ["Chef a bordo en las Egadi", "Experiencia gourmet en trimaran", "Tour privado con comida"],
      keywords: ["chef a bordo egadi", "experiencia gourmet egadi", "trimaran egadi comida", "tour privado egadi"],
    },
  },
  fr: {
    boatTour: {
      about: ["Excursion bateau Egades depuis Trapani", "Tour bateau Favignana et Levanzo", "Snorkeling aux iles Egades"],
      keywords: ["excursion bateau egades", "excursion bateau trapani", "favignana levanzo bateau", "snorkeling egades"],
    },
    charter: {
      about: ["Charter aux iles Egades en trimaran", "Yacht charter aux Egades", "Catamaran Egades avec skipper"],
      keywords: ["charter iles egades", "yacht charter egades", "catamaran egades", "trimaran trapani"],
    },
    fishing: {
      about: ["Charter peche Egades", "Peche sportive aux Egades", "Sortie privee de peche depuis Trapani"],
      keywords: ["charter peche egades", "peche sportive egades", "peche trapani", "fishing charter egadi"],
    },
    gourmet: {
      about: ["Chef a bord aux Egades", "Experience gourmet en trimaran", "Tour prive avec dejeuner"],
      keywords: ["chef a bord egades", "experience gourmet egades", "trimaran egades dejeuner", "tour prive egades"],
    },
  },
  de: {
    boatTour: {
      about: ["Bootstour ab Trapani zu den Ägadischen Inseln", "Bootstour Favignana und Levanzo", "Schnorcheln auf den Ägadischen Inseln"],
      keywords: ["bootstour trapani", "bootstour ägadische inseln", "favignana levanzo bootstour", "schnorcheln egadi"],
    },
    charter: {
      about: ["Trimaran-Charter zu den Ägadischen Inseln", "Yachtcharter Ägadische Inseln", "Katamaran-Komfort mit Skipper"],
      keywords: ["charter egadi", "yachtcharter ägadische inseln", "katamaran egadi", "trimaran trapani"],
    },
    fishing: {
      about: ["Angelcharter Ägadische Inseln ab Trapani", "Sportangeln auf den Ägadischen Inseln", "Private Angelausfahrt mit Skipper"],
      keywords: ["angelcharter egadi", "sportangeln ägadische inseln", "angeln trapani", "fishing charter egadi"],
    },
    gourmet: {
      about: ["Chef an Bord auf den Ägadischen Inseln", "Gourmet-Erlebnis im Trimaran", "Private Bootstour mit Mittagessen"],
      keywords: ["chef an bord egadi", "gourmet bootstour egadi", "trimaran egadi mittagessen", "private bootstour egadi"],
    },
  },
} as const satisfies Record<string, Record<ExperienceSchemaCategory, ExperienceSchemaTopics>>;

function experienceDetailSchemaTopics(locale: string, service: { id?: string; type: string }) {
  const category: ExperienceSchemaCategory = isFishingService(service)
    ? "fishing"
    : service.type === "CABIN_CHARTER"
      ? "charter"
      : service.type === "EXCLUSIVE_EXPERIENCE"
        ? "gourmet"
        : "boatTour";

  const topicsByLocale =
    EXPERIENCE_DETAIL_SCHEMA_TOPICS[locale as keyof typeof EXPERIENCE_DETAIL_SCHEMA_TOPICS] ??
    EXPERIENCE_DETAIL_SCHEMA_TOPICS.it;

  return topicsByLocale[category];
}

const RELATED_EXPERIENCE_IDS_BY_SERVICE: Record<string, string[]> = {
  "boat-shared-full-day": ["boat-exclusive-full-day", "boat-exclusive-morning", "cabin-charter"],
  "boat-exclusive-full-day": ["boat-shared-full-day", "boat-exclusive-morning", "exclusive-experience"],
  "boat-exclusive-morning": ["boat-exclusive-full-day", "boat-shared-full-day", "exclusive-experience"],
  "boat-exclusive-afternoon": ["boat-exclusive-morning", "boat-exclusive-full-day", "boat-shared-full-day"],
  "cabin-charter": ["exclusive-experience", "boat-exclusive-full-day", "fishing-full-day"],
  "exclusive-experience": ["cabin-charter", "boat-exclusive-full-day", "boat-shared-full-day"],
  "fishing-full-day": ["cabin-charter", "boat-exclusive-full-day", "boat-shared-full-day"],
};

function getRelatedExperienceIds(serviceId: string) {
  const prioritized = RELATED_EXPERIENCE_IDS_BY_SERVICE[serviceId] ?? [];
  const fallback = getListedExperienceIds();
  return Array.from(new Set([...prioritized, ...fallback]))
    .filter((id) => id !== serviceId && isPublicBookingServiceEnabled(id))
    .slice(0, 3);
}

type RelatedIslandSlug = "favignana" | "levanzo" | "marettimo";

type RelatedIslandCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel: string;
  islands: Record<RelatedIslandSlug, { name: string; description: string }>;
};

const RELATED_ISLAND_COPY = {
  it: {
    eyebrow: "Isole collegate",
    title: "Approfondisci le isole di questa rotta",
    intro:
      "Prima di scegliere il tour, puoi leggere le guide delle isole più legate a questa esperienza: aiutano a capire cale, ritmo di navigazione e differenze tra le tappe.",
    ctaLabel: "Leggi la guida",
    islands: {
      favignana: {
        name: "Favignana",
        description: "Cala Rossa, Bue Marino, Cala Azzurra e le cave di tufo: la tappa più cercata per chi parte da Trapani verso le Egadi.",
      },
      levanzo: {
        name: "Levanzo",
        description: "Più piccola e silenziosa, ideale per bagni lenti, Cala Fredda, Cala Minnola e una navigazione meno affollata.",
      },
      marettimo: {
        name: "Marettimo",
        description: "La più selvaggia e distante, perfetta da valutare quando l'esperienza diventa charter di più giorni.",
      },
    },
  },
  en: {
    eyebrow: "Related islands",
    title: "Explore the islands connected to this route",
    intro:
      "Before choosing the tour, read the island guides linked to this experience: they explain coves, navigation rhythm and the difference between each stop.",
    ctaLabel: "Read guide",
    islands: {
      favignana: {
        name: "Favignana",
        description: "Cala Rossa, Bue Marino, Cala Azzurra and tuff quarries: the most searched island for boat tours from Trapani.",
      },
      levanzo: {
        name: "Levanzo",
        description: "Smaller and quieter, ideal for slow swims, Cala Fredda, Cala Minnola and a less crowded pace.",
      },
      marettimo: {
        name: "Marettimo",
        description: "The wildest and most remote island, worth considering when the experience becomes a multi-day charter.",
      },
    },
  },
  es: {
    eyebrow: "Islas relacionadas",
    title: "Explora las islas conectadas con esta ruta",
    intro:
      "Antes de elegir el tour, lee las guías de las islas más ligadas a esta experiencia: ayudan a entender calas, ritmo de navegación y diferencias entre paradas.",
    ctaLabel: "Leer guía",
    islands: {
      favignana: {
        name: "Favignana",
        description: "Cala Rossa, Bue Marino, Cala Azzurra y canteras de toba: la isla más buscada para excursiones desde Trapani.",
      },
      levanzo: {
        name: "Levanzo",
        description: "Más pequeña y tranquila, ideal para baños lentos, Cala Fredda, Cala Minnola y un ritmo menos concurrido.",
      },
      marettimo: {
        name: "Marettimo",
        description: "La isla más salvaje y lejana, especialmente interesante cuando la experiencia se convierte en charter de varios días.",
      },
    },
  },
  fr: {
    eyebrow: "Îles liées",
    title: "Explorer les îles reliées à cette route",
    intro:
      "Avant de choisir l'excursion, lisez les guides des îles liées à cette expérience : ils expliquent criques, rythme de navigation et différences entre les étapes.",
    ctaLabel: "Lire le guide",
    islands: {
      favignana: {
        name: "Favignana",
        description: "Cala Rossa, Bue Marino, Cala Azzurra et carrières de tuf : l'île la plus recherchée pour les excursions depuis Trapani.",
      },
      levanzo: {
        name: "Levanzo",
        description: "Plus petite et plus calme, idéale pour les baignades lentes, Cala Fredda, Cala Minnola et un rythme moins fréquenté.",
      },
      marettimo: {
        name: "Marettimo",
        description: "L'île la plus sauvage et éloignée, à envisager quand l'expérience devient un charter de plusieurs jours.",
      },
    },
  },
  de: {
    eyebrow: "Verbundene Inseln",
    title: "Die Inseln dieser Route besser verstehen",
    intro:
      "Vor der Buchung helfen die Inselguides, Buchten, Reiserhythmus und Unterschiede zwischen den Stopps besser einzuschätzen.",
    ctaLabel: "Guide lesen",
    islands: {
      favignana: {
        name: "Favignana",
        description: "Cala Rossa, Bue Marino, Cala Azzurra und Tuffsteinbrüche: die meistgesuchte Insel für Bootstouren ab Trapani.",
      },
      levanzo: {
        name: "Levanzo",
        description: "Kleiner und ruhiger, ideal für langsame Badestopps, Cala Fredda, Cala Minnola und weniger Gedränge.",
      },
      marettimo: {
        name: "Marettimo",
        description: "Die wildeste und entfernteste Insel, besonders relevant, wenn daraus ein mehrtägiger Charter wird.",
      },
    },
  },
} as const satisfies Record<string, RelatedIslandCopy>;

function getRelatedIslandSlugs(service: { id?: string; type: string; durationType?: string }): RelatedIslandSlug[] {
  if (service.type === "CABIN_CHARTER") return ["favignana", "levanzo", "marettimo"];
  if (service.id === "fishing-full-day") return ["favignana", "levanzo"];
  if (service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON") {
    return ["favignana"];
  }
  return ["favignana", "levanzo"];
}

function getRelatedIslandSection(locale: string, service: { id?: string; type: string; durationType?: string }) {
  const copy = RELATED_ISLAND_COPY[locale as keyof typeof RELATED_ISLAND_COPY] ?? RELATED_ISLAND_COPY.it;
  return {
    ...copy,
    links: getRelatedIslandSlugs(service).map((slug) => ({
      slug,
      name: copy.islands[slug].name,
      description: copy.islands[slug].description,
      href: localizedPath(locale, `/islands/${slug}`),
    })),
  };
}

function getEgadiBoatHeroAlt(locale: string) {
  if (locale === "es") return "Vista frontal de la Barca Egadi Sailing";
  if (locale === "fr") return "Vue frontale de la Barca Egadi Sailing";
  if (locale === "de") return "Frontansicht der Barca Egadi Sailing";
  if (locale === "en") return "Front view of Barca Egadi Sailing";
  return "Vista frontale della Barca Egadi Sailing";
}

function getEgadiBoatRouteGallery(locale: string, isHalfDay: boolean): CarouselGalleryItem[] {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const labels = {
    calaRossa: isDe ? "Cala Rossa" : isFr ? "Cala Rossa" : isEs ? "Cala Rossa" : "Cala Rossa",
    calaAzzurra: isDe ? "Cala Azzurra" : isFr ? "Cala Azzurra" : isEs ? "Cala Azzurra" : "Cala Azzurra",
    bueMarino: isDe ? "Bue Marino" : isFr ? "Bue Marino" : isEs ? "Bue Marino" : "Bue Marino",
  };

  return [
    {
      src: "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp",
      alt: isEn
        ? "Swimming in the clear water of Cala Rossa during the Egadi boat tour"
        : isEs
          ? "Baño en el agua cristalina de Cala Rossa durante la excursión en barco"
          : isFr
            ? "Baignade dans l'eau cristalline de Cala Rossa pendant l'excursion en bateau"
            : isDe
              ? "Schwimmen im klaren Wasser von Cala Rossa während der Bootstour"
              : "Nuoto nell'acqua cristallina di Cala Rossa durante il tour in barca",
      caption: isEn ? "Swimming in Cala Rossa" : isEs ? "Baño en Cala Rossa" : isFr ? "Baignade à Cala Rossa" : isDe ? "Schwimmen in Cala Rossa" : "Nuoto a Cala Rossa",
    },
    {
      src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
      alt: isEn
        ? "Boat tour stop near Cala Rossa in Favignana"
        : isEs
          ? "Parada en barco cerca de Cala Rossa en Favignana"
          : isFr
            ? "Arrêt en bateau près de Cala Rossa à Favignana"
            : isDe
              ? "Badestopp mit dem Boot nahe Cala Rossa auf Favignana"
              : "Sosta in barca vicino Cala Rossa a Favignana",
      caption: labels.calaRossa,
    },
    {
      src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      alt: isEn
        ? isHalfDay
          ? "Snorkelling during the Favignana boat tour"
          : "Snorkelling during the Favignana and Levanzo boat tour"
        : isEs
          ? isHalfDay
            ? "Snorkel durante la excursión en barco por Favignana"
            : "Snorkel durante la excursión en barco Favignana y Levanzo"
          : isFr
            ? isHalfDay
              ? "Snorkeling pendant l'excursion en bateau à Favignana"
              : "Snorkeling pendant l'excursion en bateau Favignana et Levanzo"
            : isDe
              ? isHalfDay
                ? "Schnorcheln während der Bootstour rund um Favignana"
                : "Schnorcheln während der Bootstour Favignana und Levanzo"
              : isHalfDay
                ? "Snorkeling durante il tour in barca a Favignana"
                : "Snorkeling durante l'escursione in barca Favignana e Levanzo",
      caption: isEn ? "Snorkelling" : isEs ? "Snorkel" : isFr ? "Snorkeling" : isDe ? "Schnorcheln" : "Snorkeling",
    },
    {
      src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
      alt: isEn
        ? "Return navigation at sunset after the Egadi Islands boat tour"
        : isEs
          ? "Regreso al atardecer después del tour en barco por las Egadi"
          : isFr
            ? "Retour au coucher du soleil après le tour en bateau aux Égades"
            : isDe
              ? "Rückfahrt bei Sonnenuntergang nach der Bootstour zu den Ägadischen Inseln"
              : "Navigazione di rientro al tramonto dopo il tour in barca alle Egadi",
      caption: isEn ? "Return at sunset" : isEs ? "Regreso al atardecer" : isFr ? "Retour au coucher du soleil" : isDe ? "Rückfahrt bei Sonnenuntergang" : "Rientro al tramonto",
    },
    {
      src: "/images/islands/favignana/poi/cala-azzurra.webp",
      alt: isEn
        ? "Cala Azzurra in Favignana with turquoise water"
        : isEs
          ? "Cala Azzurra en Favignana con agua turquesa"
          : isFr
            ? "Cala Azzurra à Favignana avec eau turquoise"
            : isDe
              ? "Cala Azzurra auf Favignana mit türkisfarbenem Wasser"
              : "Cala Azzurra a Favignana con acqua turchese",
      caption: labels.calaAzzurra,
    },
    {
      src: "/images/islands/favignana/poi/bue-marino.webp",
      alt: isEn
        ? "Bue Marino rocky coastline in Favignana"
        : isEs
          ? "Costa rocosa de Bue Marino en Favignana"
          : isFr
            ? "Côte rocheuse de Bue Marino à Favignana"
            : isDe
              ? "Felsige Küste von Bue Marino auf Favignana"
              : "Costa rocciosa del Bue Marino a Favignana",
      caption: labels.bueMarino,
    },
    {
      src: "/images/islands/favignana/poi/cala-del-pozzo.webp",
      alt: isEn
        ? "Cala del Pozzo in Favignana"
        : isEs
          ? "Cala del Pozzo en Favignana"
          : isFr
            ? "Cala del Pozzo à Favignana"
            : isDe
              ? "Cala del Pozzo auf Favignana"
              : "Cala del Pozzo a Favignana",
      caption: "Cala del Pozzo",
    },
    {
      src: "/images/islands/favignana/poi/cala-rossa.webp",
      alt: isEn
        ? "Cala Rossa in Favignana seen from the coast"
        : isEs
          ? "Cala Rossa en Favignana vista desde la costa"
          : isFr
            ? "Cala Rossa à Favignana vue depuis la côte"
            : isDe
              ? "Cala Rossa auf Favignana von der Küste aus gesehen"
              : "Cala Rossa a Favignana vista dalla costa",
      caption: labels.calaRossa,
    },
    {
      src: "/images/islands/favignana/poi/punta-marsala.webp",
      alt: isEn
        ? "Punta Marsala in Favignana"
        : isEs
          ? "Punta Marsala en Favignana"
          : isFr
            ? "Punta Marsala à Favignana"
            : isDe
              ? "Punta Marsala auf Favignana"
              : "Punta Marsala a Favignana",
      caption: "Punta Marsala",
    },
  ];
}

function PaymentBrandMark({ brand }: { brand: PaymentBrand }) {
  return (
    <span className="inline-flex h-8 w-[4.35rem] items-center justify-center overflow-hidden rounded-[0.28rem] bg-white px-2 shadow-sm ring-1 ring-white/20">
      <Image
        src={brand.src}
        alt={brand.label}
        width={56}
        height={22}
        unoptimized
        className="max-h-5 max-w-full object-contain"
      />
    </span>
  );
}

function getFishingDetailCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return {
    experienceLabel: isEs
      ? "Charter de pesca deportiva"
      : isFr
        ? "Charter de pêche sportive"
        : isDe
          ? "Sportangel-Charter"
          : isEn
            ? "Sport fishing charter"
            : "Charter di pesca sportiva",
    bookingTitle: isEs
      ? "Reserva el charter de pesca"
      : isFr
        ? "Réserver le charter de pêche"
        : isDe
          ? "Angelcharter buchen"
          : isEn
            ? "Book the fishing charter"
            : "Prenota il charter di pesca",
    bookingText: isEs
      ? "Elige la fecha y reserva la neumática privada hasta 4 personas, con precio por grupo."
      : isFr
        ? "Choisissez la date et réservez le semi-rigide privé jusqu'à 4 personnes, avec prix par groupe."
        : isDe
          ? "Wählen Sie das Datum und buchen Sie das private Angel-RIB bis 4 Personen, mit Preis pro Gruppe."
          : isEn
            ? "Choose the date and book the private Fishing RIB for up to 4 guests, priced per group."
            : "Scegli la data e prenota il Gommone Pesca privato fino a 4 persone, con prezzo per gruppo.",
    galleryTitle: isEs
      ? "Gommone y setup de pesca"
      : isFr
        ? "Semi-rigide et setup pêche"
        : isDe
          ? "Angel-RIB und Setup"
          : isEn
            ? "Fishing RIB and setup"
            : "Gommone e setup pesca",
    bookNow: isEs
      ? "Reservar ahora"
      : isFr
        ? "Réserver"
        : isDe
          ? "Verfügbarkeit prüfen"
          : isEn
            ? "Book now"
            : "Prenota ora",
  };
}

function getFishingSeoExpansionCopy(
  locale: string,
  durationText: string,
  boatTitle?: string,
  capacityMax = 4,
) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const boat = boatTitle ?? (isEs ? "neumática de pesca" : isFr ? "semi-rigide de pêche" : isDe ? "Angel-RIB" : isEn ? "Fishing RIB" : "Gommone Pesca");
  return {
    practicalEyebrow: isEs ? "Antes de reservar" : isFr ? "Avant de réserver" : isDe ? "Vor der Buchung" : isEn ? "Before booking" : "Prima di prenotare",
    practicalTitle: isEs ? "Detalles técnicos" : isFr ? "Détails techniques" : isDe ? "Technische Details" : isEn ? "Technical details" : "Dettagli tecnici",
    practicalItems: [
      {
        icon: Anchor,
        title: isEs ? "Salida desde Trapani" : isFr ? "Départ de Trapani" : isDe ? "Abfahrt ab Trapani" : isEn ? "Departure from Trapani" : "Partenza da Trapani",
        text: isEs
          ? "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani."
          : isFr
            ? "Point de rencontre : Via dei Gladioli 15, 91100 Trapani."
            : isDe
              ? "Treffpunkt: Via dei Gladioli 15, 91100 Trapani."
              : isEn
                ? "Meeting point: Via dei Gladioli 15, 91100 Trapani."
                : "Punto di incontro: Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        icon: Clock,
        title: isEs ? "Duración" : isFr ? "Durée" : isDe ? "Dauer" : isEn ? "Duration" : "Durata",
        text: durationText,
      },
      {
        icon: Compass,
        title: isEs ? "Ruta y normativa" : isFr ? "Route et règles" : isDe ? "Route und Regeln" : isEn ? "Route and rules" : "Rotta e normativa",
        text: isEs
          ? "La ruta se decide según mar, temporada y autorizaciones AMP/MASAF: se pesca alrededor de las islas, en zonas permitidas, no dentro de las calas de baño."
          : isFr
            ? "La route est décidée selon mer, saison et autorisations AMP/MASAF : on pêche autour des îles, dans les zones autorisées, pas dans les criques de baignade."
            : isDe
              ? "Die Route richtet sich nach Meer, Saison und AMP/MASAF-Genehmigungen: Geangelt wird rund um die Inseln in erlaubten Bereichen, nicht in Badebuchten."
              : isEn
                ? "The route is chosen according to sea state, season and AMP/MASAF authorisations: fishing takes place around the islands, in permitted areas, not inside swimming coves."
                : "La rotta si decide in base a mare, stagione e autorizzazioni AMP/MASAF: si pesca intorno alle isole, nelle aree consentite, non dentro le cale balneari.",
      },
      {
        icon: Users,
        title: isEs ? "Formato y capacidad" : isFr ? "Format et capacité" : isDe ? "Format und Kapazität" : isEn ? "Format and capacity" : "Formula e capienza",
        text: isEs
          ? `${boat} privado hasta ${capacityMax} personas, con precio por grupo.`
          : isFr
            ? `${boat} privé jusqu'à ${capacityMax} personnes, avec prix par groupe.`
            : isDe
              ? `${boat} privat bis ${capacityMax} Gäste, Preis pro Gruppe.`
              : isEn
                ? `Private ${boat} for up to ${capacityMax} guests, priced per group.`
                : `${boat} privato fino a ${capacityMax} persone, con prezzo per gruppo.`,
      },
      {
        icon: ShieldCheck,
        title: isEs ? "Meteorología, cancelación y reembolso" : isFr ? "Météo, annulation et remboursement" : isDe ? "Wetter, Storno und Erstattung" : isEn ? "Weather, cancellation and refund" : "Meteo, cancellazione e rimborso",
        text: isEs
          ? "Si Egadisailing cancela por mar no seguro, puedes elegir cambio de fecha gratuito o reembolso completo. Cancelación cliente: 100% hasta 30 días, 50% de 29 a 15 días, sin reembolso bajo 15 días o no-show."
          : isFr
            ? "Si Egadisailing annule pour mer non sûre, vous choisissez un changement de date gratuit ou un remboursement complet. Annulation client : 100% jusqu'à 30 jours, 50% de 29 à 15 jours, aucun remboursement sous 15 jours ou no-show."
            : isDe
              ? "Wenn Egadisailing wegen unsicherer Seebedingungen storniert, wählen Sie kostenlosen Terminwechsel oder volle Erstattung. Kundenstorno: 100% bis 30 Tage, 50% von 29 bis 15 Tage, keine Erstattung unter 15 Tagen oder bei No-show."
              : isEn
                ? "If Egadisailing cancels because of unsafe sea conditions, you can choose a free date change or full refund. Customer cancellation: 100% up to 30 days, 50% from 29 to 15 days, no refund under 15 days or no-show."
                : "Se Egadisailing cancella per mare non sicuro, puoi scegliere cambio data gratuito o rimborso completo. Cancellazione cliente: 100% fino a 30 giorni, 50% da 29 a 15 giorni, nessun rimborso sotto i 15 giorni o no-show.",
      },
    ],
    whatYouSeeTitle: isEs ? "Qué harás a bordo" : isFr ? "Ce que vous ferez à bord" : isDe ? "Was Sie an Bord machen" : isEn ? "What you will do on board" : "Cosa farai a bordo",
    whatYouSeeIntro: isEs
      ? "Una jornada para aficionados, con técnica, lectura del mar y cumplimiento normativo antes que promesas de captura."
      : isFr
        ? "Une journée pour passionnés, avec technique, lecture de la mer et conformité avant toute promesse de prise."
        : isDe
          ? "Ein Tag für Enthusiasten, mit Technik, Lesen des Meeres und Regelkonformität statt Fangversprechen."
          : isEn
            ? "A day for enthusiasts, with technique, sea reading and compliance before catch promises."
            : "Una giornata per appassionati, con tecnica, lettura del mare e rispetto delle regole prima delle promesse di cattura.",
    whatYouSeeItems: [
      {
        title: isEs ? "Técnicas mixtas" : isFr ? "Techniques mixtes" : isDe ? "Gemischte Techniken" : isEn ? "Mixed techniques" : "Tecniche miste",
        text: isEs
          ? "Pesca de fondo, curricán, drifting o catch and release según condiciones y decisión del patrón."
          : isFr
            ? "Pêche de fond, traîne, drifting ou catch and release selon conditions et décision du skipper."
            : isDe
              ? "Grundangeln, Schleppangeln, Drifting oder Catch and Release je nach Bedingungen und Skipper-Entscheidung."
              : isEn
                ? "Bottom fishing, trolling, drifting or catch and release according to conditions and skipper decision."
                : "Bolentino, traina, drifting o catch and release secondo condizioni e decisione dello skipper.",
      },
      {
        title: isEs ? "Equipo profesional" : isFr ? "Matériel professionnel" : isDe ? "Profi-Ausrüstung" : isEn ? "Professional gear" : "Attrezzatura professionale",
        text: isEs
          ? "Cañas, carretes, cebos y señuelos están preparados para una salida técnica de grupo pequeño."
          : isFr
            ? "Cannes, moulinets, appâts et leurres sont préparés pour une sortie technique en petit groupe."
            : isDe
              ? "Ruten, Rollen, Köder und Kunstköder sind für eine technische Kleingruppen-Ausfahrt vorbereitet."
              : isEn
                ? "Rods, reels, bait and lures are prepared for a technical small-group outing."
                : "Canne, mulinelli, esche e artificiali sono preparati per un'uscita tecnica in piccolo gruppo.",
      },
      {
        title: isEs ? "Captura responsable" : isFr ? "Prise responsable" : isDe ? "Verantwortungsvoller Fang" : isEn ? "Responsible catch" : "Pescato responsabile",
        text: isEs
          ? "Las capturas pueden soltarse o conservarse solo dentro de ley, tallas, cupos y autorizaciones."
          : isFr
            ? "Les prises peuvent être relâchées ou gardées uniquement selon loi, tailles, quotas et autorisations."
            : isDe
              ? "Fänge dürfen nur nach Gesetz, Mindestmaßen, Quoten und Genehmigungen behalten oder freigelassen werden."
              : isEn
                ? "Catches can be released or kept only within law, sizes, quotas and authorisations."
                : "Il pescato può essere rilasciato o trattenuto solo entro legge, taglie, quote e autorizzazioni.",
      },
    ],
    faqTitle: isEs ? "Preguntas sobre el charter de pesca" : isFr ? "Questions sur le charter de pêche" : isDe ? "Fragen zum Angelcharter" : isEn ? "Fishing charter questions" : "Domande sul charter di pesca",
    faqs: [
      {
        question: isEs ? "¿La captura está garantizada?" : isFr ? "La prise est-elle garantie ?" : isDe ? "Ist ein Fang garantiert?" : isEn ? "Is a catch guaranteed?" : "La cattura è garantita?",
        answer: isEs
          ? "No. La pesca depende de mar, temporada y naturaleza. El servicio garantiza guía técnica, equipo y cumplimiento de reglas."
          : isFr
            ? "Non. La pêche dépend de la mer, de la saison et de la nature. Le service garantit guide technique, matériel et respect des règles."
            : isDe
              ? "Nein. Angeln hängt von Meer, Saison und Natur ab. Der Service garantiert technische Begleitung, Ausrüstung und Regelkonformität."
              : isEn
                ? "No. Fishing depends on sea, season and nature. The service guarantees technical guidance, gear and rule compliance."
                : "No. La pesca dipende da mare, stagione e natura. Il servizio garantisce guida tecnica, attrezzatura e rispetto delle regole.",
      },
      {
        question: isEs ? "¿Podemos conservar el pescado?" : isFr ? "Peut-on garder le poisson ?" : isDe ? "Dürfen wir Fisch behalten?" : isEn ? "Can we keep the fish?" : "Possiamo tenere il pescato?",
        answer: isEs
          ? "Sí, solo cuando ley, tallas, especies, cupos y autorizaciones lo permiten. En los demás casos se practica catch and release."
          : isFr
            ? "Oui, seulement lorsque loi, tailles, espèces, quotas et autorisations le permettent. Sinon, catch and release."
            : isDe
              ? "Ja, nur wenn Gesetz, Mindestmaße, Arten, Quoten und Genehmigungen es erlauben. Sonst Catch and Release."
              : isEn
                ? "Yes, only when law, sizes, species, quotas and authorisations allow it. Otherwise catch and release is used."
                : "Sì, solo quando legge, taglie, specie, quote e autorizzazioni lo permettono. Altrimenti si pratica catch and release.",
      },
      {
        question: isEs ? "¿Qué técnicas se usan?" : isFr ? "Quelles techniques sont utilisées ?" : isDe ? "Welche Techniken werden genutzt?" : isEn ? "Which techniques are used?" : "Quali tecniche si usano?",
        answer: isEs
          ? "Pesca de fondo, curricán, drifting y catch and release se eligen el mismo día según condiciones y decisión del patrón."
          : isFr
            ? "Pêche de fond, traîne, drifting et catch and release sont choisis le jour même selon les conditions et le skipper."
            : isDe
              ? "Grundangeln, Schleppangeln, Drifting und Catch and Release werden am Tag je nach Bedingungen und Skipper gewählt."
              : isEn
                ? "Bottom fishing, trolling, drifting and catch and release are chosen on the day according to conditions and skipper decision."
                : "Bolentino, traina, drifting e catch and release si scelgono in giornata secondo condizioni e decisione dello skipper.",
      },
      {
        question: isEs ? "¿Cuántas personas pueden participar?" : isFr ? "Combien de personnes peuvent participer ?" : isDe ? "Wie viele Personen können teilnehmen?" : isEn ? "How many people can join?" : "Quante persone possono partecipare?",
        answer: isEs
          ? `El charter es privado y acepta hasta ${capacityMax} personas. El precio es por grupo, no por persona.`
          : isFr
            ? `Le charter est privé et accepte jusqu'à ${capacityMax} personnes. Le prix est par groupe, pas par personne.`
            : isDe
              ? `Der Charter ist privat und für bis zu ${capacityMax} Personen. Der Preis gilt pro Gruppe, nicht pro Person.`
              : isEn
                ? `The charter is private and takes up to ${capacityMax} guests. The price is per group, not per person.`
                : `Il charter è privato e può ospitare fino a ${capacityMax} persone. Il prezzo è per gruppo, non a persona.`,
      },
      {
        question: isEs ? "¿El equipo de pesca está incluido?" : isFr ? "Le matériel de pêche est-il inclus ?" : isDe ? "Ist die Angelausrüstung enthalten?" : isEn ? "Is fishing gear included?" : "L'attrezzatura da pesca è inclusa?",
        answer: isEs
          ? "Sí. Están incluidos cañas, carretes, cebos, señuelos, combustible, agua, refrescos, snack y dotaciones de seguridad."
          : isFr
            ? "Oui. Cannes, moulinets, appâts, leurres, carburant, eau, boissons sans alcool, snack et équipements de sécurité sont inclus."
            : isDe
              ? "Ja. Ruten, Rollen, Köder, Kunstköder, Treibstoff, Wasser, Softdrinks, Snacks und Sicherheitsausrüstung sind enthalten."
              : isEn
                ? "Yes. Rods, reels, bait, lures, fuel, water, soft drinks, snacks and safety equipment are included."
                : "Sì. Sono inclusi canne, mulinelli, esche, artificiali, carburante, acqua, soft drink, snack e dotazioni di sicurezza.",
      },
      {
        question: isEs ? "¿Hay que tener experiencia?" : isFr ? "Faut-il avoir de l'expérience ?" : isDe ? "Braucht man Erfahrung?" : isEn ? "Do we need previous experience?" : "Serve esperienza?",
        answer: isEs
          ? "No es obligatorio, pero la salida está pensada para aficionados motivados. El patrón adapta técnica y ritmo al grupo y a las condiciones."
          : isFr
            ? "Ce n'est pas obligatoire, mais la sortie est pensée pour des passionnés motivés. Le skipper adapte technique et rythme au groupe et aux conditions."
            : isDe
              ? "Nein, Erfahrung ist nicht zwingend, aber die Ausfahrt richtet sich an motivierte Angler. Der Skipper passt Technik und Tempo an Gruppe und Bedingungen an."
              : isEn
                ? "No, it is not mandatory, but the outing is designed for motivated enthusiasts. The skipper adapts technique and pace to the group and conditions."
                : "Non è obbligatoria, ma l'uscita è pensata per appassionati motivati. Lo skipper adatta tecnica e ritmo al gruppo e alle condizioni.",
      },
      {
        question: isEs ? "¿Dónde se puede pescar en las Egadi?" : isFr ? "Où peut-on pêcher aux Égades ?" : isDe ? "Wo darf auf den Ägadischen Inseln geangelt werden?" : isEn ? "Where can we fish in the Egadi Islands?" : "Dove si può pescare alle Egadi?",
        answer: isEs
          ? "Solo en zonas permitidas alrededor de las islas y con las autorizaciones necesarias. No se pesca dentro de las calas de baño: el patrón elige el área según corriente, fondo, temporada y reglas AMP/MASAF."
          : isFr
            ? "Uniquement dans les zones autorisées autour des îles et avec les autorisations nécessaires. On ne pêche pas dans les criques de baignade : le skipper choisit la zone selon courant, fond, saison et règles AMP/MASAF."
            : isDe
              ? "Nur in erlaubten Bereichen rund um die Inseln und mit den nötigen Genehmigungen. Nicht in Badebuchten: Der Skipper wählt das Gebiet nach Strömung, Grund, Saison und AMP/MASAF-Regeln."
              : isEn
                ? "Only in permitted areas around the islands and with the required authorisations. Fishing does not take place inside swimming coves: the skipper chooses the area according to current, seabed, season and AMP/MASAF rules."
                : "Solo nelle aree consentite intorno alle isole e con le autorizzazioni necessarie. Non si pesca dentro le cale balneari: lo skipper sceglie la zona in base a corrente, fondale, stagione e regole AMP/MASAF.",
      },
      {
        question: isEs ? "¿Qué pasa si el mar no permite salir?" : isFr ? "Que se passe-t-il si la mer ne permet pas de sortir ?" : isDe ? "Was passiert, wenn das Meer die Ausfahrt nicht erlaubt?" : isEn ? "What happens if sea conditions are not suitable?" : "Cosa succede se il mare non permette l'uscita?",
        answer: isEs
          ? "La seguridad decide siempre. Si las condiciones no son adecuadas, la salida se reprograma o se gestiona según la política de reserva."
          : isFr
            ? "La sécurité décide toujours. Si les conditions ne sont pas adaptées, la sortie est reprogrammée ou gérée selon la politique de réservation."
            : isDe
              ? "Sicherheit entscheidet immer. Wenn die Bedingungen nicht geeignet sind, wird die Ausfahrt verschoben oder nach Buchungsbedingungen verwaltet."
              : isEn
                ? "Safety always comes first. If conditions are not suitable, the outing is rescheduled or handled according to the booking policy."
                : "La sicurezza viene prima di tutto. Se le condizioni non sono adatte, l'uscita viene riprogrammata o gestita secondo la policy di prenotazione.",
      },
      {
        question: isEs ? "¿La jornada dura siempre 8 horas?" : isFr ? "La journée dure-t-elle toujours 8 heures ?" : isDe ? "Dauert der Tag immer 8 Stunden?" : isEn ? "Does the day always last 8 hours?" : "La giornata dura sempre 8 ore?",
        answer: isEs
          ? "La duración prevista es de 8 horas desde la salida hasta el regreso. Ruta, técnicas y tiempos pueden cambiar por seguridad, mar y normativa."
          : isFr
            ? "La durée prévue est de 8 heures du départ au retour. Route, techniques et horaires peuvent changer pour sécurité, mer et réglementation."
            : isDe
              ? "Die geplante Dauer beträgt 8 Stunden von Abfahrt bis Rückkehr. Route, Techniken und Zeiten können sich wegen Sicherheit, Meer und Regeln ändern."
              : isEn
                ? "The planned duration is 8 hours from departure to return. Route, techniques and timing may change for safety, sea state and regulations."
                : "La durata prevista è di 8 ore dalla partenza al rientro. Rotta, tecniche e tempi possono cambiare per sicurezza, mare e normativa.",
      },
    ],
  };
}

function isPriorityFullDayBoatService(service: { id?: string }) {
  return (
    service.id === "boat-shared-full-day" ||
    service.id === "boat-exclusive-full-day"
  );
}

function getFullDayBoatSeoExpansionCopy(
  locale: string,
  service: { id?: string; type: string; capacityMax: number },
  durationText: string,
  boatTitle?: string,
) {
  const isPrivate = service.type === "BOAT_EXCLUSIVE";
  const boatNote = boatTitle ? ` ${boatTitle}.` : "";

  if (locale === "es") {
    const formulaText = isPrivate
      ? `Tour privado en barco Favignana y Levanzo desde Trapani, con barco reservado para tu grupo.${boatNote} Hasta ${service.capacityMax} personas.`
      : `Paseo en barco compartido Favignana y Levanzo desde Trapani, con plazas individuales a bordo.${boatNote} Hasta ${service.capacityMax} personas.`;
    return {
      practicalEyebrow: "Antes de reservar",
      practicalTitle: "Detalles del paseo Favignana y Levanzo",
      practicalItems: [
        {
          icon: Anchor,
          title: "Salida desde el Puerto de Trapani",
          text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani. El embarque se confirma con la tripulación antes de la salida.",
        },
        {
          icon: Clock,
          title: "Duración 8 horas",
          text: `Duración prevista: ${durationText}, con salida desde Trapani y regreso al Puerto de Trapani.`,
        },
        {
          icon: Users,
          title: isPrivate ? "Tour privado" : "Paseo compartido",
          text: formulaText,
        },
        {
          icon: Check,
          title: "Qué incluye",
          text: "Patrón, combustible para la ruta prevista, equipo de snorkel, agua y refrescos, paradas de baño y asistencia a bordo.",
        },
        {
          icon: ShieldCheck,
          title: "Meteorología, cancelación y reembolso",
          text: "Si Egadisailing cancela por mar no seguro, puedes elegir cambio de fecha gratuito o reembolso completo. Cancelación cliente: 100% hasta 30 días, 50% de 29 a 15 días, sin reembolso bajo 15 días o no-show.",
        },
      ],
      whatYouSeeTitle: "Itinerario Favignana y Levanzo",
      whatYouSeeIntro:
        "Las paradas se eligen el mismo día para mantener seguridad, comodidad y agua clara, no como una lista rígida.",
      whatYouSeeItems: [
        {
          title: "Cala Rossa, Cala Azzurra y Bue Marino",
          text: "Las calas más buscadas de Favignana se evalúan para baño, snorkel, luz y afluencia.",
        },
        {
          title: "Grotta degli Innamorati y Scalo Cavallo",
          text: "Posibles pasos panorámicos cuando el mar permite navegar cerca de la costa con seguridad.",
        },
        {
          title: "Cala Fredda, Cala Minnola y Faraglione de Levanzo",
          text: "La segunda isla se trabaja buscando el lado más protegido para baño y relax.",
        },
        {
          title: "Snorkel y paradas de baño",
          text: "La jornada mantiene tiempo en el agua sin forzar etapas cuando viento o afluencia cambian.",
        },
      ],
      faqTitle: "Preguntas sobre Favignana y Levanzo en barco",
      faqs: [
        {
          question: "¿Desde dónde sale la excursión?",
          answer: "La salida es desde el Puerto de Trapani. El punto de encuentro habitual es Via dei Gladioli 15, 91100 Trapani.",
        },
        {
          question: "¿La excursión dura 8 horas?",
          answer: "Sí, la duración prevista es de 8 horas desde la salida hasta el regreso. Horarios y ruta pueden adaptarse por seguridad, mar y tráfico portuario.",
        },
        {
          question: "¿Qué calas se pueden ver?",
          answer: "Las posibles paradas incluyen Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Scalo Cavallo, Cala Fredda, Cala Minnola y el Faraglione de Levanzo.",
        },
        {
          question: "¿Es un tour compartido o privado?",
          answer: `${formulaText} El formato exacto está indicado en el título y en el panel de reserva.`,
        },
        {
          question: "¿Qué está incluido?",
          answer: "Están incluidos patrón, combustible para la ruta prevista, equipo de snorkel, agua y refrescos, paradas de baño y asistencia a bordo.",
        },
        {
          question: "¿Qué pasa si hay mal tiempo?",
          answer: "Si Egadisailing cancela por condiciones de mar no seguras, puedes elegir cambio de fecha gratuito o reembolso completo. La ruta puede cambiar si la experiencia se puede realizar con seguridad.",
        },
      ],
    };
  }

  if (locale === "fr") {
    const formulaText = isPrivate
      ? `Excursion privée en bateau Favignana et Levanzo depuis Trapani, avec bateau réservé pour votre groupe.${boatNote} Jusqu'à ${service.capacityMax} personnes.`
      : `Excursion partagée en bateau Favignana et Levanzo depuis Trapani, avec places individuelles à bord.${boatNote} Jusqu'à ${service.capacityMax} personnes.`;
    return {
      practicalEyebrow: "Avant de réserver",
      practicalTitle: "Détails du tour Favignana et Levanzo",
      practicalItems: [
        {
          icon: Anchor,
          title: "Départ du port de Trapani",
          text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani. L'embarquement est confirmé par l'équipage avant le départ.",
        },
        {
          icon: Clock,
          title: "Durée 8 heures",
          text: `Durée prévue : ${durationText}, avec départ de Trapani et retour au port de Trapani.`,
        },
        {
          icon: Users,
          title: isPrivate ? "Tour privé" : "Tour partagé",
          text: formulaText,
        },
        {
          icon: Check,
          title: "Ce qui est inclus",
          text: "Skipper, carburant pour la route prévue, équipement de snorkeling, eau et boissons fraîches, arrêts baignade et assistance à bord.",
        },
        {
          icon: ShieldCheck,
          title: "Météo, annulation et remboursement",
          text: "Si Egadisailing annule pour mer non sûre, vous choisissez un changement de date gratuit ou un remboursement complet. Annulation client : 100% jusqu'à 30 jours, 50% de 29 à 15 jours, aucun remboursement sous 15 jours ou no-show.",
        },
      ],
      whatYouSeeTitle: "Itinéraire Favignana et Levanzo",
      whatYouSeeIntro:
        "Les arrêts sont choisis le jour même pour garder sécurité, confort et eau claire, pas comme une liste rigide.",
      whatYouSeeItems: [
        {
          title: "Cala Rossa, Cala Azzurra et Bue Marino",
          text: "Les criques les plus recherchées de Favignana sont évaluées pour baignade, snorkeling, lumière et affluence.",
        },
        {
          title: "Grotta degli Innamorati et Scalo Cavallo",
          text: "Passages panoramiques possibles lorsque la mer permet une navigation côtière sûre.",
        },
        {
          title: "Cala Fredda, Cala Minnola et Faraglione de Levanzo",
          text: "La deuxième île se travaille en cherchant le côté le plus abrité pour baignade et détente.",
        },
        {
          title: "Snorkeling et arrêts baignade",
          text: "La journée garde du temps dans l'eau sans forcer les étapes quand vent ou affluence changent.",
        },
      ],
      faqTitle: "Questions sur Favignana et Levanzo en bateau",
      faqs: [
        {
          question: "D'où part l'excursion ?",
          answer: "Le départ se fait depuis le port de Trapani. Le point habituel est Via dei Gladioli 15, 91100 Trapani.",
        },
        {
          question: "L'excursion dure-t-elle 8 heures ?",
          answer: "Oui, la durée prévue est de 8 heures du départ au retour. Horaires et route peuvent s'adapter pour sécurité, mer et trafic portuaire.",
        },
        {
          question: "Quelles criques peut-on voir ?",
          answer: "Les arrêts possibles incluent Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Scalo Cavallo, Cala Fredda, Cala Minnola et le Faraglione de Levanzo.",
        },
        {
          question: "Le tour est-il partagé ou privé ?",
          answer: `${formulaText} Le format exact est indiqué dans le titre et le panneau de réservation.`,
        },
        {
          question: "Qu'est-ce qui est inclus ?",
          answer: "Skipper, carburant pour la route prévue, équipement de snorkeling, eau et boissons fraîches, arrêts baignade et assistance à bord sont inclus.",
        },
        {
          question: "Que se passe-t-il en cas de mauvaise météo ?",
          answer: "Si Egadisailing annule pour conditions de mer non sûres, vous choisissez un changement de date gratuit ou un remboursement complet. La route peut changer si l'expérience reste réalisable en sécurité.",
        },
      ],
    };
  }

  if (locale === "de") {
    const formulaText = isPrivate
      ? `Private Bootstour Favignana und Levanzo ab Trapani, mit Boot exklusiv für Ihre Gruppe.${boatNote} Bis zu ${service.capacityMax} Personen.`
      : `Geteilte Bootstour Favignana und Levanzo ab Trapani, mit Einzelplätzen an Bord.${boatNote} Bis zu ${service.capacityMax} Personen.`;
    return {
      practicalEyebrow: "Vor der Buchung",
      practicalTitle: "Details zur Bootstour Favignana und Levanzo",
      practicalItems: [
        {
          icon: Anchor,
          title: "Abfahrt vom Hafen Trapani",
          text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani. Die Einschiffung wird vor der Abfahrt von der Crew bestätigt.",
        },
        {
          icon: Clock,
          title: "Dauer 8 Stunden",
          text: `Geplante Dauer: ${durationText}, mit Abfahrt in Trapani und Rückkehr zum Hafen Trapani.`,
        },
        {
          icon: Users,
          title: isPrivate ? "Private Bootstour" : "Geteilte Ausfahrt",
          text: formulaText,
        },
        {
          icon: Check,
          title: "Was enthalten ist",
          text: "Skipper, Treibstoff für die geplante Route, Schnorchelausrüstung, Wasser und Softdrinks, Badestopps und Betreuung an Bord.",
        },
        {
          icon: ShieldCheck,
          title: "Wetter, Stornierung und Erstattung",
          text: "Wenn Egadisailing wegen unsicherer Seebedingungen storniert, wählen Sie kostenlosen Terminwechsel oder volle Erstattung. Kundenstorno: 100% bis 30 Tage, 50% von 29 bis 15 Tage, keine Erstattung unter 15 Tagen oder bei No-show.",
        },
      ],
      whatYouSeeTitle: "Route Favignana und Levanzo",
      whatYouSeeIntro:
        "Die Stopps werden am Tag selbst gewählt, damit Sicherheit, Komfort und klares Wasser Vorrang vor einer starren Liste haben.",
      whatYouSeeItems: [
        {
          title: "Cala Rossa, Cala Azzurra und Bue Marino",
          text: "Die meistgesuchten Buchten von Favignana werden für Baden, Schnorcheln, Licht und Andrang geprüft.",
        },
        {
          title: "Grotta degli Innamorati und Scalo Cavallo",
          text: "Mögliche Panoramapassagen, wenn das Meer eine sichere Küstennavigation erlaubt.",
        },
        {
          title: "Cala Fredda, Cala Minnola und Faraglione di Levanzo",
          text: "Auf der zweiten Insel sucht der Skipper die geschützteste Seite zum Baden und Entspannen.",
        },
        {
          title: "Schnorcheln und Badestopps",
          text: "Der Tag lässt Zeit im Wasser, ohne Stopps zu erzwingen, wenn Wind oder Andrang wechseln.",
        },
      ],
      faqTitle: "Fragen zu Favignana und Levanzo per Boot",
      faqs: [
        {
          question: "Wo startet die Bootstour?",
          answer: "Die Abfahrt erfolgt vom Hafen Trapani. Der übliche Treffpunkt ist Via dei Gladioli 15, 91100 Trapani.",
        },
        {
          question: "Dauert die Bootstour 8 Stunden?",
          answer: "Ja, die geplante Dauer beträgt 8 Stunden von Abfahrt bis Rückkehr. Zeiten und Route können sich aus Sicherheits-, See- und Hafengründen anpassen.",
        },
        {
          question: "Welche Buchten können wir sehen?",
          answer: "Mögliche Stopps sind Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Scalo Cavallo, Cala Fredda, Cala Minnola und Faraglione di Levanzo.",
        },
        {
          question: "Ist die Bootstour geteilt oder privat?",
          answer: `${formulaText} Das genaue Format steht im Titel und im Buchungsbereich.`,
        },
        {
          question: "Was ist enthalten?",
          answer: "Enthalten sind Skipper, Treibstoff für die geplante Route, Schnorchelausrüstung, Wasser und Softdrinks, Badestopps und Betreuung an Bord.",
        },
        {
          question: "Was passiert bei schlechtem Wetter?",
          answer: "Wenn Egadisailing wegen unsicherer Seebedingungen storniert, wählen Sie kostenlosen Terminwechsel oder volle Erstattung. Die Route kann sich ändern, wenn die Bootstour sicher durchführbar bleibt.",
        },
      ],
    };
  }

  const isEn = locale === "en";
  const formulaText = isPrivate
    ? isEn
      ? `Private Favignana and Levanzo boat tour from Trapani, with the boat reserved for your group.${boatNote} Up to ${service.capacityMax} guests.`
      : `Tour privato in barca Favignana e Levanzo da Trapani, con barca riservata al tuo gruppo.${boatNote} Fino a ${service.capacityMax} persone.`
    : isEn
      ? `Shared Favignana and Levanzo boat tour from Trapani, with individual seats on board.${boatNote} Up to ${service.capacityMax} guests.`
      : `Escursione condivisa in barca Favignana e Levanzo da Trapani, con posti singoli a bordo.${boatNote} Fino a ${service.capacityMax} persone.`;

  return {
    practicalEyebrow: isEn ? "Before booking" : "Prima di prenotare",
    practicalTitle: isEn ? "Favignana and Levanzo tour details" : "Dettagli del tour Favignana e Levanzo",
    practicalItems: [
      {
        icon: Anchor,
        title: isEn ? "Departure from Trapani harbour" : "Partenza dal Porto di Trapani",
        text: isEn
          ? "Meeting point: Via dei Gladioli 15, 91100 Trapani. Boarding is confirmed by the crew before departure."
          : "Punto di incontro: Via dei Gladioli 15, 91100 Trapani. L'imbarco viene confermato dalla crew prima della partenza.",
      },
      {
        icon: Clock,
        title: isEn ? "8-hour duration" : "Durata 8 ore",
        text: isEn
          ? `Planned duration: ${durationText}, departing from Trapani and returning to Trapani harbour.`
          : `Durata prevista: ${durationText}, con partenza da Trapani e rientro al Porto di Trapani.`,
      },
      {
        icon: Users,
        title: isPrivate ? (isEn ? "Private tour" : "Tour privato") : isEn ? "Shared tour" : "Tour condiviso",
        text: formulaText,
      },
      {
        icon: Check,
        title: isEn ? "What is included" : "Cosa include",
        text: isEn
          ? "Skipper, fuel for the planned route, snorkelling equipment, water and soft drinks, swim stops and on-board assistance."
          : "Skipper, carburante per la rotta prevista, attrezzatura snorkeling, acqua e soft drink, soste bagno e assistenza a bordo.",
      },
      {
        icon: ShieldCheck,
        title: isEn ? "Weather, cancellation and refund" : "Meteo, cancellazione e rimborso",
        text: isEn
          ? "If Egadisailing cancels because of unsafe sea conditions, you can choose a free date change or full refund. Customer cancellation: 100% up to 30 days, 50% from 29 to 15 days, no refund under 15 days or no-show."
          : "Se Egadisailing cancella per mare non sicuro, puoi scegliere cambio data gratuito o rimborso completo. Cancellazione cliente: 100% fino a 30 giorni, 50% da 29 a 15 giorni, nessun rimborso sotto i 15 giorni o no-show.",
      },
    ],
    whatYouSeeTitle: isEn ? "Favignana and Levanzo itinerary" : "Itinerario Favignana e Levanzo",
    whatYouSeeIntro: isEn
      ? "Stops are chosen on the day to protect safety, comfort and clear water instead of forcing a rigid list."
      : "Le tappe vengono scelte il giorno stesso per proteggere sicurezza, comfort e acqua limpida, non per forzare una lista rigida.",
    whatYouSeeItems: [
      {
        title: "Cala Rossa, Cala Azzurra e Bue Marino",
        text: isEn
          ? "The most searched Favignana coves are evaluated for swimming, snorkelling, light and crowds."
          : "Le cale più cercate di Favignana vengono valutate per bagno, snorkeling, luce e affollamento.",
      },
      {
        title: "Grotta degli Innamorati e Scalo Cavallo",
        text: isEn
          ? "Possible scenic passages when sea conditions allow safe coastal navigation."
          : "Possibili passaggi panoramici quando il mare permette una navigazione costiera sicura.",
      },
      {
        title: isEn ? "Cala Fredda, Cala Minnola and Faraglione di Levanzo" : "Cala Fredda, Cala Minnola e Faraglione di Levanzo",
        text: isEn
          ? "On the second island, the skipper looks for the most sheltered side for swimming and relaxed time."
          : "Sulla seconda isola si cerca il lato più riparato per bagno e tempo in rada.",
      },
      {
        title: isEn ? "Snorkelling and swim stops" : "Snorkeling e soste bagno",
        text: isEn
          ? "The day keeps real time in the water without forcing stops when wind or crowds change."
          : "La giornata lascia tempo vero in acqua senza forzare tappe quando vento o affollamento cambiano.",
      },
    ],
    faqTitle: isEn ? "Favignana and Levanzo boat tour questions" : "Domande sul tour Favignana e Levanzo in barca",
    faqs: [
      {
        question: isEn ? "Where does the boat tour depart from?" : "Da dove parte l'escursione?",
        answer: isEn
          ? "The tour departs from Trapani harbour. The usual meeting point is Via dei Gladioli 15, 91100 Trapani."
          : "La partenza avviene dal Porto di Trapani. Il punto di incontro abituale è Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        question: isEn ? "Does the tour last 8 hours?" : "Il tour dura 8 ore?",
        answer: isEn
          ? "Yes, the planned duration is 8 hours from departure to return. Timing and route can adapt for safety, sea conditions and harbour traffic."
          : "Sì, la durata prevista è di 8 ore dalla partenza al rientro. Orari e rotta possono adattarsi per sicurezza, mare e traffico portuale.",
      },
      {
        question: isEn ? "Which coves can be visited?" : "Quali cale si possono vedere?",
        answer: isEn
          ? "Possible stops include Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Scalo Cavallo, Cala Fredda, Cala Minnola and Faraglione di Levanzo."
          : "Le possibili tappe includono Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Scalo Cavallo, Cala Fredda, Cala Minnola e Faraglione di Levanzo.",
      },
      {
        question: isEn ? "Is this a shared or private tour?" : "Il tour è condiviso o privato?",
        answer: isEn
          ? `${formulaText} The exact format is shown in the page title and booking panel.`
          : `${formulaText} La formula esatta è indicata nel titolo e nel box di prenotazione.`,
      },
      {
        question: isEn ? "What is included?" : "Cosa è incluso?",
        answer: isEn
          ? "Skipper, fuel for the planned route, snorkelling equipment, water and soft drinks, swim stops and on-board assistance are included."
          : "Sono inclusi skipper, carburante per la rotta prevista, attrezzatura snorkeling, acqua e soft drink, soste bagno e assistenza a bordo.",
      },
      {
        question: isEn ? "What happens in bad weather?" : "Cosa succede in caso di maltempo?",
        answer: isEn
          ? "If Egadisailing cancels because sea conditions are unsafe, you can choose a free date change or a full refund. The route may change when the experience can still be safely provided."
          : "Se Egadisailing cancella per condizioni di mare non sicure, puoi scegliere cambio data gratuito o rimborso completo. La rotta può cambiare quando l'esperienza resta svolgibile in sicurezza.",
      },
    ],
  };
}

function getFishingEditorialCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return {
    eyebrow: isEs ? "Pesca deportiva Egadi" : isFr ? "Pêche sportive Égades" : isDe ? "Sportangeln Ägadische Inseln" : isEn ? "Egadi sport fishing" : "Pesca sportiva Egadi",
    title: isEs
      ? "Una jornada técnica para quien ama pescar de verdad"
      : isFr
        ? "Une journée technique pour ceux qui aiment vraiment pêcher"
        : isDe
          ? "Ein technischer Tag für echte Angelbegeisterte"
          : isEn
            ? "A technical day for people who really love fishing"
            : "Una giornata tecnica per chi ama davvero pescare",
    paragraphs: isEs
      ? [
          "El charter de pesca en las Islas Egadi está pensado para aficionados que quieren una salida privada desde Trapani, equipo profesional y una tripulación capaz de leer mar, temporada y normativa.",
          "No se pesca dentro de las calas de baño: la ruta se construye alrededor de Favignana, Levanzo y el archipiélago, en zonas permitidas y elegidas según corriente, fondo, viento y autorizaciones AMP/MASAF.",
          "La jornada puede combinar pesca de fondo, curricán, drifting o catch and release según condiciones reales. No se prometen capturas: se promete una experiencia técnica, seria, segura y respetuosa.",
          "El pescado puede soltarse o conservarse solo cuando la ley, las tallas, los cupos y las autorizaciones lo permiten. La decisión final operativa queda siempre al patrón.",
        ]
      : isFr
        ? [
            "Le charter de pêche aux îles Égades est conçu pour les passionnés qui veulent une sortie privée depuis Trapani, du matériel professionnel et un équipage capable de lire la mer, la saison et la réglementation.",
            "On ne pêche pas dans les criques de baignade : la route se construit autour de Favignana, Levanzo et l'archipel, dans les zones autorisées choisies selon courant, fond, vent et autorisations AMP/MASAF.",
            "La journée peut combiner pêche de fond, traîne, drifting ou catch and release selon les conditions réelles. Aucune prise n'est promise : l'expérience est technique, sérieuse, sûre et respectueuse.",
            "Le poisson peut être relâché ou gardé uniquement lorsque loi, tailles, quotas et autorisations le permettent. La décision opérationnelle finale appartient toujours au skipper.",
          ]
        : isDe
          ? [
              "Der Angelcharter auf den Ägadischen Inseln ist für Enthusiasten gedacht, die eine private Ausfahrt ab Trapani, professionelle Ausrüstung und eine Crew suchen, die Meer, Saison und Regeln lesen kann.",
              "Geangelt wird nicht in Badebuchten: Die Route entsteht rund um Favignana, Levanzo und den Archipel, in erlaubten Bereichen nach Strömung, Grund, Wind und AMP/MASAF-Genehmigungen.",
              "Der Tag kann Grundangeln, Schleppangeln, Drifting oder Catch and Release je nach echten Bedingungen kombinieren. Es wird kein Fang versprochen: Versprochen wird ein technisches, sicheres und respektvolles Erlebnis.",
              "Fisch darf nur behalten oder freigelassen werden, wenn Gesetz, Mindestmaße, Quoten und Genehmigungen es erlauben. Die endgültige operative Entscheidung liegt immer beim Skipper.",
            ]
          : isEn
            ? [
                "The Egadi fishing charter is designed for enthusiasts who want a private outing from Trapani, professional gear and a crew able to read the sea, the season and the rules.",
                "Fishing does not happen inside swimming coves: the route is built around Favignana, Levanzo and the archipelago, in permitted areas chosen according to current, seabed, wind and AMP/MASAF authorisations.",
                "The day can combine bottom fishing, trolling, drifting or catch and release according to real conditions. No catch is promised: the promise is a technical, serious, safe and respectful experience.",
                "Fish can be released or kept only when law, sizes, quotas and authorisations allow it. The final operational decision always belongs to the skipper.",
              ]
            : [
                "Il charter pesca Egadi da Trapani è pensato per appassionati che vogliono un'uscita privata, attrezzatura professionale e una crew capace di leggere mare, stagione e normativa.",
                "Non si pesca dentro le cale balneari: la rotta viene costruita intorno a Favignana, Levanzo e all'arcipelago, nelle aree consentite e scelte in base a corrente, fondale, vento e autorizzazioni AMP/MASAF.",
                "La giornata può combinare bolentino, traina, drifting o catch and release secondo condizioni reali. Non si promette la cattura: si promette un'esperienza tecnica, seria, sicura e rispettosa.",
                "Il pescato può essere rilasciato o trattenuto solo quando legge, taglie, quote e autorizzazioni lo permettono. La decisione operativa finale resta sempre allo skipper.",
              ],
  };
}

function getDetailCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string },
) {
  if (isFishingService(service)) return getFishingDetailCopy(locale);

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isHalfDay = service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

  if (isDe) {
    const experienceLabel = isCharter
      ? "Privater Charter"
      : isPrivateBoat
        ? "Private Bootstour zu den Ägadischen Inseln"
        : isSharedBoat
          ? "Geteilte Bootstour zu den Ägadischen Inseln"
          : "Bootserlebnis auf den Ägadischen Inseln";
    const routeText = isCharter
      ? "Favignana, Levanzo und Marettimo werden nach Wind, Meer und gewünschtem Bordrhythmus geplant."
      : isFullDay
        ? "Acht Stunden geben Raum für Favignana und Levanzo, mit Buchten und Zeiten passend zu den Bedingungen."
        : isHalfDay
          ? "Vier Stunden konzentrieren sich auf die am besten geschützten Gewässer des Tages, mit klarer Rückkehr."
          : "Die Crew wählt die besten Buchten zum Baden, Schnorcheln und entspannten Navigieren.";
    const formulaText = isCharter
      ? "Privater Trimaran-Charter mit Skipper, Kabinen und Route, die Tag für Tag entsteht."
      : isPrivateBoat
        ? "Das Boot ist für Ihre Gruppe reserviert; Stopps und Rhythmus werden mit dem Skipper abgestimmt."
        : isSharedBoat
          ? "Sie buchen einzelne Plätze und teilen das Erlebnis mit anderen Gästen."
          : "Privater Premium-Tag auf dem Trimaran mit Chef, Skipper und Hostess.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nächte vor Anker", text: "Wachen Sie nahe geschützter Buchten auf und passen Sie jeden Tag ohne Eile an." },
          { title: "Favignana, Levanzo, Marettimo", text: "Die Inseln werden nach Wind, Meer und Charterdauer gewählt." },
          { title: "Leben an Bord", text: "Kabinen, Küche und Gemeinschaftsflächen machen den Trimaran zu einem schwimmenden Zuhause." },
        ]
      : isFullDay
        ? [
            { title: "Mehr Zeit im Wasser", text: "Acht Stunden geben mehr Spielraum für Buchten, Baden und Schnorcheln." },
            { title: "Favignana und Levanzo", text: "Die Crew kann zwischen beiden Inseln arbeiten, wenn das Meer es erlaubt." },
            { title: "Entspannte Rückfahrt", text: "Der letzte Abschnitt hält den Tag ruhig, mit wechselndem Licht Richtung Trapani." },
          ]
        : [
            { title: "Klarer Zeitplan", text: "Ein kompaktes Zeitfenster für Meer, Baden und eine präzise Rückkehr." },
            { title: "Geschützte Buchten", text: "Der Skipper wählt die sichersten und klarsten Gewässer, die in einem halben Tag erreichbar sind." },
            { title: "Panoramafahrt", text: "Genug Zeit, um die Ägadischen Inseln auch bei einer kurzen Ausfahrt vom Meer aus zu spüren." },
          ];
    const faqs = [
      {
        question: "Wo startet die Bootstour?",
        answer:
          "Die Abfahrt erfolgt ab Trapani. Der übliche Treffpunkt ist Via dei Gladioli 15, 91100 Trapani, sofern die Crew nichts anderes mitteilt.",
      },
      {
        question: "Ist die Route fest?",
        answer:
          "Nein. Der Skipper wählt die sicherste und angenehmste Route nach Wind, Meer, Auslastung und verfügbarer Zeit.",
      },
      {
        question: "Ist das Erlebnis geteilt oder privat?",
        answer: `${formulaText} Das genaue Format sehen Sie im Titel und im Buchungsbereich, bevor Sie ein Datum wählen.`,
      },
      {
        question: "Was sollte ich an Bord mitbringen?",
        answer:
          "Badekleidung, Handtuch, Sonnenschutz, Sonnenbrille, Hut und eine weiche Tasche, die sich leicht verstauen lässt.",
      },
      {
        question: "Was passiert, wenn das Meer nicht geeignet ist?",
        answer:
          "Die Crew prüft die Bedingungen vor der Abfahrt und stellt Sicherheit immer an erste Stelle. Falls nötig, wird die Route angepasst oder es werden verfügbare operative Optionen vorgeschlagen.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "Das Erlebnis",
      overviewEyebrow: "Warum es passt",
      bookingTitle: "Dieses Erlebnis planen",
      bookingText: "Wählen Sie das Datum und fahren Sie mit aktuellen Preisen und Verfügbarkeiten zur Buchung fort.",
      galleryTitle: "Ein Eindruck an Bord",
      usefulInfo: "Nützliche Informationen",
      routeTitle: isCharter ? "Route Tag für Tag" : isFullDay ? "Ganztagesroute" : isHalfDay ? "Kompakte Route" : "Route nach Seebedingungen",
      routeText,
      onboardTitle: isCharter ? "Leben an Bord" : isPrivateBoat ? "Reserviertes Boot" : isSharedBoat ? "Geteilte Plätze" : "Crew und Komfort",
      onboardText: isCharter
        ? "Kabinen, Gemeinschaftsflächen und Küche machen den Trimaran zu einem kleinen Zuhause auf dem Meer."
        : isPrivateBoat
          ? "Das Boot ist Ihrer Gruppe gewidmet, daher werden Stopps und Rhythmus mit dem Skipper gestaltet."
          : isSharedBoat
            ? "Sie buchen Ihre Plätze und teilen die Route mit anderen Gästen, einfach und zugänglich."
            : "Skipper und Bordservice halten den Tag von der Abfahrt bis zur Rückkehr flüssig.",
      rhythmTitle: isCharter ? "Langsame Tage" : isFullDay ? "Zeit zum Bleiben" : isHalfDay ? "Essentieller halber Tag" : "Leichter Rhythmus",
      rhythmText: isCharter
        ? "Schlafen Sie nahe geschützter Buchten, wachen Sie am Wasser auf und passen Sie das Programm ohne Eile an."
        : isFullDay
          ? "Ein längeres Zeitfenster bedeutet mehr Zeit im Wasser, mehr Flexibilität und weniger Druck zwischen den Stopps."
          : isHalfDay
            ? "Ein kurzes, fokussiertes Erlebnis für Gäste, die Meer, Baden und klare Zeiten wünschen."
            : "Badestopps, Zeit vor Anker und eine klare Rückkehr halten das Erlebnis ausgewogen.",
      priceHeader: isCharter ? "Paketpreis" : "Preis",
      charterType: "Charterpaket",
      daysLabel: (days: number) => `${days} Tage`,
      bookNow: "Verfügbarkeit prüfen",
      practicalEyebrow: "Vor der Buchung",
      practicalTitle: "Praktische Details",
      practicalItems: [
        { icon: Anchor, title: "Abfahrt ab Trapani", text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Dauer",
          text: isCharter
            ? "3 bis 7 Tage, vor der Abfahrt geplant."
            : isFullDay
              ? "8 Stunden."
              : isHalfDay
                ? "4 Stunden."
                : "Dauer wie in der Erlebnisbeschreibung angegeben.",
        },
        { icon: Compass, title: "Route", text: routeText },
        { icon: Users, title: "Format und Kapazität", text: formulaText },
      ],
      whatYouSeeTitle: "Was Sie an Bord erleben",
      whatYouSeeIntro: "Mehr Kontext, damit Sie vor der Buchung das passende Erlebnis wählen.",
      whatYouSeeItems,
      faqTitle: "Fragen zu diesem Erlebnis",
      faqs,
    };
  }

  if (isFr) {
    const experienceLabel = isCharter
      ? "Charter privé"
      : isPrivateBoat
        ? "Excursion privée aux Égades"
        : isSharedBoat
          ? "Excursion partagée aux Égades"
          : "Expérience en bateau aux Égades";
    const routeText = isCharter
      ? "Favignana, Levanzo et Marettimo sont planifiées selon le vent, la mer et le rythme souhaité à bord."
      : isFullDay
        ? "Huit heures permettent de naviguer entre Favignana et Levanzo, en adaptant criques et horaires aux conditions."
        : isHalfDay
          ? "Quatre heures concentrées sur les eaux les plus protégées du jour, avec un retour clair et sans précipitation."
          : "L'équipage choisit les meilleures baies pour se baigner, faire du snorkeling et naviguer tranquillement.";
    const formulaText = isCharter
      ? "Charter privé en trimaran avec skipper, cabines et route construite jour après jour."
      : isPrivateBoat
        ? "Le bateau est réservé à votre groupe, avec arrêts et rythme définis avec le skipper."
        : isSharedBoat
          ? "Vous réservez des places individuelles et partagez l'expérience avec d'autres hôtes."
          : "Journée privée premium en trimaran avec chef, skipper et hôtesse.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nuits au mouillage", text: "Réveillez-vous près de criques protégées et adaptez chaque journée sans courir." },
          { title: "Favignana, Levanzo, Marettimo", text: "Les îles sont choisies selon le vent, la mer et la durée du charter." },
          { title: "Vie à bord", text: "Cabines, cuisine et espaces communs transforment le trimaran en maison flottante." },
        ]
      : isFullDay
        ? [
            { title: "Plus de temps dans l'eau", text: "Huit heures donnent plus de marge pour les criques, la baignade et le snorkeling." },
            { title: "Favignana et Levanzo", text: "L'équipage peut travailler entre les deux îles lorsque la mer le permet." },
            { title: "Retour détendu", text: "Le dernier tronçon garde la journée calme, avec la lumière changeante vers Trapani." },
          ]
        : [
            { title: "Horaire clair", text: "Une plage compacte pour ceux qui veulent mer, baignade et retour précis." },
            { title: "Criques protégées", text: "Le skipper choisit les eaux les plus sûres et claires accessibles en demi-journée." },
            { title: "Navigation panoramique", text: "Assez de temps pour sentir les Égades depuis la mer, même sur une sortie courte." },
          ];
    const faqs = [
      {
        question: "D'où part l'excursion ?",
        answer:
          "Le départ se fait depuis Trapani. Le point de rencontre habituel est Via dei Gladioli 15, 91100 Trapani, sauf indication opérationnelle différente de l'équipage.",
      },
      {
        question: "La route est-elle fixe ?",
        answer:
          "Non. Le skipper choisit la route la plus sûre et agréable selon le vent, la mer, l'affluence et le temps disponible.",
      },
      {
        question: "L'expérience est-elle partagée ou privée ?",
        answer: `${formulaText} Vous pouvez vérifier le format exact dans le titre et le panneau de réservation avant de choisir la date.`,
      },
      {
        question: "Que faut-il apporter à bord ?",
        answer:
          "Maillot, serviette, crème solaire, lunettes de soleil, chapeau et sac souple facile à ranger.",
      },
      {
        question: "Que se passe-t-il si la mer n'est pas adaptée ?",
        answer:
          "L'équipage vérifie les conditions avant le départ et privilégie toujours la sécurité. Si nécessaire, la route est adaptée ou les options opérationnelles disponibles sont proposées.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "L'expérience",
      overviewEyebrow: "Pourquoi la choisir",
      bookingTitle: "Planifier cette expérience",
      bookingText: "Choisissez la date et continuez vers la réservation avec prix et disponibilités à jour.",
      galleryTitle: "Un aperçu à bord",
      usefulInfo: "Informations utiles",
      routeTitle: isCharter ? "Route construite jour après jour" : isFullDay ? "Route de journée complète" : isHalfDay ? "Route compacte" : "Route selon la mer",
      routeText,
      onboardTitle: isCharter ? "Vie à bord" : isPrivateBoat ? "Bateau réservé" : isSharedBoat ? "Places partagées" : "Équipage et confort",
      onboardText: isCharter
        ? "Cabines, espaces communs et cuisine transforment le trimaran en petite maison sur la mer."
        : isPrivateBoat
          ? "Le bateau est dédié à votre groupe, donc les arrêts et le rythme se construisent avec le skipper."
          : isSharedBoat
            ? "Réservez vos places et partagez la route avec d'autres hôtes, avec une formule simple et accessible."
            : "Skipper et services à bord gardent la journée fluide du départ au retour.",
      rhythmTitle: isCharter ? "Jours lents" : isFullDay ? "Temps pour rester" : isHalfDay ? "Demi-journée essentielle" : "Rythme facile",
      rhythmText: isCharter
        ? "Dormez près de baies protégées, réveillez-vous au bord de l'eau et ajustez le programme sans vous presser."
        : isFullDay
          ? "Un créneau plus long signifie plus de temps dans l'eau, plus de flexibilité et moins de pression entre les arrêts."
          : isHalfDay
            ? "Une expérience courte et ciblée pour ceux qui veulent mer, baignade et horaires clairs."
            : "Arrêts baignade, temps au mouillage et retour clair gardent l'expérience équilibrée.",
      priceHeader: isCharter ? "Prix du forfait" : "Prix",
      charterType: "Forfait charter",
      daysLabel: (days: number) => `${days} jours`,
      bookNow: "Réserver",
      practicalEyebrow: "Avant de réserver",
      practicalTitle: "Détails pratiques",
      practicalItems: [
        { icon: Anchor, title: "Départ de Trapani", text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Durée",
          text: isCharter
            ? "De 3 à 7 jours, planifiés avant le départ."
            : isFullDay
              ? "8 heures."
              : isHalfDay
                ? "4 heures."
                : "Durée indiquée dans la fiche de l'expérience.",
        },
        { icon: Compass, title: "Route", text: routeText },
        { icon: Users, title: "Format et capacité", text: formulaText },
      ],
      whatYouSeeTitle: "Ce que vous vivrez à bord",
      whatYouSeeIntro: "Plus de contexte pour choisir la bonne expérience avant de réserver.",
      whatYouSeeItems,
      faqTitle: "Questions sur cette expérience",
      faqs,
    };
  }

  if (isEs) {
    const experienceLabel = isCharter
      ? "Charter privado"
      : isPrivateBoat
        ? "Excursión privada por las Egadi"
        : isSharedBoat
          ? "Excursión compartida por las Egadi"
          : "Experiencia en barco por las Egadi";
    const routeText = isCharter
      ? "Favignana, Levanzo y Marettimo se planifican según viento, mar y el ritmo que quieras a bordo."
      : isFullDay
        ? "Ocho horas permiten trabajar entre Favignana y Levanzo, adaptando calas y tiempos a las condiciones."
        : isHalfDay
          ? "Cuatro horas concentradas en las aguas más protegidas del día, con regreso claro y sin prisas."
          : "La tripulación elige las mejores bahías para bañarse, hacer snorkel y navegar con calma.";
    const formulaText = isCharter
      ? "Charter privado en trimarán con patrón, camarotes y ruta construida día a día."
      : isPrivateBoat
        ? "El barco queda reservado para tu grupo, con paradas y ritmo acordados con el patrón."
        : isSharedBoat
          ? "Reservas plazas individuales y compartes la experiencia con otros huéspedes."
	          : "Jornada privada premium en trimarán con chef, patrón y azafata.";
    const whatYouSeeItems = isCharter
      ? [
	          { title: "Noches al fondeo", text: "Despiértate cerca de calas protegidas y adapta cada día sin prisas." },
          { title: "Favignana, Levanzo, Marettimo", text: "Las islas se eligen según viento, mar y duración del charter." },
          { title: "Vida a bordo", text: "Camarotes, cocina y zonas comunes convierten el trimarán en una casa flotante." },
        ]
      : isFullDay
        ? [
            { title: "Más tiempo en el agua", text: "Ocho horas dan más margen para calas, baño y snorkel." },
            { title: "Favignana y Levanzo", text: "La tripulación puede trabajar entre ambas islas cuando el mar lo permite." },
            { title: "Regreso relajado", text: "El último tramo mantiene el día tranquilo, con luz cambiante de vuelta a Trapani." },
          ]
        : [
            { title: "Horario claro", text: "Una franja compacta para quienes quieren mar, baño y regreso preciso." },
            { title: "Calas protegidas", text: "El patrón elige las aguas más seguras y limpias alcanzables en medio día." },
            { title: "Navegación panorámica", text: "Tiempo suficiente para sentir las Egadi desde el mar incluso en una salida breve." },
          ];
    const faqs = [
      {
        question: "¿Desde dónde sale la excursión?",
        answer:
          "La salida es desde Trapani. El punto de encuentro habitual es Via dei Gladioli 15, 91100 Trapani, salvo indicación operativa distinta de la tripulación.",
      },
      {
        question: "¿La ruta es fija?",
        answer:
          "No. El patrón elige la ruta más segura y agradable según viento, mar, afluencia y tiempo disponible.",
      },
      {
        question: "¿Es una experiencia compartida o privada?",
        answer: `${formulaText} Puedes comprobar el formato exacto en el título y en el panel de reserva antes de elegir la fecha.`,
      },
      {
        question: "¿Qué debo llevar a bordo?",
        answer:
          "Bañador, toalla, protector solar, gafas de sol, sombrero y una bolsa blanda fácil de guardar.",
      },
      {
        question: "¿Qué pasa si el mar no es adecuado?",
        answer:
          "La tripulación revisa las condiciones antes de salir y prioriza siempre la seguridad. Si hace falta, se adapta la ruta o se proponen las opciones operativas disponibles.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "La experiencia",
      overviewEyebrow: "Por qué elegirla",
      bookingTitle: "Planifica esta experiencia",
      bookingText: "Elige la fecha y continúa al proceso de reserva con precios y disponibilidad actualizados.",
      galleryTitle: "Un vistazo a bordo",
      usefulInfo: "Información útil",
      routeTitle: isCharter ? "Ruta construida día a día" : isFullDay ? "Ruta de día completo" : isHalfDay ? "Ruta compacta" : "Ruta según el mar",
      routeText,
      onboardTitle: isCharter ? "Vida a bordo" : isPrivateBoat ? "Barco reservado" : isSharedBoat ? "Plazas compartidas" : "Tripulación y confort",
      onboardText: isCharter
        ? "Camarotes, zonas comunes y cocina convierten el trimarán en una pequeña casa sobre el mar."
        : isPrivateBoat
          ? "El barco está dedicado a tu grupo, así que las paradas y el ritmo se ajustan con el patrón."
          : isSharedBoat
            ? "Reserva tus plazas y comparte la ruta con otros huéspedes, con una fórmula sencilla y accesible."
            : "Patrón y servicios a bordo mantienen la jornada fluida desde la salida hasta el regreso.",
      rhythmTitle: isCharter ? "Días lentos" : isFullDay ? "Tiempo para quedarse" : isHalfDay ? "Medio día esencial" : "Ritmo fácil",
      rhythmText: isCharter
        ? "Duerme cerca de bahías protegidas, despiértate junto al agua y ajusta el plan sin prisas."
        : isFullDay
          ? "Una franja más larga significa más tiempo en el agua, más flexibilidad y menos presión entre paradas."
          : isHalfDay
            ? "Una experiencia corta y enfocada para quienes quieren mar, baño y horarios claros."
	            : "Paradas de baño, tiempo al fondeo y regreso claro mantienen la experiencia equilibrada.",
      priceHeader: isCharter ? "Precio del paquete" : "Precio",
      charterType: "Paquete charter",
      daysLabel: (days: number) => `${days} días`,
      bookNow: "Reservar ahora",
      practicalEyebrow: "Antes de reservar",
      practicalTitle: "Detalles prácticos",
      practicalItems: [
        { icon: Anchor, title: "Salida desde Trapani", text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Duración",
          text: isCharter
            ? "De 3 a 7 días, planificados antes de la salida."
            : isFullDay
              ? "8 horas."
              : isHalfDay
                ? "4 horas."
                : "Duración indicada en la ficha de la experiencia.",
        },
        { icon: Compass, title: "Ruta", text: routeText },
        {
          icon: Users,
          title: "Formato y capacidad",
          text: formulaText,
        },
      ],
      whatYouSeeTitle: "Qué vivirás a bordo",
      whatYouSeeIntro: "Más contexto para elegir la experiencia adecuada antes de reservar.",
      whatYouSeeItems,
      faqTitle: "Preguntas sobre esta experiencia",
      faqs,
    };
  }

  return {
    experienceLabel: isCharter
      ? isEn
        ? "Private charter"
        : "Charter privato"
      : isPrivateBoat
        ? isEn
          ? "Private Egadi boat tour"
          : "Tour privato alle Egadi"
        : isSharedBoat
          ? isEn
            ? "Shared Egadi boat tour"
            : "Tour condiviso alle Egadi"
      : isEn
        ? "Egadi boat experience"
        : "Esperienza in barca alle Egadi",
	    overviewTitle: isEn ? "The experience" : "L'esperienza",
    overviewEyebrow: isEn ? "What makes it special" : "Perché sceglierla",
    bookingTitle: isEn ? "Plan this experience" : "Organizza questa esperienza",
    bookingText: isEn
      ? "Choose your date and continue to the booking flow with live prices and availability."
      : "Scegli la data e continua nel flusso di prenotazione con prezzi e disponibilità aggiornati.",
    galleryTitle: isEn ? "A glimpse on board" : "A bordo, in breve",
    usefulInfo: isEn ? "Useful info" : "Info utili",
    routeTitle: isCharter
      ? isEn
        ? "Route built day by day"
        : "Rotta costruita giorno per giorno"
      : isFullDay
        ? isEn
          ? "Full-day route"
          : "Rotta giornata intera"
        : isHalfDay
          ? isEn
            ? "Compact sea route"
            : "Rotta compatta"
      : isEn
        ? "Weather-aware route"
        : "Rotta scelta con il mare",
    routeText: isCharter
      ? isEn
        ? "Favignana, Levanzo and Marettimo are planned around wind, sea and the pace you want on board."
        : "Favignana, Levanzo e Marettimo vengono pianificate in base a vento, mare e ritmo che vuoi a bordo."
      : isFullDay
        ? isEn
          ? "Eight hours allow the crew to work between Favignana and Levanzo, adapting coves and timings to the conditions."
          : "Otto ore permettono alla crew di lavorare tra Favignana e Levanzo, adattando cale e tempi alle condizioni."
        : isHalfDay
          ? isEn
            ? "Four hours focus on the best sheltered waters of the day, with a clear return schedule."
            : "Quattro ore concentrate sulle acque più riparate della giornata, con rientro chiaro e senza corse."
      : isEn
        ? "The crew chooses the best bays for swimming, snorkelling and relaxed navigation."
        : "La crew sceglie le baie migliori per bagno, snorkeling e navigazione leggera.",
    onboardTitle: isCharter
      ? isEn
        ? "Life on board"
        : "Vita a bordo"
      : isPrivateBoat
        ? isEn
          ? "Reserved boat"
          : "Barca riservata"
        : isSharedBoat
          ? isEn
            ? "Shared seats"
            : "Posti condivisi"
      : isEn
        ? "Crew and comfort"
        : "Crew e comfort",
    onboardText: isCharter
      ? isEn
        ? "Cabins, shared spaces and galley make the trimaran a small floating home."
        : "Cabine, spazi comuni e cucina trasformano il trimarano in una piccola casa sul mare."
      : isPrivateBoat
        ? isEn
          ? "The boat is dedicated to your group, so stops and pace can be shaped with the skipper."
          : "La barca è dedicata al tuo gruppo, quindi soste e ritmo si costruiscono con lo skipper."
        : isSharedBoat
          ? isEn
            ? "Book your places and share the route with other guests, keeping the day simple and accessible."
            : "Prenoti i posti e condividi la rotta con altri ospiti, con una formula semplice e accessibile."
      : isEn
        ? "Skipper and on-board services keep the day smooth from departure to return."
        : "Skipper e servizi a bordo tengono la giornata fluida dalla partenza al rientro.",
    rhythmTitle: isCharter
      ? isEn
        ? "Slow days"
        : "Giorni lenti"
      : isFullDay
        ? isEn
          ? "Time to stay"
          : "Tempo per restare"
        : isHalfDay
          ? isEn
            ? "Essential half day"
            : "Mezza giornata essenziale"
      : isEn
        ? "Easy rhythm"
        : "Ritmo leggero",
    rhythmText: isCharter
      ? isEn
        ? "Sleep near sheltered bays, wake up by the water and adjust the plan without rushing."
        : "Dormi vicino alle baie, ti svegli sull'acqua e moduli il programma senza fretta."
      : isFullDay
        ? isEn
          ? "A longer slot means more swim time, more flexibility and less pressure between stops."
          : "Una fascia più lunga significa più tempo in acqua, più flessibilità e meno pressione tra le soste."
        : isHalfDay
          ? isEn
            ? "A short, focused experience for guests who want sea, swimming and a clean schedule."
            : "Un'esperienza breve e mirata per chi vuole mare, bagno e orari puliti."
      : isEn
        ? "Swim stops, time at anchor and a clear return schedule keep the experience balanced."
        : "Soste bagno, tempo in rada e rientro chiaro mantengono l'esperienza equilibrata.",
    priceHeader: isCharter ? (isEn ? "Package price" : "Prezzo pacchetto") : isEn ? "Price" : "Prezzo",
    charterType: isEn ? "Charter package" : "Pacchetto charter",
    daysLabel: (days: number) => (isEn ? `${days} days` : `${days} giornate`),
    bookNow: isEn ? "Book now" : "Prenota ora",
  };
}

function getSeoExpansionCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string; durationHours: number; capacityMax: number },
  durationText: string,
  boatTitle?: string,
) {
  if (isFishingService(service)) {
    return getFishingSeoExpansionCopy(locale, durationText, boatTitle, service.capacityMax);
  }

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

  if (isFullDay && isPriorityFullDayBoatService(service)) {
    return getFullDayBoatSeoExpansionCopy(locale, service, durationText, boatTitle);
  }

  if (isDe) {
    const routeText = isCharter
      ? "Favignana, Levanzo und Marettimo können über mehrere Tage kombiniert werden, immer nach Seewetter."
      : isFullDay
        ? "Der ganze Tag lässt Raum für Favignana, Levanzo, Badestopps und entspannte Zeit vor Anker."
        : isHalfDay
          ? "Der halbe Tag konzentriert sich auf die am besten geschützten Buchten, die ab Trapani bequem erreichbar sind, vor allem rund um Favignana."
          : "Die Crew plant die Route zwischen den schönsten und geschütztesten Buchten der Ägadischen Inseln.";
    const formulaText = isCharter
      ? "Privater Trimaran-Charter mit Skipper, Kabinen und Route Tag für Tag."
      : isPrivateBoat
        ? "Das Boot ist für Ihre Gruppe reserviert, mit Stopps und Rhythmus nach Absprache mit dem Skipper."
        : isSharedBoat
          ? "Sie buchen einzelne Plätze und teilen das Erlebnis mit anderen Gästen."
          : isGourmet
            ? "Privater Premium-Tag auf dem Trimaran mit Chef, Skipper und Hostess."
            : "Ein sorgfältig kuratiertes Erlebnis auf den Ägadischen Inseln mit professioneller Crew.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nächte vor Anker", text: "Wachen Sie nahe geschützter Buchten auf und passen Sie jeden Tag ohne Eile an." },
          { title: "Favignana, Levanzo, Marettimo", text: "Die Inseln werden nach Wind, Meer und Charterdauer gewählt." },
          { title: "Leben an Bord", text: "Kabinen, Küche und Gemeinschaftsflächen machen den Trimaran zu einem kleinen schwimmenden Zuhause." },
        ]
      : isFullDay
        ? [
            { title: "Mehr Zeit im Wasser", text: "Acht Stunden bedeuten weniger Druck zwischen den Buchten und mehr Zeit zum Schnorcheln." },
            { title: "Favignana und Levanzo", text: "Die Crew kann zwischen beiden Inseln arbeiten, wenn die Seebedingungen es erlauben." },
            { title: "Sanfte Rückfahrt", text: "Der letzte Abschnitt hält den Tag entspannt, mit wechselndem Licht auf dem Rückweg." },
          ]
        : [
            { title: "Klarer Zeitplan", text: "Ein kompaktes Zeitfenster für alle, die Meer, Baden und eine präzise Rückkehr wünschen." },
            { title: "Geschützte Buchten", text: "Der Skipper wählt die sichersten und klarsten Gewässer, die in einem halben Tag erreichbar sind." },
            { title: "Panoramafahrt", text: "Genug Zeit, um die Ägadischen Inseln auch bei einer kurzen Ausfahrt vom Wasser aus zu erleben." },
          ];
    const faqs = [
      {
        question: isCharter ? "Wie lange kann der Charter dauern?" : "Wo startet die Bootstour?",
        answer: isCharter
          ? "Der Charter auf den Ägadischen Inseln kann von 3 bis 7 Tagen geplant werden. Die endgültige Route wird mit dem Skipper bestätigt und an Wind, Meer und gewünschten Rhythmus angepasst."
          : "Die Bootstour startet in Trapani. Der übliche Treffpunkt ist Via dei Gladioli 15, 91100 Trapani, sofern die Crew nichts anderes mitteilt.",
      },
      {
        question: "Können wir die Route wählen?",
        answer:
          "Ja, die Route wird vor der Abfahrt mit der Crew besprochen. Der Skipper behält die notwendige Flexibilität, um die sichersten und angenehmsten Buchten des Tages zu wählen.",
      },
      {
        question: "Was ist enthalten?",
        answer: `${formulaText} Auf der Seite finden Sie außerdem Dauer, Kapazität, Preis und Hinweise dazu, was Sie an Bord mitbringen sollten.`,
      },
      {
        question: "Ist das Erlebnis für Kinder geeignet?",
        answer:
          "Ja, wenn das gewählte Format und die Seebedingungen passen. Für Familien bietet eine private Bootstour oft mehr Freiheit bei Zeiten und Pausen.",
      },
      {
        question: "Was passiert, wenn sich das Wetter ändert?",
        answer:
          "Die Route wird mit dem Skipper geprüft. Wenn die Bedingungen eine sichere Durchführung verhindern, teilt das Team die verfügbaren Optionen mit.",
      },
    ];

    return {
      practicalEyebrow: "Vor der Buchung",
      practicalTitle: "Praktische Details",
      practicalItems: [
        { icon: Anchor, title: "Abfahrt ab Trapani", text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Dauer", text: isCharter ? "3 bis 7 Tage, vor der Abfahrt geplant." : durationText },
        { icon: Compass, title: "Route", text: routeText },
        {
          icon: Users,
          title: "Format und Kapazität",
          text: `${formulaText}${boatTitle ? ` Boot: ${boatTitle}.` : ""} Bis zu ${service.capacityMax} Gäste.`,
        },
        {
          icon: ShieldCheck,
          title: "Wetter, Storno und Erstattung",
          text: "Wenn Egadisailing wegen unsicherer Seebedingungen storniert, wählen Sie kostenlosen Terminwechsel oder volle Erstattung. Kundenstorno: 100% bis 30 Tage, 50% von 29 bis 15 Tage, keine Erstattung unter 15 Tagen oder bei No-show.",
        },
      ],
      whatYouSeeTitle: "Was Sie an Bord erleben",
      whatYouSeeIntro: "Mehr Details, damit Sie vor der Buchung das richtige Erlebnis wählen.",
      whatYouSeeItems,
      faqTitle: "Fragen zu diesem Erlebnis",
      faqs,
    };
  }

  if (isFr) {
    const routeText = isCharter
      ? "Favignana, Levanzo et Marettimo peuvent se combiner sur plusieurs jours, toujours selon la météo marine."
      : isFullDay
        ? "La journée complète laisse de la place pour Favignana, Levanzo, les baignades et du temps détendu au mouillage."
        : isHalfDay
          ? "La demi-journée se concentre sur les criques les plus protégées et facilement accessibles depuis Trapani, surtout autour de Favignana."
          : "L'équipage planifie la route entre les baies les plus belles et protégées des Égades.";
    const formulaText = isCharter
      ? "Charter privé en trimaran avec skipper, cabines et route jour après jour."
      : isPrivateBoat
        ? "Le bateau est réservé à votre groupe, avec arrêts et rythme définis avec le skipper."
        : isSharedBoat
          ? "Vous réservez des places individuelles et partagez l'expérience avec d'autres hôtes."
          : isGourmet
            ? "Journée privée premium en trimaran avec chef, skipper et hôtesse."
            : "Une expérience soignée aux Égades avec équipage professionnel.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nuits au mouillage", text: "Réveillez-vous près de baies protégées et ajustez chaque journée sans courir." },
          { title: "Favignana, Levanzo, Marettimo", text: "Les îles sont choisies selon le vent, la mer et la durée du charter." },
          { title: "Vie à bord", text: "Cabines, cuisine et espaces communs transforment le trimaran en petite maison flottante." },
        ]
      : isFullDay
        ? [
            { title: "Plus de temps dans l'eau", text: "Huit heures signifient moins de pression entre les criques et plus de temps pour le snorkeling." },
            { title: "Favignana et Levanzo", text: "L'équipage peut travailler entre les deux îles lorsque la mer le permet." },
            { title: "Retour doux", text: "Le dernier tronçon garde la journée détendue, avec lumière et vues changeantes au retour." },
          ]
        : [
            { title: "Horaire clair", text: "Une plage compacte pour ceux qui veulent mer, baignade et retour précis." },
            { title: "Criques protégées", text: "Le skipper choisit les eaux les plus sûres et claires accessibles en demi-journée." },
            { title: "Navigation panoramique", text: "Assez de temps pour sentir les Égades depuis l'eau, même sur une sortie courte." },
          ];
    const faqs = [
      {
        question: isCharter ? "Combien de temps peut durer le charter ?" : "D'où part le tour ?",
        answer: isCharter
          ? "Le charter aux îles Égades peut se planifier de 3 à 7 jours. La route finale est confirmée avec le skipper et adaptée au vent, à la mer et au rythme souhaité."
          : "Le tour part de Trapani. Le point habituel est Via dei Gladioli 15, 91100 Trapani, sauf communication opérationnelle différente.",
      },
      {
        question: "Peut-on choisir la route ?",
        answer:
          "Oui, elle se discute avec l'équipage avant le départ, mais le skipper garde la flexibilité nécessaire pour choisir les criques les plus sûres et agréables du jour.",
      },
      {
        question: "Qu'est-ce qui est inclus ?",
        answer: `${formulaText} La page indique aussi la durée, la capacité, le prix et ce qu'il faut apporter à bord.`,
      },
      {
        question: "Est-ce adapté aux enfants ?",
        answer:
          "Oui, lorsque le format choisi et les conditions de mer sont adaptés. Pour les familles, un tour privé offre souvent plus de liberté sur les horaires et les pauses.",
      },
      {
        question: "Que se passe-t-il si la météo change ?",
        answer:
          "La route est revue avec le skipper. Si les conditions empêchent de réaliser l'expérience en sécurité, l'équipe communique les options disponibles.",
      },
    ];

    return {
      practicalEyebrow: "Avant de réserver",
      practicalTitle: "Détails pratiques",
      practicalItems: [
        { icon: Anchor, title: "Départ de Trapani", text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Durée", text: isCharter ? "De 3 à 7 jours, planifiés avant le départ." : durationText },
        { icon: Compass, title: "Route", text: routeText },
        {
          icon: Users,
          title: "Format et capacité",
          text: `${formulaText}${boatTitle ? ` Bateau : ${boatTitle}.` : ""} Jusqu'à ${service.capacityMax} hôtes.`,
        },
        {
          icon: ShieldCheck,
          title: "Météo, annulation et remboursement",
          text: "Si Egadisailing annule pour mer non sûre, vous choisissez un changement de date gratuit ou un remboursement complet. Annulation client : 100% jusqu'à 30 jours, 50% de 29 à 15 jours, aucun remboursement sous 15 jours ou no-show.",
        },
      ],
      whatYouSeeTitle: "Ce que vous vivrez à bord",
      whatYouSeeIntro: "Plus de détails pour choisir la bonne expérience avant de réserver.",
      whatYouSeeItems,
      faqTitle: "Questions sur cette expérience",
      faqs,
    };
  }

  if (isEs) {
    const routeText = isCharter
      ? "Favignana, Levanzo y Marettimo pueden combinarse en varios días, siempre según la meteorología."
      : isFullDay
		        ? "El día completo deja espacio para Favignana, Levanzo, baños y tiempo relajado al fondeo."
        : isHalfDay
          ? "El medio día se concentra en las calas más protegidas y cómodas desde Trapani, sobre todo alrededor de Favignana."
          : "La tripulación planifica la ruta entre las bahías más escénicas y protegidas de las Egadi.";
    const formulaText = isCharter
      ? "Charter privado en trimarán con patrón, camarotes y ruta día a día."
      : isPrivateBoat
        ? "El barco queda reservado para tu grupo, con paradas y ritmo definidos con el patrón."
        : isSharedBoat
          ? "Reservas plazas individuales y compartes la experiencia con otros huéspedes."
          : isGourmet
	            ? "Jornada privada premium en trimarán con chef, patrón y azafata."
            : "Una experiencia cuidada en las Egadi con tripulación profesional.";
    const whatYouSeeItems = isCharter
      ? [
	          { title: "Noches al fondeo", text: "Despiértate cerca de bahías protegidas y ajusta cada día sin prisas." },
          { title: "Favignana, Levanzo, Marettimo", text: "Las islas se eligen según viento, mar y duración del charter." },
          { title: "Vida a bordo", text: "Camarotes, cocina y zonas comunes convierten el trimarán en una pequeña casa flotante." },
        ]
      : isFullDay
        ? [
            { title: "Más tiempo en el agua", text: "Ocho horas significan menos presión entre calas y más tiempo para snorkel." },
            { title: "Favignana y Levanzo", text: "La tripulación puede trabajar entre ambas islas cuando el mar lo permite." },
            { title: "Regreso suave", text: "El último tramo mantiene la jornada relajada, con luz y vistas cambiando de vuelta." },
          ]
        : [
            { title: "Horario claro", text: "Una franja compacta para quien quiere mar, baño y un regreso preciso." },
            { title: "Calas protegidas", text: "El patrón elige las aguas más seguras y limpias alcanzables en medio día." },
            { title: "Navegación panorámica", text: "Tiempo suficiente para sentir las Egadi desde el agua, incluso en una salida breve." },
          ];
    const faqs = [
      {
        question: isCharter ? "¿Cuánto puede durar el charter?" : "¿Desde dónde sale el tour?",
        answer: isCharter
          ? "El charter por las Islas Egadi puede planificarse de 3 a 7 días. La ruta final se confirma con el patrón y se adapta a viento, mar y ritmo deseado."
          : "El tour sale desde Trapani. El punto habitual es Via dei Gladioli 15, 91100 Trapani, salvo comunicación operativa distinta.",
      },
      {
        question: "¿Podemos elegir la ruta?",
        answer:
          "Sí, se habla con la tripulación antes de salir, pero el patrón mantiene flexibilidad para elegir las calas más seguras y agradables del día.",
      },
      {
        question: "¿Qué incluye la experiencia?",
        answer: `${formulaText} En la página se indican también duración, capacidad, precio y qué llevar a bordo.`,
      },
      {
        question: "¿Es adecuada para niños?",
        answer:
          "Sí, cuando el formato elegido y las condiciones del mar son adecuados. Para familias, un tour privado suele ofrecer más libertad de horarios y pausas.",
      },
      {
        question: "¿Qué pasa si cambia el tiempo?",
        answer:
          "La ruta se revisa con el patrón. Si las condiciones impiden realizar la experiencia con seguridad, el equipo comunica las opciones disponibles.",
      },
    ];

    return {
      practicalEyebrow: "Antes de reservar",
      practicalTitle: "Detalles prácticos",
      practicalItems: [
        { icon: Anchor, title: "Salida desde Trapani", text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Duración", text: isCharter ? "De 3 a 7 días, planificados antes de la salida." : durationText },
        { icon: Compass, title: "Ruta", text: routeText },
        {
          icon: Users,
          title: "Formato y capacidad",
          text: `${formulaText}${boatTitle ? ` Barco: ${boatTitle}.` : ""} Hasta ${service.capacityMax} huéspedes.`,
        },
        {
          icon: ShieldCheck,
          title: "Meteorología, cancelación y reembolso",
          text: "Si Egadisailing cancela por mar no seguro, puedes elegir cambio de fecha gratuito o reembolso completo. Cancelación cliente: 100% hasta 30 días, 50% de 29 a 15 días, sin reembolso bajo 15 días o no-show.",
        },
      ],
      whatYouSeeTitle: "Qué vivirás a bordo",
      whatYouSeeIntro: "Más detalles para elegir la experiencia correcta antes de reservar.",
      whatYouSeeItems,
      faqTitle: "Preguntas sobre esta experiencia",
      faqs,
    };
  }

  const routeText = isCharter
    ? isEn
      ? "Favignana, Levanzo and Marettimo can be combined across several days, always according to the weather."
      : "Favignana, Levanzo e Marettimo possono entrare nella rotta su più giornate, sempre in base al meteo."
    : isFullDay
      ? isEn
        ? "The full day gives room for Favignana, Levanzo, swim stops and relaxed time at anchor."
        : "La giornata intera lascia spazio a Favignana, Levanzo, soste bagno e tempo in rada senza fretta."
      : isHalfDay
        ? isEn
          ? "The half day focuses on the best sheltered coves comfortably reachable from Trapani, especially around Favignana."
          : "La mezza giornata si concentra sulle cale più riparate raggiungibili comodamente da Trapani, soprattutto intorno a Favignana."
    : isEn
      ? "The crew plans the route between the most scenic and sheltered Egadi bays."
      : "La crew costruisce la rotta tra le baie più sceniche e riparate delle Egadi.";

  const formulaText = isCharter
    ? isEn
      ? "A private trimaran charter with skipper, cabins and a day-by-day route."
      : "Charter privato in trimarano con skipper, cabine e rotta costruita giorno per giorno."
    : isPrivateBoat
      ? isEn
        ? "The boat is reserved for your group, with stops and rhythm shaped with the skipper."
        : "La barca è riservata al tuo gruppo, con soste e ritmo concordati con lo skipper."
      : isSharedBoat
        ? isEn
          ? "Book individual seats and share the experience with other guests."
          : "Prenoti posti singoli e condividi l'esperienza con altri ospiti."
        : isGourmet
          ? isEn
            ? "A premium private trimaran day with chef, skipper and hostess."
            : "Giornata privata premium in trimarano con chef, skipper e hostess."
          : isEn
            ? "A curated Egadi experience with professional crew."
            : "Un'esperienza alle Egadi curata dalla crew professionale.";

  const whatYouSeeItems = isCharter
    ? [
        {
          title: isEn ? "Nights at anchor" : "Notti in rada",
          text: isEn
            ? "Wake up close to sheltered bays and adjust each day without rushing."
            : "Ti svegli vicino alle baie riparate e moduli ogni giornata senza fretta.",
        },
        {
          title: isEn ? "Favignana, Levanzo, Marettimo" : "Favignana, Levanzo, Marettimo",
          text: isEn
            ? "The islands are chosen according to wind, sea and the length of your charter."
            : "Le isole si scelgono in base a vento, mare e durata del charter.",
        },
        {
          title: isEn ? "Life on board" : "Vita a bordo",
          text: isEn
            ? "Cabins, galley and shared spaces make the trimaran a small floating home."
            : "Cabine, cucina e spazi comuni rendono il trimarano una piccola casa sul mare, con più spazio e respiro rispetto a una barca tradizionale.",
        },
      ]
    : isFullDay
      ? [
          {
            title: isEn ? "More swim time" : "Più tempo in acqua",
            text: isEn
              ? "Eight hours mean less pressure between coves and more time for snorkelling."
              : "Otto ore significano meno pressione tra le cale e più tempo per snorkeling e bagno.",
          },
          {
            title: isEn ? "Favignana and Levanzo" : "Favignana e Levanzo",
            text: isEn
              ? "The crew can work across both islands when the sea conditions allow it."
              : "La crew può lavorare su entrambe le isole quando il mare lo permette.",
          },
          {
            title: isEn ? "Slow return" : "Rientro morbido",
            text: isEn
              ? "The last stretch keeps the day relaxed, with light and views changing on the way back."
              : "L'ultimo tratto resta rilassato, con luce e vista che cambiano durante il rientro.",
          },
        ]
      : [
          {
            title: isEn ? "Clear schedule" : "Orari chiari",
            text: isEn
              ? "A compact slot for guests who want sea, swimming and a precise return."
              : "Una fascia compatta per chi vuole mare, bagno e un rientro preciso.",
          },
          {
            title: isEn ? "Sheltered coves" : "Cale riparate",
            text: isEn
              ? "The skipper chooses the safest and clearest waters reachable in half a day."
              : "Lo skipper sceglie le acque più sicure e limpide raggiungibili in mezza giornata.",
          },
          {
            title: isEn ? "Scenic navigation" : "Navigazione panoramica",
            text: isEn
              ? "Enough route time to feel the Egadi from the water, even with a shorter experience."
              : "Abbastanza navigazione per sentire le Egadi dal mare, anche in un'esperienza breve.",
          },
        ];

  const faqs = isCharter
    ? [
        {
          question: isEn ? "How many days can the Egadi charter last?" : "Quanto può durare il charter alle Egadi?",
          answer: isEn
            ? "The Egadi charter can be planned from 3 to 7 days. The final route is confirmed with the skipper and adapted around wind, sea state, anchorage availability and the pace you want on board."
            : "Il charter alle Egadi può essere pianificato da 3 a 7 giornate. La rotta definitiva viene confermata con lo skipper e adattata a vento, stato del mare, disponibilità delle rade e ritmo che vuoi vivere a bordo.",
        },
        {
          question: isEn ? "Is provisioning included?" : "La cambusa è inclusa?",
          answer: isEn
            ? "Provisioning is not included in the charter package. Before departure the crew can help you organise the shopping list, pantry setup and any refills needed during the route between Favignana, Levanzo and Marettimo."
            : "La cambusa non è inclusa nel pacchetto charter. Prima della partenza la crew può aiutarti a organizzare lista spesa, dispensa iniziale ed eventuali refill durante la rotta tra Favignana, Levanzo e Marettimo.",
        },
        {
          question: isEn ? "Is it suitable if we are looking for a catamaran charter?" : "È adatto a chi cerca un charter in catamarano alle Egadi?",
          answer: isEn
            ? "Yes. The boat is technically a trimaran, but it answers the same need for multihull comfort: cabins, shared spaces, stability, skipper and a flexible route across the Egadi Islands."
            : "Sì. Tecnicamente è un trimarano, ma risponde allo stesso bisogno di chi cerca un catamarano alle Egadi: cabine, spazi vivibili, stabilità, skipper e rotta flessibile tra Favignana, Levanzo e Marettimo.",
        },
        {
          question: isEn ? "Can we choose the route?" : "Possiamo scegliere la rotta?",
          answer: isEn
            ? "Yes. The itinerary is agreed with the skipper before departure and then adjusted day by day. This is important in the Egadi Islands because the best bay is not always the same: comfort, safety and sea clarity depend on the daily conditions."
            : "Sì. L'itinerario si concorda con lo skipper prima della partenza e poi viene aggiornato giorno per giorno. Alle Egadi è importante perché la baia migliore non è sempre la stessa: comfort, sicurezza e limpidezza dipendono dalle condizioni del giorno.",
        },
        {
          question: isEn ? "Where does boarding take place?" : "Dove avviene l'imbarco?",
          answer: isEn
            ? "Boarding is in Trapani, at Via dei Gladioli 15, 91100 Trapani, unless the crew confirms a different operational meeting point."
            : "L'imbarco è a Trapani, in Via dei Gladioli 15, 91100 Trapani, salvo diversa indicazione operativa della crew.",
        },
        {
          question: isEn ? "Can we sleep at anchor?" : "Si può dormire in rada?",
          answer: isEn
            ? "Yes, when weather and anchorage conditions allow it. Sleeping close to the islands is one of the strongest parts of an Egadi charter, but the skipper always chooses the safest and most sheltered option."
            : "Sì, quando meteo e condizioni della rada lo permettono. Dormire vicino alle isole è una delle parti più belle del charter alle Egadi, ma lo skipper sceglie sempre l'opzione più riparata e sicura.",
        },
        {
          question: isEn ? "Is the charter suitable for families?" : "Il charter è adatto alle famiglie?",
          answer: isEn
            ? "Yes, the trimaran works well for families and private groups that want space, shaded areas and a slower rhythm. Before confirming, the crew can help evaluate ages, needs and the most comfortable route length."
            : "Sì, il trimarano funziona bene per famiglie e gruppi privati che cercano spazio, zone d'ombra e un ritmo più lento. Prima della conferma la crew può valutare età, esigenze e durata di rotta più comoda.",
        },
        {
          question: isEn ? "What happens if the weather changes?" : "Cosa succede se cambia il meteo?",
          answer: isEn
            ? "The route is revised with the skipper. On a multi-day charter there is usually more flexibility to move the plan, choose sheltered anchorages and protect the quality of the experience."
            : "La rotta viene rivista con lo skipper. Su un charter di più giorni c'è in genere più flessibilità per spostare il programma, scegliere rade riparate e proteggere la qualità dell'esperienza.",
        },
      ]
    : isGourmet
      ? [
          {
            question: isEn ? "What is included in the Gourmet Experience?" : "Cosa include l'esperienza Gourmet?",
            answer: isEn
              ? "The Gourmet Experience includes skipper, hostess, private chef, lunch based on local fish and local products, fuel, aperitif, wine, water, soft drinks and snorkelling equipment."
              : "L'esperienza Gourmet include skipper, hostess, chef privato, pranzo a base di pesce locale e prodotti del territorio, carburante, aperitivo, vino, acqua, bevande e attrezzatura da snorkeling.",
          },
          {
            question: isEn ? "Which islands and coves are visited?" : "Quali isole e cale si visitano?",
            answer: isEn
              ? "The route is planned between Favignana and Levanzo according to sea and wind conditions. Check the itinerary on this page for more details about the usual stops."
              : "La rotta viene organizzata tra Favignana e Levanzo in base a mare e vento. Consulta l'itinerario in questa pagina per maggiori informazioni sulle soste previste.",
          },
          {
            question: isEn ? "Is it like a catamaran day in the Egadi Islands?" : "È come una giornata in catamarano alle Egadi?",
            answer: isEn
              ? "It is a private day on a trimaran, so the experience is very close to the catamaran idea in terms of space, stability and relaxed onboard life, with the added focus on chef service and lunch prepared on board."
              : "È una giornata privata su un trimarano: per spazio, stabilità e vita a bordo è molto vicina all'idea di catamarano alle Egadi, con in più chef locale, hostess e pranzo cucinato direttamente a bordo.",
          },
          {
            question: isEn ? "Is the menu fixed?" : "Il menu è fisso?",
            answer: isEn
              ? "No. The menu changes according to the fresh catch and the local products available. You can view sample menus on this page to understand the style of the lunch served on board."
              : "No. Il menu varia in base al pescato fresco e ai prodotti locali disponibili. In questa pagina trovi alcuni menu di esempio per capire lo stile del pranzo servito a bordo.",
          },
          {
            question: isEn ? "Can allergies or intolerances be managed?" : "Si possono gestire allergie o intolleranze?",
            answer: isEn
              ? "Yes. Allergies, intolerances and important dietary needs must be communicated at least 48 hours before the experience, so the chef can organise the menu correctly."
              : "Sì. Allergie, intolleranze ed esigenze alimentari importanti devono essere comunicate almeno 48 ore prima dell'esperienza, così lo chef può organizzare correttamente il menu.",
          },
          {
            question: isEn ? "Are drinks included?" : "Le bevande sono incluse?",
            answer: isEn
              ? "Yes. Wine, soft drinks and water are included in the Gourmet Experience. Cocktails can be purchased separately on board."
              : "Sì. Vino, bevande analcoliche e acqua sono inclusi nell'esperienza Gourmet. I cocktail possono essere acquistati separatamente a bordo.",
          },
          {
            question: isEn ? "Is lunch served at anchor?" : "Il pranzo viene servito in rada?",
            answer: isEn
              ? "Yes. When sea and wind conditions allow it, lunch is served at anchor in a sheltered bay, with time to swim before or after the meal."
              : "Sì. Quando mare e vento lo permettono, il pranzo viene servito in rada in una baia riparata, con tempo per fare il bagno prima o dopo il pasto.",
          },
          {
            question: isEn ? "Is the Gourmet Experience private?" : "L'esperienza Gourmet è privata?",
            answer: isEn
              ? "Yes. The trimaran is reserved for your group, with skipper, hostess and private chef on board."
              : "Sì. Il trimarano è riservato al tuo gruppo, con skipper, hostess e chef privato a bordo.",
          },
          {
            question: isEn ? "How many people can join?" : "Quante persone possono partecipare?",
            answer: isEn
              ? "The Gourmet Experience can host up to 10 guests, keeping the day comfortable and the service on board curated."
              : "L'esperienza Gourmet può ospitare fino a un massimo di 10 persone, mantenendo la giornata comoda e il servizio a bordo curato.",
          },
          {
            question: isEn ? "What happens in case of bad weather?" : "Cosa succede in caso di maltempo?",
            answer: isEn
              ? "If conditions require it, the skipper changes the route to protect comfort and safety. In case of bad weather that prevents the experience from taking place, the refund is guaranteed."
              : "Se le condizioni lo richiedono, lo skipper cambia rotta per proteggere comfort e sicurezza. In caso di maltempo che impedisce lo svolgimento dell'esperienza, il rimborso è garantito.",
          },
          {
            question: isEn ? "Is it suitable for private events?" : "È adatta per eventi privati?",
            answer: isEn
              ? "Absolutely. The Gourmet Experience is often chosen for birthdays, proposals, anniversaries and private moments that need a more special setting on board."
              : "Assolutamente sì. L'esperienza Gourmet viene scelta spesso per compleanni, proposte, anniversari ed eventi privati che richiedono un contesto più speciale a bordo.",
          },
        ]
    : [
        {
          question: isEn ? "Where does the Egadi boat tour depart from?" : "Da dove parte il tour in barca alle Egadi?",
          answer: isEn
            ? "The Egadi boat tour departs from Trapani. The usual meeting point is Via dei Gladioli 15, 91100 Trapani, unless the crew sends a different operational update before departure."
            : "Il tour in barca alle Egadi parte da Trapani. Il punto di incontro abituale è Via dei Gladioli 15, 91100 Trapani, salvo diversa comunicazione operativa inviata dalla crew prima della partenza.",
        },
	        {
	          question: isEn ? "Is the route always fixed?" : "La rotta è sempre la stessa?",
	          answer: isEn
	            ? isHalfDay
	              ? "No. The skipper chooses the safest and most enjoyable route according to wind, sea, crowding and the time available. On the 4-hour tour the route stays on coves comfortably reachable from Trapani, especially around Favignana."
	              : "No. The skipper chooses the safest and most enjoyable route according to wind, sea, crowding and the time available. Favignana, Levanzo and the most scenic coves are evaluated with the real conditions of the day."
	            : isHalfDay
	              ? "No. Lo skipper sceglie la rotta più sicura e piacevole in base a vento, mare, affollamento e tempo disponibile. Nel tour di 4 ore la rotta resta sulle cale raggiungibili comodamente da Trapani, soprattutto intorno a Favignana."
	              : "No. Lo skipper sceglie la rotta più sicura e piacevole in base a vento, mare, affollamento e tempo disponibile. Favignana, Levanzo e le cale più sceniche vengono valutate sulle condizioni reali della giornata.",
	        },
        {
          question: isEn ? "Is this experience shared or private?" : "Questa esperienza è condivisa o privata?",
          answer: isEn
            ? `${formulaText} You can check the exact format in the title and booking panel of this page before choosing the date.`
            : `${formulaText} Puoi verificare la formula esatta nel titolo e nel box di prenotazione della pagina prima di scegliere la data.`,
        },
        {
          question: isEn ? "Should I choose 4 hours or 8 hours?" : "Meglio scegliere 4 ore o 8 ore?",
	          answer: isHalfDay
	            ? isEn
	              ? "Choose 4 hours if you want a compact, clear schedule with sea, swimming and a smooth return. Choose 8 hours if you want more swim time, more route flexibility and a slower full-day pace."
	              : "Scegli 4 ore se vuoi una fascia compatta, orari chiari, mare, bagno e rientro morbido. Scegli 8 ore se vuoi più tempo in acqua, più flessibilità di rotta e un ritmo più lento di giornata intera."
            : isEn
              ? "The 8-hour tour is best if you want a full day, more swim stops and a slower rhythm. The 4-hour tour works better when you have limited time or prefer a focused half day."
              : "Il tour di 8 ore è ideale se vuoi una giornata completa, più soste bagno e ritmo lento. Il 4 ore funziona meglio quando hai poco tempo o preferisci una mezza giornata essenziale.",
        },
        {
          question: isEn ? "Can children join the tour?" : "I bambini possono partecipare?",
          answer: isEn
            ? "Yes, children can join the experience when the selected format, weather and sea conditions are suitable. For families, a private tour often gives more freedom with timing, swim stops and shade breaks."
            : "Sì, i bambini possono partecipare quando formula scelta, meteo e condizioni del mare sono adatti. Per le famiglie, il tour privato offre spesso più libertà su tempi, soste bagno e pause all'ombra.",
        },
        {
          question: isEn ? "What should I bring on board?" : "Cosa devo portare a bordo?",
          answer: isEn
            ? "Bring swimwear, towel, sunscreen, sunglasses and a hat. Soft luggage is easier to store on board. The experience page also lists what is included and what is recommended before departure."
            : "Porta costume, asciugamano, crema solare, occhiali da sole e cappello. Una borsa morbida è più semplice da sistemare a bordo. Nella pagina trovi anche cosa è incluso e cosa è consigliato prima della partenza.",
        },
        {
          question: isEn ? "What happens in case of bad sea conditions?" : "Cosa succede in caso di mare non adatto?",
          answer: isEn
            ? "The crew checks conditions before departure and prioritises safety. If the planned route is not comfortable, the skipper can adapt the itinerary or the team will contact you with the available operational options."
            : "La crew controlla le condizioni prima della partenza e mette al primo posto la sicurezza. Se la rotta prevista non è confortevole, lo skipper può adattare l'itinerario o il team ti contatta con le opzioni operative disponibili.",
        },
      ];

  return {
    practicalEyebrow: isEn ? "Before booking" : "Prima di prenotare",
    practicalTitle: isEn ? "Practical details" : "Dettagli pratici",
    practicalItems: [
      {
        icon: Anchor,
        title: isEn ? "Departure from Trapani" : "Partenza da Trapani",
        text: isEn
          ? "Meeting point: Via dei Gladioli 15, 91100 Trapani."
          : "Punto di incontro: Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        icon: Clock,
        title: isEn ? "Duration" : "Durata",
        text: isCharter
          ? isEn
            ? "From 3 to 7 days, planned before departure."
            : "Da 3 a 7 giornate, pianificate prima della partenza."
          : durationText,
      },
      {
        icon: Compass,
        title: isEn ? "Route" : "Rotta",
        text: routeText,
      },
      {
        icon: Users,
        title: isEn ? "Format and capacity" : "Formula e capienza",
        text: `${formulaText}${boatTitle ? ` ${isEn ? "Boat" : "Barca"}: ${boatTitle}.` : ""} ${
          isEn ? `Up to ${service.capacityMax} guests.` : `Fino a ${service.capacityMax} ospiti.`
        }`,
      },
      {
        icon: ShieldCheck,
        title: isEn ? "Weather, cancellation and refund" : "Meteo, cancellazione e rimborso",
        text: isEn
          ? "If Egadisailing cancels because of unsafe sea conditions, you can choose a free date change or full refund. Customer cancellation: 100% up to 30 days, 50% from 29 to 15 days, no refund under 15 days or no-show."
          : "Se Egadisailing cancella per mare non sicuro, puoi scegliere cambio data gratuito o rimborso completo. Cancellazione cliente: 100% fino a 30 giorni, 50% da 29 a 15 giorni, nessun rimborso sotto i 15 giorni o no-show.",
      },
    ],
    whatYouSeeTitle: isEn ? "What you will experience" : "Cosa vivrai a bordo",
    whatYouSeeIntro: isEn
      ? "Extra context for choosing the right experience before starting the booking flow."
      : "Qualche dettaglio in più per scegliere l'esperienza giusta prima di prenotare.",
    whatYouSeeItems,
    faqTitle: isEn ? "Questions about this experience" : "Domande su questa esperienza",
    faqs,
  };
}

function getEditorialExperienceCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string; capacityMax: number },
  title: string,
  boatTitle?: string,
) {
  if (isFishingService(service)) return getFishingEditorialCopy(locale);

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const boat =
    boatTitle ??
    (isDe
      ? "das ausgewählte Boot"
      : isFr
        ? "le bateau sélectionné"
        : isEn
          ? "the selected boat"
          : "la barca selezionata");
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const plannedIslandsEn = isCharter ? "Favignana, Levanzo and Marettimo" : "Favignana and Levanzo";
  const plannedIslandsIt = isCharter ? "Favignana, Levanzo e Marettimo" : "Favignana e Levanzo";
  const plannedIslandsDe = isCharter ? "Favignana, Levanzo und Marettimo" : "Favignana und Levanzo";

  if (isDe) {
    if (!isCharter && !isGourmet) {
      const boatTourFormat = isSharedBoat
        ? "eine geteilte Bootstour zu den Ägadischen Inseln ab Trapani, ideal, wenn Sie einen ganzen Tag auf dem Meer erleben möchten, ohne das gesamte Boot privat zu buchen"
        : isHalfDay
          ? "eine private 4-stündige Bootstour zu den Ägadischen Inseln, gedacht für Gäste, die klares Wasser, Badestopps und eine gut planbare Rückkehr wünschen"
          : "eine private Ganztages-Bootstour zu den Ägadischen Inseln, bei der das Boot nur für Ihre Gruppe reserviert ist und mehr Zeit für die Route bleibt";

	      return {
	        eyebrow: "Erlebnisguide",
	        title: `Warum ${title} wählen`,
	        paragraphs: [
	          isHalfDay
	            ? `${title} ist ${boatTourFormat}. Die Abfahrt erfolgt ab Trapani, und die Route wird nach den besten Bedingungen des Tages rund um die bequem erreichbaren Buchten geplant, vor allem auf Favignana. Das ist auf den Ägadischen Inseln wichtig: Wind, Seegang und Besucheraufkommen können sich schnell ändern, deshalb sollte eine gute Bootstour keinem starren Plan folgen.`
	            : `${title} ist ${boatTourFormat}. Die Abfahrt erfolgt ab Trapani, und die Route wird nach den besten Bedingungen des Tages zwischen Favignana und Levanzo geplant. Das ist auf den Ägadischen Inseln wichtig: Wind, Seegang und Besucheraufkommen können sich schnell ändern, deshalb sollte eine gute Bootstour keinem starren Plan folgen. Sie sollte die Buchten wählen, in denen das Wasser klarer, der Ankerplatz ruhiger und der Tag von Anfang bis Ende entspannter ist.`,
	          isHalfDay
	            ? "Das Erlebnis ist auf das ausgerichtet, was Gäste bei einer kompakten Bootstour suchen: türkisfarbenes Wasser, Badestopps, Schnorcheln, Küstenblicke und eine klare Rückkehrzeit. Cala Rossa, Cala Azzurra, Bue Marino und die geschützteren Seiten von Favignana gehören zu den Bereichen, die der Skipper bewertet."
	            : "Das Erlebnis ist auf das ausgerichtet, was Gäste bei einer Bootstour zu den Ägadischen Inseln meist suchen: türkisfarbenes Wasser, Badestopps, Schnorcheln, Küstenblicke und genügend Zeit, um das Meer ohne Eile zu genießen. Cala Rossa, Cala Azzurra, Bue Marino und die ruhigeren Ecken von Levanzo gehören zu den Orten, die der Skipper im Tagesverlauf bewertet. Die endgültige Wahl hängt aber immer von den realen Bedingungen auf See ab.",
          isSharedBoat
            ? "Das geteilte Format ist einfach und praktisch. Sie buchen Ihre Plätze, treffen die Crew in Trapani und teilen den Tag mit anderen Gästen, die dasselbe suchen: Meer, Baden und eine gut organisierte Route. Es ist eine gute Wahl, wenn Sie eine vollständige Egadi-Bootstour mit leichterem Budget und geselliger Stimmung an Bord wünschen."
            : isHalfDay
              ? "Die private 4-stündige Bootstour passt, wenn Sie ein kompaktes Erlebnis möchten: klare Zeiten, Privatsphäre für Ihre Gruppe und ein oder zwei gut gewählte Stopps statt vieler Orte im Eiltempo. Sie eignet sich für Paare, Familien und Reisende, die das Meer vor oder nach einem anderen Plan in Trapani erleben möchten."
              : "Die private Ganztages-Bootstour gibt dem Skipper mehr Freiheit, den Rhythmus an Ihre Gruppe anzupassen. Es bleibt mehr Zeit zum Baden, mehr Spielraum zwischen Favignana und Levanzo und ein ruhigeres Tempo an Bord. Sie ist die richtige Wahl, wenn Sie Privatsphäre, Raum und eine Route wünschen, die zu Kindern, Freunden oder einem besonderen Anlass passt.",
          `An Bord von ${boat} buchen Sie nicht nur einen Bootsnamen. Sie wählen ein offenes Motorboot, das sich leicht zwischen den Buchten bewegt. Es gibt Sitzplätze für die Gruppe, Raum für Sonne, Zugang zum Meer zum Baden und Schnorcheln, einen Skipper am Steuer und praktische Unterstützung vor der Abfahrt. Sie müssen die Ägadischen Inseln nicht bereits kennen; bringen Sie Badebekleidung, Handtuch, Sonnenschutz und eine weiche Tasche mit, die Crew führt die Route nach den Bedingungen des Tages.`,
          "Den Unterschied macht die lokale Einschätzung. Eine berühmte Bucht ist nicht immer der beste Stopp, wenn sie voll oder dem Wind ausgesetzt ist; manchmal bietet eine ruhigere Bucht klareres Wasser und ein angenehmeres Bad. Deshalb beschreiben wir diese Erfahrung als flexible Bootstour von Trapani zu den Ägadischen Inseln: Die Route hat eine klare Idee, aber der Skipper behält genug Freiheit, um Komfort, Sicherheit und Qualität des Tages zu schützen.",
        ],
      };
    }

    const formatText = isCharter
      ? "ein privater mehrtägiger Charter, gedacht für Reisende, die nahe an den Inseln schlafen und der Route Raum geben möchten"
      : isGourmet
        ? "ein privater Premium-Tag auf dem Trimaran, aufgebaut rund um Komfort, Essen und ruhige Zeit vor Anker"
        : isSharedBoat
          ? "eine geteilte Ganztages-Bootstour für Gäste, die die Ägadischen Inseln in einem einfachen und gut organisierten Format erleben möchten"
          : isHalfDay
            ? "eine private Halbtages-Bootstour für Gruppen, die Meer, Privatsphäre und klare Rückkehrzeiten wünschen"
            : "eine private Ganztages-Bootstour für Gruppen, die mehr Badezeit, flexible Route und ein langsameres Tempo suchen";

    return {
      eyebrow: "Erlebnisguide",
      title: `Warum ${title} wählen`,
      paragraphs: [
        `${title} ist ${formatText}. Das Erlebnis startet in Trapani und richtet sich nach den Ägadischen Inseln, wie sie am Tag der Abfahrt wirklich sind: hell, wechselhaft, an manchen Stellen offen und an anderen wunderbar geschützt. Deshalb verkaufen wir keine starre Postkartenroute. Wir zeigen ein professionell geführtes Meererlebnis, bei dem der Skipper Wind, Verkehr, Seegang und Licht liest, bevor er den angenehmsten Plan für ${plannedIslandsDe} wählt.`,
        `An Bord von ${boat} liegt der Wert nicht nur in der Liste der Buchten. Entscheidend ist, wie der Tag geführt wird: klare Abfahrt, entspannte Zeiten, sorgfältig gewählte Badestopps, ruhige Navigation und praktische Aufmerksamkeit für die Gruppe. Gäste erinnern sich oft an Cala Rossa, Cala Azzurra, Bue Marino oder die stilleren Seiten von Levanzo. Der echte Unterschied ist aber das Gefühl, von einer Crew begleitet zu werden, die weiß, wann man bleibt, wann man weiterfährt und wann eine ruhigere Bucht besser ist als der berühmteste Name auf der Karte.`,
        isCharter
          ? "Beim Charter wird der Rhythmus noch wichtiger. Eine mehrtägige Route lässt die Inseln langsam aufgehen: ein erster Badestopp nach der Abfahrt von Trapani, ein Abend vor Anker, wenn das Wetter passt, Morgenstunden nahe klarem Wasser und die Möglichkeit, den nächsten Tag anzupassen, statt ein fixes Programm zu erzwingen. Der Trimaran bietet dafür eine komfortable Basis mit Kabinen, Gemeinschaftsflächen und genug Raum, damit das Boot zu einem kleinen Zuhause auf dem Meer wird."
          : isGourmet
            ? "Beim Gourmet-Erlebnis wird das Boot zugleich Route und Tisch. Chef und Crew koordinieren die Zeiten so, dass das Mittagessen nicht wie eine Unterbrechung wirkt, sondern Teil des Tages wird: ein Bad vor dem Ankern, ruhiger Service an Bord, lokale Aromen und danach genug Zeit, wieder ins Wasser zu gehen. Es ist für Gäste gedacht, die Privatsphäre, Komfort und eine kuratiertere Art suchen, die Ägadischen Inseln zu erleben."
            : isPrivateBoat
              ? "Bei privaten Bootstouren ist Flexibilität der stärkste Vorteil. Das Boot ist für Ihre Gruppe reserviert, sodass der Skipper Badezeit, Tempo und Stopps anpassen kann, ohne unterschiedliche Erwartungen an Bord ausgleichen zu müssen. Das passt für Familien, Paare, Freundesgruppen und alle, die die Egadi-Inseln persönlicher erleben möchten."
              : "Bei der geteilten Ganztages-Bootstour liegt der Reiz in der Einfachheit. Sie buchen Ihre Plätze, treffen die Crew in Trapani und nehmen an einem Tag teil, der das Wesentliche zusammenhält: klares Wasser, Badestopps, Panorama-Navigation und eine gesellige, aber gut organisierte Atmosphäre.",
        "Die Route wird bewusst flexibel beschrieben, weil die Ägadischen Inseln Erfahrung stärker belohnen als Improvisation. Ein guter Tag auf See hängt von kleinen Entscheidungen ab: wo man mit weniger Schwell ankert, welche Inselseite klarer ist, wann eine bekannte Bucht zu voll wird und wie lange die Gruppe im Wasser bleiben kann, ohne die Rückfahrt hektisch zu machen. Die Crew hält diese Details im Gleichgewicht, damit der Ausflug natürlich wirkt. Dahinter stehen Planung, lokale Kenntnis und ständige Aufmerksamkeit für Komfort.",
        "Das ist besonders wichtig, wenn Sie vor der Buchung verschiedene Erlebnisse vergleichen. Ein privates Format gibt mehr Kontrolle über Rhythmus und Privatsphäre; ein geteilter Ganztag hält die Kosten zugänglicher und bewahrt die wichtigsten Meeresmomente; ein Gourmet-Tag auf dem Trimaran ergänzt Service, Essen und Raum; ein Charter macht aus den Inseln eine langsamere Reise. Diese Seite soll diese Unterschiede klar machen, damit die Wahl des Datums der letzte Schritt ist und nicht der Moment, in dem Sie noch verstehen müssen, was Sie buchen.",
        "Die Seite hilft Ihnen auch, vor der Buchung sicherer zu entscheiden. Die Bilder zeigen Boot und Atmosphäre an Bord, der Reiseverlauf erklärt die wahrscheinliche Struktur des Tages, und die FAQ beantworten die praktischen Fragen, die vor der Datumswahl zählen. Preise und Verfügbarkeit bleiben im Buchungsbereich; hier bekommen Sie den Kontext: wie sich das Erlebnis anfühlt, für wen es passt, wie die Crew arbeitet und warum eine gut geführte Route rund um die Ägadischen Inseln deutlich anders sein kann als eine generische Bootsfahrt.",
      ],
    };
  }

  if (isFr) {
    const formatText = isCharter
      ? "un charter privé de plusieurs jours pensé pour dormir près des îles et laisser respirer la route"
      : isGourmet
        ? "une journée privée premium en trimaran, construite autour du confort, du déjeuner et du temps lent au mouillage"
        : isSharedBoat
          ? "une excursion partagée de journée complète pour vivre les Égades avec une formule simple et accessible"
          : isHalfDay
            ? "un tour privé de demi-journée pour les groupes qui veulent mer, intimité et retour clair"
            : "un tour privé de journée complète pour les groupes qui veulent plus de temps de baignade, flexibilité et rythme lent";

    return {
      eyebrow: "Guide de l'expérience",
      title: `Pourquoi choisir ${title}`,
      paragraphs: [
        `${title} est ${formatText}. L'expérience part de Trapani et s'adapte aux îles Égades telles qu'elles sont le jour du départ : lumineuses, changeantes, exposées par endroits et très protégées ailleurs.`,
        `À bord de ${boat}, la valeur ne tient pas seulement à la liste des criques. Elle tient à la gestion de la journée : départ clair, temps confortables, arrêts baignade choisis avec soin et équipage capable de décider quand rester ou changer de baie.`,
        isCharter
          ? "En charter, le rythme est essentiel. Plusieurs jours permettent de découvrir les îles peu à peu, avec mouillages calmes, cabines et possibilité d'adapter la route au lendemain."
          : isGourmet
            ? "Dans l'expérience gourmet, le bateau devient à la fois route et table. Le chef et l'équipage coordonnent baignade, mouillage et déjeuner pour que tout fasse naturellement partie de la journée."
            : isSharedBoat
              ? "La formule partagée est pratique : vous réservez votre place, rencontrez l'équipage à Trapani et partagez la route avec d'autres hôtes qui cherchent mer, baignade et sortie bien organisée."
              : "Dans les tours privés, la flexibilité est le point fort. Le bateau est réservé à votre groupe, le skipper peut donc ajuster arrêts, rythme et navigation sans équilibrer les attentes d'autres hôtes.",
	        isHalfDay
	          ? "Cala Rossa, Cala Azzurra, Bue Marino et les côtés les plus abrités de Favignana restent les repères de la sortie compacte. Le meilleur arrêt dépend toujours du vent, de la mer et de l'affluence, donc la route garde une idée claire sans devenir un itinéraire rigide."
	          : "Cala Rossa, Cala Azzurra, Bue Marino et les coins tranquilles de Levanzo restent des repères importants, mais le meilleur arrêt dépend toujours du vent, de la mer et de l'affluence. C'est pourquoi la route garde une idée claire sans devenir un itinéraire rigide.",
      ],
    };
  }

  if (isEs) {
    const spanishBoat = boatTitle ?? "el barco seleccionado";
    const formatText = isCharter
      ? "un charter privado de varios días para dormir cerca de las islas y dejar respirar la ruta"
      : isGourmet
	        ? "una jornada privada premium en trimarán, construida alrededor del confort, la comida y el tiempo lento al fondeo"
        : isSharedBoat
          ? "una excursión compartida de día completo para vivir las Egadi con una fórmula sencilla y accesible"
          : isHalfDay
            ? "un tour privado de medio día para grupos que quieren mar, privacidad y regreso claro"
            : "un tour privado de día completo para grupos que quieren más tiempo de baño, flexibilidad y ritmo lento";

    return {
      eyebrow: "Guía de la experiencia",
      title: `Por qué elegir ${title}`,
      paragraphs: [
        `${title} es ${formatText}. La experiencia sale desde Trapani y se adapta a las Islas Egadi tal y como están el día de la salida: luminosas, cambiantes, expuestas en algunas zonas y muy protegidas en otras.`,
        `A bordo de ${spanishBoat}, el valor no está solo en la lista de calas. Está en cómo se gestiona la jornada: salida clara, tiempos cómodos, paradas de baño elegidas con cuidado y una tripulación que sabe cuándo quedarse y cuándo moverse.`,
        isCharter
	          ? "En el charter, el ritmo es fundamental. Varias jornadas permiten descubrir las islas poco a poco: primer baño tras salir de Trapani, noche al fondeo si el tiempo acompaña y posibilidad de adaptar el plan al día siguiente."
          : isGourmet
            ? "En la experiencia gourmet, el barco se convierte en ruta y mesa a la vez. El chef y la tripulación coordinan tiempos, baño, fondeo y comida para que todo forme parte natural del día."
            : isSharedBoat
              ? "La fórmula compartida es práctica: reservas tu plaza, conoces a la tripulación en Trapani y compartes la ruta con otros huéspedes que buscan mar, baño y una salida bien organizada."
              : "En los tours privados, la flexibilidad es el punto fuerte. El barco queda reservado para tu grupo, así que el patrón puede ajustar paradas, ritmo y navegación sin equilibrar expectativas de otros huéspedes.",
	        isHalfDay
	          ? "Cala Rossa, Cala Azzurra, Bue Marino y los lados más protegidos de Favignana son las referencias de la salida compacta. La mejor parada depende siempre de viento, mar y afluencia, por eso la ruta mantiene una idea clara sin convertirse en un itinerario rígido."
	          : "Cala Rossa, Cala Azzurra, Bue Marino y los rincones tranquilos de Levanzo son referencias importantes, pero la mejor parada depende siempre de viento, mar y afluencia. Por eso la ruta mantiene una idea clara sin convertirse en un itinerario rígido.",
      ],
    };
  }

  if (isEn) {
    if (!isCharter && !isGourmet) {
      const boatTourFormat = isSharedBoat
        ? "a shared boat tour in the Egadi Islands from Trapani, ideal if you want a full day at sea without booking the whole boat"
        : isHalfDay
          ? "a private 4-hour boat tour in the Egadi Islands, designed for guests who want clear water, swim stops and an easy return schedule"
          : "a private full-day boat tour in the Egadi Islands, with the boat reserved for your group and more time to enjoy the route";

	      return {
	        eyebrow: "Experience guide",
	        title: `Why choose ${title}`,
	        paragraphs: [
	          isHalfDay
	            ? `${title} is ${boatTourFormat}. The departure is from Trapani, and the route is planned around the best conditions of the day in the coves comfortably reachable in four hours, especially around Favignana. This is important in the Egadi Islands: wind, sea state and crowding can change quickly, so a good boat tour is not about forcing a fixed itinerary.`
	            : `${title} is ${boatTourFormat}. The departure is from Trapani, and the route is planned around the best conditions of the day between Favignana and Levanzo. This is important in the Egadi Islands: wind, sea state and crowding can change quickly, so a good boat tour is not about forcing a fixed itinerary. It is about choosing the coves where the water is clearer, the anchorage is more comfortable and the day feels relaxed from start to finish.`,
	          isHalfDay
	            ? "The experience is built around the things people usually hope to find in a compact boat tour: turquoise water, swim stops, snorkelling, coastal views and a clean return schedule. Cala Rossa, Cala Azzurra, Bue Marino and the sheltered sides of Favignana are the kind of areas the skipper evaluates, but the final choice always depends on the real sea conditions."
	            : "The experience is built around the things people usually hope to find when they search for a boat tour in the Egadi Islands: turquoise water, swim stops, snorkelling, views of the coast and enough time to enjoy the sea without feeling rushed. Cala Rossa, Cala Azzurra, Bue Marino and the quieter corners of Levanzo are the kind of places the skipper evaluates during the day, but the final choice always depends on the real sea conditions.",
          isSharedBoat
	          ? "The shared format is simple and practical. You book your seats, meet the crew in Trapani and share the day with other guests who want the same kind of experience: sea, swimming and a well-organised route. It is a good option if you want a complete Egadi boat tour with a lighter budget and a sociable atmosphere on board."
            : isHalfDay
              ? "The 4-hour private tour is best when you want a compact experience: a clean schedule, privacy for your group and one or two well-chosen stops instead of a long list of places visited in a hurry. It works well for couples, families and travellers who want to enjoy the sea before or after another plan in Trapani."
              : "The private full-day format gives the skipper more freedom to shape the rhythm around your group. There is more time for swimming, more flexibility between Favignana and Levanzo and a calmer pace on board. It is the right choice if you want privacy, space and a route that can adapt to children, friends or a special occasion.",
          `On board ${boat}, you are not booking a technical boat name: you are choosing an open motorboat made for moving easily between the coves. There is seating for the group, space to enjoy the sun, sea access for swimming and snorkelling, a skipper at the helm and practical support before departure. You do not need to know the Egadi Islands already; bring swimwear, towel, sunscreen and a soft bag, and the crew will guide the route around the real conditions of the day.`,
          "What makes the difference is local judgement. A famous cove is not always the best stop if it is crowded or exposed; sometimes a quieter bay gives you clearer water and a better swim. That is why this experience is written as a flexible boat tour from Trapani to the Egadi Islands: the route has a clear idea, but the skipper keeps enough freedom to protect comfort, safety and the quality of the day.",
        ],
      };
    }

    const formatText = isCharter
      ? "a private multi-day charter designed for travellers who want to sleep close to the islands and let the route breathe"
      : isGourmet
        ? "a private premium day on the trimaran, built around comfort, food and unhurried time at anchor"
        : isSharedBoat
          ? "a shared full-day boat tour for guests who want the Egadi experience with a simple, accessible booking format"
          : isHalfDay
            ? "a private half-day tour for groups who want sea, privacy and a clear return schedule"
            : "a private full-day tour for groups who want more swim time, route flexibility and a slower pace";

    return {
      eyebrow: "Experience guide",
      title: `Why choose ${title}`,
      paragraphs: [
        `${title} is ${formatText}. The experience starts from Trapani and is shaped around the Egadi Islands as they really are on the day of departure: bright, changeable, exposed in some areas and wonderfully sheltered in others. This is why the page does not sell a rigid postcard route. It presents a professional sea experience where the skipper reads wind, traffic, sea state and light before choosing the most comfortable plan for ${plannedIslandsEn}.`,
        `On board ${boat}, the value of the experience is not only the list of coves. It is the way the day is managed: departure without confusion, clear timing, swim stops chosen with care, relaxed navigation and practical attention to the group. Guests often remember Cala Rossa, Cala Azzurra, Bue Marino or the quiet edges of Levanzo, but the real difference is the feeling of being guided by a crew that knows when to stay, when to move and when a quieter bay will be better than the most famous name on the map.`,
        isCharter
          ? "For charter guests, the rhythm becomes even more important. A multi-day route lets the islands open slowly: a first swim after leaving Trapani, dinner at anchor when the weather is right, mornings close to clear water and the possibility to adapt the following day instead of forcing a fixed programme. The trimaran gives the charter a more comfortable base, with cabins, shared spaces and enough room to turn the boat into a small floating home."
	          : isGourmet
	            ? "For the gourmet experience, the boat becomes both route and table. The chef and crew coordinate the timing so lunch does not feel like an interruption but part of the day: a swim before anchoring, calm service on board, local flavours and enough time after the meal to enjoy the water again. It is designed for guests who want privacy, comfort and a more curated way to experience the Egadi Islands."
          : isPrivateBoat
              ? "For private boat tours, flexibility is the strongest advantage. The boat is reserved for your group, so the skipper can adjust swim time, pace and stops without balancing different expectations on board. This is useful for families, couples, groups of friends and anyone who wants the Egadi with more privacy and a route that feels personal rather than standard."
	              : "For the shared full-day tour, the appeal is simplicity. You book your seats, meet the crew in Trapani and join a day that keeps the essentials: clear water, swim stops, scenic navigation and a sociable but organised atmosphere. It is a good choice when you want the full Egadi Islands experience without booking the entire boat privately.",
        `The route is intentionally described as flexible because the Egadi reward experience more than improvisation. A good day at sea depends on small decisions: where to anchor with less roll, which side of an island is clearer, when a famous cove is too crowded, and how long the group can stay in the water without turning the return into a rush. The crew keeps these details in balance so the trip feels natural, but behind that natural feeling there is planning, local knowledge and constant attention to comfort.`,
	        `This is especially important for guests comparing different experiences before booking. A private format gives more control over rhythm and privacy; a shared full day keeps the cost more accessible while preserving the main sea moments; a gourmet trimaran day adds service, food and space; a charter turns the islands into a slower journey. The goal of this page is to make those differences clear, so choosing the date is the last step, not the moment when you are still trying to understand what you are buying.`,
	        `The experience is also designed to help you decide before booking. The images show the boat and the atmosphere on board, the itinerary explains the likely structure of the day, and the FAQ answers the practical questions that usually matter before choosing a date. Prices and availability remain in the booking panel, while this page gives the context: what the experience feels like, who it is best for, how the crew works and why a well-managed route around the Egadi Islands can feel very different from a generic boat trip.`,
      ],
    };
  }

  const formatText = isCharter
    ? "un charter privato di più giorni in trimarano, pensato per chi vuole dormire vicino alle isole e ritrovare il comfort di un catamarano alle Egadi"
    : isGourmet
      ? "una giornata privata premium in trimarano, costruita intorno a comfort da catamarano, tavola e tempo lento in rada"
      : isSharedBoat
        ? "un tour condiviso di giornata intera per chi vuole vivere le Egadi con una formula semplice e accessibile"
        : isHalfDay
          ? "un tour privato di mezza giornata per gruppi che cercano mare, privacy e orari chiari"
          : "un tour privato di giornata intera per gruppi che vogliono più tempo in acqua, flessibilità e ritmo lento";

  if (!isCharter && !isGourmet) {
    const boatTourFormat = isSharedBoat
      ? "un tour in barca alle Egadi da Trapani in formula condivisa, pensato per chi vuole vivere una giornata completa in mare senza riservare tutta la barca"
      : isHalfDay
        ? "un tour privato in barca alle Egadi di 4 ore, ideale per chi cerca acqua limpida, soste bagno e un rientro semplice da organizzare"
        : "un tour privato in barca alle Egadi di giornata intera, con la barca riservata al tuo gruppo e più tempo per godersi la rotta";

	      return {
	        eyebrow: "Guida all'esperienza",
	        title: `Perché scegliere ${title}`,
	        paragraphs: [
	        isHalfDay
	          ? `${title} è ${boatTourFormat}. Si parte da Trapani e la rotta viene costruita sulle condizioni migliori della giornata nelle cale raggiungibili comodamente in quattro ore, soprattutto intorno a Favignana. Alle Egadi questa cosa conta davvero: vento, mare e affollamento possono cambiare in fretta, quindi un buon tour non deve inseguire una lista rigida di tappe.`
	          : `${title} è ${boatTourFormat}. Si parte da Trapani e la rotta viene costruita sulle condizioni migliori della giornata tra Favignana e Levanzo. Alle Egadi questa cosa conta davvero: vento, mare e affollamento possono cambiare in fretta, quindi un buon tour non deve inseguire una lista rigida di tappe. Deve scegliere le cale dove l'acqua è più bella, l'ancoraggio è più comodo e la giornata scorre senza forzature.`,
	        isHalfDay
	          ? "L'esperienza nasce per chi cerca un tour in barca alle Egadi compatto: acqua turchese, soste bagno, snorkeling, costa da vedere dal mare e orari semplici. Cala Rossa, Cala Azzurra, Bue Marino e i lati più riparati di Favignana sono tra le zone che lo skipper valuta durante l'uscita, ma la scelta finale dipende sempre dal mare reale del giorno."
	          : "L'esperienza nasce per chi cerca un tour in barca alle Egadi fatto bene: acqua turchese, soste bagno, snorkeling, costa da vedere dal mare e tempi abbastanza morbidi per godersi il momento. Cala Rossa, Cala Azzurra, Bue Marino e i lati più tranquilli di Levanzo sono tra i luoghi che lo skipper valuta durante l'uscita, ma la scelta finale dipende sempre dal mare reale del giorno.",
        isSharedBoat
          ? "La formula condivisa è semplice e pratica. Prenoti il tuo posto, incontri la crew a Trapani e condividi la giornata con altri ospiti che cercano la stessa cosa: mare, bagno e una rotta organizzata bene. È una buona soluzione se vuoi vivere una giornata completa alle Egadi con un prezzo più accessibile e un'atmosfera leggera a bordo."
          : isHalfDay
            ? "Il tour privato di 4 ore funziona quando vuoi un'esperienza compatta: orari chiari, barca riservata al tuo gruppo e una o due soste scelte bene, invece di tante tappe fatte di corsa. È adatto a coppie, famiglie e a chi vuole inserire il mare in una giornata già organizzata a Trapani."
            : "La giornata intera privata dà allo skipper più libertà per adattare il ritmo al tuo gruppo. C'è più tempo per fare il bagno, più margine per muoversi tra Favignana e Levanzo e una navigazione più rilassata. È la scelta giusta se vuoi privacy, spazio e una rotta che tenga conto di bambini, amici o occasioni speciali.",
        `A bordo della ${boat} non devi conoscere il modello della barca per capire cosa stai prenotando: è una barca open, aperta e veloce, pensata per muoversi facilmente tra le cale. Ci sono sedute per il gruppo, spazio per prendere il sole, accesso al mare per bagno e snorkeling, skipper alla guida e assistenza pratica prima della partenza. Non serve conoscere già le Egadi o sapere quale cala scegliere: porta costume, asciugamano, crema solare e una borsa morbida; alla navigazione e alla rotta pensa la crew.`,
        "La differenza la fa la conoscenza locale. Una cala famosa non è sempre la migliore se è troppo piena o esposta al vento; a volte una baia più tranquilla regala acqua più limpida e una sosta molto più piacevole. Per questo parliamo di tour in barca da Trapani alle Egadi con rotta flessibile: c'è un programma di base, ma lo skipper mantiene la libertà necessaria per proteggere comfort, sicurezza e qualità della giornata.",
      ],
    };
  }

  return {
    eyebrow: "Guida all'esperienza",
    title: `Perché scegliere ${title}`,
    paragraphs: [
      `${title} è ${formatText}. Si parte da Trapani e si entra nelle Isole Egadi per come sono davvero il giorno dell'uscita: luminose, variabili, esposte in alcuni tratti e sorprendentemente riparate in altri. Per questo non vendiamo una rotta rigida da cartolina. Raccontiamo un'esperienza di mare gestita con criterio, in cui lo skipper valuta vento, traffico, stato del mare e luce prima di scegliere il piano più comodo tra ${plannedIslandsIt}.`,
      `A bordo di ${boat}, il valore non è solo nella lista delle cale. Conta il modo in cui viene condotta la giornata: accoglienza ordinata, tempi chiari, soste bagno scelte con attenzione, navigazione rilassata e cura pratica del gruppo. Spesso si ricordano Cala Rossa, Cala Azzurra, Bue Marino o i lati più tranquilli di Levanzo, ma la differenza vera è sentirsi accompagnati da una crew che sa quando restare, quando spostarsi e quando una baia meno famosa può offrire un'esperienza migliore.`,
      isCharter
        ? "Nel charter il ritmo diventa ancora più importante. Più giornate permettono alle isole di aprirsi lentamente: primo bagno dopo la partenza da Trapani, cena in rada quando il meteo lo consente, risvegli vicino all'acqua limpida e possibilità di adattare il giorno successivo senza forzare un programma fisso. Il trimarano offre una base comoda, con cabine, spazi comuni e abbastanza respiro per trasformare la barca in una piccola casa sul mare: per questo è una scelta naturale anche per chi sta valutando un noleggio catamarano alle Egadi con skipper."
        : isGourmet
          ? "Nell'esperienza gourmet la barca diventa insieme rotta e tavola. Chef e crew coordinano i tempi per far sentire il pranzo come parte naturale della giornata: bagno prima dell'ancoraggio, servizio tranquillo a bordo, sapori locali e tempo sufficiente per tornare in acqua dopo il pasto. È una formula pensata per chi cerca privacy, comfort e un modo più curato di vivere le Egadi, molto adatta anche a chi immagina una giornata in catamarano tra Favignana e Levanzo."
          : isPrivateBoat
            ? "Nei tour privati il vantaggio principale è la flessibilità. La barca è riservata al tuo gruppo, quindi lo skipper può modulare soste, ritmo e navigazione senza dover bilanciare aspettative diverse a bordo. Funziona bene per famiglie, coppie, gruppi di amici e per chi vuole sentire le Egadi in modo personale, senza trasformare l'uscita in un programma standard."
            : "Nel tour condiviso di giornata intera il punto forte è la semplicità. Prenoti i posti, incontri la crew a Trapani e vivi una giornata che tiene insieme gli elementi essenziali: acqua limpida, soste bagno, navigazione panoramica e un'atmosfera sociale ma ordinata. È una buona scelta se vuoi l'esperienza completa delle Egadi senza riservare tutta la barca.",
      "La rotta viene raccontata come flessibile perché le Egadi premiano l'esperienza più dell'improvvisazione. Una buona giornata in mare dipende da scelte piccole: dove ancorare con meno rollio, quale lato dell'isola è più limpido, quando una cala famosa è troppo affollata e quanto tempo restare in acqua senza trasformare il rientro in una corsa. La crew tiene insieme questi dettagli in modo naturale, ma dietro quella naturalezza ci sono pianificazione, conoscenza locale e attenzione continua al comfort.",
      "Questo conta soprattutto quando stai confrontando esperienze diverse prima di prenotare. Una formula privata offre più controllo su ritmo e privacy; una giornata condivisa mantiene l'esperienza più accessibile senza rinunciare ai momenti principali; il trimarano gourmet aggiunge servizio, tavola e spazio; il charter trasforma le isole in un viaggio lento. L'obiettivo di questa pagina è rendere chiare queste differenze, così la scelta della data diventa l'ultimo passo, non il momento in cui devi ancora capire cosa stai acquistando.",
      "La pagina è pensata anche per aiutarti a scegliere prima di prenotare. Le immagini mostrano la barca e il mood a bordo, l'itinerario spiega la struttura probabile dell'uscita e le FAQ rispondono alle domande pratiche che contano davvero prima di scegliere una data. Prezzi e disponibilità restano nel box di prenotazione, mentre qui trovi il contesto: cosa si vive, per chi è adatta l'esperienza, come lavora la crew e perché una rotta ben gestita alle Egadi può essere molto diversa da un semplice giro in barca.",
    ],
  };
}

function getExperienceIntroSectionCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string },
  durationText: string,
  boatTitle?: string,
) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isFishing = isFishingService(service);
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const boat =
    boatTitle ??
    (isDe
      ? "das ausgewählte Boot"
      : isFr
        ? "le bateau sélectionné"
        : isEs
          ? "el barco seleccionado"
          : isEn
            ? "the selected boat"
            : "la barca selezionata");

  if (isDe) {
    const title = isFishing
      ? "Sportangeln auf den Ägadischen Inseln, mit einer Route nach Saison und Meer"
      : isCharter
        ? "Mehrere Tage auf den Ägadischen Inseln, ohne den Rhythmus zu erzwingen"
        : isGourmet
          ? "Die Ägadischen Inseln mit Raum, Komfort und Küche an Bord"
          : isPrivateBoat
            ? isHalfDay
              ? "Die Ägadischen Inseln im privaten Boot, im passenden Halbtag"
              : "Favignana und Levanzo im privaten Boot, mit Ihrem Rhythmus"
            : "Favignana und Levanzo vom Meer aus, mit der richtigen Zeit";

    return {
      eyebrow: "Das Erlebnis",
      title,
	      intro: isFishing
	        ? `Ein privater Angelcharter ab Trapani für alle, die ${durationText} auf dem Wasser verbringen möchten, mit Ausrüstung, Skipper und einem Plan, der nach Saison, Regeln, Wind und Meer gewählt wird.`
	        : isHalfDay
	          ? "Diese private 4-Stunden-Bootstour startet in Trapani und konzentriert sich auf die besten Buchten, die in einem halben Tag bequem erreichbar sind, vor allem rund um Favignana."
	          : `Diese Bootstour startet in Trapani und bringt Sie nach Favignana und Levanzo: Navigation, Badestopps, Schnorcheln und Buchten, die der Skipper nach Wind und Meer auswählt.`,
      paragraphs: [
        isFishing
          ? "Die Route wird nicht als starre Liste verkauft: Der Skipper bewertet Strömung, Tiefe, Wind und zulässige Bereiche, damit der Tag technisch sinnvoll und zugleich angenehm bleibt."
          : `An Bord von ${boat} bleibt der Ablauf klar: Treffpunkt in Trapani, Einschiffung, Navigation zu den Ägadischen Inseln und genügend Zeit, um das Meer nicht nur vom Boot aus zu sehen, sondern wirklich zu erleben.`,
	        isFishing
	          ? "Geangelt wird rund um die Inseln in erlaubten Bereichen, nicht in Badebuchten. Die Route kann sich zwischen Favignana, Levanzo und den passendsten Seiten des Archipels bewegen, immer nach Regeln, Meer und Sicherheit."
	          : isHalfDay
	          ? "Wenn die Bedingungen passen, gehören Cala Rossa, Cala Azzurra, Bue Marino und geschützte Seiten von Favignana zu den möglichen Stopps. Die endgültige Wahl bleibt flexibel, damit Wasser, Sicherheit und Komfort stimmen."
	          : "Wenn die Bedingungen passen, gehören Cala Rossa, Cala Azzurra und Bue Marino auf Favignana zu den möglichen Stopps. Auf Levanzo kommen oft Cala Fredda und Cala Minnola in Betracht. Die endgültige Wahl bleibt flexibel, damit Wasser, Sicherheit und Komfort stimmen.",
        isFishing
          ? `Die Ausfahrt dauert ${durationText} und ist für Gäste gedacht, die einen privaten, gut geführten Tag auf dem Meer suchen, nicht nur eine kurze Aktivität.`
          : isCharter
            ? `Der Charter dauert ${durationText} und passt zu Gästen, die Favignana, Levanzo und Marettimo über mehrere Tage erleben möchten, mit Nächten an Bord und mehr Freiheit bei der Route.`
            : isPrivateBoat
            ? `Das private Format dauert ${durationText}: Das Boot ist für Ihre Gruppe reserviert, daher kann der Skipper Tempo, Badestopps und Buchten persönlicher anpassen.`
            : isGourmet
              ? `Das Gourmet-Format dauert ${durationText}: Route, Badestopps und Mittagessen an Bord werden als ein ruhiger Premium-Tag geplant.`
              : `Das gemeinsame Format dauert ${durationText}: Sie buchen Ihre Plätze und teilen die Ausfahrt mit anderen Gästen, behalten aber eine organisierte Route und echte Zeit im Wasser.`,
      ],
    };
  }

  if (isFr) {
    const title = isFishing
      ? "Pêche sportive aux Égades, avec une route choisie sur l'eau"
      : isCharter
        ? "Plusieurs jours aux Égades, sans courir"
        : isGourmet
          ? "Les Égades avec espace, cuisine et temps lent"
          : isPrivateBoat
            ? isHalfDay
              ? "Les Égades en bateau privé, sur la bonne demi-journée"
              : "Favignana et Levanzo en bateau privé, à votre rythme"
            : "Favignana et Levanzo depuis la mer, avec le bon timing";

    return {
      eyebrow: "L'expérience",
      title,
	      intro: isFishing
	        ? `Un charter de pêche privé au départ de Trapani, avec ${durationText} en mer, matériel, skipper et route définie selon saison, règles, vent et conditions réelles.`
	        : isHalfDay
	          ? "Cette excursion privée de 4 heures part de Trapani et se concentre sur les meilleures criques accessibles en demi-journée, surtout autour de Favignana."
	          : `Cette excursion en bateau part de Trapani pour vivre Favignana et Levanzo avec navigation, baignades, snorkeling et criques choisies par le skipper selon vent et mer.`,
      paragraphs: [
        isFishing
          ? "Le skipper lit courant, profondeur, vent et zones autorisées avant de choisir le plan le plus cohérent pour la journée."
          : `À bord de ${boat}, le rythme reste simple : rendez-vous à Trapani, embarquement, navigation vers les Égades et temps réel pour profiter de l'eau.`,
	        isFishing
	          ? "La pêche se fait autour des îles dans les zones autorisées, pas dans les criques de baignade. La route peut évoluer entre Favignana, Levanzo et les secteurs les plus adaptés de l'archipel, toujours selon règles, mer et sécurité."
	          : isHalfDay
	          ? "Quand les conditions le permettent, Cala Rossa, Cala Azzurra, Bue Marino et les côtés abrités de Favignana font partie des zones évaluées. La route reste flexible pour préserver confort et sécurité."
	          : "Quand les conditions le permettent, Cala Rossa, Cala Azzurra et Bue Marino à Favignana font partie des arrêts possibles. À Levanzo, Cala Fredda et Cala Minnola sont souvent évaluées. La route reste flexible pour préserver confort et sécurité.",
        isFishing
          ? `La sortie dure ${durationText} et s'adresse à ceux qui veulent une journée privée en mer, technique mais confortable.`
          : isCharter
            ? `Le charter dure ${durationText} et convient à ceux qui veulent vivre Favignana, Levanzo et Marettimo sur plusieurs jours, avec nuits à bord et plus de liberté dans la route.`
            : isPrivateBoat
            ? `Le format privé dure ${durationText}: le bateau est réservé à votre groupe et le skipper peut ajuster rythme, baignades et criques.`
            : isGourmet
              ? `Le format gourmet dure ${durationText}: route, baignades et déjeuner à bord sont coordonnés comme une journée premium.`
              : `Le format partagé dure ${durationText}: vous réservez vos places et partagez une route organisée, avec du vrai temps dans l'eau.`,
      ],
    };
  }

  if (isEs) {
    const title = isFishing
      ? "Pesca deportiva en las Egadi, con ruta elegida en el mar"
      : isCharter
        ? "Varios días en las Egadi, sin correr"
        : isGourmet
          ? "Las Egadi con espacio, cocina y ritmo lento"
          : isPrivateBoat
            ? isHalfDay
              ? "Las Egadi en barco privado, en la media jornada justa"
              : "Favignana y Levanzo en barco privado, a tu ritmo"
            : "Favignana y Levanzo desde el mar, con el tiempo justo";

    return {
      eyebrow: "La experiencia",
      title,
	      intro: isFishing
	        ? `Un charter privado de pesca desde Trapani, con ${durationText} en el mar, equipo, patrón y ruta elegida según temporada, normativa, viento y condiciones reales.`
	        : isHalfDay
	          ? "Esta excursión privada de 4 horas sale de Trapani y se concentra en las mejores calas alcanzables en media jornada, sobre todo alrededor de Favignana."
	          : `Esta excursión en barco sale de Trapani para vivir Favignana y Levanzo con navegación, baños, snorkel y calas elegidas por el patrón según viento y mar.`,
      paragraphs: [
        isFishing
          ? "El patrón valora corriente, fondo, viento y zonas permitidas antes de elegir el plan más coherente para la jornada."
          : `A bordo de ${boat}, el ritmo es claro: encuentro en Trapani, embarque, navegación hacia las Egadi y tiempo real para disfrutar del agua.`,
	        isFishing
	          ? "La pesca se realiza alrededor de las islas, en zonas permitidas, no dentro de las calas de baño. La ruta puede moverse entre Favignana, Levanzo y los sectores más adecuados del archipiélago, siempre según normativa, mar y seguridad."
	          : isHalfDay
	          ? "Cuando las condiciones lo permiten, Cala Rossa, Cala Azzurra, Bue Marino y los lados protegidos de Favignana pueden formar parte de la ruta. El itinerario se mantiene flexible para cuidar comodidad y seguridad."
	          : "Cuando las condiciones lo permiten, Cala Rossa, Cala Azzurra y Bue Marino en Favignana pueden formar parte de la ruta. En Levanzo, Cala Fredda y Cala Minnola se valoran según el lado más protegido. El itinerario se mantiene flexible para cuidar comodidad y seguridad.",
        isFishing
          ? `La salida dura ${durationText} y está pensada para quien quiere una jornada privada en el mar, técnica pero cómoda.`
          : isCharter
            ? `El charter dura ${durationText} y encaja con quien quiere vivir Favignana, Levanzo y Marettimo durante varios días, con noches a bordo y más libertad de ruta.`
            : isPrivateBoat
            ? `El formato privado dura ${durationText}: el barco queda reservado para tu grupo y el patrón puede ajustar ritmo, baños y calas.`
            : isGourmet
              ? `El formato gourmet dura ${durationText}: ruta, baños y comida a bordo se coordinan como una jornada premium.`
              : `El formato compartido dura ${durationText}: reservas tus plazas y compartes una ruta organizada, con tiempo real para bañarte.`,
      ],
    };
  }

  if (isEn) {
    const title = isFishing
      ? "Sport fishing in the Egadi Islands, with the route chosen at sea"
      : isCharter
        ? "Several days in the Egadi Islands, without rushing the route"
        : isGourmet
          ? "The Egadi Islands with space, food and an unhurried rhythm"
          : isPrivateBoat
            ? isHalfDay
              ? "The Egadi Islands by private boat, in the right half day"
              : "Favignana and Levanzo by private boat, at your own rhythm"
            : "Favignana and Levanzo from the sea, with the right timing";

    return {
      eyebrow: "The experience",
      title,
	      intro: isFishing
	        ? `A private fishing charter from Trapani, with ${durationText} at sea, equipment, skipper and a route chosen around season, rules, wind and real conditions.`
	        : isHalfDay
	          ? "This private 4-hour boat tour leaves from Trapani and focuses on the best coves reachable in a half day, especially around Favignana."
	          : `This boat tour leaves from Trapani to experience Favignana and Levanzo in a clear way: navigation, swim stops, snorkelling and bays chosen by the skipper according to wind and sea.`,
      paragraphs: [
        isFishing
          ? "The skipper reads current, depth, wind and permitted areas before choosing the most sensible plan for the day."
          : `On board ${boat}, the rhythm stays easy to understand: meeting in Trapani, boarding, navigation towards the Egadi Islands and enough time to enjoy the water properly.`,
	        isFishing
	          ? "Fishing takes place around the islands in permitted areas, not inside swimming coves. The route can move between Favignana, Levanzo and the most suitable parts of the archipelago, always according to rules, sea conditions and safety."
	          : isHalfDay
	          ? "When conditions allow, Cala Rossa, Cala Azzurra, Bue Marino and the sheltered sides of Favignana may be part of the route. The itinerary stays flexible to protect comfort and safety."
	          : "When conditions allow, Cala Rossa, Cala Azzurra and Bue Marino in Favignana may be part of the route. In Levanzo, Cala Fredda and Cala Minnola are often evaluated according to the most sheltered side. The itinerary stays flexible to protect comfort and safety.",
        isFishing
          ? `The trip lasts ${durationText} and is designed for guests who want a private, well-led day at sea.`
          : isCharter
            ? `The charter lasts ${durationText} and suits guests who want Favignana, Levanzo and Marettimo across several days, with nights on board and more freedom in the route.`
            : isPrivateBoat
            ? `The private format lasts ${durationText}: the boat is reserved for your group, so the skipper can adjust pace, swim stops and bays.`
            : isGourmet
              ? `The gourmet format lasts ${durationText}: route, swim stops and lunch on board are coordinated as one premium day.`
              : `The shared format lasts ${durationText}: you book your seats and share an organised route, with real time in the water.`,
      ],
    };
  }

  const title = isFishing
    ? "Pesca sportiva alle Egadi, con rotta scelta sul mare"
    : isCharter
      ? "Più giorni alle Egadi, senza correre"
      : isGourmet
        ? "Le Egadi con spazio, cucina e tempo lento"
        : isPrivateBoat
          ? isHalfDay
            ? "Le Egadi in barca privata, nella mezza giornata giusta"
            : "Favignana e Levanzo in barca privata, con ritmo tuo"
          : "Favignana e Levanzo dal mare, con il tempo giusto";

	  return {
    eyebrow: "L'esperienza",
    title,
	    intro: isFishing
	      ? `Una giornata privata di pesca sportiva con partenza da Trapani: ${durationText} in mare con attrezzatura, skipper e rotta scelta in base a stagione, regole, vento e condizioni reali.`
	      : isHalfDay
	        ? "Questo tour privato in barca di 4 ore parte da Trapani e si concentra sulle migliori cale raggiungibili in mezza giornata, soprattutto intorno a Favignana."
	        : "Questa escursione in barca parte da Trapani e porta a vivere Favignana e Levanzo in una giornata completa: navigazione, soste bagno, snorkeling e baie scelte dallo skipper in base a vento e mare.",
    paragraphs: [
      isFishing
        ? "La giornata viene costruita sul mare, non su una promessa rigida: lo skipper valuta corrente, fondale, vento e zone consentite prima di scegliere il piano più sensato per pescare con calma e sicurezza."
        : `Si parte dal Porto di Trapani con check-in semplice e una giornata pensata per alternare navigazione, soste bagno e momenti in rada. A bordo di ${boat} il ritmo resta chiaro, con una crew che gestisce tempi e rotta senza trasformare l'uscita in una corsa tra tappe.`,
	      isFishing
	        ? "La pesca si svolge intorno alle isole, nelle aree consentite, non dentro le cale balneari. La rotta può muoversi tra Favignana, Levanzo e i tratti più adatti dell'arcipelago, sempre in base a regole, mare e sicurezza."
	        : isHalfDay
	        ? "Quando le condizioni lo permettono, lo skipper valuta Cala Rossa, Cala Azzurra, Bue Marino e i lati più riparati di Favignana. Non c'è una lista rigida da spuntare: si sceglie il punto migliore per acqua limpida, meno vento e una sosta davvero piacevole."
	        : "Quando le condizioni lo permettono, lo skipper valuta Cala Rossa, Cala Azzurra e Bue Marino a Favignana, poi Cala Fredda e Cala Minnola a Levanzo. Non c'è una lista rigida da spuntare: si sceglie il lato migliore per acqua limpida, meno vento e una sosta davvero piacevole.",
      isFishing
        ? `L'uscita dura ${durationText} ed è adatta a chi vuole una giornata privata, tecnica ma comoda, con attrezzatura professionale e una gestione attenta dei tempi.`
        : isCharter
          ? `La formula charter dura ${durationText} ed è pensata per vivere Favignana, Levanzo e Marettimo con più respiro: notti a bordo, rade tranquille e una rotta che può cambiare giorno per giorno. È adatta anche a chi cerca un charter in catamarano alle Egadi, ma vuole la stabilità e gli spazi di un trimarano multiscafo.`
          : isPrivateBoat
	        ? isHalfDay
	          ? `La formula privata dura ${durationText}: è il tour in barca alle Egadi giusto se vuoi spazio per il tuo gruppo, soste scelte bene e una rotta compatta costruita con lo skipper.`
	          : `La formula privata dura ${durationText}: è il tour in barca alle Egadi giusto se vuoi spazio per il tuo gruppo, più libertà nelle soste e una rotta costruita con lo skipper. Per chi cerca un tour privato Favignana e Levanzo da Trapani, qui contano ritmo e privacy.`
          : isGourmet
            ? `La formula gourmet dura ${durationText}: un tour in trimarano alle Egadi con chef a bordo, pranzo curato e tempo lento in rada, pensato per chi vuole comfort e servizio oltre alla rotta. È una soluzione naturale per chi cerca una giornata in catamarano alle Egadi, ma desidera una cucina vera a bordo.`
            : `La formula condivisa dura ${durationText}: è adatta se vuoi un tour in barca alle Egadi completo ma semplice da prenotare, un'escursione in barca Favignana e Levanzo con partenza da Trapani e tempo vero per bagno e snorkeling.`,
    ],
  };
}

function getDayProgramEditorialCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string },
  durationText: string,
  boatTitle?: string,
) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isFishing = isFishingService(service);
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDayBoatProgram =
    (service.type === "BOAT_SHARED" || service.type === "BOAT_EXCLUSIVE") && !isHalfDay;
  const boat =
    boatTitle ??
    (isDe
      ? "das ausgewählte Boot"
      : isFr
        ? "le bateau sélectionné"
        : isEs
          ? "el barco seleccionado"
          : isEn
            ? "the selected boat"
            : "la barca selezionata");

  if (isDe) {
    return {
      paragraphs: [
        {
          lead: isFishing
            ? "Der Angeltag startet in Trapani mit einem technischen Briefing und einem Plan, der nach Saison und Meer gewählt wird."
            : isCharter
              ? "Das Charterprogramm beginnt in Trapani und entwickelt sich Tag für Tag rund um die Ägadischen Inseln."
              : isGourmet
	                ? "Das Gourmet-Erlebnis startet in Trapani und verbindet Navigation, Badestopps und ein kuratiertes Mittagessen an Bord."
	                : isPrivateBoat
	                  ? isHalfDay
	                    ? "Diese private 4-Stunden-Bootstour ab Trapani ist für Gruppen gedacht, die eine kompakte Route mit Badestopps rund um Favignana möchten."
	                    : "Diese private Bootstour ab Trapani ist für Gruppen gedacht, die Favignana und Levanzo mit eigenem Rhythmus erleben möchten."
                  : "Diese Bootstour Favignana und Levanzo ab Trapani ist für Gäste gedacht, die die Ägadischen Inseln an einem ganzen Tag erleben möchten.",
          text: isFishing
            ? `An Bord von ${boat} beginnt der Tag mit Ausrüstung, Sicherheitsbriefing und einer technischen Route rund um die Inseln. Der Skipper wählt erlaubte Angelbereiche nach Strömung, Grund, Wind und AMP/MASAF-Regeln.`
            : `An Bord von ${boat} bleibt der Ablauf klar: Einschiffung, Ausfahrt aus dem Hafen von Trapani, Navigation zu den geschützten Seiten der Inseln und Stopps, die der Skipper nach Wind, Meer und Komfort auswählt.`,
        },
        isFishing
          ? {
              lead: "Die Route zielt nicht darauf, in Badebuchten zu angeln, sondern in erlaubten Angelbereichen rund um die Ägadischen Inseln.",
              text: "Favignana, Levanzo und die geeigneten Seiten des Archipels werden nach Wetter, Strömung, Grund und Saison bewertet. So bleibt der Angelcharter ab Trapani technisch sinnvoll, sicher und regelkonform.",
            }
          : {
              lead: "Favignana ist meist der erste große Teil der Route, mit möglichen Stopps bei Cala Rossa, Cala Azzurra und Bue Marino.",
              text: "Diese Orte sind bekannt für klares Wasser, felsige Küste und Badestopps, aber die Reihenfolge bleibt flexibel. Wenn eine Bucht zu exponiert oder zu voll ist, wählt die Crew eine ruhigere Alternative.",
            },
        ...(isCharter
          ? [
              {
                lead: "Ein Trimaran-Charter auf den Ägadischen Inseln bedeutet, Favignana, Levanzo und Marettimo mit Reisezeit statt Tagesausflug-Rhythmus zu erleben.",
                text: "Die Route kann die bekannten Buchten von Favignana, die ruhigen Ankerplätze vor Levanzo und die wildere Küste von Marettimo verbinden, immer nach Wetter, Dauer und Komfort an Bord.",
              },
              {
                lead: "Auf Anfrage kann die Route, wenn Wetter und gewählte Dauer passen, auch Richtung San Vito lo Capo erweitert werden.",
                text: "Das ist eine hochwertige Erweiterung für Gäste, die einen privaten Trimaran-Charter ab Trapani mit den Ägadischen Inseln und einer der schönsten Küsten der westlichen Sizilien verbinden möchten.",
              },
            ]
          : isGourmet
          ? [
              {
                lead: "Bei Cala Rossa ist der wichtigste Stopp für das Mittagessen an Bord vorgesehen.",
                text: "Der lokale Chef kocht direkt auf dem Trimaran: eine Cooking Experience mit regionalen Zutaten, Meerblick und ruhigem Timing vor der Weiterfahrt.",
              },
            ]
          : isFullDayBoatProgram
          ? [
              {
                lead: "Zur Mittagszeit ist ein Anlegen auf Favignana für die Mittagspause vorgesehen.",
                text: "So können Sie die Insel kurz betreten und das Mittagessen frei organisieren, bevor die Navigation Richtung Levanzo weitergeht. Zeiten und Anlegestelle können je nach Hafenbetrieb und Wetter angepasst werden.",
              },
            ]
          : []),
        isFishing
          ? {
              lead: "Im zweiten Teil kann der Skipper Gebiet oder Technik ändern, wenn das Meer es nahelegt.",
              text: "Grundangeln, Schleppangeln, Drifting oder Catch and Release werden nach echten Bedingungen gewählt. Ziel ist ein geführter Sportangeltag auf den Ägadischen Inseln, nicht ein touristischer Stopp in einer Bucht.",
            }
          : isHalfDay
          ? {
              lead: "Der zweite Teil bleibt kompakt und folgt den besten Bedingungen rund um Favignana.",
              text: "Der Skipper kann eine weitere Bucht, einen Panoramabereich oder mehr Badezeit wählen, ohne die Rückkehr nach Trapani zu knapp werden zu lassen.",
            }
          : isCharter
            ? {
                lead: "Marettimo ist der natürlichste Grund, den Charter über mehrere Tage zu planen.",
                text: "Mit mehr Nächten an Bord entsteht genug Raum für lange Überfahrten, ruhigere Morgenstunden, Buchten abseits des schnellen Tagesverkehrs und eine Route, die wirklich wie ein kleiner Segelurlaub wirkt.",
              }
          : {
              lead: "Levanzo bringt einen langsameren und oft ruhigeren Teil des Tages.",
              text: "Cala Fredda, Cala Minnola und die Küste nahe dem Faraglione werden nach den Bedingungen geprüft, damit Zeit zum Schwimmen, Schnorcheln und Entspannen vor Anker bleibt.",
            },
        {
          lead: `Die geplante Dauer beträgt ${durationText}, mit Rückkehr nach Trapani ohne den Tag in eine Liste starrer Stopps zu verwandeln.`,
          text: isHalfDay
            ? "Das Halbtag-Format konzentriert sich auf wenige, gut gewählte Badestopps und eine saubere Rückkehrzeit."
            : isCharter
              ? "Das Ziel ist ein privater Charter mit klarer Planung und flexibler Route: Favignana, Levanzo, Marettimo und, auf Anfrage, San Vito lo Capo werden als echte Reise gedacht, nicht als starre Liste von Stopps."
            : isFishing
              ? "Das Ziel ist klar zu verstehen, was gebucht wird: ein Angelcharter auf den Ägadischen Inseln ab Trapani mit privatem RIB, professioneller Ausrüstung, flexibler Route und Techniken, die auf See nach AMP/MASAF-Regeln gewählt werden."
            : "Das Ziel ist ein gut geführtes Erlebnis auf den Ägadischen Inseln: klare Zeiten, flexible Route, lokale Entscheidungen und genug Raum, um das Meer wirklich zu genießen.",
        },
      ],
    };
  }

  if (isFr) {
    return {
      paragraphs: [
        {
          lead: isFishing
            ? "La journée de pêche sportive part de Trapani avec briefing technique et route choisie selon saison, règles et mer."
            : isCharter
              ? "Le programme de charter commence à Trapani et se construit jour après jour autour des îles Égades."
              : isGourmet
	                ? "L'expérience gourmet part de Trapani et associe navigation, baignades et déjeuner soigné à bord."
	                : isPrivateBoat
	                  ? isHalfDay
	                    ? "Cette excursion privée de 4 heures depuis Trapani permet de vivre une route compacte avec baignades autour de Favignana."
	                    : "Cette excursion privée en bateau depuis Trapani permet de vivre Favignana et Levanzo avec un rythme plus personnel."
                  : "Cette excursion en bateau Favignana et Levanzo depuis Trapani permet de vivre les Égades sur une journée complète.",
          text: isFishing
            ? `À bord de ${boat}, la journée commence avec matériel, briefing sécurité et route technique autour des îles. Le skipper choisit les zones de pêche autorisées selon courant, fond, vent et règles AMP/MASAF.`
            : `À bord de ${boat}, la journée reste lisible : embarquement, sortie du port de Trapani, navigation vers les côtés les plus adaptés des îles et arrêts choisis par le skipper selon vent, mer et confort.`,
        },
        isFishing
          ? {
              lead: "La route ne vise pas à pêcher dans les criques de baignade, mais dans les zones autorisées autour des îles Égades.",
              text: "Favignana, Levanzo et les secteurs les plus adaptés de l'archipel sont évalués selon météo, courant, fond et saison. Le charter de pêche depuis Trapani reste ainsi technique, sûr et conforme aux règles.",
            }
          : {
              lead: "Favignana est souvent la première grande partie de la route, avec Cala Rossa, Cala Azzurra et Bue Marino parmi les arrêts possibles.",
              text: "Ces criques sont recherchées pour l'eau claire, la côte rocheuse et le snorkeling, mais l'ordre n'est jamais forcé si une zone est exposée ou trop fréquentée.",
            },
        ...(isCharter
          ? [
              {
                lead: "Un charter en trimaran aux Égades permet de vivre Favignana, Levanzo et Marettimo avec un vrai rythme de voyage.",
                text: "La route peut relier les criques les plus connues de Favignana, les mouillages calmes de Levanzo et la côte plus sauvage de Marettimo, toujours selon météo, durée choisie et confort à bord.",
              },
              {
                lead: "Sur demande, lorsque la météo et la durée le permettent, l'itinéraire peut aussi s'ouvrir vers San Vito lo Capo.",
                text: "C'est une extension idéale pour ceux qui cherchent un charter privé en trimaran depuis Trapani, entre îles Égades, navigation lente et l'une des côtes les plus spectaculaires de Sicile occidentale.",
              },
            ]
          : isGourmet
          ? [
              {
                lead: "À Cala Rossa, l'arrêt principal est prévu pour le déjeuner à bord.",
                text: "Le chef local cuisine directement sur le trimaran : une cooking experience avec ingrédients du territoire, service face à la mer et rythme détendu avant de reprendre la navigation.",
              },
            ]
          : isFullDayBoatProgram
          ? [
              {
                lead: "À l'heure du déjeuner, un accostage à Favignana est prévu pour la pause repas.",
                text: "Vous pouvez ainsi descendre sur l'île et organiser librement votre déjeuner avant de reprendre la navigation vers Levanzo. L'horaire et le point d'accostage peuvent varier selon le port et la météo.",
              },
            ]
          : []),
        isFishing
          ? {
              lead: "La deuxième partie peut changer de zone ou de technique selon ce qui se passe en mer.",
              text: "Pêche de fond, traîne, drifting ou catch and release sont choisis pendant la journée. L'objectif est une pêche sportive guidée aux Égades, pas un arrêt touristique dans une crique.",
            }
          : isHalfDay
          ? {
              lead: "La deuxième partie reste compacte et suit les meilleures conditions autour de Favignana.",
              text: "Le skipper peut choisir une autre crique, un passage panoramique ou plus de temps de baignade, sans rendre le retour à Trapani trop serré.",
            }
          : isCharter
            ? {
                lead: "Marettimo donne tout son sens à un charter de plusieurs jours.",
                text: "Avec plus de nuits à bord, on gagne le temps nécessaire pour des navigations plus longues, des matins calmes, des mouillages moins rapides et une route qui ressemble vraiment à une petite croisière privée.",
              }
          : {
              lead: "L'exploration continue à Levanzo, plus lente et souvent plus calme.",
              text: "Cala Fredda, Cala Minnola et la côte du Faraglione sont évaluées selon les conditions pour garder du temps de baignade et une vraie pause au mouillage.",
            },
        {
          lead: `La durée prévue est de ${durationText}, avec retour à Trapani et une route flexible.`,
          text: isHalfDay
            ? "Le format demi-journée privilégie quelques arrêts bien choisis et un retour facile à organiser."
            : isCharter
              ? "L'objectif est un charter privé avec une route claire mais flexible : Favignana, Levanzo, Marettimo et, sur demande, San Vito lo Capo deviennent une vraie expérience de voyage en mer."
            : isFishing
              ? "Le but est de comprendre avant de réserver ce que vous allez vivre : un charter de pêche aux îles Égades depuis Trapani, semi-rigide privé, matériel professionnel, route flexible et techniques choisies en mer selon les règles AMP/MASAF."
            : "Le but est de comprendre avant de réserver ce que l'on va vivre : mer, baignades, navigation panoramique et décisions locales prises au bon moment.",
        },
      ],
    };
  }

  if (isEs) {
    return {
      paragraphs: [
        {
          lead: isFishing
            ? "La jornada de pesca deportiva sale de Trapani con briefing técnico y ruta elegida según temporada, normativa y mar."
            : isCharter
              ? "El programa de charter empieza en Trapani y se construye día a día alrededor de las Islas Egadi."
              : isGourmet
	                ? "La experiencia gourmet sale de Trapani y combina navegación, baños y comida cuidada a bordo."
	                : isPrivateBoat
	                  ? isHalfDay
	                    ? "Esta excursión privada de 4 horas desde Trapani permite vivir una ruta compacta con baños alrededor de Favignana."
	                    : "Esta excursión privada en barco desde Trapani permite vivir Favignana y Levanzo con un ritmo más personal."
                  : "Esta excursión en barco Favignana y Levanzo desde Trapani está pensada para vivir las Egadi en una jornada completa.",
          text: isFishing
            ? `A bordo de ${boat}, el día empieza con equipo, briefing de seguridad y ruta técnica alrededor de las islas. El patrón elige las zonas de pesca permitidas según corriente, fondo, viento y reglas AMP/MASAF.`
            : `A bordo de ${boat}, el día es fácil de entender: embarque, salida del puerto de Trapani, navegación hacia los lados más protegidos de las islas y paradas elegidas por el patrón según viento, mar y comodidad.`,
        },
        isFishing
          ? {
              lead: "La ruta no busca pescar dentro de las calas de baño, sino en zonas permitidas alrededor de las Islas Egadi.",
              text: "Favignana, Levanzo y los sectores más adecuados del archipiélago se valoran según meteorología, corriente, fondo y temporada. Así el charter de pesca desde Trapani se mantiene técnico, seguro y conforme a la normativa.",
            }
          : {
              lead: "Favignana suele ser la primera gran parte de la ruta, con Cala Rossa, Cala Azzurra y Bue Marino entre las paradas posibles.",
              text: "Son lugares buscados por el agua clara, la costa rocosa y el snorkel, pero el orden se mantiene flexible si una cala está expuesta o demasiado llena.",
            },
        ...(isCharter
          ? [
              {
                lead: "Un charter en trimarán por las Egadi permite vivir Favignana, Levanzo y Marettimo con ritmo de viaje, no de excursión rápida.",
                text: "La ruta puede unir las calas más conocidas de Favignana, los fondeos tranquilos de Levanzo y la costa más salvaje de Marettimo, siempre según meteorología, duración elegida y comodidad a bordo.",
              },
              {
                lead: "Bajo petición, cuando la meteorología y la duración lo permiten, la ruta también puede abrirse hacia San Vito lo Capo.",
                text: "Es una extensión ideal para quien busca un charter privado en trimarán desde Trapani, combinando Islas Egadi, navegación lenta y una de las bahías más escénicas de Sicilia occidental.",
              },
            ]
          : isGourmet
          ? [
              {
                lead: "En Cala Rossa está prevista la parada principal para la comida a bordo.",
                text: "El chef local cocina directamente en el trimarán: una cooking experience con ingredientes del territorio, servicio frente al mar y tiempo tranquilo antes de seguir navegando.",
              },
            ]
          : isFullDayBoatProgram
          ? [
              {
                lead: "A la hora de comer está previsto atracar en Favignana para la pausa del almuerzo.",
                text: "Así puedes bajar a la isla y organizar la comida libremente antes de continuar la navegación hacia Levanzo. El horario y el punto de atraque pueden adaptarse según puerto y meteorología.",
              },
            ]
          : []),
        isFishing
          ? {
              lead: "La segunda parte puede cambiar de zona o de técnica según lo que ocurra en el mar.",
              text: "Pesca de fondo, curricán, drifting o catch and release se eligen durante la jornada. El objetivo es una pesca deportiva guiada en las Egadi, no una parada turística dentro de una cala.",
            }
          : isHalfDay
          ? {
              lead: "La segunda parte se mantiene compacta y sigue las mejores condiciones alrededor de Favignana.",
              text: "El patrón puede elegir otra cala, un tramo panorámico o más tiempo de baño, sin apretar demasiado el regreso a Trapani.",
            }
          : isCharter
            ? {
                lead: "Marettimo es la razón más natural para elegir varios días de charter.",
                text: "Con más noches a bordo hay tiempo para travesías largas, mañanas tranquilas, fondeos menos inmediatos y una ruta que se siente como una pequeña travesía privada.",
              }
          : {
              lead: "La exploración continúa hacia Levanzo, normalmente con un ritmo más tranquilo.",
              text: "Cala Fredda, Cala Minnola y la zona del Faraglione se valoran según las condiciones para conservar tiempo de baño y una pausa real al fondeo.",
            },
        {
          lead: `La duración prevista es de ${durationText}, con regreso a Trapani y una ruta flexible.`,
          text: isHalfDay
            ? "El formato de medio día se centra en pocas paradas bien elegidas y un regreso sencillo de organizar."
            : isCharter
              ? "El objetivo es un charter privado con planificación clara y ruta flexible: Favignana, Levanzo, Marettimo y, bajo petición, San Vito lo Capo se viven como un verdadero viaje por mar."
            : isFishing
              ? "La idea es que sepas antes de reservar qué vas a vivir: un charter de pesca en las Islas Egadi desde Trapani, neumática privada, equipo profesional, ruta flexible y técnicas elegidas en el mar según reglas AMP/MASAF."
            : "La idea es que sepas antes de reservar qué vas a vivir: mar, baños, navegación panorámica y decisiones locales tomadas en el momento justo.",
        },
      ],
    };
  }

  if (isEn) {
    return {
      paragraphs: [
        {
          lead: isFishing
            ? "The sport fishing day leaves from Trapani with a technical briefing and a route chosen around season, rules and sea conditions."
            : isCharter
              ? "The charter programme starts in Trapani and is shaped day by day around the Egadi Islands."
              : isGourmet
	                ? "The gourmet experience leaves from Trapani and combines navigation, swim stops and a curated lunch on board."
	                : isPrivateBoat
	                  ? isHalfDay
	                    ? "This private 4-hour boat tour from Trapani is designed for a compact route with swim stops around Favignana."
	                    : "This private boat tour from Trapani is designed to experience Favignana and Levanzo at a more personal rhythm."
                  : "This Favignana and Levanzo boat tour from Trapani is designed to experience the Egadi Islands over a full day at sea.",
          text: isFishing
            ? `On board ${boat}, the day starts with gear, safety briefing and a technical route around the islands. The skipper chooses permitted fishing areas according to current, seabed, wind and AMP/MASAF rules.`
            : `On board ${boat}, the day is easy to understand: boarding, departure from Trapani harbour, navigation towards the most comfortable sides of the islands and stops chosen by the skipper according to wind, sea and comfort.`,
        },
        isFishing
          ? {
              lead: "The route is not about fishing inside swimming coves, but in permitted fishing areas around the Egadi Islands.",
              text: "Favignana, Levanzo and the most suitable parts of the archipelago are evaluated according to weather, current, seabed and season. This keeps the fishing charter from Trapani technical, safe and compliant.",
            }
          : {
              lead: "Favignana is usually the first main part of the route, with Cala Rossa, Cala Azzurra and Bue Marino among the possible stops.",
              text: "These coves are known for clear water, rocky coastline and snorkelling, but the order is not forced if a bay is exposed or too crowded.",
            },
        ...(isCharter
          ? [
              {
                lead: "An Egadi trimaran charter is designed to experience Favignana, Levanzo and Marettimo with the rhythm of a journey rather than a fast day trip.",
                text: "The route can connect the iconic coves of Favignana, the quieter anchorages of Levanzo and the wilder coastline of Marettimo, always according to weather, chosen duration and comfort on board.",
              },
              {
                lead: "On request, when weather and charter length allow it, the route can also extend towards San Vito lo Capo.",
                text: "It is a refined option for guests looking for a private trimaran charter from Trapani that combines the Egadi Islands, slow navigation and one of the most scenic coastlines in western Sicily.",
              },
            ]
          : isGourmet
          ? [
              {
                lead: "At Cala Rossa, the main stop is planned around lunch on board.",
                text: "The local chef cooks directly on the trimaran: a cooking experience with local ingredients, sea-view service and relaxed timing before navigation continues.",
              },
            ]
          : isFullDayBoatProgram
          ? [
              {
                lead: "Around lunchtime, the programme includes docking on Favignana for the lunch break.",
                text: "This gives you time to step onto the island and organise lunch independently before continuing towards Levanzo. Timing and docking point can adapt to harbour operations and weather conditions.",
              },
            ]
          : []),
        isFishing
          ? {
              lead: "The second part can change area or technique according to what happens at sea.",
              text: "Bottom fishing, trolling, drifting or catch and release are chosen during the day. The goal is guided sport fishing in the Egadi Islands, not a tourist stop inside a cove.",
            }
          : isHalfDay
          ? {
              lead: "The second part stays compact and follows the best conditions around Favignana.",
              text: "The skipper can choose another cove, a scenic coastal passage or more swim time, without making the return to Trapani too tight.",
            }
          : isCharter
            ? {
                lead: "Marettimo is the natural reason to choose a multi-day charter.",
                text: "With more nights on board, there is room for longer passages, quieter mornings, less rushed anchorages and a route that feels like a proper private sea journey.",
              }
          : {
              lead: "The experience continues towards Levanzo, often with a slower and quieter rhythm.",
              text: "Cala Fredda, Cala Minnola and the coast near the Faraglione are evaluated according to the conditions, so there is real time for swimming and relaxing at anchor.",
            },
        {
          lead: `The planned duration is ${durationText}, with return to Trapani and a flexible route.`,
          text: isHalfDay
            ? "The half-day format focuses on a few well-chosen swim stops and a simple return schedule."
            : isCharter
              ? "The goal is a private charter with clear planning and a flexible route: Favignana, Levanzo, Marettimo and, on request, San Vito lo Capo become a real journey by sea."
            : isFishing
              ? "The goal is to understand before booking what the day really includes: an Egadi Islands fishing charter from Trapani with private RIB, professional gear, flexible route and techniques chosen at sea under AMP/MASAF rules."
            : "The goal is to understand before booking what the day actually feels like: sea, swim stops, scenic navigation and local decisions made at the right moment.",
        },
      ],
    };
  }

  return {
    paragraphs: [
      {
        lead: isFishing
          ? "La giornata di pesca sportiva parte da Trapani con briefing tecnico, attrezzatura pronta e rotta scelta in base a stagione, regole e mare."
          : isCharter
            ? "Il programma del charter inizia a Trapani e si costruisce giorno per giorno intorno alle Isole Egadi."
            : isGourmet
	              ? "La Premium Experience parte da Trapani e unisce navigazione, soste bagno e pranzo curato a bordo."
	              : isPrivateBoat
	                ? isHalfDay
	                  ? "Questo tour privato in barca di 4 ore da Trapani è pensato per una rotta compatta con soste bagno intorno a Favignana."
	                  : "Questa escursione privata in barca da Trapani è pensata per vivere Favignana e Levanzo con un ritmo più personale."
                : "Questa escursione in barca Favignana e Levanzo da Trapani è pensata per vivere le Egadi in una giornata completa, chiara e senza corse inutili.",
        text: isFishing
          ? `A bordo di ${boat} la giornata parte con attrezzatura, briefing sicurezza e rotta tecnica intorno alle isole. Lo skipper sceglie le aree di pesca consentite in base a corrente, fondale, vento e regole AMP/MASAF.`
          : `A bordo di ${boat} la giornata ha una struttura semplice: incontro al porto, uscita da Trapani, navigazione verso i lati più adatti delle isole e soste decise dallo skipper in base a vento, mare, affollamento e qualità dell'acqua.`,
      },
      isFishing
        ? {
            lead: "La rotta non punta a pescare dentro le cale, ma nelle aree consentite intorno alle Isole Egadi.",
            text: "Favignana, Levanzo e i tratti più adatti dell'arcipelago vengono valutati in base a meteo, corrente, fondale e stagione. In questo modo il charter pesca Egadi da Trapani resta tecnico, sicuro e conforme alla normativa.",
          }
        : {
            lead: "Favignana è di solito la prima parte forte del tour in barca alle Egadi, con Cala Rossa, Cala Azzurra e Bue Marino tra le possibili tappe.",
            text: "Sono luoghi cercati per acqua turchese, costa rocciosa, bagni e snorkeling, ma non vengono inseriti in modo rigido: se una cala è troppo esposta o troppo piena, la crew sceglie il punto più piacevole e sicuro della giornata.",
          },
      ...(isCharter
        ? [
            {
              lead: "Il charter in trimarano alle Egadi è pensato per vivere Favignana, Levanzo e Marettimo con ritmo da viaggio, non da escursione veloce.",
              text: "La rotta può unire le cale più iconiche di Favignana, le rade tranquille di Levanzo e la costa più selvaggia di Marettimo, sempre in base a meteo, durata scelta e comfort a bordo.",
            },
            {
              lead: "Su richiesta, quando meteo e durata lo permettono, l'itinerario può aprirsi anche verso San Vito lo Capo.",
              text: "È un'estensione ideale per chi cerca un charter privato in trimarano da Trapani che unisca Isole Egadi, navigazione lenta e una delle baie più scenografiche della Sicilia occidentale.",
            },
          ]
        : isGourmet
        ? [
            {
              lead: "A Cala Rossa è prevista la sosta principale per il pranzo a bordo.",
              text: "Lo chef locale cucina direttamente sul trimarano: una cooking experience con ingredienti del territorio, servizio vista mare e tempi distesi prima di riprendere la navigazione.",
            },
          ]
        : isFullDayBoatProgram
        ? [
            {
              lead: "Per la pausa pranzo è previsto l'attracco a Favignana.",
              text: "A metà giornata si entra in porto sull'isola, così puoi scendere e organizzare il pranzo libero prima di riprendere la navigazione verso Levanzo. Orario e punto di attracco possono adattarsi a traffico portuale, vento e condizioni del mare.",
            },
          ]
        : []),
      isFishing
        ? {
            lead: "La seconda parte può cambiare zona o tecnica in base a quello che succede in mare.",
            text: "Bolentino, traina, drifting o catch and release vengono scelti durante la giornata: l'obiettivo è una pesca sportiva alle Egadi guidata, sicura e rispettosa delle regole, non una sosta turistica in una cala.",
          }
        : isHalfDay
        ? {
            lead: "La seconda parte resta compatta e segue le condizioni migliori intorno a Favignana.",
            text: "Lo skipper può scegliere un'altra cala, un tratto panoramico o più tempo per il bagno, senza rendere troppo stretto il rientro a Trapani.",
          }
        : isCharter
          ? {
              lead: "Marettimo è il motivo più naturale per scegliere più giorni di charter.",
              text: "Con più notti a bordo c'è spazio per traversate più lunghe, mattine lente, rade meno immediate e una rotta che diventa davvero una piccola crociera privata alle Egadi.",
            }
        : {
            lead: "L'esplorazione continua verso Levanzo, dove Cala Fredda, Cala Minnola e il tratto del Faraglione offrono un ritmo più lento e raccolto.",
            text: "Qui il programma punta a lasciare tempo vero in acqua e in rada, senza trasformare l'escursione in barca Favignana e Levanzo in una sequenza di nomi da spuntare.",
          },
      {
        lead: `La durata prevista è ${durationText}, con rientro a Trapani e rotta sempre adattata alle condizioni reali del mare.`,
        text: isHalfDay
          ? "Nel formato mezza giornata il valore sta nella selezione: poche soste, scelte bene, con orari chiari e una navigazione facile da inserire nella giornata."
          : isCharter
            ? "L'obiettivo è un charter privato con pianificazione chiara e rotta flessibile: Favignana, Levanzo, Marettimo e, su richiesta, San Vito lo Capo diventano un vero viaggio via mare."
          : isFishing
            ? "L'obiettivo è farti capire prima di prenotare cosa vivrai davvero: un charter pesca Egadi da Trapani con gommone dedicato, attrezzatura professionale, rotta flessibile e tecniche scelte sul mare nel rispetto delle norme AMP/MASAF."
          : "L'obiettivo è farti capire prima di prenotare cosa vivrai davvero: un tour Favignana e Levanzo da Trapani con navigazione panoramica, soste bagno, snorkeling e gestione locale del percorso.",
      },
    ],
  };
}

function getExcursionSnapshotCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string },
  durationText: string,
) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isFishing = isFishingService(service);
  const isCharter = service.type === "CABIN_CHARTER";
  const isMorning = service.durationType === "HALF_DAY_MORNING";
  const isAfternoon = service.durationType === "HALF_DAY_AFTERNOON";
  const isHalfDay = isMorning || isAfternoon;
  const isFullDay = service.durationType === "FULL_DAY";

  if (isDe) {
    return {
      detailsEyebrow: "EGADISAILING",
      detailsTitleStart: "Details",
      detailsTitleAccent: "Ausflug",
      includesEyebrow: "DER PERFEKTE AUSFLUG",
      includesTitleStart: "Was ist",
      includesTitleAccent: "inklusive?",
      detailItems: [
        "Treffpunkt: Via dei Gladioli 15, Hafen Trapani.",
        isCharter
          ? "Einschiffung und Route werden vor der Abfahrt mit der Crew bestätigt."
          : isFishing
            ? "Technisches Briefing und Ausrüstungscheck vor der Abfahrt."
            : isFullDay
              ? "Empfohlene Ankunft am Steg: 9:00 / 9:30."
              : "Empfohlene Ankunft: 30 Minuten vor Abfahrt.",
        isCharter
          ? "Route über Favignana, Levanzo und Marettimo nach Wetter und Dauer."
          : isFishing
            ? "Angelplätze werden nach Saison, Regeln und Seegang gewählt."
            : isMorning
              ? "Abfahrt 9:00 - Rückkehr ca. 13:00."
              : isAfternoon
                ? "Abfahrt 14:00 - Rückkehr ca. 18:00."
                : "Abfahrt 10:00 - Rückkehr bis ca. 18:00.",
        `Dauer: ${durationText}.`,
        isCharter
          ? "Nächte vor Anker oder im Hafen werden nach Wetter und Verfügbarkeit geplant."
          : isFishing
            ? "Technik und Rhythmus werden vom Skipper während des Tages angepasst."
            : isHalfDay
              ? "Badestopps und Buchten werden nach dem geschütztesten Tagesfenster gewählt."
              : "Mögliche Stopps zwischen Favignana und Levanzo, nach Wind, Meer und Andrang.",
      ],
    };
  }

  if (isFr) {
    return {
      detailsEyebrow: "EGADISAILING",
      detailsTitleStart: "Détails",
      detailsTitleAccent: "excursion",
      includesEyebrow: "L'EXCURSION PARFAITE",
      includesTitleStart: "Ce qui est",
      includesTitleAccent: "inclus ?",
      detailItems: [
        "Point de départ : Via dei Gladioli 15, port de Trapani.",
        isCharter
          ? "Embarquement et route confirmés avec la crew avant le départ."
          : isFishing
            ? "Briefing technique et contrôle du matériel avant la sortie."
            : isFullDay
              ? "Arrivée conseillée au ponton : 9:00 / 9:30."
              : "Arrivée conseillée : 30 minutes avant le départ.",
        isCharter
          ? "Route entre Favignana, Levanzo et Marettimo selon météo et durée."
          : isFishing
            ? "Zones de pêche choisies selon saison, règles et état de la mer."
            : isMorning
              ? "Départ 9:00 - retour vers 13:00."
              : isAfternoon
                ? "Départ 14:00 - retour vers 18:00."
                : "Départ 10:00 - retour avant 18:00.",
        `Durée : ${durationText}.`,
        isCharter
          ? "Nuits au mouillage ou au port organisées selon météo et disponibilité."
          : isFishing
            ? "Techniques et rythme adaptés par le skipper pendant la journée."
            : isHalfDay
              ? "Baignades et criques choisies dans la fenêtre la plus protégée."
              : "Arrêts possibles entre Favignana et Levanzo, selon vent, mer et affluence.",
      ],
    };
  }

  if (isEs) {
    return {
      detailsEyebrow: "EGADISAILING",
      detailsTitleStart: "Detalles",
      detailsTitleAccent: "excursión",
      includesEyebrow: "LA EXCURSIÓN PERFECTA",
      includesTitleStart: "¿Qué",
      includesTitleAccent: "incluye?",
      detailItems: [
        "Punto de salida: Via dei Gladioli 15, Puerto de Trapani.",
        isCharter
          ? "Embarque y ruta confirmados con la tripulación antes de salir."
          : isFishing
            ? "Briefing técnico y control del equipo antes de la salida."
            : isFullDay
              ? "Llegada recomendada al muelle: 9:00 / 9:30."
              : "Llegada recomendada: 30 minutos antes de la salida.",
        isCharter
          ? "Ruta entre Favignana, Levanzo y Marettimo según meteo y duración."
          : isFishing
            ? "Zonas de pesca elegidas según temporada, normativa y mar."
            : isMorning
              ? "Salida 9:00 - regreso sobre las 13:00."
              : isAfternoon
                ? "Salida 14:00 - regreso sobre las 18:00."
                : "Salida 10:00 - regreso antes de las 18:00.",
        `Duración: ${durationText}.`,
        isCharter
          ? "Noches fondeados o en puerto según meteo y disponibilidad."
          : isFishing
            ? "Técnicas y ritmo adaptados por el patrón durante la jornada."
            : isHalfDay
              ? "Baños y calas elegidos en la franja más protegida."
              : "Paradas posibles entre Favignana y Levanzo, según viento, mar y afluencia.",
      ],
    };
  }

  if (isEn) {
    return {
      detailsEyebrow: "EGADISAILING",
      detailsTitleStart: "Excursion",
      detailsTitleAccent: "details",
      includesEyebrow: "THE PERFECT EXCURSION",
      includesTitleStart: "What is",
      includesTitleAccent: "included?",
      detailItems: [
        "Departure point: Via dei Gladioli 15, Trapani harbour.",
        isCharter
          ? "Boarding and route confirmed with the crew before departure."
          : isFishing
            ? "Technical briefing and gear check before departure."
            : isFullDay
              ? "Recommended arrival at the pier: 9:00 / 9:30."
              : "Recommended arrival: 30 minutes before departure.",
        isCharter
          ? "Route across Favignana, Levanzo and Marettimo according to weather and duration."
          : isFishing
            ? "Fishing areas chosen according to season, rules and sea conditions."
            : isMorning
              ? "Departure 9:00 - return around 13:00."
              : isAfternoon
                ? "Departure 14:00 - return around 18:00."
                : "Departure 10:00 - return by 18:00.",
        `Duration: ${durationText}.`,
        isCharter
          ? "Nights at anchor or in harbour planned according to weather and availability."
          : isFishing
            ? "Techniques and rhythm adjusted by the skipper during the day."
            : isHalfDay
              ? "Swim stops and coves chosen within the most sheltered time window."
              : "Possible stops between Favignana and Levanzo, according to wind, sea and crowds.",
      ],
    };
  }

  return {
    detailsEyebrow: "EGADISAILING",
    detailsTitleStart: "Dettagli",
    detailsTitleAccent: "escursione",
    includesEyebrow: "L'ESCURSIONE PERFETTA",
    includesTitleStart: "Cosa",
    includesTitleAccent: "include?",
    detailItems: [
      "Punto di partenza: Via dei Gladioli 15, Porto di Trapani.",
      isCharter
        ? "Imbarco e rotta vengono confermati con la crew prima della partenza."
        : isFishing
          ? "Briefing tecnico e controllo attrezzatura prima dell'uscita."
          : isFullDay
            ? "Arrivo consigliato al pontile: 9:00 / 9:30."
            : "Arrivo consigliato: 30 minuti prima della partenza.",
      isCharter
        ? "Rotta tra Favignana, Levanzo e Marettimo secondo meteo e durata."
        : isFishing
          ? "Zone di pesca scelte in base a stagione, regole e condizioni del mare."
          : isMorning
            ? "Partenza ore 9:00 - rientro intorno alle 13:00."
            : isAfternoon
              ? "Partenza ore 14:00 - rientro intorno alle 18:00."
              : "Partenza ore 10:00 - rientro entro le 18:00.",
      `Durata: ${durationText}.`,
      isCharter
        ? "Notti in rada o in porto pianificate in base a meteo e disponibilità."
        : isFishing
          ? "Tecniche e ritmo vengono adattati dallo skipper durante la giornata."
          : isHalfDay
            ? "Soste bagno e cale scelte nella finestra più riparata della giornata."
            : "Possibili soste tra Favignana e Levanzo, secondo vento, mare e affollamento.",
    ],
  };
}

function getGourmetMenuCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
    eyebrow: isDe ? "Chef an Bord" : isEs ? "Chef a bordo" : isFr ? "Chef à bord" : isEn ? "Chef on board" : "Chef a bordo",
    title: isDe
      ? "Beispielmenüs für das Gourmet-Erlebnis"
      : isEs
        ? "Ejemplos de menús gourmet"
        : isFr
          ? "Exemples de menus gourmet"
          : isEn
            ? "Sample gourmet menus"
            : "Esempi di menu gourmet",
    intro: isEs
      ? "Tres ejemplos de comida servida a bordo durante la Premium Experience. El menú final se confirma con el chef según pesca fresca, temporada y necesidades de los huéspedes."
      : isDe
      ? "Drei Beispiele für das Mittagessen an Bord während der Premium Experience. Das endgültige Menü wird mit dem Chef nach frischem Fang, Saison und Bedürfnissen der Gäste bestätigt."
      : isFr
      ? "Trois exemples de déjeuner servis à bord pendant la Premium Experience. Le menu final est confirmé avec le chef selon la pêche fraîche, la saison et les besoins des hôtes."
      : isEn
      ? "Three sample lunch styles served on board during the Gourmet Experience. The final menu is confirmed with the chef according to fresh catch, seasonality and guest needs."
      : "Tre esempi di pranzo servito a bordo durante l'Esperienza Gourmet. Il menu definitivo viene concordato con lo chef in base a pescato fresco, stagione ed esigenze degli ospiti.",
    seasonalNote: isEs
      ? "Los menús pueden variar según disponibilidad. Alergias, intolerancias y necesidades alimentarias importantes deben comunicarse antes de la salida."
      : isDe
      ? "Die Menüs können je nach Verfügbarkeit variieren. Allergien, Unverträglichkeiten und wichtige Ernährungsbedürfnisse sollten vor der Abfahrt mitgeteilt werden."
      : isFr
      ? "Les menus peuvent varier selon la disponibilité. Allergies, intolérances et besoins alimentaires importants doivent être communiqués avant le départ."
      : isEn
      ? "Menus may vary according to availability. Allergies, intolerances and important dietary needs should be communicated before departure."
      : "I menu possono variare in base alla disponibilità. Allergie, intolleranze ed esigenze alimentari importanti vanno comunicate prima della partenza.",
  };
}

function getGourmetSampleMenus(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return [
    {
      title: isDe
        ? "Favignana-Thunfisch-Menü"
        : isEs
          ? "Menú de atún de Favignana"
          : isFr
            ? "Menu thon de Favignana"
            : isEn
              ? "Favignana Tuna Menu"
              : "Menu tonno di Favignana",
      subtitle: isDe
        ? "Lokaler Fisch, sizilianische Aromen und ein leichter Abschluss."
        : isEs
          ? "Pescado local, sabores sicilianos y un final ligero."
          : isFr
            ? "Poisson local, saveurs siciliennes et finale légère."
            : isEn
              ? "Local fish, Sicilian flavours and a relaxed finish."
              : "Pesce locale, sapori siciliani e chiusura leggera.",
      items: isEs
        ? [
            "Aperitivo de bruschette sicilianas tradicionales a base de pescado",
            "Rollé de atún fresco pescado en Favignana",
            "Pasta a la eoliana",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Aperitif mit typischen sizilianischen Fisch-Bruschette",
            "Roulade aus frischem Thunfisch, gefangen vor Favignana",
            "Pasta nach äolischer Art",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Apéritif de bruschette siciliennes traditionnelles au poisson",
            "Roulé de thon frais pêché à Favignana",
            "Pâtes à l'éolienne",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Aperitif with traditional Sicilian seafood bruschetta",
            "Fresh tuna roulade caught off Favignana",
            "Aeolian-style pasta",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Aperitivo di bruschette tipiche siciliane a base di pesce",
            "Rollè di tonno fresco pescato a Favignana",
            "Pasta all'eoliana",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
    {
      title: isDe
        ? "Trapani-Meeresmenü"
        : isEs
          ? "Menú marinero trapanese"
          : isFr
            ? "Menu marin de Trapani"
            : isEn
              ? "Trapani Sea Menu"
              : "Menu mare trapanese",
      subtitle: isDe
        ? "Eine feinere Meeresvariante mit Muscheln und lokalem Wein."
        : isEs
          ? "Una propuesta de mar más delicada, con mejillones y vino local."
          : isFr
            ? "Une proposition marine plus délicate, avec moules et vin local."
            : isEn
              ? "A softer seafood menu built around mussels and local wine."
              : "Una proposta di mare più delicata, con cozze e vino del territorio.",
      items: isEs
        ? [
            "Trío de mousses de mar",
            "Pasta con ragú de mejillones",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Dreierlei Meeresmousse",
            "Pasta mit Muschelragout",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Trio de mousses de mer",
            "Pâtes au ragoût de moules",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Trio of seafood mousses",
            "Pasta with mussel ragout",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Trittico di mousse di mare",
            "Pasta con ragù di cozze",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
    {
      title: isDe
        ? "Premium-Crudité-Menü"
        : isEs
          ? "Menú crudité premium"
          : isFr
            ? "Menu crudités de mer premium"
            : isEn
              ? "Premium Raw Seafood Menu"
              : "Menu crudité premium",
      subtitle: isDe
        ? "Nur auf ausdrückliche Anfrage und mit Aufpreis verfügbar."
        : isEs
          ? "Disponible solo bajo petición expresa y con suplemento."
          : isFr
            ? "Disponible uniquement sur demande explicite, avec supplément."
            : isEn
              ? "Available only on explicit request with a supplement."
              : "Disponibile solo su esplicita richiesta e con supplemento.",
      badge: isDe ? "Auf Anfrage" : isEs ? "Bajo petición" : isFr ? "Sur demande" : isEn ? "On request" : "Su richiesta",
      items: isEs
        ? [
            "Crudités de mar",
            "Pasta con gamba roja de Mazara del Vallo y pesto de pistacho",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Meeres-Crudités",
            "Pasta mit roter Garnele aus Mazara del Vallo und Pistazienpesto",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Crudités de mer",
            "Pâtes à la crevette rouge de Mazara del Vallo et pesto de pistache",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Seafood crudités",
            "Pasta with Mazara del Vallo red prawns and pistachio pesto",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Crudité di mare",
            "Pasta con gambero rosso di Mazara del Vallo e pesto di pistacchio",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  if (!isPublicBookingServiceEnabled(serviceId)) return { title: "Not Found" };
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return { title: "Not Found" };
  const content = getExperienceContent(service.id, locale);
  if (!content) return { title: "Not Found" };
  return buildPageMetadata({
    title: content.seoTitle,
    description: content.seoDescription,
    path: `/experiences/${getExperiencePublicSlug(service.id, locale)}`,
    locale,
    image: service.boatId === "boat" ? EGADI_BOAT_FRONT_HERO_IMAGE : content.media[0]?.src,
  });
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations();
  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  if (!isPublicBookingServiceEnabled(serviceId)) notFound();

  const service = await db.service.findUnique({ where: { id: serviceId } });

  if (!service || !service.active) notFound();
  const content = getExperienceContent(service.id, locale);
  if (!content) notFound();
  const canonicalSlug = getExperiencePublicSlug(service.id, locale);
  if (slug !== canonicalSlug) permanentRedirect(localizedPath(locale, `/experiences/${canonicalSlug}`));

  const boatContent = getBoatContent(service.boatId, locale);
  const boatDetailHref =
    boatContent?.id === "trimarano" ? localizedPath(locale, `/boats/${boatContent.slug}`) : null;
  const [displayPrice, itinerary] = await Promise.all([
    getDisplayPrice(service.id, 2026, locale),
    getExperienceItinerary(service.id, locale, content.itinerary),
  ]);

  const copy = getDetailCopy(locale, service);
  const pagePath = `/experiences/${canonicalSlug}`;
  const bookingServiceParam = getExperiencePublicSlug(service.id, locale);
  const bookingHref = localizedPath(locale, `/prenota?service=${bookingServiceParam}`);
  const recoveryHref = localizedStaticPath(locale, "/recupera-prenotazione");
  const contactHref = localizedStaticPath(locale, "/contacts");
  const recoveryLabel =
    locale === "es"
      ? "Buscar reserva"
      : locale === "fr"
        ? "Retrouver réservation"
        : locale === "de"
          ? "Buchung finden"
        : locale === "en"
          ? "Find booking"
      : "Recupera prenotazione";
  const contactLabel =
    locale === "es"
      ? "Contáctanos"
      : locale === "fr"
        ? "Nous contacter"
        : locale === "de"
          ? "Kontakt"
          : locale === "en"
            ? "Contact us"
            : "Contattaci";
  const passengersLabel =
    locale === "es"
      ? "Pasajeros"
      : locale === "fr"
        ? "Passagers"
        : locale === "de"
          ? "Passagiere"
          : locale === "en"
            ? "Passengers"
            : "Passeggeri";
  const reviewScoreLabel =
    locale === "es"
      ? "4.9 de 5"
      : locale === "fr"
        ? "4,9 sur 5"
        : locale === "de"
          ? "4,9 von 5"
          : locale === "en"
            ? "4.9 out of 5"
            : "4.9 su 5";
  const durationText = getServiceDurationLabel(service, locale);
  const seoExpansion = getSeoExpansionCopy(locale, service, durationText, boatContent?.title);
  const experienceIntro = getExperienceIntroSectionCopy(
    locale,
    service,
    durationText,
    boatContent?.title,
  );
  const excursionSnapshot = getExcursionSnapshotCopy(locale, service, durationText);
  const dayProgram = getDayProgramEditorialCopy(locale, service, durationText, boatContent?.title);
  const priceUnit =
    service.type === "CABIN_CHARTER" || service.pricingUnit === "PER_PACKAGE"
      ? getPriceUnitLabel(service.pricingUnit, service.type, locale)
      : t("experience.perPerson");
  const heroMedia = content.media.find((item) => item.src) ?? content.media[0];
  const isEgadiBoatExperience = boatContent?.id === "boat";
  const isHalfDayExperience =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const heroImage = isEgadiBoatExperience
    ? EGADI_BOAT_FRONT_HERO_IMAGE
    : heroMedia?.src ?? FALLBACK_HERO_IMAGE;
  const heroImageAlt = isEgadiBoatExperience
    ? getEgadiBoatHeroAlt(locale)
    : heroMedia?.alt ?? content.title;
  const gallery = content.media.filter(
    (item): item is (typeof content.media)[number] & { src: string } => Boolean(item.src),
  );
  const boatGallery = boatContent?.gallery ?? [];
  const isGourmetExperience = service.type === "EXCLUSIVE_EXPERIENCE";
  const isCharterExperience = service.type === "CABIN_CHARTER";
  const showcaseGallery = isEgadiBoatExperience
    ? [...boatGallery, ...getEgadiBoatRouteGallery(locale, isHalfDayExperience)]
    : isGourmetExperience || isCharterExperience
      ? gallery
    : [...gallery, ...boatGallery];
  const editorial = getEditorialExperienceCopy(locale, service, content.title, boatContent?.title);
  const gourmetMenuCopy = getGourmetMenuCopy(locale);
  const gourmetMenus = service.type === "EXCLUSIVE_EXPERIENCE" ? getGourmetSampleMenus(locale) : [];
  const relatedExperiences = getRelatedExperienceIds(service.id)
    .map((id) => getExperienceContent(id, locale))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const relatedIslandSection = getRelatedIslandSection(locale, service);
  const priceLabel = displayPrice.amount
    ? `${t("experience.from")} ${formatEur(displayPrice.amount, locale)}`
    : displayPrice.label;
  const charterDurationDays = service.type === "CABIN_CHARTER" ? 3 : undefined;
  const bookingInfoItems = [
    {
      icon: "clock" as const,
      label: t("experience.duration"),
      value: durationText,
    },
    {
      icon: "users" as const,
      label: t("experience.capacity"),
      value: service.capacityMax,
    },
    ...(boatContent
      ? [
          {
            icon: "ship" as const,
            label: t("experience.boat"),
            value: boatContent.title,
          },
        ]
      : []),
  ];
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = localizedAbsoluteUrl(siteBase, locale, pagePath);
  const bookingUrl = `${siteBase}${bookingHref}`;
  const boatDetailUrl = boatDetailHref ? `${siteBase}${boatDetailHref}` : null;
  const schemaDuration =
    service.type === "CABIN_CHARTER"
      ? "P3D"
      : service.durationHours > 0
        ? `PT${service.durationHours}H`
        : undefined;
  const touristTypes =
    locale === "de"
      ? service.type === "CABIN_CHARTER"
        ? ["Privater Charter", "Mehrtägige Segelreise", "Ägadische Inseln"]
        : service.type === "BOAT_SHARED"
          ? ["Geteilte Bootstour", "Schnorcheln", "Ägadische Inseln"]
          : service.type === "BOAT_EXCLUSIVE"
            ? ["Private Bootstour", "Familien", "Kleine Gruppen"]
            : ["Gourmet-Erlebnis mit Chef an Bord", "Private Gruppe", "Ägadische Inseln"]
      : service.type === "CABIN_CHARTER"
        ? ["Private charter", "Multi-day sailing", "Egadi Islands"]
        : service.type === "BOAT_SHARED"
          ? ["Shared boat tour", "Snorkelling", "Egadi Islands"]
          : service.type === "BOAT_EXCLUSIVE"
            ? ["Private boat tour", "Families", "Small groups"]
            : ["Gourmet sailing experience", "Private group", "Egadi Islands"];
  const inLanguage =
    locale === "de"
      ? "de-DE"
      : locale === "fr"
        ? "fr-FR"
        : locale === "es"
          ? "es-ES"
          : locale === "en"
            ? "en-US"
            : "it-IT";
  const meetingPointId = `${pageUrl}#meeting-point`;
  const meetingPointName =
    locale === "es"
      ? "Puerto de Trapani - punto de encuentro Egadisailing"
      : locale === "fr"
        ? "Port de Trapani - point de rencontre Egadisailing"
        : locale === "de"
          ? "Hafen Trapani - Egadisailing Treffpunkt"
          : locale === "en"
            ? "Trapani harbour - Egadisailing meeting point"
            : "Porto di Trapani - punto di incontro Egadisailing";
  const meetingPoint = {
    "@type": "Place",
    "@id": meetingPointId,
    name: meetingPointName,
    address: PUBLIC_CONTACT_POSTAL_ADDRESS,
    geo: PUBLIC_CONTACT_GEO,
    hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
  };
  const areaServed = [
    { "@type": "Place", name: "Trapani" },
    { "@type": "Place", name: "Isole Egadi" },
    { "@type": "Place", name: "Favignana" },
    ...(isHalfDayExperience ? [] : [{ "@type": "Place", name: "Levanzo" }]),
  ];
  const structuredImageUrls =
    showcaseGallery.length > 0
      ? showcaseGallery.map((item) => absoluteUrl(item.src))
      : [absoluteUrl(heroImage)];
  const schemaTopics = experienceDetailSchemaTopics(locale, service);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        inLanguage,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Egadi Sailing",
            item: localizedAbsoluteUrl(siteBase, locale, "/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: t("experience.allExperiences"),
            item: localizedAbsoluteUrl(siteBase, locale, "/experiences"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: content.title,
            item: pageUrl,
          },
        ],
      },
      meetingPoint,
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        inLanguage,
        name: content.seoTitle,
        description: content.seoDescription,
        mainEntity: { "@id": `${pageUrl}#experience` },
        about: [
          { "@id": `${pageUrl}#experience` },
          ...(boatDetailUrl ? [{ "@id": `${boatDetailUrl}#boat` }] : []),
          ...schemaTopics.about.map((name) => ({ "@type": "Thing", name })),
        ],
        keywords: schemaTopics.keywords.join(", "),
      },
      {
        "@type": ["Product", "TouristTrip"],
        "@id": `${pageUrl}#experience`,
        inLanguage,
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
        name: content.seoTitle,
        description: `${content.seoDescription} ${editorial.paragraphs[0]}`,
        duration: schemaDuration,
        touristType: touristTypes,
        areaServed,
        location: { "@id": meetingPointId },
        availableAtOrFrom: { "@id": meetingPointId },
        ...(boatDetailUrl ? { isRelatedTo: { "@id": `${boatDetailUrl}#boat` } } : {}),
        image: structuredImageUrls,
        ...buildServiceProductCodes(service.id),
        itinerary: {
          "@type": "ItemList",
          itemListElement: itinerary.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title ?? item.time,
            description: item.text,
          })),
        },
        provider: {
          "@type": "Organization",
          name: "Egadi Sailing",
          legalName: PUBLIC_COMPANY_LEGAL.name,
          alternateName: "Egadisailing",
          url: siteBase,
          email: PUBLIC_CONTACT_EMAIL,
          telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
          taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
          address: PUBLIC_CONTACT_POSTAL_ADDRESS,
        },
        brand: EGADI_PRODUCT_BRAND,
        offers: {
          "@type": "Offer",
          url: bookingUrl,
          priceCurrency: "EUR",
          ...(displayPrice.amount ? { price: displayPrice.amount.toFixed(2) } : {}),
          availability: "https://schema.org/InStock",
          seller: {
            "@type": "Organization",
            name: PUBLIC_COMPANY_LEGAL.name,
            url: siteBase,
          },
          areaServed,
          availableAtOrFrom: { "@id": meetingPointId },
          shippingDetails: buildDigitalServiceShippingDetails(),
          hasMerchantReturnPolicy: buildServiceReturnPolicy(
            localizedAbsoluteUrl(siteBase, locale, "/terms"),
          ),
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage,
        mainEntity: seoExpansion.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#related-experiences`,
        name:
          locale === "es"
            ? "Experiencias Egadi relacionadas"
            : locale === "fr"
              ? "Expériences Égades liées"
              : locale === "de"
                ? "Verwandte Erlebnisse auf den Ägadischen Inseln"
              : locale === "en"
                ? "Related Egadi experiences"
                : "Esperienze Egadi correlate",
        itemListElement: relatedExperiences.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: localizedAbsoluteUrl(siteBase, locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`),
          name: item.title,
          description: item.seoDescription,
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#related-islands`,
        name: relatedIslandSection.title,
        itemListElement: relatedIslandSection.links.map((island, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteBase}${island.href}`,
          name: island.name,
          description: island.description,
        })),
      },
    ],
  };

  const bookingCardProps = {
    locale,
    serviceId: bookingServiceParam,
    bookingServiceParam,
    charterDurationDays,
    title: copy.bookingTitle,
    text: copy.bookingText,
    priceLabel,
    priceUnit,
    bookNowLabel: copy.bookNow,
    infoItems: bookingInfoItems,
    includedItems: content.includes,
  };
  const directBookingLabel =
    locale === "es"
      ? "Reserva directa Egadisailing"
      : locale === "fr"
        ? "Réservation directe Egadisailing"
        : locale === "de"
          ? "Direktbuchung Egadisailing"
          : locale === "en"
            ? "Direct Egadisailing booking"
            : "Prenotazione diretta Egadisailing";
  const programTitle =
    locale === "es"
      ? "PROGRAMA DEL DÍA"
      : locale === "fr"
        ? "PROGRAMME DE LA JOURNÉE"
        : locale === "de"
          ? "TAGESPROGRAMM"
          : locale === "en"
            ? "DAY PROGRAM"
            : "PROGRAMMA DELLA GIORNATA";
  const programTitleWords = programTitle.split(" ");
  const galleryPreviousLabel =
    locale === "es"
      ? "Fotos anteriores"
      : locale === "fr"
        ? "Photos précédentes"
        : locale === "de"
          ? "Vorherige Fotos"
          : locale === "en"
            ? "Previous photos"
            : "Foto precedenti";
  const galleryNextLabel =
    locale === "es"
      ? "Fotos siguientes"
      : locale === "fr"
        ? "Photos suivantes"
        : locale === "de"
          ? "Weitere Fotos"
          : locale === "en"
            ? "Next photos"
            : "Foto successive";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071934] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <ExperienceDetailFloatingOffset />
      <ExperiencePresenceNotice serviceId={service.id} locale={locale} />

      <main className="bg-[linear-gradient(180deg,#071934_0%,#0a2a4a_38%,#0c3d5e_56%,#0a2a4a_78%,#071934_100%)] pb-32">
        <section className="px-4 pb-0 pt-24 md:px-8 lg:px-12 lg:pt-28">
          <div className="mx-auto max-w-6xl">
            <Link
              href={localizedStaticPath(locale, "/experiences")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-[var(--color-gold)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("experience.allExperiences")}
            </Link>

            <div className="mt-6 text-center">
              <ScrollSection animation="fade-up">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--color-gold)]">
                  {copy.experienceLabel}
                </p>
                <h1 className="mx-auto mt-4 max-w-5xl font-heading text-5xl font-bold leading-[1.08] text-white [text-shadow:0_2px_0_rgba(217,119,6,0.45),0_12px_24px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
                  {content.title}
                </h1>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-white/85">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--color-gold)]" />
                    {directBookingLabel}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--color-gold)]" />
                    <strong>{passengersLabel}</strong> {service.capacityMax} max
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--color-gold)]" />
                    <strong>{t("experience.duration")}</strong> {durationText}
                  </span>
                  {boatContent && (
                    <span className="inline-flex items-center gap-2">
                      <Ship className="h-4 w-4 text-[var(--color-gold)]" />
                      {boatDetailHref ? (
                        <Link
                          href={boatDetailHref}
                          className="underline decoration-white/35 underline-offset-4 transition hover:text-[var(--color-gold)] hover:decoration-[var(--color-gold)]"
                        >
                          {boatContent.title}
                        </Link>
                      ) : (
                        boatContent.title
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-bold text-white">
                  <span className="text-base font-black text-white" aria-label={reviewScoreLabel}>
                    4.9
                  </span>
                  <span className="text-[var(--color-gold)]" aria-hidden="true">
                    ★★★★★
                  </span>
                  <a
                    href={PUBLIC_REVIEW_LINKS.google}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline decoration-white/35 underline-offset-4 transition hover:text-[var(--color-gold)] hover:decoration-[var(--color-gold)]"
                  >
                    Google
                  </a>
                  <span className="text-white/45" aria-hidden="true">
                    /
                  </span>
                  <a
                    href={PUBLIC_REVIEW_LINKS.tripadvisor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline decoration-white/35 underline-offset-4 transition hover:text-[var(--color-gold)] hover:decoration-[var(--color-gold)]"
                  >
                    Tripadvisor
                  </a>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Metodi di pagamento accettati">
                  {PAYMENT_BRANDS.map((brand) => (
                    <PaymentBrandMark key={brand.id} brand={brand} />
                  ))}
                </div>

                <figure className="relative mt-10 overflow-hidden rounded-t-[1.75rem] bg-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
                  <div className="relative aspect-[16/10] sm:aspect-[16/8.7]">
                    <Image
                      src={heroImage}
                      alt={heroImageAlt}
                      fill
                      preload
                      sizes="(max-width: 1024px) 100vw, 860px"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071934]/70 via-[#071934]/15 to-transparent" />
                  </div>
                </figure>
              </ScrollSection>
            </div>
          </div>
        </section>

        <section id="details" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <ScrollSection animation="fade-up">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-[var(--color-gold)]">
                  {experienceIntro.eyebrow}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
                  {experienceIntro.title}
                </h2>
                <div className="mx-auto mt-4 h-1 w-16 bg-[var(--color-gold)]" />
                <p className="mt-5 text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
                  {experienceIntro.intro}
                </p>
              </div>

              <div className="mx-auto mt-9 max-w-4xl space-y-5 text-base leading-8 text-white/78 sm:text-lg sm:leading-9">
                {experienceIntro.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </ScrollSection>
          </div>
        </section>

        <section id="included" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <ScrollSection animation="fade-up">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                    {excursionSnapshot.detailsEyebrow}
                  </p>
                  <h2 className="mt-5 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
                    {excursionSnapshot.detailsTitleStart}{" "}
                    <em className="font-normal italic">
                      {excursionSnapshot.detailsTitleAccent}
                    </em>
                  </h2>
                  <div className="mt-8 h-px w-full bg-white/75" />
                  <ul className="mt-7 space-y-4">
                    {excursionSnapshot.detailItems.map((item) => (
                      <li key={item} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 text-base leading-7 text-white">
                        <Check className="mt-1 h-4 w-4 text-[var(--color-gold)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                    {excursionSnapshot.includesEyebrow}
                  </p>
                  <h2 className="mt-5 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
                    {excursionSnapshot.includesTitleStart}{" "}
                    <em className="font-normal italic">
                      {excursionSnapshot.includesTitleAccent}
                    </em>
                  </h2>
                  <div className="mt-8 h-px w-full bg-white/75" />
                  <ul className="mt-7 space-y-4">
                    {content.includes.map((item) => (
                      <li key={item} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 text-base leading-7 text-white">
                        <Check className="mt-1 h-4 w-4 text-[var(--color-gold)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollSection>
          </div>
        </section>

        <ExperienceImageCarousel
          title={copy.galleryTitle}
          items={showcaseGallery}
          previousLabel={galleryPreviousLabel}
          nextLabel={galleryNextLabel}
        />

        <section id="itinerary" className="scroll-mt-28 px-4 py-16 md:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <ScrollSection animation="fade-up">
              <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 sm:gap-8">
                <span className="h-px bg-white/70" aria-hidden="true" />
                <h2 className="text-center font-sans text-4xl font-black uppercase leading-tight text-white sm:text-5xl">
                  {programTitleWords.map((word, index) => (
                    <span key={`${word}-${index}`} className="block">
                      {word}
                    </span>
                  ))}
                </h2>
                <span className="h-px bg-white/70" aria-hidden="true" />
              </div>

              <div className="mx-auto mt-8 max-w-5xl space-y-5 text-base leading-8 text-white sm:text-lg sm:leading-9">
                {dayProgram.paragraphs.map((paragraph) => (
                  <p key={paragraph.lead}>
                    <strong>{paragraph.lead}</strong>{" "}
                    <span className="text-white/90">{paragraph.text}</span>
                  </p>
                ))}
              </div>
            </ScrollSection>
          </div>
        </section>

        {gourmetMenus.length > 0 && (
          <section id="sample-menus" className="scroll-mt-28 px-4 py-12 md:px-8 lg:px-12">
            <div className="mx-auto max-w-6xl">
              <ScrollSection animation="fade-up">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                    {gourmetMenuCopy.eyebrow}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                    {gourmetMenuCopy.title}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                    {gourmetMenuCopy.intro}
                  </p>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-3">
                  {gourmetMenus.map((menu, index) => (
                    <article
                      key={menu.title}
                      className="flex h-full flex-col border-t border-white/15 pt-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                            {`Menu ${index + 1}`}
                          </p>
                          <h3 className="mt-2 font-heading text-xl font-bold text-white">
                            {menu.title}
                          </h3>
                        </div>
                        {menu.badge ? (
                          <span className="shrink-0 text-right text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                            {menu.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/70">
                        {menu.subtitle}
                      </p>
                      <ul className="mt-5 space-y-3">
                        {menu.items.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/75">
                            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                              <Check className="h-3.5 w-3.5 text-[var(--color-turquoise)]" />
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>

                <p className="mt-7 border-l-2 border-[var(--color-gold)] pl-4 text-sm leading-6 text-white/70">
                  {gourmetMenuCopy.seasonalNote}
                </p>
              </ScrollSection>
            </div>
          </section>
        )}

        <section id="faq" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <ScrollSection animation="fade-up">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {locale === "es"
                    ? "Preguntas frecuentes"
                    : locale === "fr"
                      ? "Questions fréquentes"
                      : locale === "de"
                        ? "Häufige Fragen"
                        : locale === "en"
                          ? "FAQ"
                          : "Domande frequenti"}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
                  {seoExpansion.faqTitle}
                </h2>
              </div>

              <div className="mx-auto mt-8 max-w-4xl divide-y divide-white/15 border-y border-white/15 sm:mt-10">
                {seoExpansion.faqs.map((faq, index) => (
                  <details key={faq.question} className="group py-5 sm:py-6" open={index === 0}>
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-start gap-5 text-left text-base font-semibold leading-7 text-white sm:text-lg">
                      <span>{faq.question}</span>
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-xl leading-none text-[var(--color-gold)] transition group-open:rotate-45 group-hover:border-[var(--color-gold)]">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </ScrollSection>
          </div>
        </section>

        {relatedExperiences.length > 0 && (
          <ScrollSection animation="fade-up" className="px-4 py-14 md:px-8 lg:px-12">
            <section id="related-experiences" className="scroll-mt-28">
              <div className="mx-auto max-w-6xl">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                    {locale === "es"
                      ? "Más ideas"
                      : locale === "fr"
                        ? "Autres idées"
                        : locale === "de"
                          ? "Weitere Ideen"
                          : locale === "en"
                            ? "More ideas"
                            : "Altre idee"}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                    {locale === "es"
                      ? "También puedes ver estas experiencias"
                      : locale === "fr"
                        ? "Vous pouvez aussi voir ces expériences"
                        : locale === "de"
                          ? "Diese Erlebnisse könnten auch passen"
                          : locale === "en"
                            ? "You may also want to view these experiences"
                            : "Prova a visionare anche queste esperienze"}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                    {locale === "es"
                      ? "Compara formatos, barcos y horarios antes de elegir la mejor forma de vivir las Islas Egadi."
                      : locale === "fr"
                        ? "Comparez formats, bateaux et horaires avant de choisir la meilleure façon de vivre les îles Égades."
                        : locale === "de"
                          ? "Vergleichen Sie Formate, Boote und Zeiten, bevor Sie die passende Art wählen, die Ägadischen Inseln zu erleben."
                          : locale === "en"
                            ? "Compare formats, boats and timings before choosing the right way to experience the Egadi Islands."
                            : "Confronta formule, barche e durata prima di scegliere il modo giusto per vivere le Isole Egadi."}
                  </p>
                </div>
                <div className="mt-9 grid gap-8 md:grid-cols-3">
                  {relatedExperiences.map((item) => {
                    const relatedImage = item.media.find((media) => media.src) ?? item.media[0];
                    return (
                      <Link
                        key={item.serviceId}
                        href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`)}
                        className="group block border-t border-white/15 pt-5 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-4 focus:ring-offset-[#071934]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-white/10">
                          {relatedImage?.src && (
                            <Image
                              src={relatedImage.src}
                              alt={relatedImage.alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover transition duration-500 group-hover:scale-[1.025]"
                            />
                          )}
                        </div>
                        <div className="mt-4">
                          <h3 className="font-heading text-xl font-bold text-white transition group-hover:text-[var(--color-gold)]">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {item.subtitle}
                          </p>
                          <span className="mt-4 inline-flex text-sm font-bold text-[var(--color-gold)]">
                            {locale === "es"
                              ? "Ver experiencia"
                              : locale === "fr"
                                ? "Voir l'expérience"
                                : locale === "de"
                                  ? "Erlebnis ansehen"
                                  : locale === "en"
                                    ? "View experience"
                                    : "Vedi esperienza"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          </ScrollSection>
        )}

        {relatedIslandSection.links.length > 0 && (
          <ScrollSection animation="fade-up" className="px-4 py-14 md:px-8 lg:px-12">
            <section id="related-islands" className="scroll-mt-28">
              <div className="mx-auto max-w-6xl border-y border-white/12 py-9">
                <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                      <Compass className="h-4 w-4" aria-hidden="true" />
                      {relatedIslandSection.eyebrow}
                    </p>
                    <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                      {relatedIslandSection.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                      {relatedIslandSection.intro}
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedIslandSection.links.map((island) => (
                      <Link
                        key={island.slug}
                        href={island.href}
                        className="group border-t border-white/15 pt-4 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-4 focus:ring-offset-[#071934]"
                      >
                        <h3 className="font-heading text-xl font-bold text-white transition group-hover:text-[var(--color-gold)]">
                          {island.name}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/65">
                          {island.description}
                        </p>
                        <span className="mt-4 inline-flex text-sm font-bold text-[var(--color-gold)]">
                          {relatedIslandSection.ctaLabel}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </ScrollSection>
        )}

        <ScrollSection animation="fade-up">
          <section className="px-4 py-14 md:px-8 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <div>
                <Anchor className="mx-auto h-8 w-8 text-[var(--color-gold)]" />
                <h2 className="mt-4 font-heading text-3xl font-bold text-white">
                  {t("experience.bookNow")}
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/70">
                  {content.subtitle}
                </p>
              </div>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <ExperienceBookingDialogButton
                  {...bookingCardProps}
                  label={copy.bookNow}
                  showIcon={false}
                  className="!bg-[var(--color-gold)] px-10 py-6 text-base font-semibold !text-[#071934] hover:!bg-[#f2b84b] hover:!text-[#071934]"
                />
                <Link
                  href={recoveryHref}
                  className="inline-flex items-center justify-center border border-white/70 px-8 py-3 text-sm font-semibold text-white transition hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[#071934]"
                >
                  {recoveryLabel}
                </Link>
              </div>
            </div>
          </section>
        </ScrollSection>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[180] border-t border-white/15 bg-[#071934]/95 shadow-[0_-24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="flex shrink-0 gap-2">
            <Link
              href={contactHref}
              className="inline-flex min-h-12 flex-1 items-center justify-center border border-white/45 px-5 text-sm font-bold text-white transition hover:border-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[#071934] sm:flex-none"
            >
              {contactLabel}
            </Link>
            <ExperienceBookingDialogButton
              {...bookingCardProps}
              label={copy.bookNow}
              showIcon={false}
              dialogMode="all"
              className="min-h-12 flex-1 !bg-[var(--color-gold)] px-6 text-sm font-bold !text-[#071934] hover:!bg-[#f2b84b] hover:!text-[#071934] sm:flex-none"
            />
          </div>

          <div className="min-w-0 sm:text-right">
            <p className="truncate font-heading text-sm font-bold text-white sm:text-base">
              {content.title}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/65">
              {priceLabel} · {durationText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
