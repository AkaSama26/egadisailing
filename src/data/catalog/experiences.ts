import { localize, type LocalizedString } from "./locales";

export interface ExperienceCatalogMedia {
  caption: LocalizedString;
  color: string;
  src?: string;
}

export interface ExperienceCatalogEntry {
  serviceId: string;
  order: number;
  listed: boolean;
  title: LocalizedString;
  subtitle: LocalizedString;
  detailDescription: LocalizedString;
  seoTitle: LocalizedString;
  seoDescription: LocalizedString;
  media: ExperienceCatalogMedia[];
  itinerary: Array<{ time: string; text: LocalizedString }>;
  includes: LocalizedString[];
  bringItems: LocalizedString[];
}

export interface ResolvedExperienceContent {
  serviceId: string;
  order: number;
  listed: boolean;
  title: string;
  subtitle: string;
  detailDescription: string;
  seoTitle: string;
  seoDescription: string;
  media: Array<{ caption: string; color: string; src?: string }>;
  itinerary: Array<{ time: string; text: string }>;
  includes: string[];
  bringItems: string[];
}

const defaultItinerary = [
  {
    time: "09:00",
    text: {
      it: "Partenza dal Porto di Trapani e briefing della crew.",
      en: "Departure from Trapani harbour and crew briefing.",
    },
  },
  {
    time: "10:00",
    text: {
      it: "Prima baia alle Egadi, bagno e snorkeling.",
      en: "First Egadi bay, swimming and snorkelling.",
    },
  },
  {
    time: "12:30",
    text: {
      it: "Pranzo a bordo con prodotti locali.",
      en: "Lunch on board with local produce.",
    },
  },
  {
    time: "14:00",
    text: {
      it: "Navigazione verso una seconda cala, scelta in base al vento.",
      en: "Sail to a second cove, chosen according to the wind.",
    },
  },
  {
    time: "15:30",
    text: {
      it: "Relax, tuffi e tempo libero in rada.",
      en: "Relaxing, swimming and free time at anchor.",
    },
  },
  {
    time: "17:00",
    text: {
      it: "Rientro a Trapani.",
      en: "Return to Trapani.",
    },
  },
];

const defaultIncludes = [
  { it: "Skipper professionista", en: "Professional skipper" },
  { it: "Pranzo o aperitivo secondo il pacchetto", en: "Lunch or aperitif depending on package" },
  { it: "Attrezzatura snorkeling", en: "Snorkelling equipment" },
  { it: "Acqua e soft drink", en: "Water and soft drinks" },
  { it: "Carburante per la rotta prevista", en: "Fuel for the planned route" },
];

const defaultBringItems = [
  { it: "Crema solare", en: "Sunscreen" },
  { it: "Costume da bagno", en: "Swimwear" },
  { it: "Asciugamano personale", en: "Personal towel" },
  { it: "Cappello", en: "Hat" },
  { it: "Occhiali da sole", en: "Sunglasses" },
];

export const EXPERIENCE_CATALOG = {
  "exclusive-experience": {
    serviceId: "exclusive-experience",
    order: 10,
    listed: true,
    title: {
      it: "Esperienza Gourmet",
      en: "Gourmet Experience",
    },
    subtitle: {
      it: "Il trimarano tutto per te, con chef a bordo e rotta costruita sulla giornata migliore alle Egadi.",
      en: "The trimaran reserved for you, with an onboard chef and a route shaped around the best Egadi conditions.",
    },
    detailDescription: {
      it: "Una giornata privata sul trimarano Egadisailing: skipper, hostess e chef coordinano ritmo, tavola e soste bagno. E il pacchetto piu completo per chi vuole vivere le Egadi senza compromessi.",
      en: "A private day on the Egadisailing trimaran: skipper, hostess and chef coordinate the pace, the table and the swim stops. This is the most complete package for experiencing the Egadi without compromise.",
    },
    seoTitle: {
      it: "Esperienza Gourmet in trimarano alle Egadi",
      en: "Gourmet trimaran experience in the Egadi Islands",
    },
    seoDescription: {
      it: "Prenota il trimarano Egadisailing in esclusiva con chef a bordo, skipper e itinerario tra Favignana, Levanzo e Marettimo.",
      en: "Book the Egadisailing trimaran privately with onboard chef, skipper and an itinerary around Favignana, Levanzo and Marettimo.",
    },
    media: [
      {
        caption: { it: "Chef a bordo", en: "Chef on board" },
        color: "#FFB6C1",
        src: "/images/experience-polaroids/chef-a-bordo-cucina.webp",
      },
      {
        caption: { it: "Aperitivo al tramonto", en: "Sunset aperitivo" },
        color: "#FFDAB9",
        src: "/images/experience-polaroids/chef-a-bordo-rada.webp",
      },
      {
        caption: { it: "Sapori locali", en: "Local flavours" },
        color: "#DDA0DD",
        src: "/images/experience-polaroids/chef-a-bordo-dettaglio-piatto.webp",
      },
      { caption: { it: "Solo per voi", en: "Only for you" }, color: "#E1BEE7" },
    ],
    itinerary: defaultItinerary,
    includes: [
      { it: "Trimarano in esclusiva", en: "Private trimaran" },
      { it: "Skipper, hostess e chef", en: "Skipper, hostess and chef" },
      { it: "Pranzo preparato a bordo", en: "Lunch prepared on board" },
      { it: "Attrezzatura snorkeling", en: "Snorkelling equipment" },
      { it: "Acqua, soft drink e carburante rotta", en: "Water, soft drinks and route fuel" },
    ],
    bringItems: defaultBringItems,
  },
  "cabin-charter": {
    serviceId: "cabin-charter",
    order: 20,
    listed: true,
    title: {
      it: "Cabin Charter Egadi",
      en: "Egadi Cabin Charter",
    },
    subtitle: {
      it: "Da 3 a 7 giornate sul trimarano, con le Egadi come casa galleggiante.",
      en: "Three to seven days on the trimaran, with the Egadi as your floating home.",
    },
    detailDescription: {
      it: "Un charter flessibile per dormire a bordo, svegliarsi vicino alle baie e costruire la rotta giorno per giorno. Cambusa esclusa dal pacchetto, hostess extra su richiesta e refill/dispensa organizzabili con la crew.",
      en: "A flexible charter for sleeping on board, waking up near the bays and shaping the route day by day. Provisioning is not included, hostess is available as an extra and pantry refills can be arranged with the crew.",
    },
    seoTitle: {
      it: "Cabin charter alle Egadi in trimarano",
      en: "Egadi cabin charter by trimaran",
    },
    seoDescription: {
      it: "Charter in trimarano alle Isole Egadi da 3 a 7 giornate con skipper e pernottamento a bordo.",
      en: "Trimaran charter in the Egadi Islands for 3 to 7 days with skipper and overnight stay on board.",
    },
    media: [
      {
        caption: { it: "Trimarano Egadi", en: "Egadi trimaran" },
        color: "#ADD8E6",
        src: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      },
      {
        caption: { it: "Vita a bordo", en: "Life on board" },
        color: "#B2DFDB",
        src: "/images/experience-polaroids/charter-cabina-bordo.webp",
      },
      {
        caption: { it: "Rada tranquilla", en: "Quiet anchorage" },
        color: "#C5CAE9",
        src: "/images/experience-polaroids/charter-rada-tranquilla.webp",
      },
      { caption: { it: "Rotta lenta", en: "Slow route" }, color: "#BBDEFB" },
    ],
    itinerary: [
      {
        time: "Day 1",
        text: {
          it: "Imbarco a Trapani, briefing cambusa/dispensa se richiesto e prima navigazione verso Favignana.",
          en: "Boarding in Trapani, provisioning/pantry briefing if requested and first sail towards Favignana.",
        },
      },
      {
        time: "Day 2",
        text: {
          it: "Favignana tra Cala Rossa, Bue Marino e soste bagno riparate.",
          en: "Favignana with Cala Rossa, Bue Marino and sheltered swim stops.",
        },
      },
      {
        time: "Day 3",
        text: {
          it: "Levanzo, rada tranquilla e cena in coperta.",
          en: "Levanzo, a quiet anchorage and dinner on deck.",
        },
      },
      {
        time: "Day 4+",
        text: {
          it: "Estensione verso Marettimo o rientro morbido secondo meteo e durata scelta.",
          en: "Extension towards Marettimo or an easy return depending on weather and chosen duration.",
        },
      },
    ],
    includes: [
      { it: "Trimarano con cabine", en: "Trimaran with cabins" },
      { it: "Skipper", en: "Skipper" },
      { it: "Hostess extra su richiesta", en: "Hostess available as an extra" },
      { it: "Cucina e spazi comuni", en: "Galley and shared spaces" },
      { it: "Cambusa esclusa dal prezzo", en: "Provisioning not included in the price" },
      { it: "Refill e dispensa su richiesta", en: "Refills and pantry service on request" },
      { it: "Attrezzatura snorkeling", en: "Snorkelling equipment" },
      { it: "Pianificazione rotta meteo-dipendente", en: "Weather-aware route planning" },
    ],
    bringItems: [
      { it: "Bagaglio morbido", en: "Soft luggage" },
      { it: "Costumi e cambi leggeri", en: "Swimwear and light clothes" },
      { it: "Felpa per la sera", en: "Sweatshirt for evenings" },
      { it: "Crema solare reef-safe", en: "Reef-safe sunscreen" },
      { it: "Documenti personali", en: "Personal documents" },
    ],
  },
  "boat-shared-full-day": {
    serviceId: "boat-shared-full-day",
    order: 30,
    listed: true,
    title: { it: "Barca condivisa giornata intera", en: "Shared boat full day" },
    subtitle: {
      it: "Un posto a bordo per vivere le Egadi in compagnia, con una giornata completa tra baie e snorkeling.",
      en: "A seat on board to enjoy the Egadi with others, with a full day of bays and snorkelling.",
    },
    detailDescription: {
      it: "La formula piu semplice per salire a bordo: scegli la data, prenota i posti e condividi la giornata con altri ospiti.",
      en: "The easiest way to get on board: choose the date, book your seats and share the day with other guests.",
    },
    seoTitle: { it: "Barca condivisa giornata intera alle Egadi", en: "Shared full-day boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso giornaliero alle Egadi con partenza da Trapani, soste bagno e snorkeling.",
      en: "Shared full-day tour in the Egadi departing from Trapani, with swim stops and snorkelling.",
    },
    media: [
      { caption: { it: "Full day", en: "Full day" }, color: "#A7F3D0" },
      { caption: { it: "Baie chiare", en: "Clear bays" }, color: "#BFDBFE" },
      { caption: { it: "A bordo insieme", en: "Together on board" }, color: "#FDE68A" },
      { caption: { it: "12 posti", en: "12 seats" }, color: "#DDD6FE" },
    ],
    itinerary: defaultItinerary,
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
  "boat-shared-morning": {
    serviceId: "boat-shared-morning",
    order: 40,
    listed: false,
    title: { it: "Barca condivisa mattina", en: "Shared boat morning" },
    subtitle: {
      it: "Mezza giornata condivisa, perfetta per un bagno alle Egadi senza occupare tutta la giornata.",
      en: "A shared half day, perfect for an Egadi swim without using the whole day.",
    },
    detailDescription: {
      it: "Partenza al mattino, ritmo leggero e rientro prima di pranzo o nel primo pomeriggio secondo programma.",
      en: "Morning departure, easy pace and return before lunch or early afternoon depending on schedule.",
    },
    seoTitle: { it: "Barca condivisa mattina alle Egadi", en: "Shared morning boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso di mezza giornata al mattino alle Egadi con partenza da Trapani.",
      en: "Shared morning half-day tour in the Egadi departing from Trapani.",
    },
    media: [
      { caption: { it: "Mattina", en: "Morning" }, color: "#BFDBFE" },
      { caption: { it: "Bagno veloce", en: "Quick swim" }, color: "#A7F3D0" },
      { caption: { it: "Luce chiara", en: "Clear light" }, color: "#FDE68A" },
    ],
    itinerary: defaultItinerary.slice(0, 4),
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
  "boat-shared-afternoon": {
    serviceId: "boat-shared-afternoon",
    order: 50,
    listed: true,
    title: { it: "Barca condivisa pomeriggio", en: "Shared boat afternoon" },
    subtitle: {
      it: "Il mare del pomeriggio, condiviso con pochi ospiti e rientro con luce morbida.",
      en: "The afternoon sea, shared with a small group and returning in softer light.",
    },
    detailDescription: {
      it: "Una mezza giornata pensata per chi preferisce partire con calma e godersi le Egadi nel pomeriggio.",
      en: "A half day for guests who prefer an easy start and an afternoon in the Egadi.",
    },
    seoTitle: { it: "Barca condivisa pomeriggio alle Egadi", en: "Shared afternoon boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso pomeridiano alle Egadi con partenza da Trapani e soste bagno.",
      en: "Shared afternoon tour in the Egadi departing from Trapani with swim stops.",
    },
    media: [
      { caption: { it: "Pomeriggio", en: "Afternoon" }, color: "#FDE68A" },
      { caption: { it: "Rada tranquilla", en: "Quiet anchorage" }, color: "#BFDBFE" },
      { caption: { it: "Luce bassa", en: "Low light" }, color: "#FED7AA" },
    ],
    itinerary: defaultItinerary.slice(1, 5),
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-full-day": {
    serviceId: "boat-exclusive-full-day",
    order: 60,
    listed: true,
    title: { it: "Barca in esclusiva giornata intera", en: "Private boat full day" },
    subtitle: {
      it: "La barca riservata al tuo gruppo per una giornata completa tra le baie piu belle.",
      en: "The boat reserved for your group for a full day among the best bays.",
    },
    detailDescription: {
      it: "Una giornata privata e flessibile, con soste decise insieme allo skipper in base a vento, mare e ritmo del gruppo.",
      en: "A private and flexible day, with stops chosen with the skipper according to wind, sea and group pace.",
    },
    seoTitle: { it: "Barca privata giornata intera alle Egadi", en: "Private full-day boat tour in the Egadi" },
    seoDescription: {
      it: "Prenota una barca privata per una giornata intera alle Egadi con partenza da Trapani.",
      en: "Book a private boat for a full day in the Egadi Islands departing from Trapani.",
    },
    media: [
      { caption: { it: "Uso esclusivo", en: "Private use" }, color: "#FECACA" },
      { caption: { it: "Rotta privata", en: "Private route" }, color: "#BAE6FD" },
      { caption: { it: "Fino a 12", en: "Up to 12" }, color: "#C7D2FE" },
    ],
    itinerary: defaultItinerary,
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-morning": {
    serviceId: "boat-exclusive-morning",
    order: 70,
    listed: false,
    title: { it: "Barca in esclusiva mattina", en: "Private boat morning" },
    subtitle: {
      it: "Mezza giornata privata al mattino per il tuo gruppo.",
      en: "A private morning half day for your group.",
    },
    detailDescription: {
      it: "Una partenza mattutina con barca riservata, ideale per gruppi che vogliono mare e privacy in poche ore.",
      en: "A morning departure with a reserved boat, ideal for groups who want sea and privacy in a few hours.",
    },
    seoTitle: { it: "Barca privata mattina alle Egadi", en: "Private morning boat tour in the Egadi" },
    seoDescription: {
      it: "Mezza giornata privata in barca alle Egadi con partenza da Trapani.",
      en: "Private half-day morning boat tour in the Egadi departing from Trapani.",
    },
    media: [
      { caption: { it: "Mattina privata", en: "Private morning" }, color: "#BAE6FD" },
      { caption: { it: "Prima baia", en: "First bay" }, color: "#FECACA" },
      { caption: { it: "Gruppo piccolo", en: "Small group" }, color: "#C7D2FE" },
    ],
    itinerary: defaultItinerary.slice(0, 4),
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-afternoon": {
    serviceId: "boat-exclusive-afternoon",
    order: 80,
    listed: true,
    title: { it: "Barca in esclusiva pomeriggio", en: "Private boat afternoon" },
    subtitle: {
      it: "Una mezza giornata privata per godersi le Egadi con luce morbida e ritmo rilassato.",
      en: "A private half day to enjoy the Egadi in soft light and at a relaxed pace.",
    },
    detailDescription: {
      it: "Barca riservata al pomeriggio, pensata per gruppi che vogliono privacy, soste bagno e un rientro piu scenografico.",
      en: "A boat reserved for the afternoon, designed for groups who want privacy, swim stops and a more scenic return.",
    },
    seoTitle: { it: "Barca privata pomeriggio alle Egadi", en: "Private afternoon boat tour in the Egadi" },
    seoDescription: {
      it: "Mezza giornata privata in barca alle Egadi nel pomeriggio, con partenza da Trapani.",
      en: "Private afternoon half-day boat tour in the Egadi departing from Trapani.",
    },
    media: [
      { caption: { it: "Pomeriggio privato", en: "Private afternoon" }, color: "#FED7AA" },
      { caption: { it: "Rotta flessibile", en: "Flexible route" }, color: "#BAE6FD" },
      { caption: { it: "Rientro morbido", en: "Soft return" }, color: "#FECACA" },
    ],
    itinerary: defaultItinerary.slice(1, 5),
    includes: defaultIncludes,
    bringItems: defaultBringItems,
  },
} as const satisfies Record<string, ExperienceCatalogEntry>;

export type ExperienceServiceId = keyof typeof EXPERIENCE_CATALOG;

export function isExperienceServiceId(serviceId: string): serviceId is ExperienceServiceId {
  return serviceId in EXPERIENCE_CATALOG;
}

export function getExperienceCatalogEntry(serviceId: string): ExperienceCatalogEntry | null {
  return isExperienceServiceId(serviceId) ? EXPERIENCE_CATALOG[serviceId] : null;
}

export function getExperienceContent(
  serviceId: string,
  locale?: string | null,
): ResolvedExperienceContent | null {
  const entry = getExperienceCatalogEntry(serviceId);
  if (!entry) return null;

  return {
    serviceId: entry.serviceId,
    order: entry.order,
    listed: entry.listed,
    title: localize(entry.title, locale),
    subtitle: localize(entry.subtitle, locale),
    detailDescription: localize(entry.detailDescription, locale),
    seoTitle: localize(entry.seoTitle, locale),
    seoDescription: localize(entry.seoDescription, locale),
    media: entry.media.map((item) => ({
      caption: localize(item.caption, locale),
      color: item.color,
      src: item.src,
    })),
    itinerary: entry.itinerary.map((item) => ({
      time: item.time,
      text: localize(item.text, locale),
    })),
    includes: entry.includes.map((item) => localize(item, locale)),
    bringItems: entry.bringItems.map((item) => localize(item, locale)),
  };
}

export function getExperienceIds(): string[] {
  return Object.keys(EXPERIENCE_CATALOG);
}

export function getListedExperienceIds(): string[] {
  return Object.values(EXPERIENCE_CATALOG)
    .filter((entry) => entry.listed)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.serviceId);
}

export function isExperienceListed(serviceId: string): boolean {
  return getExperienceCatalogEntry(serviceId)?.listed ?? false;
}

export function compareExperienceOrder(aServiceId: string, bServiceId: string): number {
  const a = getExperienceCatalogEntry(aServiceId)?.order ?? Number.MAX_SAFE_INTEGER;
  const b = getExperienceCatalogEntry(bServiceId)?.order ?? Number.MAX_SAFE_INTEGER;
  return a - b;
}
