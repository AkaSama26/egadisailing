import { localize, type LocalizedString } from "./locales";
import { getExperienceContent } from "./experiences";

export type BoatSpecIcon = "cabins" | "beds" | "kitchen" | "bath" | "relax" | "users" | "engine";

export interface BoatCatalogEntry {
  id: string;
  slug: string;
  aliases?: string[];
  externalUrl?: string;
  order: number;
  title: LocalizedString;
  shortTitle: LocalizedString;
  eyebrow: LocalizedString;
  description: LocalizedString;
  seoTitle: LocalizedString;
  seoDescription: LocalizedString;
  imageSrc?: string;
  imageAlt: LocalizedString;
  gallery: Array<{
    src: string;
    alt: LocalizedString;
    caption: LocalizedString;
  }>;
  idealFor: LocalizedString[];
  routes: LocalizedString[];
  serviceIds: string[];
  faqs: Array<{
    question: LocalizedString;
    answer: LocalizedString;
  }>;
  specs: Array<{
    icon: BoatSpecIcon;
    value: string;
    label: LocalizedString;
  }>;
}

export interface ResolvedBoatContent {
  id: string;
  slug: string;
  externalUrl?: string;
  order: number;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  imageSrc?: string;
  imageAlt: string;
  gallery: Array<{
    src: string;
    alt: string;
    caption: string;
  }>;
  idealFor: string[];
  routes: string[];
  serviceIds: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  specs: Array<{
    icon: BoatSpecIcon;
    value: string;
    label: string;
  }>;
}

export interface ResolvedBoatsPageContent {
  seoTitle: string;
  seoDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  comparisonTitle: string;
  comparisonText: string;
  chooserTitle: string;
  chooserText: string;
  detailCtaLabel: string;
  experiencesCtaLabel: string;
  availableExperiencesLabel: string;
  fallbackImageNote: string;
}

const BOATS_PAGE_COPY = {
  seoTitle: {
    it: "Barche alle Egadi da Trapani",
    en: "Boats in the Egadi from Trapani",
  },
  seoDescription: {
    it: "Scopri le barche Egadisailing per tour alle Egadi da Trapani: Neel 43 con chef e charter, Ciagal & Bertinetti 34 Offshore Open per tour privati o condivisi.",
    en: "Discover Egadisailing boats for Egadi tours from Trapani: Neel 43 with chef and charter, Ciagal & Bertinetti 34 Offshore Open for private or shared tours.",
  },
  eyebrow: {
    it: "Flotta Egadisailing",
    en: "Egadisailing fleet",
  },
  title: {
    it: "Le nostre barche per scoprire le Egadi da Trapani",
    en: "Our boats to discover the Egadi from Trapani",
  },
  subtitle: {
    it: "Dal Neel 43 con chef a bordo alla Ciagal & Bertinetti 34 Offshore Open per tour privati o condivisi: scegli il ritmo giusto per Favignana, Levanzo e Marettimo.",
    en: "From the Neel 43 with chef on board to the Ciagal & Bertinetti 34 Offshore Open for private or shared tours: choose the right pace for Favignana, Levanzo and Marettimo.",
  },
  comparisonTitle: {
    it: "Due barche, due modi di vivere il mare",
    en: "Two boats, two ways to live the sea",
  },
  comparisonText: {
    it: "Il Neel 43 e' pensato per comfort, chef e charter. La Ciagal & Bertinetti 34 Offshore Open e' la scelta agile per tour in giornata, privati o condivisi.",
    en: "The Neel 43 is designed for comfort, chef experiences and charter. The Ciagal & Bertinetti 34 Offshore Open is the agile choice for day tours, private or shared.",
  },
  chooserTitle: {
    it: "Quale barca scegliere?",
    en: "Which boat should you choose?",
  },
  chooserText: {
    it: "Se cerchi spazio, tavola e privacy scegli il Neel 43. Se vuoi una rotta snella tra le baie, scegli la Ciagal & Bertinetti 34 Offshore Open per tour da 4 o 8 ore.",
    en: "If you want space, food and privacy, choose the Neel 43. If you want an agile route between bays, choose the Ciagal & Bertinetti 34 Offshore Open for 4 or 8-hour tours.",
  },
  detailCtaLabel: {
    it: "Scopri la barca",
    en: "Discover the boat",
  },
  experiencesCtaLabel: {
    it: "Vedi esperienze",
    en: "View experiences",
  },
  availableExperiencesLabel: {
    it: "Esperienze disponibili",
    en: "Available experiences",
  },
  fallbackImageNote: {
    it: "Foto completa in arrivo",
    en: "Full photo coming soon",
  },
} as const satisfies Record<string, LocalizedString>;

export const BOAT_CATALOG = {
  trimarano: {
    id: "trimarano",
    slug: "neel-43",
    aliases: ["trimarano-egadisailing"],
    externalUrl: "https://www.neel-trimarans.com/range/neel-43/",
    order: 10,
    title: {
      it: "Neel 43",
      en: "Neel 43",
    },
    shortTitle: {
      it: "Neel 43",
      en: "Neel 43",
    },
    eyebrow: {
      it: "Comfort, chef e charter",
      en: "Comfort, chef and charter",
    },
    description: {
      it: "Il trimarano e' la barca per le esperienze piu complete alle Egadi: spazi ampi, cabine, cucina e comfort per giornate private, chef a bordo e charter di piu giorni.",
      en: "The trimaran is the boat for the most complete Egadi experiences: wide spaces, cabins, galley and comfort for private days, chef on board and multi-day charter.",
    },
    seoTitle: {
      it: "Neel 43 alle Egadi con chef a bordo",
      en: "Neel 43 in the Egadi with chef on board",
    },
    seoDescription: {
      it: "Scopri il Neel 43 Egadisailing da Trapani: esperienze gourmet, charter alle Egadi, cabine, cucina e comfort per gruppi privati.",
      en: "Discover the Egadisailing Neel 43 from Trapani: gourmet experiences, Egadi charter, cabins, galley and comfort for private groups.",
    },
    imageSrc: "/images/boats/neel-43/neel-43-hero.webp",
    imageAlt: {
      it: "Neel 43 Egadisailing",
      en: "Egadisailing Neel 43",
    },
    gallery: [
      {
        src: "/images/boats/neel-43/neel-43-hero.webp",
        alt: {
          it: "Neel 43 Egadisailing in navigazione",
          en: "Egadisailing Neel 43 sailing",
        },
        caption: { it: "Neel 43 Egadisailing", en: "Egadisailing Neel 43" },
      },
      {
        src: "/images/experience-polaroids/chef-a-bordo-cucina.webp",
        alt: {
          it: "Chef a bordo del Neel 43 Egadisailing",
          en: "Chef on board the Egadisailing Neel 43",
        },
        caption: { it: "Chef a bordo", en: "Chef on board" },
      },
      {
        src: "/images/experience-polaroids/charter-rada-tranquilla.webp",
        alt: {
          it: "Rada tranquilla durante un charter alle Egadi",
          en: "Quiet anchorage during an Egadi charter",
        },
        caption: { it: "Charter e rada", en: "Charter and anchorage" },
      },
    ],
    idealFor: [
      { it: "Giornate private con chef a bordo", en: "Private days with chef on board" },
      { it: "Charter alle Egadi di piu giorni", en: "Multi-day Egadi charter" },
      {
        it: "Gruppi che vogliono spazio, comfort e privacy",
        en: "Groups looking for space, comfort and privacy",
      },
    ],
    routes: [
      {
        it: "Favignana e Levanzo in giornata, con soste scelte in base al mare",
        en: "Favignana and Levanzo in one day, with stops chosen around the sea",
      },
      {
        it: "Marettimo e rade riparate nei programmi charter",
        en: "Marettimo and sheltered anchorages on charter programs",
      },
      {
        it: "Partenza da Trapani e rotta flessibile con skipper",
        en: "Departure from Trapani and flexible route with skipper",
      },
    ],
    serviceIds: ["exclusive-experience", "cabin-charter"],
    faqs: [
      {
        question: {
          it: "Il trimarano e' adatto a un'esperienza con chef?",
          en: "Is the trimaran suitable for an experience with chef?",
        },
        answer: {
          it: "Si. Il trimarano ha spazi, cucina e comfort pensati per l'esperienza gourmet con chef a bordo.",
          en: "Yes. The trimaran has space, galley and comfort designed for the gourmet experience with chef on board.",
        },
      },
      {
        question: {
          it: "Si puo prenotare il trimarano per piu giorni?",
          en: "Can the trimaran be booked for several days?",
        },
        answer: {
          it: "Si, il trimarano e' la barca dedicata al charter alle Egadi con programma di piu giorni.",
          en: "Yes, the trimaran is the boat dedicated to Egadi charter with a multi-day program.",
        },
      },
    ],
    specs: [
      { icon: "cabins", value: "3", label: { it: "Cabine", en: "Cabins" } },
      { icon: "beds", value: "6", label: { it: "Posti letto", en: "Berths" } },
      { icon: "kitchen", value: "1", label: { it: "Cucina", en: "Galley" } },
      { icon: "bath", value: "1", label: { it: "Bagno", en: "Bathroom" } },
      { icon: "relax", value: "1", label: { it: "Area relax", en: "Relax area" } },
    ],
  },
  boat: {
    id: "boat",
    slug: "ciagal-bertinetti-34-offshore-open",
    aliases: ["barca-egadisailing"],
    order: 20,
    title: {
      it: "Ciagal & Bertinetti 34 Offshore Open",
      en: "Ciagal & Bertinetti 34 Offshore Open",
    },
    shortTitle: {
      it: "Ciagal & Bertinetti 34",
      en: "Ciagal & Bertinetti 34",
    },
    eyebrow: {
      it: "Tour privati e condivisi",
      en: "Private and shared tours",
    },
    description: {
      it: "La Ciagal & Bertinetti 34 Offshore Open e' pensata per tour alle Egadi da 4 o 8 ore: agile, pratica e perfetta per scegliere tra posti condivisi o barca privata.",
      en: "The Ciagal & Bertinetti 34 Offshore Open is designed for 4 or 8-hour Egadi tours: agile, practical and perfect for choosing between shared seats or a private boat.",
    },
    seoTitle: {
      it: "Ciagal & Bertinetti 34 Offshore Open alle Egadi",
      en: "Ciagal & Bertinetti 34 Offshore Open in the Egadi",
    },
    seoDescription: {
      it: "Scopri la Ciagal & Bertinetti 34 Offshore Open per tour alle Egadi da Trapani: 4 ore o 8 ore, formula condivisa o privata, rotta tra Favignana e Levanzo.",
      en: "Discover the Ciagal & Bertinetti 34 Offshore Open for Egadi tours from Trapani: 4 or 8 hours, shared or private, route between Favignana and Levanzo.",
    },
    imageSrc: "/images/boats/ciagal-bertinetti-34-offshore-open/ciagal-bertinetti-34-offshore-open-hero.webp",
    imageAlt: {
      it: "Ciagal & Bertinetti 34 Offshore Open durante un tour alle Egadi",
      en: "Ciagal & Bertinetti 34 Offshore Open during an Egadi tour",
    },
    gallery: [
      {
        src: "/images/boats/ciagal-bertinetti-34-offshore-open/ciagal-bertinetti-34-offshore-open-hero.webp",
        alt: {
          it: "Gruppo a bordo della Ciagal & Bertinetti 34 Offshore Open alle Egadi",
          en: "Group on board the Ciagal & Bertinetti 34 Offshore Open in the Egadi",
        },
        caption: { it: "Tour 8 ore", en: "8-hour tour" },
      },
      {
        src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
        alt: {
          it: "Barca in tour tra le baie delle Egadi",
          en: "Boat touring the Egadi bays",
        },
        caption: { it: "Tour 4 ore", en: "4-hour tour" },
      },
      {
        src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
        alt: {
          it: "Tuffo durante un tour in barca alle Egadi",
          en: "Dive during an Egadi boat tour",
        },
        caption: { it: "Bagni e snorkeling", en: "Swimming and snorkelling" },
      },
    ],
    idealFor: [
      { it: "Tour condivisi alle Egadi da 4 o 8 ore", en: "Shared 4 or 8-hour Egadi tours" },
      { it: "Gruppi che vogliono la barca privata", en: "Groups who want a private boat" },
      { it: "Giornate agili tra Favignana e Levanzo", en: "Agile days between Favignana and Levanzo" },
    ],
    routes: [
      {
        it: "Mezza giornata mattina o pomeriggio con soste bagno mirate",
        en: "Morning or afternoon half day with focused swim stops",
      },
      {
        it: "Giornata intera tra baie, snorkeling e tempi piu rilassati",
        en: "Full day among bays, snorkelling and more relaxed timing",
      },
      {
        it: "Partenza da Trapani con rotta adattata a vento e mare",
        en: "Departure from Trapani with route adapted to wind and sea",
      },
    ],
    serviceIds: [
      "boat-shared-afternoon",
      "boat-exclusive-afternoon",
      "boat-shared-full-day",
      "boat-exclusive-full-day",
      "boat-shared-morning",
      "boat-exclusive-morning",
    ],
    faqs: [
      {
        question: {
          it: "La barca si puo prenotare in esclusiva?",
          en: "Can the boat be booked privately?",
        },
        answer: {
          it: "Si. Puoi scegliere i tour privati da 4 o 8 ore se vuoi la barca riservata al tuo gruppo.",
          en: "Yes. You can choose private 4 or 8-hour tours if you want the boat reserved for your group.",
        },
      },
      {
        question: {
          it: "La stessa barca fa anche tour condivisi?",
          en: "Does the same boat also run shared tours?",
        },
        answer: {
          it: "Si. I tour condivisi permettono di prenotare singoli posti e dividere la giornata con altri ospiti.",
          en: "Yes. Shared tours let you book individual seats and share the day with other guests.",
        },
      },
    ],
    specs: [
      { icon: "users", value: "12", label: { it: "Posti", en: "Seats" } },
      { icon: "engine", value: "800", label: { it: "HP", en: "HP" } },
    ],
  },
} as const satisfies Record<string, BoatCatalogEntry>;

export function getBoatCatalogEntry(boatId: string): BoatCatalogEntry | null {
  return boatId in BOAT_CATALOG ? BOAT_CATALOG[boatId as keyof typeof BOAT_CATALOG] : null;
}

export function getBoatContent(boatId: string, locale?: string | null): ResolvedBoatContent | null {
  const entry = getBoatCatalogEntry(boatId);
  if (!entry) return null;
  return {
    id: entry.id,
    slug: entry.slug,
    externalUrl: entry.externalUrl,
    order: entry.order,
    title: localize(entry.title, locale),
    shortTitle: localize(entry.shortTitle, locale),
    eyebrow: localize(entry.eyebrow, locale),
    description: localize(entry.description, locale),
    seoTitle: localize(entry.seoTitle, locale),
    seoDescription: localize(entry.seoDescription, locale),
    imageSrc: entry.imageSrc,
    imageAlt: localize(entry.imageAlt, locale),
    gallery: entry.gallery.map((item) => ({
      src: item.src,
      alt: localize(item.alt, locale),
      caption: localize(item.caption, locale),
    })),
    idealFor: entry.idealFor.map((item) => localize(item, locale)),
    routes: entry.routes.map((item) => localize(item, locale)),
    serviceIds: [...entry.serviceIds],
    faqs: entry.faqs.map((item) => ({
      question: localize(item.question, locale),
      answer: localize(item.answer, locale),
    })),
    specs: entry.specs.map((spec) => ({
      icon: spec.icon,
      value: spec.value,
      label: localize(spec.label, locale),
    })),
  };
}

export function getPublicBoatIds(): string[] {
  return Object.values(BOAT_CATALOG)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.id);
}

export function getPublicBoatSlugs(): string[] {
  return Object.values(BOAT_CATALOG)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.slug);
}

export function getBoatPublicSlug(boatId: string): string {
  return getBoatCatalogEntry(boatId)?.slug ?? boatId;
}

export function resolveBoatIdFromSlug(slug: string): string {
  const match = Object.values(BOAT_CATALOG).find(
    (entry) =>
      entry.slug === slug ||
      entry.id === slug ||
      ("aliases" in entry && (entry.aliases as readonly string[]).includes(slug)),
  );
  return match?.id ?? slug;
}

export function getPublicBoatServiceTitle(serviceId: string, locale?: string | null): string {
  return getExperienceContent(serviceId, locale)?.title ?? serviceId;
}

export function getBoatsPageContent(locale?: string | null): ResolvedBoatsPageContent {
  return {
    seoTitle: localize(BOATS_PAGE_COPY.seoTitle, locale),
    seoDescription: localize(BOATS_PAGE_COPY.seoDescription, locale),
    eyebrow: localize(BOATS_PAGE_COPY.eyebrow, locale),
    title: localize(BOATS_PAGE_COPY.title, locale),
    subtitle: localize(BOATS_PAGE_COPY.subtitle, locale),
    comparisonTitle: localize(BOATS_PAGE_COPY.comparisonTitle, locale),
    comparisonText: localize(BOATS_PAGE_COPY.comparisonText, locale),
    chooserTitle: localize(BOATS_PAGE_COPY.chooserTitle, locale),
    chooserText: localize(BOATS_PAGE_COPY.chooserText, locale),
    detailCtaLabel: localize(BOATS_PAGE_COPY.detailCtaLabel, locale),
    experiencesCtaLabel: localize(BOATS_PAGE_COPY.experiencesCtaLabel, locale),
    availableExperiencesLabel: localize(BOATS_PAGE_COPY.availableExperiencesLabel, locale),
    fallbackImageNote: localize(BOATS_PAGE_COPY.fallbackImageNote, locale),
  };
}
