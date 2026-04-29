import { localize, type LocalizedString } from "./locales";
import { getExperienceContent } from "./experiences";

export type BoatSpecIcon = "cabins" | "beds" | "kitchen" | "bath" | "users" | "engine";

export interface BoatCatalogEntry {
  id: string;
  order: number;
  title: LocalizedString;
  description: LocalizedString;
  imageSrc?: string;
  imageAlt: LocalizedString;
  specs: Array<{
    icon: BoatSpecIcon;
    value: string;
    label: LocalizedString;
  }>;
}

export interface ResolvedBoatContent {
  id: string;
  order: number;
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt: string;
  specs: Array<{
    icon: BoatSpecIcon;
    value: string;
    label: string;
  }>;
}

export interface ResolvedBoatsPageContent {
  seoTitle: string;
  seoDescription: string;
  title: string;
  subtitle: string;
  availableExperiencesLabel: string;
  fallbackImageNote: string;
}

const BOATS_PAGE_COPY = {
  seoTitle: {
    it: "Le nostre barche",
    en: "Our boats",
  },
  seoDescription: {
    it: "Trimarano con chef e barca per tour condivisi o privati alle Isole Egadi da Trapani.",
    en: "Trimaran with chef and boat for shared or private tours in the Egadi Islands from Trapani.",
  },
  title: {
    it: "Le Isole Egadi meritano la barca giusta",
    en: "The Egadi Islands deserve the right boat",
  },
  subtitle: {
    it: "Trimarano per esperienze complete e barca per tour agili: il contenuto pubblico vive nel codice, il DB decide solo cosa e' prenotabile.",
    en: "A trimaran for complete experiences and a boat for agile tours: public content lives in code, the database only decides what can be booked.",
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
    order: 10,
    title: {
      it: "Trimarano Egadisailing",
      en: "Egadisailing Trimaran",
    },
    description: {
      it: "Il trimarano e' la base delle esperienze piu complete: spazi ampi, cabine, cucina e comfort per giornate private o charter di piu giorni.",
      en: "The trimaran is the base for the most complete experiences: wide spaces, cabins, galley and comfort for private days or multi-day charters.",
    },
    imageSrc: "/images/trimarano.webp",
    imageAlt: {
      it: "Trimarano Egadisailing",
      en: "Egadisailing trimaran",
    },
    specs: [
      { icon: "cabins", value: "3", label: { it: "Cabine", en: "Cabins" } },
      { icon: "beds", value: "10", label: { it: "Posti letto", en: "Berths" } },
      { icon: "kitchen", value: "1", label: { it: "Cucina", en: "Galley" } },
      { icon: "bath", value: "1", label: { it: "Bagno", en: "Bathroom" } },
    ],
  },
  boat: {
    id: "boat",
    order: 20,
    title: {
      it: "Barca Egadisailing",
      en: "Egadisailing Boat",
    },
    description: {
      it: "La barca per tour condivisi o privati: veloce, pratica e ideale per mezze giornate o giornate intere tra le baie delle Egadi.",
      en: "The boat for shared or private tours: fast, practical and ideal for half days or full days among the Egadi bays.",
    },
    imageAlt: {
      it: "Sagoma barca Egadisailing",
      en: "Egadisailing boat silhouette",
    },
    specs: [
      { icon: "users", value: "12", label: { it: "Posti", en: "Seats" } },
      { icon: "engine", value: "200", label: { it: "HP", en: "HP" } },
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
    order: entry.order,
    title: localize(entry.title, locale),
    description: localize(entry.description, locale),
    imageSrc: entry.imageSrc,
    imageAlt: localize(entry.imageAlt, locale),
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

export function getPublicBoatServiceTitle(serviceId: string, locale?: string | null): string {
  return getExperienceContent(serviceId, locale)?.title ?? serviceId;
}

export function getBoatsPageContent(locale?: string | null): ResolvedBoatsPageContent {
  return {
    seoTitle: localize(BOATS_PAGE_COPY.seoTitle, locale),
    seoDescription: localize(BOATS_PAGE_COPY.seoDescription, locale),
    title: localize(BOATS_PAGE_COPY.title, locale),
    subtitle: localize(BOATS_PAGE_COPY.subtitle, locale),
    availableExperiencesLabel: localize(BOATS_PAGE_COPY.availableExperiencesLabel, locale),
    fallbackImageNote: localize(BOATS_PAGE_COPY.fallbackImageNote, locale),
  };
}
