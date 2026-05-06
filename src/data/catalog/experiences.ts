import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";

import { localize, type LocalizedString } from "./locales";

export interface ExperienceCatalogMedia {
  caption: LocalizedString;
  alt: LocalizedString;
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
  itinerary: Array<{
    time: string | LocalizedString;
    title?: LocalizedString;
    location?: LocalizedString;
    text: LocalizedString;
  }>;
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
  media: Array<{ caption: string; alt: string; color: string; src?: string }>;
  itinerary: Array<{ time: string; title?: string; location?: string; text: string }>;
  includes: string[];
  bringItems: string[];
}

export interface ExperiencePackageVariant {
  label: LocalizedString;
  description: LocalizedString;
  serviceId: string;
  href: string;
}

export interface ExperiencePackageEntry {
  key: string;
  order: number;
  serviceIds: readonly string[];
  title: LocalizedString;
  subtitle: LocalizedString;
  seoTitle: LocalizedString;
  seoDescription: LocalizedString;
  durationLabel: LocalizedString;
  detailLabel: LocalizedString;
  priceUnitLabel: LocalizedString;
  primaryCtaLabel: LocalizedString;
  primaryHref: string;
  media: readonly ExperienceCatalogMedia[];
  variants?: readonly ExperiencePackageVariant[];
}

export interface ResolvedExperiencePackageContent {
  key: string;
  order: number;
  serviceIds: string[];
  title: string;
  subtitle: string;
  seoTitle: string;
  seoDescription: string;
  durationLabel: string;
  detailLabel: string;
  priceUnitLabel: string;
  primaryCtaLabel: string;
  primaryHref: string;
  media: Array<{ caption: string; alt: string; color: string; src?: string }>;
  variants: Array<{ label: string; description: string; serviceId: string; href: string }>;
}

const gourmetItinerary = [
  {
    time: "09:30",
    title: {
      it: "Accoglienza a bordo",
      en: "Welcome on board",
    },
    text: {
      it: "Punto di incontro: Via dei Gladioli 15, 91100 Trapani.",
      en: "Meeting point: Via dei Gladioli 15, 91100 Trapani, Italy.",
    },
  },
  {
    time: "11:30",
    title: {
      it: "Cala Azzurra",
      en: "Cala Azzurra",
    },
    location: {
      it: "Favignana",
      en: "Favignana",
    },
    text: {
      it: "Bagno in acque cristalline. Cala Azzurra, Favignana, Free municipal consortium of Trapani, Italy.",
      en: "Swim in crystal-clear water. Cala Azzurra, Favignana, Free municipal consortium of Trapani, Italy.",
    },
  },
  {
    time: "12:30",
    title: {
      it: "Cala Rossa",
      en: "Cala Rossa",
    },
    location: {
      it: "Favignana",
      en: "Favignana",
    },
    text: {
      it: "Pranzo gourmet in rada. Cala Rossa, Favignana, Free municipal consortium of Trapani, Italy, 91023.",
      en: "Gourmet lunch at anchor. Cala Rossa, Favignana, Free municipal consortium of Trapani, Italy, 91023.",
    },
  },
  {
    time: "13:00",
    title: {
      it: "Show cooking a bordo",
      en: "Show cooking on board",
    },
    text: {
      it: "Lo chef locale prepara il pranzo in rada a Cala Rossa, Favignana.",
      en: "The local chef prepares lunch at anchor in Cala Rossa, Favignana.",
    },
  },
  {
    time: "13:30",
    title: {
      it: "Pranzo vista mare",
      en: "Sea-view lunch",
    },
    text: {
      it: "Pranzo gourmet vista mare a Cala Rossa, Favignana.",
      en: "Gourmet lunch with sea views in Cala Rossa, Favignana.",
    },
  },
  {
    time: "14:30",
    title: {
      it: "Relax a Cala Rossa",
      en: "Relax at Cala Rossa",
    },
    location: {
      it: "Favignana",
      en: "Favignana",
    },
    text: {
      it: "Relax e sosta bagno nelle acque di Cala Rossa, Favignana.",
      en: "Relax and swim stop in the waters of Cala Rossa, Favignana.",
    },
  },
  {
    time: "16:00",
    title: {
      it: "Cala Dogana",
      en: "Cala Dogana",
    },
    location: {
      it: "Levanzo",
      en: "Levanzo",
    },
    text: {
      it: "Sosta a Spiaggia di Cala Dogana, Levanzo, Free municipal consortium of Trapani, Italy, 91023 Levanzo.",
      en: "Stop at Spiaggia di Cala Dogana, Levanzo, Free municipal consortium of Trapani, Italy, 91023 Levanzo.",
    },
  },
  {
    time: "16:30",
    title: {
      it: "Cala Fredda",
      en: "Cala Fredda",
    },
    location: {
      it: "Levanzo",
      en: "Levanzo",
    },
    text: {
      it: "Natura, silenzio e mare turchese. Spiaggia di Cala Fredda, Italy.",
      en: "Nature, silence and turquoise sea. Spiaggia di Cala Fredda, Italy.",
    },
  },
  {
    time: "17:15",
    title: {
      it: "Aperitivo al tramonto",
      en: "Sunset aperitivo",
    },
    text: {
      it: "Durante la navigazione di rientro tra le Isole Egadi.",
      en: "During the return navigation through the Egadi Islands.",
    },
  },
  {
    time: "18:00",
    title: {
      it: "Rientro al porto",
      en: "Return to harbour",
    },
    text: {
      it: "Fine dell'esperienza e rientro a Trapani.",
      en: "End of the experience and return to Trapani.",
    },
  },
];

const fullDayBoatItinerary = [
  {
    time: "10:00",
    title: {
      it: "Partenza da Trapani",
      en: "Departure from Trapani",
    },
    location: {
      it: "Porto di Trapani",
      en: "Trapani harbour",
    },
    text: {
      it: "Imbarco, briefing sicurezza e rotta definita con lo skipper in base a vento e mare.",
      en: "Boarding, safety briefing and route agreed with the skipper according to wind and sea.",
    },
  },
  {
    time: "11:00",
    title: {
      it: "Favignana",
      en: "Favignana",
    },
    location: {
      it: "Cale riparate",
      en: "Sheltered coves",
    },
    text: {
      it: "Prima sosta bagno tra Cala Rossa, Bue Marino, Cala Azzurra o una rada più protetta.",
      en: "First swim stop between Cala Rossa, Bue Marino, Cala Azzurra or a more sheltered anchorage.",
    },
  },
  {
    time: "13:00",
    title: {
      it: "Pausa in rada",
      en: "Anchorage break",
    },
    text: {
      it: "Tempo per relax, snorkeling e pranzo libero o servizio extra organizzato su richiesta.",
      en: "Time to relax, snorkel and enjoy lunch independently or as an extra service on request.",
    },
  },
  {
    time: "15:00",
    title: {
      it: "Levanzo",
      en: "Levanzo",
    },
    location: {
      it: "Cala Dogana o Cala Fredda",
      en: "Cala Dogana or Cala Fredda",
    },
    text: {
      it: "Seconda isola o seconda baia: una sosta più tranquilla, scelta secondo mare e affollamento.",
      en: "Second island or second bay: a quieter stop, chosen according to sea conditions and crowding.",
    },
  },
  {
    time: "17:00",
    title: {
      it: "Navigazione panoramica",
      en: "Scenic navigation",
    },
    text: {
      it: "Ultimo bagno e rientro morbido verso Trapani con vista sulle Egadi.",
      en: "Final swim and an easy return towards Trapani with views of the Egadi.",
    },
  },
  {
    time: "18:00",
    title: {
      it: "Rientro",
      en: "Return",
    },
    location: {
      it: "Trapani",
      en: "Trapani",
    },
    text: {
      it: "Sbarco a Trapani.",
      en: "Disembarkation in Trapani.",
    },
  },
];

const halfDayMorningItinerary = [
  {
    time: "09:00",
    title: {
      it: "Partenza da Trapani",
      en: "Departure from Trapani",
    },
    location: {
      it: "Porto di Trapani",
      en: "Trapani harbour",
    },
    text: {
      it: "Imbarco e briefing rapido con lo skipper per scegliere la rotta più riparata della mattina.",
      en: "Boarding and quick briefing with the skipper to choose the most sheltered morning route.",
    },
  },
  {
    time: "09:45",
    title: {
      it: "Prima cala",
      en: "First cove",
    },
    location: {
      it: "Favignana o Levanzo",
      en: "Favignana or Levanzo",
    },
    text: {
      it: "Bagno e snorkeling nelle acque più limpide raggiungibili in sicurezza in mezza giornata.",
      en: "Swimming and snorkelling in the clearest waters safely reachable in half a day.",
    },
  },
  {
    time: "11:15",
    title: {
      it: "Seconda sosta",
      en: "Second stop",
    },
    location: {
      it: "Isole Egadi",
      en: "Egadi Islands",
    },
    text: {
      it: "Seconda baia o navigazione panoramica, secondo vento, mare e tempi di rientro.",
      en: "Second bay or scenic navigation depending on wind, sea and return timing.",
    },
  },
  {
    time: "13:00",
    title: {
      it: "Rientro",
      en: "Return",
    },
    location: {
      it: "Trapani",
      en: "Trapani",
    },
    text: {
      it: "Rientro e sbarco a Trapani.",
      en: "Return and disembarkation in Trapani.",
    },
  },
];

const halfDayAfternoonItinerary = [
  {
    time: "14:00",
    title: {
      it: "Partenza da Trapani",
      en: "Departure from Trapani",
    },
    location: {
      it: "Porto di Trapani",
      en: "Trapani harbour",
    },
    text: {
      it: "Imbarco e rotta verso la baia migliore del pomeriggio, scelta con lo skipper.",
      en: "Boarding and route towards the best afternoon bay, chosen with the skipper.",
    },
  },
  {
    time: "14:45",
    title: {
      it: "Bagno in rada",
      en: "Anchorage swim",
    },
    location: {
      it: "Favignana o Levanzo",
      en: "Favignana or Levanzo",
    },
    text: {
      it: "Bagno, snorkeling e tempo in rada.",
      en: "Swimming, snorkelling and time at anchor.",
    },
  },
  {
    time: "16:15",
    title: {
      it: "Seconda sosta",
      en: "Second stop",
    },
    location: {
      it: "Isole Egadi",
      en: "Egadi Islands",
    },
    text: {
      it: "Seconda sosta o navigazione lungo costa con luce più morbida.",
      en: "Second stop or coastal navigation in softer light.",
    },
  },
  {
    time: "18:00",
    title: {
      it: "Rientro",
      en: "Return",
    },
    location: {
      it: "Trapani",
      en: "Trapani",
    },
    text: {
      it: "Rientro a Trapani.",
      en: "Return to Trapani.",
    },
  },
];

const defaultIncludes = [
  { it: "Skipper professionista", en: "Professional skipper" },
  { it: "Attrezzatura snorkeling", en: "Snorkelling equipment" },
  { it: "Acqua e soft drink", en: "Water and soft drinks" },
  { it: "Carburante per la rotta prevista", en: "Fuel for the planned route" },
];

const sharedBoatIncludes = [
  { it: "Posto a bordo sul tour condiviso", en: "Seat on the shared tour" },
  ...defaultIncludes,
  { it: "Soste bagno meteo-dipendenti", en: "Weather-aware swim stops" },
];

const privateBoatIncludes = [
  { it: "Barca riservata al tuo gruppo", en: "Boat reserved for your group" },
  ...defaultIncludes,
  { it: "Rotta flessibile con lo skipper", en: "Flexible route with the skipper" },
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
      it: "Una giornata privata sul Trimarano: skipper, hostess e chef coordinano ritmo, tavola e soste bagno. È il pacchetto più completo per chi vuole vivere le Egadi senza compromessi.",
      en: "A private day on the Egadisailing trimaran: skipper, hostess and chef coordinate the pace, the table and the swim stops. This is the most complete package for experiencing the Egadi without compromise.",
    },
    seoTitle: {
      it: "Esperienza Gourmet in trimarano alle Egadi",
      en: "Gourmet trimaran experience in the Egadi Islands",
    },
    seoDescription: {
      it: "Prenota il Trimarano in esclusiva con chef a bordo, skipper e itinerario tra Favignana e Levanzo.",
      en: "Book the Egadisailing trimaran privately with onboard chef, skipper and an itinerary around Favignana and Levanzo.",
    },
    media: [
      {
        caption: { it: "Chef a bordo", en: "Chef on board" },
        alt: {
          it: "Chef che cucina sul Trimarano alle Isole Egadi",
          en: "Chef cooking on the Egadisailing trimaran in the Egadi Islands",
        },
        color: "#FFB6C1",
        src: "/images/experience-polaroids/chef-a-bordo-cucina.webp",
      },
      {
        caption: { it: "Aperitivo al tramonto", en: "Sunset aperitivo" },
        alt: {
          it: "Tavola in rada sul Trimarano con aperitivo al tramonto",
          en: "Table at anchor on the Egadisailing trimaran with sunset aperitivo",
        },
        color: "#FFDAB9",
        src: "/images/experience-polaroids/chef-a-bordo-rada.webp",
      },
      {
        caption: { it: "Sapori locali", en: "Local flavours" },
        alt: {
          it: "Piatto di mare servito a bordo durante l'esperienza gourmet Egadisailing",
          en: "Seafood dish served on board during the Egadisailing gourmet experience",
        },
        color: "#DDA0DD",
        src: "/images/experience-polaroids/chef-a-bordo-dettaglio-piatto.webp",
      },
    ],
    itinerary: gourmetItinerary,
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
      it: "Charter Egadi",
      en: "Egadi Charter",
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
      it: "Charter alle Egadi in trimarano",
      en: "Egadi charter by trimaran",
    },
    seoDescription: {
      it: "Charter in trimarano alle Isole Egadi da 3 a 7 giornate con skipper e pernottamento a bordo.",
      en: "Trimaran charter in the Egadi Islands for 3 to 7 days with skipper and overnight stay on board.",
    },
    media: [
      {
        caption: { it: "Trimarano Egadi", en: "Egadi trimaran" },
        alt: {
          it: "Trimarano in navigazione tra le Isole Egadi",
          en: "Egadisailing trimaran sailing through the Egadi Islands",
        },
        color: "#ADD8E6",
        src: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      },
      {
        caption: { it: "Vita a bordo", en: "Life on board" },
        alt: {
          it: "Dettaglio di bordo durante un charter alle Egadi",
          en: "On-board detail during an Egadi charter",
        },
        color: "#B2DFDB",
        src: "/images/experience-polaroids/charter-cabina-bordo.webp",
      },
      {
        caption: { it: "Rada tranquilla", en: "Quiet anchorage" },
        alt: {
          it: "Trimarano fermo in rada tranquilla durante un charter alle Isole Egadi",
          en: "Trimaran anchored in a quiet bay during an Egadi Islands charter",
        },
        color: "#C5CAE9",
        src: "/images/experience-polaroids/charter-rada-tranquilla.webp",
      },
    ],
    itinerary: [
      {
        time: { it: "Giorno 1", en: "Day 1" },
        text: {
          it: "Imbarco a Trapani, briefing cambusa e sicurezza, prima rada tra Favignana e Levanzo.",
          en: "Boarding in Trapani, provisioning and safety briefing, first anchorage between Favignana and Levanzo.",
        },
      },
      {
        time: { it: "Giorno 2", en: "Day 2" },
        text: {
          it: "Favignana: Cala Rossa, Bue Marino e soste bagno scelte secondo meteo e affollamento.",
          en: "Favignana: Cala Rossa, Bue Marino and swim stops chosen according to weather and crowding.",
        },
      },
      {
        time: { it: "Giorno 3", en: "Day 3" },
        text: {
          it: "Levanzo, rada tranquilla e rientro morbido a Trapani se scegli il charter da 3 giornate.",
          en: "Levanzo, a quiet anchorage and an easy return to Trapani if you choose the 3-day charter.",
        },
      },
      {
        time: { it: "Giorni 4-7", en: "Days 4-7" },
        text: {
          it: "Estensione verso Marettimo, notti in rada e rotta modulata giorno per giorno con la crew.",
          en: "Extension towards Marettimo, nights at anchor and a route shaped day by day with the crew.",
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
    title: { it: "Tour in barca Egadi 8 ore condiviso", en: "Shared 8-hour Egadi boat tour" },
    subtitle: {
      it: "Un posto a bordo per una giornata completa tra baie, snorkeling e tempo lento alle Egadi.",
      en: "A seat on board for a full day of bays, snorkelling and slow time in the Egadi.",
    },
    detailDescription: {
      it: "La formula più semplice per vivere un tour in barca alle Isole Egadi da Trapani: scegli la data, prenota i posti e condividi la giornata con altri ospiti.",
      en: "The easiest way to enjoy a boat tour in the Egadi Islands from Trapani: choose the date, book your seats and share the day with other guests.",
    },
    seoTitle: { it: "Tour in barca Egadi 8 ore condiviso", en: "Shared 8-hour boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso in barca alle Egadi di 8 ore da Trapani con soste bagno, snorkeling e posti prenotabili online.",
      en: "Shared 8-hour boat tour in the Egadi from Trapani with swim stops, snorkelling and online booking.",
    },
    media: [
      {
        caption: { it: "Giornata intera", en: "Full day" },
        alt: {
          it: "Gruppo a bordo durante un tour in barca di 8 ore alle Isole Egadi",
          en: "Group on board during an 8-hour boat tour in the Egadi Islands",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      },
      {
        caption: { it: "Snorkeling", en: "Snorkelling" },
        alt: {
          it: "Snorkeling in acqua limpida durante il tour in barca alle Egadi",
          en: "Snorkelling in clear water during the Egadi boat tour",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      },
      {
        caption: { it: "Rientro dorato", en: "Golden return" },
        alt: {
          it: "Rientro in barca con luce dorata dopo una giornata alle Isole Egadi",
          en: "Boat return in golden light after a day in the Egadi Islands",
        },
        color: "#FED7AA",
        src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
      },
    ],
    itinerary: fullDayBoatItinerary,
    includes: sharedBoatIncludes,
    bringItems: defaultBringItems,
  },
  "boat-shared-morning": {
    serviceId: "boat-shared-morning",
    order: 40,
    listed: false,
    title: { it: "Tour in barca Egadi 4 ore mattina condiviso", en: "Shared 4-hour morning Egadi boat tour" },
    subtitle: {
      it: "La partenza del mattino per vivere le Egadi in mezza giornata condivisa, con soste bagno e rientro alle 13:00.",
      en: "The morning departure for a shared half day in the Egadi, with swim stops and return at 13:00.",
    },
    detailDescription: {
      it: "Tour condiviso di 4 ore alle Isole Egadi da Trapani: partenza al mattino, rotta compatta e tempo per bagno, snorkeling e navigazione panoramica.",
      en: "A shared 4-hour tour in the Egadi Islands from Trapani: morning departure, compact route and time for swimming, snorkelling and scenic navigation.",
    },
    seoTitle: { it: "Tour condiviso in barca alle Egadi 4 ore mattina", en: "Shared 4-hour morning boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso in barca alle Egadi di 4 ore al mattino da Trapani, con soste bagno, snorkeling e rientro alle 13:00.",
      en: "Shared 4-hour morning boat tour in the Egadi from Trapani, with swim stops, snorkelling and return at 13:00.",
    },
    media: [
      {
        caption: { it: "Tour agile", en: "Agile tour" },
        alt: {
          it: "Barca in navigazione vicino alla costa durante un tour di 4 ore alle Egadi",
          en: "Boat sailing near the coast during a 4-hour Egadi tour",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      },
      {
        caption: { it: "Tuffo veloce", en: "Quick swim" },
        alt: {
          it: "Persone che si tuffano in acqua trasparente durante un tour breve alle Egadi",
          en: "People diving into clear water during a short Egadi tour",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
      },
      {
        caption: { it: "Cala Rossa", en: "Cala Rossa" },
        alt: {
          it: "Acqua cristallina a Cala Rossa durante un tour in barca alle Egadi",
          en: "Crystal-clear water at Cala Rossa during an Egadi boat tour",
        },
        color: "#FDE68A",
        src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
      },
    ],
    itinerary: halfDayMorningItinerary,
    includes: sharedBoatIncludes,
    bringItems: defaultBringItems,
  },
  "boat-shared-afternoon": {
    serviceId: "boat-shared-afternoon",
    order: 50,
    listed: false,
    title: { it: "Tour in barca Egadi 4 ore pomeriggio condiviso", en: "Shared 4-hour afternoon Egadi boat tour" },
    subtitle: {
      it: "La formula agile del pomeriggio per vivere le Egadi in mezza giornata, con bagno, relax e rotta scelta in base al mare.",
      en: "The agile afternoon way to experience the Egadi in half a day, with swimming, relaxing and a route shaped by the sea.",
    },
    detailDescription: {
      it: "Un tour condiviso di 4 ore nel pomeriggio alle Isole Egadi da Trapani: ideale per chi vuole un'esperienza breve ma completa, con soste bagno e navigazione leggera.",
      en: "A shared 4-hour afternoon tour in the Egadi Islands from Trapani: ideal for a short but complete experience, with swim stops and easy navigation.",
    },
    seoTitle: { it: "Tour condiviso in barca alle Egadi 4 ore pomeriggio", en: "Shared 4-hour afternoon boat tour in the Egadi" },
    seoDescription: {
      it: "Tour condiviso in barca alle Egadi di 4 ore al pomeriggio da Trapani con soste bagno, rotta meteo-dipendente e prenotazione online.",
      en: "Shared 4-hour afternoon boat tour in the Egadi from Trapani with swim stops, weather-aware route and online booking.",
    },
    media: [
      {
        caption: { it: "Tour agile", en: "Agile tour" },
        alt: {
          it: "Barca in navigazione vicino alla costa durante un tour di 4 ore alle Egadi",
          en: "Boat sailing near the coast during a 4-hour Egadi tour",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      },
      {
        caption: { it: "Tuffo veloce", en: "Quick swim" },
        alt: {
          it: "Persone che si tuffano in acqua trasparente durante un tour breve alle Egadi",
          en: "People diving into clear water during a short Egadi tour",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
      },
      {
        caption: { it: "Cala Rossa", en: "Cala Rossa" },
        alt: {
          it: "Acqua cristallina a Cala Rossa durante un tour in barca alle Egadi",
          en: "Crystal-clear water at Cala Rossa during an Egadi boat tour",
        },
        color: "#FDE68A",
        src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
      },
    ],
    itinerary: halfDayAfternoonItinerary,
    includes: sharedBoatIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-full-day": {
    serviceId: "boat-exclusive-full-day",
    order: 60,
    listed: true,
    title: { it: "Tour in barca Egadi 8 ore privato", en: "Private 8-hour Egadi boat tour" },
    subtitle: {
      it: "La barca riservata al tuo gruppo per una giornata completa tra baie, snorkeling e tempi scelti con lo skipper.",
      en: "The boat reserved for your group for a full day of bays, snorkelling and timing shaped with the skipper.",
    },
    detailDescription: {
      it: "Una giornata privata e flessibile alle Isole Egadi, con partenza da Trapani e soste decise insieme allo skipper in base a vento, mare e ritmo del gruppo.",
      en: "A private and flexible day in the Egadi Islands, departing from Trapani with stops chosen with the skipper according to wind, sea and group pace.",
    },
    seoTitle: { it: "Tour privato in barca alle Egadi 8 ore", en: "Private 8-hour boat tour in the Egadi" },
    seoDescription: {
      it: "Prenota una barca privata alle Egadi per 8 ore con partenza da Trapani, skipper, soste bagno e rotta flessibile.",
      en: "Book a private 8-hour boat tour in the Egadi from Trapani, with skipper, swim stops and flexible route.",
    },
    media: [
      {
        caption: { it: "Barca privata", en: "Private boat" },
        alt: {
          it: "Gruppo su barca privata durante un tour di 8 ore alle Isole Egadi",
          en: "Group on a private boat during an 8-hour tour in the Egadi Islands",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      },
      {
        caption: { it: "Snorkeling", en: "Snorkelling" },
        alt: {
          it: "Snorkeling vicino alla barca privata nelle acque limpide delle Egadi",
          en: "Snorkelling near a private boat in the clear waters of the Egadi",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      },
      {
        caption: { it: "Luce dorata", en: "Golden light" },
        alt: {
          it: "Aperitivo e rientro in barca privata con luce dorata alle Egadi",
          en: "Aperitivo and return on a private boat in golden Egadi light",
        },
        color: "#FED7AA",
        src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
      },
    ],
    itinerary: fullDayBoatItinerary,
    includes: privateBoatIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-morning": {
    serviceId: "boat-exclusive-morning",
    order: 70,
    listed: false,
    title: { it: "Tour in barca Egadi 4 ore mattina privato", en: "Private 4-hour morning Egadi boat tour" },
    subtitle: {
      it: "Mezza giornata privata al mattino, con barca riservata e rotta scelta con lo skipper.",
      en: "A private morning half day, with a reserved boat and route chosen with the skipper.",
    },
    detailDescription: {
      it: "Tour privato di 4 ore alle Isole Egadi da Trapani, ideale per gruppi che vogliono mare, privacy e soste bagno in una fascia compatta.",
      en: "A private 4-hour tour in the Egadi Islands from Trapani, ideal for groups who want sea, privacy and swim stops in a compact slot.",
    },
    seoTitle: { it: "Tour privato in barca alle Egadi 4 ore mattina", en: "Private 4-hour morning boat tour in the Egadi" },
    seoDescription: {
      it: "Tour privato in barca alle Egadi di 4 ore al mattino da Trapani, con skipper, soste bagno e rotta flessibile.",
      en: "Private 4-hour morning boat tour in the Egadi from Trapani, with skipper, swim stops and flexible route.",
    },
    media: [
      {
        caption: { it: "Tour privato", en: "Private tour" },
        alt: {
          it: "Barca privata in navigazione vicino alla costa durante un tour di 4 ore alle Egadi",
          en: "Private boat sailing near the coast during a 4-hour Egadi tour",
        },
        color: "#BAE6FD",
        src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      },
      {
        caption: { it: "Tuffo privato", en: "Private swim" },
        alt: {
          it: "Tuffo da una barca privata in acqua trasparente alle Isole Egadi",
          en: "Dive from a private boat into clear water in the Egadi Islands",
        },
        color: "#FECACA",
        src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
      },
      {
        caption: { it: "Cala Rossa", en: "Cala Rossa" },
        alt: {
          it: "Cala Rossa e acqua cristallina durante un tour privato alle Egadi",
          en: "Cala Rossa and crystal-clear water during a private Egadi tour",
        },
        color: "#C7D2FE",
        src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
      },
    ],
    itinerary: halfDayMorningItinerary,
    includes: privateBoatIncludes,
    bringItems: defaultBringItems,
  },
  "boat-exclusive-afternoon": {
    serviceId: "boat-exclusive-afternoon",
    order: 80,
    listed: true,
    title: { it: "Tour in barca Egadi 4 ore pomeriggio privato", en: "Private 4-hour afternoon Egadi boat tour" },
    subtitle: {
      it: "Una mezza giornata privata nel pomeriggio per godersi le Egadi con ritmo rilassato, soste bagno e rotta flessibile.",
      en: "A private afternoon half day to enjoy the Egadi at a relaxed pace, with swim stops and a flexible route.",
    },
    detailDescription: {
      it: "Barca riservata per 4 ore nel pomeriggio alle Isole Egadi da Trapani, pensata per gruppi che vogliono privacy, soste bagno e una rotta decisa con lo skipper.",
      en: "A private 4-hour afternoon boat tour in the Egadi Islands from Trapani, designed for groups who want privacy, swim stops and a route shaped with the skipper.",
    },
    seoTitle: { it: "Tour privato in barca alle Egadi 4 ore pomeriggio", en: "Private 4-hour afternoon boat tour in the Egadi" },
    seoDescription: {
      it: "Prenota un tour privato in barca alle Egadi di 4 ore al pomeriggio da Trapani, con skipper, soste bagno e rotta flessibile.",
      en: "Book a private 4-hour afternoon boat tour in the Egadi from Trapani, with skipper, swim stops and flexible route.",
    },
    media: [
      {
        caption: { it: "Tour privato", en: "Private tour" },
        alt: {
          it: "Barca privata in navigazione vicino alla costa durante un tour di 4 ore alle Egadi",
          en: "Private boat sailing near the coast during a 4-hour Egadi tour",
        },
        color: "#BAE6FD",
        src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      },
      {
        caption: { it: "Tuffo privato", en: "Private swim" },
        alt: {
          it: "Tuffo da una barca privata in acqua trasparente alle Isole Egadi",
          en: "Dive from a private boat into clear water in the Egadi Islands",
        },
        color: "#FECACA",
        src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
      },
      {
        caption: { it: "Cala Rossa", en: "Cala Rossa" },
        alt: {
          it: "Cala Rossa e acqua cristallina durante un tour privato alle Egadi",
          en: "Cala Rossa and crystal-clear water during a private Egadi tour",
        },
        color: "#C7D2FE",
        src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
      },
    ],
    itinerary: halfDayAfternoonItinerary,
    includes: privateBoatIncludes,
    bringItems: defaultBringItems,
  },
} as const satisfies Record<string, ExperienceCatalogEntry>;

export const EXPERIENCE_PACKAGE_CATALOG = [
  {
    key: "esperienza-gourmet-trimarano",
    order: 10,
    serviceIds: ["exclusive-experience"],
    title: {
      it: "Esperienza Gourmet in trimarano",
      en: "Gourmet trimaran experience",
    },
    subtitle: {
      it: "Il Trimarano con chef, skipper e hostess per una giornata premium tra sapori locali, mare e soste in rada.",
      en: "The Egadisailing trimaran with chef, skipper and hostess for a premium day of local flavours, sea and anchored swim stops.",
    },
    seoTitle: {
      it: "Esperienza gourmet in trimarano alle Isole Egadi",
      en: "Gourmet trimaran experience in the Egadi Islands",
    },
    seoDescription: {
      it: "Giornata privata sul Trimarano con chef a bordo, skipper, hostess e rotta tra Favignana e Levanzo.",
      en: "Private day on the Egadisailing trimaran with onboard chef, skipper, hostess and route around Favignana and Levanzo.",
    },
    durationLabel: { it: "8 ore", en: "8 hours" },
    detailLabel: { it: "Chef, skipper e hostess", en: "Chef, skipper and hostess" },
    priceUnitLabel: { it: "per pacchetto", en: "per package" },
    primaryCtaLabel: { it: "Scopri il pacchetto", en: "View package" },
    primaryHref: "/experiences/exclusive-experience",
    media: EXPERIENCE_CATALOG["exclusive-experience"].media,
  },
  {
    key: "charter-egadi",
    order: 20,
    serviceIds: ["cabin-charter"],
    title: {
      it: "Charter Egadi",
      en: "Egadi Charter",
    },
    subtitle: {
      it: "Da 3 a 7 giornate sul trimarano, con itinerario concordato tra Favignana, Levanzo e Marettimo in base alle tue preferenze.",
      en: "Three to seven days on the trimaran, with an itinerary agreed around Favignana, Levanzo and Marettimo according to your preferences.",
    },
    seoTitle: {
      it: "Charter alle Egadi in trimarano",
      en: "Egadi charter by trimaran",
    },
    seoDescription: {
      it: "Charter in trimarano alle Isole Egadi da 3 a 7 giornate con skipper, pernottamento a bordo e rotta meteo-dipendente.",
      en: "Trimaran charter in the Egadi Islands for 3 to 7 days with skipper, overnight stay on board and weather-aware route.",
    },
    durationLabel: { it: "3-7 giornate", en: "3-7 days" },
    detailLabel: { it: "Itinerario su misura", en: "Tailored itinerary" },
    priceUnitLabel: { it: "per pacchetto", en: "per package" },
    primaryCtaLabel: { it: "Scopri il pacchetto", en: "View package" },
    primaryHref: "/experiences/charter",
    media: EXPERIENCE_CATALOG["cabin-charter"].media,
  },
  {
    key: "tour-barca-egadi-4-ore",
    order: 40,
    serviceIds: ["boat-exclusive-morning", "boat-exclusive-afternoon"],
    title: {
      it: "Tour in barca Egadi 4 ore",
      en: "4-hour Egadi boat tour",
    },
    subtitle: {
      it: "La formula agile per vivere le Egadi in mezza giornata, con barca riservata, bagno, relax e rotta scelta in base al mare.",
      en: "The agile half-day way to experience the Egadi, with a reserved boat, swimming, relaxing and a route shaped by the sea.",
    },
    seoTitle: {
      it: "Tour in barca alle Egadi 4 ore da Trapani",
      en: "4-hour boat tour in the Egadi from Trapani",
    },
    seoDescription: {
      it: "Tour privato in barca alle Egadi di 4 ore da Trapani, con barca in esclusiva, soste bagno e rotta flessibile.",
      en: "Private 4-hour boat tour in the Egadi from Trapani, with an exclusive boat, swim stops and a flexible route.",
    },
    durationLabel: { it: "4 ore", en: "4 hours" },
    detailLabel: { it: "Barca in esclusiva", en: "Private boat" },
    priceUnitLabel: { it: "per barca", en: "per boat" },
    primaryCtaLabel: { it: "Scopri il pacchetto", en: "View package" },
    primaryHref: "/experiences/boat-exclusive-afternoon",
    media: EXPERIENCE_CATALOG["boat-exclusive-afternoon"].media,
    variants: [
      {
        label: { it: "Privato mattina", en: "Private morning" },
        description: {
          it: "Barca riservata al mattino, con rientro intorno alle 13:00.",
          en: "Boat reserved in the morning, returning around 13:00.",
        },
        serviceId: "boat-exclusive-morning",
        href: "/experiences/boat-exclusive-morning",
      },
      {
        label: { it: "Privato pomeriggio", en: "Private afternoon" },
        description: {
          it: "Barca riservata al tuo gruppo.",
          en: "Boat reserved for your group.",
        },
        serviceId: "boat-exclusive-afternoon",
        href: "/experiences/boat-exclusive-afternoon",
      },
    ],
  },
  {
    key: "tour-barca-egadi-8-ore",
    order: 30,
    serviceIds: ["boat-shared-full-day", "boat-exclusive-full-day"],
    title: {
      it: "Tour in barca Egadi 8 ore",
      en: "8-hour Egadi boat tour",
    },
    subtitle: {
      it: "Una giornata completa tra baie, snorkeling e tempo lento a bordo. Puoi scegliere posti condivisi o la barca in esclusiva.",
      en: "A full day of bays, snorkelling and slow time on board. Choose shared seats or the whole boat privately.",
    },
    seoTitle: {
      it: "Tour in barca alle Egadi 8 ore da Trapani",
      en: "8-hour boat tour in the Egadi from Trapani",
    },
    seoDescription: {
      it: "Tour in barca alle Egadi di 8 ore da Trapani, condiviso o privato, con snorkeling, soste bagno e giornata completa.",
      en: "8-hour boat tour in the Egadi from Trapani, shared or private, with snorkelling, swim stops and a full-day route.",
    },
    durationLabel: { it: "8 ore", en: "8 hours" },
    detailLabel: { it: "Condiviso o privato", en: "Shared or private" },
    priceUnitLabel: { it: "a persona o per barca", en: "per person or per boat" },
    primaryCtaLabel: { it: "Scopri il pacchetto", en: "View package" },
    primaryHref: "/experiences/boat-shared-full-day",
    media: EXPERIENCE_CATALOG["boat-shared-full-day"].media,
    variants: [
      {
        label: { it: "Condiviso", en: "Shared" },
        description: {
          it: "Posti singoli per una giornata intera.",
          en: "Individual seats for a full day.",
        },
        serviceId: "boat-shared-full-day",
        href: "/experiences/boat-shared-full-day",
      },
      {
        label: { it: "Privato", en: "Private" },
        description: {
          it: "Giornata intera con barca riservata.",
          en: "Full day with a reserved boat.",
        },
        serviceId: "boat-exclusive-full-day",
        href: "/experiences/boat-exclusive-full-day",
      },
    ],
  },
] as const satisfies readonly ExperiencePackageEntry[];

export type ExperienceServiceId = keyof typeof EXPERIENCE_CATALOG;

const EXPERIENCE_PUBLIC_SLUGS: Partial<Record<ExperienceServiceId, string>> = {
  "cabin-charter": "charter",
};

const EXPERIENCE_SLUG_ALIASES: Record<string, ExperienceServiceId> = {
  charter: "cabin-charter",
};

export function isExperienceServiceId(serviceId: string): serviceId is ExperienceServiceId {
  return serviceId in EXPERIENCE_CATALOG;
}

export function resolveExperienceServiceIdFromSlug(slug: string): string {
  return EXPERIENCE_SLUG_ALIASES[slug] ?? slug;
}

export function getExperiencePublicSlug(serviceId: string): string {
  return isExperienceServiceId(serviceId)
    ? EXPERIENCE_PUBLIC_SLUGS[serviceId] ?? serviceId
    : serviceId;
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
      alt: localize(item.alt, locale),
      color: item.color,
      src: item.src,
    })),
    itinerary: entry.itinerary.map((item) => ({
      time: typeof item.time === "string" ? item.time : localize(item.time, locale),
      title: item.title ? localize(item.title, locale) : undefined,
      location: item.location ? localize(item.location, locale) : undefined,
      text: localize(item.text, locale),
    })),
    includes: entry.includes.map((item) => localize(item, locale)),
    bringItems: entry.bringItems.map((item) => localize(item, locale)),
  };
}

export function getExperienceIds(): string[] {
  return Object.keys(EXPERIENCE_CATALOG);
}

export function getPublicExperienceIds(): string[] {
  return getExperienceIds().filter(isPublicBookingServiceEnabled);
}

export function getListedExperienceIds(): string[] {
  return Object.values(EXPERIENCE_CATALOG)
    .filter((entry) => entry.listed && isPublicBookingServiceEnabled(entry.serviceId))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.serviceId);
}

export function isExperienceListed(serviceId: string): boolean {
  return (
    isPublicBookingServiceEnabled(serviceId) &&
    (getExperienceCatalogEntry(serviceId)?.listed ?? false)
  );
}

export function compareExperienceOrder(aServiceId: string, bServiceId: string): number {
  const a = getExperienceCatalogEntry(aServiceId)?.order ?? Number.MAX_SAFE_INTEGER;
  const b = getExperienceCatalogEntry(bServiceId)?.order ?? Number.MAX_SAFE_INTEGER;
  return a - b;
}

export function getExperiencePackageContents(
  locale?: string | null,
): ResolvedExperiencePackageContent[] {
  return [...EXPERIENCE_PACKAGE_CATALOG]
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const variants = "variants" in entry ? entry.variants : [];
      return {
        key: entry.key,
        order: entry.order,
        serviceIds: entry.serviceIds.filter(isPublicBookingServiceEnabled),
        title: localize(entry.title, locale),
        subtitle: localize(entry.subtitle, locale),
        seoTitle: localize(entry.seoTitle, locale),
        seoDescription: localize(entry.seoDescription, locale),
        durationLabel: localize(entry.durationLabel, locale),
        detailLabel: localize(entry.detailLabel, locale),
        priceUnitLabel: localize(entry.priceUnitLabel, locale),
        primaryCtaLabel: localize(entry.primaryCtaLabel, locale),
        primaryHref: entry.primaryHref,
        media: entry.media.map((item) => ({
          caption: localize(item.caption, locale),
          alt: localize(item.alt, locale),
          color: item.color,
          src: item.src,
        })),
        variants: variants
          .filter((variant) => isPublicBookingServiceEnabled(variant.serviceId))
          .map((variant) => ({
            label: localize(variant.label, locale),
            description: localize(variant.description, locale),
            serviceId: variant.serviceId,
            href: variant.href,
          })),
      };
    });
}

export function getExperiencePackageServiceIds(): string[] {
  return Array.from(
    new Set(EXPERIENCE_PACKAGE_CATALOG.flatMap((entry) => [...entry.serviceIds])),
  ).filter(isPublicBookingServiceEnabled);
}
