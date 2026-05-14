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
      en: "Swim in crystal-clear water off Cala Azzurra, Favignana.",
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
      en: "Gourmet lunch at anchor off Cala Rossa, Favignana.",
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
      en: "Stop at Cala Dogana beach on Levanzo.",
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
      en: "Nature, silence and turquoise sea at Cala Fredda, Levanzo.",
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
      en: "During the return cruise through the Egadi Islands.",
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
      en: "Boarding, safety briefing and route agreed with the skipper according to wind and sea conditions.",
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
      en: "First swim stop at Cala Rossa, Bue Marino, Cala Azzurra or a more sheltered anchorage.",
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
      en: "Second island or second bay: a quieter stop chosen according to sea conditions and crowds.",
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
      en: "Final swim and an easy return towards Trapani with views of the Egadi Islands.",
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

const fishingItinerary = [
  {
    time: "08:30",
    title: {
      it: "Briefing tecnico a Trapani",
      en: "Technical briefing in Trapani",
      es: "Briefing técnico en Trapani",
      fr: "Briefing technique à Trapani",
      de: "Technisches Briefing in Trapani",
    },
    location: {
      it: "Porto di Trapani",
      en: "Trapani harbour",
      es: "Puerto de Trapani",
      fr: "Port de Trapani",
      de: "Hafen von Trapani",
    },
    text: {
      it: "Imbarco, controllo attrezzatura, sicurezza e scelta delle tecniche in base a stagione, mare e autorizzazioni.",
      en: "Boarding, gear check, safety briefing and choice of techniques according to season, sea state and authorisations.",
      es: "Embarque, revisión del equipo, seguridad y elección de técnicas según temporada, mar y autorizaciones.",
      fr: "Embarquement, vérification du matériel, sécurité et choix des techniques selon saison, mer et autorisations.",
      de: "Einschiffung, Ausrüstungscheck, Sicherheit und Wahl der Techniken je nach Saison, Meer und Genehmigungen.",
    },
  },
  {
    time: "09:30",
    title: {
      it: "Rotta verso gli spot consentiti",
      en: "Route to permitted spots",
      es: "Ruta hacia zonas permitidas",
      fr: "Route vers les zones autorisées",
      de: "Route zu erlaubten Spots",
    },
    location: {
      it: "Isole Egadi",
      en: "Egadi Islands",
      es: "Islas Egadi",
      fr: "Îles Égades",
      de: "Ägadische Inseln",
    },
    text: {
      it: "Lo skipper valuta vento, correnti e regolamento AMP: si pesca solo dove e quando è consentito.",
      en: "The skipper evaluates wind, currents and AMP rules: fishing only happens where and when it is allowed.",
      es: "El patrón evalúa viento, corrientes y normativa AMP: se pesca solo donde y cuando está permitido.",
      fr: "Le skipper évalue vent, courants et règles AMP : la pêche se pratique uniquement où et quand elle est autorisée.",
      de: "Der Skipper prüft Wind, Strömung und AMP-Regeln: Geangelt wird nur dort und dann, wo es erlaubt ist.",
    },
  },
  {
    time: "10:00",
    title: {
      it: "Tecniche miste",
      en: "Mixed techniques",
      es: "Técnicas mixtas",
      fr: "Techniques mixtes",
      de: "Gemischte Techniken",
    },
    text: {
      it: "Sessioni di bolentino, traina, drifting o catch and release secondo condizioni, specie presenti e decisione dello skipper.",
      en: "Sessions of bottom fishing, trolling, drifting or catch and release according to conditions, target species and skipper decision.",
      es: "Sesiones de pesca de fondo, curricán, drifting o catch and release según condiciones, especies y decisión del patrón.",
      fr: "Sessions de pêche de fond, traîne, drifting ou catch and release selon conditions, espèces et décision du skipper.",
      de: "Grundangeln, Schleppangeln, Drifting oder Catch and Release je nach Bedingungen, Fischarten und Entscheidung des Skippers.",
    },
  },
  {
    time: "13:00",
    title: {
      it: "Pausa a bordo",
      en: "Break on board",
      es: "Pausa a bordo",
      fr: "Pause à bord",
      de: "Pause an Bord",
    },
    text: {
      it: "Acqua, soft drink e snack leggeri. Il focus resta sulla pesca: pranzo completo non incluso.",
      en: "Water, soft drinks and light snacks. The focus stays on fishing: a full lunch is not included.",
      es: "Agua, refrescos y snacks ligeros. El foco sigue siendo la pesca: almuerzo completo no incluido.",
      fr: "Eau, boissons fraîches et snacks légers. Le focus reste la pêche : déjeuner complet non inclus.",
      de: "Wasser, Softdrinks und leichte Snacks. Der Fokus bleibt auf dem Angeln: Vollständiges Mittagessen ist nicht enthalten.",
    },
  },
  {
    time: "14:00",
    title: {
      it: "Seconda sessione",
      en: "Second session",
      es: "Segunda sesión",
      fr: "Deuxième session",
      de: "Zweite Session",
    },
    text: {
      it: "Cambio spot o tecnica se serve. Il pescato può essere rilasciato o trattenuto solo entro limiti di legge, taglie e quote.",
      en: "Spot or technique change if useful. Catches can be released or kept only within legal limits, sizes and quotas.",
      es: "Cambio de zona o técnica si conviene. Las capturas pueden soltarse o conservarse solo dentro de límites legales, tallas y cupos.",
      fr: "Changement de spot ou de technique si utile. Les prises peuvent être relâchées ou gardées uniquement dans les limites légales, tailles et quotas.",
      de: "Spot- oder Technikwechsel bei Bedarf. Fänge können nur innerhalb gesetzlicher Limits, Mindestmaße und Quoten freigelassen oder behalten werden.",
    },
  },
  {
    time: "16:30",
    title: {
      it: "Rientro tecnico",
      en: "Technical return",
      es: "Regreso técnico",
      fr: "Retour technique",
      de: "Technische Rückfahrt",
    },
    location: {
      it: "Trapani",
      en: "Trapani",
      es: "Trapani",
      fr: "Trapani",
      de: "Trapani",
    },
    text: {
      it: "Rientro, riordino attrezzatura e sbarco. Nessuna cattura è garantita: l'esperienza segue mare e natura.",
      en: "Return, gear tidy-up and disembarkation. No catch is guaranteed: the experience follows sea and nature.",
      es: "Regreso, orden del equipo y desembarque. No se garantiza ninguna captura: la experiencia sigue al mar y la naturaleza.",
      fr: "Retour, rangement du matériel et débarquement. Aucune prise n'est garantie : l'expérience suit la mer et la nature.",
      de: "Rückfahrt, Ausrüstung verstauen und Ausschiffung. Kein Fang wird garantiert: Das Erlebnis folgt Meer und Natur.",
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
      en: "Swimming and snorkelling in the clearest waters that can be reached safely in half a day.",
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

const fishingIncludes = [
  {
    it: "Gommone da pesca riservato al tuo gruppo",
    en: "Fishing RIB reserved for your group",
    es: "Neumática de pesca reservada para tu grupo",
    fr: "Semi-rigide de pêche réservé à votre groupe",
    de: "Angel-RIB exklusiv für Ihre Gruppe",
  },
  {
    it: "Skipper e guida tecnica",
    en: "Skipper and technical guide",
    es: "Patrón y guía técnica",
    fr: "Skipper et guide technique",
    de: "Skipper und technische Begleitung",
  },
  {
    it: "Canne e mulinelli professionali",
    en: "Professional rods and reels",
    es: "Cañas y carretes profesionales",
    fr: "Cannes et moulinets professionnels",
    de: "Professionelle Ruten und Rollen",
  },
  {
    it: "Esche, artificiali e setup per tecniche miste",
    en: "Bait, lures and setup for mixed techniques",
    es: "Cebos, señuelos y montaje para técnicas mixtas",
    fr: "Appâts, leurres et matériel pour techniques mixtes",
    de: "Köder, Kunstköder und Setup für gemischte Techniken",
  },
  {
    it: "Carburante per la rotta prevista",
    en: "Fuel for the planned route",
    es: "Combustible para la ruta prevista",
    fr: "Carburant pour la route prévue",
    de: "Treibstoff für die geplante Route",
  },
  {
    it: "Acqua, soft drink e snack leggeri",
    en: "Water, soft drinks and light snacks",
    es: "Agua, refrescos y snacks ligeros",
    fr: "Eau, boissons fraîches et snacks légers",
    de: "Wasser, Softdrinks und leichte Snacks",
  },
  {
    it: "Dotazioni di sicurezza",
    en: "Safety equipment",
    es: "Equipo de seguridad",
    fr: "Équipement de sécurité",
    de: "Sicherheitsausrüstung",
  },
];

const defaultBringItems = [
  { it: "Crema solare", en: "Sunscreen" },
  { it: "Costume da bagno", en: "Swimwear" },
  { it: "Asciugamano personale", en: "Personal towel" },
  { it: "Cappello", en: "Hat" },
  { it: "Occhiali da sole", en: "Sunglasses" },
];

const fishingBringItems = [
  {
    it: "Abbigliamento comodo e antivento",
    en: "Comfortable windproof clothing",
    es: "Ropa cómoda y cortaviento",
    fr: "Vêtements confortables et coupe-vent",
    de: "Bequeme windfeste Kleidung",
  },
  {
    it: "Scarpe con suola morbida antiscivolo",
    en: "Soft non-slip sole shoes",
    es: "Calzado con suela blanda antideslizante",
    fr: "Chaussures à semelle souple antidérapante",
    de: "Schuhe mit weicher rutschfester Sohle",
  },
  {
    it: "Cappello e occhiali polarizzati",
    en: "Hat and polarised sunglasses",
    es: "Sombrero y gafas polarizadas",
    fr: "Chapeau et lunettes polarisées",
    de: "Hut und polarisierte Sonnenbrille",
  },
  {
    it: "Crema solare reef-safe",
    en: "Reef-safe sunscreen",
    es: "Protector solar reef-safe",
    fr: "Crème solaire reef-safe",
    de: "Riffreundliche Sonnencreme",
  },
  {
    it: "Documento personale e comunicazione pesca sportiva se richiesta",
    en: "Personal ID and sport fishing communication if required",
    es: "Documento personal y comunicación de pesca deportiva si se requiere",
    fr: "Document personnel et déclaration de pêche sportive si nécessaire",
    de: "Ausweis und Sportfischerei-Meldung, falls erforderlich",
  },
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
      en: "The trimaran reserved for you, with an on-board chef and a route shaped around the best Egadi conditions.",
    },
    detailDescription: {
      it: "Una giornata privata sul Trimarano: skipper, hostess e chef coordinano ritmo, tavola e soste bagno. È il pacchetto più completo per chi vuole vivere le Egadi senza compromessi.",
      en: "A private day on the Egadisailing trimaran: skipper, hostess and chef coordinate the pace, meal service and swim stops. This is the most complete package for experiencing the Egadi Islands without compromise.",
    },
    seoTitle: {
      it: "Chef a bordo alle Egadi sul Neel 47",
      en: "Neel 47 Chef Experience in the Egadi",
    },
    seoDescription: {
      it: "Prenota il Trimarano in esclusiva con chef a bordo, skipper e itinerario tra Favignana e Levanzo.",
      en: "Book the Egadisailing trimaran privately with an on-board chef, skipper and itinerary around Favignana and Levanzo.",
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
      { it: "Acqua, soft drink e carburante rotta", en: "Water, soft drinks and fuel for the planned route" },
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
      en: "Three to seven days on the trimaran, with the Egadi Islands as your floating home.",
    },
    detailDescription: {
      it: "Un charter flessibile per dormire a bordo, svegliarsi vicino alle baie e costruire la rotta giorno per giorno. Cambusa esclusa dal pacchetto, hostess extra su richiesta e refill/dispensa organizzabili con la crew.",
      en: "A flexible charter for sleeping on board, waking up near the bays and shaping the route day by day. Provisioning is not included, a hostess is available as an extra and pantry top-ups can be arranged with the crew.",
    },
    seoTitle: {
      it: "Charter Egadi in trimarano Neel 47",
      en: "Egadi Trimaran Charter on the Neel 47",
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
          en: "Favignana: Cala Rossa, Bue Marino and swim stops chosen according to weather and crowds.",
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
      { it: "Refill e dispensa su richiesta", en: "Pantry top-ups on request" },
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
      en: "The easiest way to enjoy a boat tour in the Egadi Islands from Trapani: choose your date, book your seats and share the day with other guests.",
    },
    seoTitle: { it: "Tour Egadi 8 ore condiviso da Trapani", en: "Shared 8-Hour Egadi Boat Tour from Trapani" },
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
      en: "The morning departure for a shared half-day in the Egadi Islands, with swim stops and return at 13:00.",
    },
    detailDescription: {
      it: "Tour condiviso di 4 ore alle Isole Egadi da Trapani: partenza al mattino, rotta compatta e tempo per bagno, snorkeling e navigazione panoramica.",
      en: "A shared 4-hour tour in the Egadi Islands from Trapani: morning departure, compact route and time for swimming, snorkelling and scenic navigation.",
    },
    seoTitle: { it: "Tour Egadi 4 ore condiviso mattina da Trapani", en: "Shared 4-Hour Morning Egadi Boat Tour from Trapani" },
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
      en: "An agile afternoon way to experience the Egadi Islands in half a day, with swimming, relaxation and a route shaped by the sea.",
    },
    detailDescription: {
      it: "Un tour condiviso di 4 ore nel pomeriggio alle Isole Egadi da Trapani: ideale per chi vuole un'esperienza breve ma completa, con soste bagno e navigazione leggera.",
      en: "A shared 4-hour afternoon tour in the Egadi Islands from Trapani: ideal for a short but complete experience, with swim stops and easy navigation.",
    },
    seoTitle: { it: "Tour Egadi 4 ore condiviso pomeriggio da Trapani", en: "Shared 4-Hour Afternoon Egadi Boat Tour from Trapani" },
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
      en: "The boat reserved for your group for a full day of bays, snorkelling and a schedule shaped with the skipper.",
    },
    detailDescription: {
      it: "Una giornata privata e flessibile alle Isole Egadi, con partenza da Trapani e soste decise insieme allo skipper in base a vento, mare e ritmo del gruppo.",
      en: "A private and flexible day in the Egadi Islands, departing from Trapani with stops chosen with the skipper according to wind, sea and group pace.",
    },
    seoTitle: { it: "Tour Egadi 8 ore privato da Trapani", en: "Private 8-Hour Egadi Boat Tour from Trapani" },
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
      en: "A private morning half-day, with a reserved boat and route chosen with the skipper.",
    },
    detailDescription: {
      it: "Tour privato di 4 ore alle Isole Egadi da Trapani, ideale per gruppi che vogliono mare, privacy e soste bagno in una fascia compatta.",
      en: "A private 4-hour tour in the Egadi Islands from Trapani, ideal for groups who want sea, privacy and swim stops in a compact slot.",
    },
    seoTitle: { it: "Tour Egadi 4 ore privato mattina da Trapani", en: "Private 4-Hour Morning Egadi Boat Tour from Trapani" },
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
      en: "A private afternoon half-day to enjoy the Egadi Islands at a relaxed pace, with swim stops and a flexible route.",
    },
    detailDescription: {
      it: "Barca riservata per 4 ore nel pomeriggio alle Isole Egadi da Trapani, pensata per gruppi che vogliono privacy, soste bagno e una rotta decisa con lo skipper.",
      en: "A private 4-hour afternoon boat tour in the Egadi Islands from Trapani, designed for groups who want privacy, swim stops and a route shaped with the skipper.",
    },
    seoTitle: { it: "Tour Egadi 4 ore privato pomeriggio da Trapani", en: "Private 4-Hour Afternoon Egadi Boat Tour from Trapani" },
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
  "fishing-full-day": {
    serviceId: "fishing-full-day",
    order: 90,
    listed: true,
    title: {
      it: "Charter di pesca alle Egadi",
      en: "Egadi fishing charter",
      es: "Charter de pesca en las Islas Egadi",
      fr: "Charter de pêche aux îles Égades",
      de: "Angelcharter Ägadische Inseln",
    },
    subtitle: {
      it: "Giornata privata di pesca sportiva da Trapani su gommone dedicato, con attrezzatura professionale e tecniche miste.",
      en: "Private sport fishing day from Trapani on a dedicated Fishing RIB, with professional gear and mixed techniques.",
      es: "Jornada privada de pesca deportiva desde Trapani en neumática dedicada, con equipo profesional y técnicas mixtas.",
      fr: "Journée privée de pêche sportive depuis Trapani sur semi-rigide dédié, avec matériel professionnel et techniques mixtes.",
      de: "Privater Sportangeltag ab Trapani auf einem speziellen Angel-RIB, mit professioneller Ausrüstung und gemischten Techniken.",
    },
    detailDescription: {
      it: "Una giornata da 8 ore per appassionati: bolentino, traina, drifting e catch and release vengono scelti dallo skipper in base a stagione, mare, specie presenti e regole AMP/MASAF. Il pescato può essere rilasciato o trattenuto solo entro limiti di legge, taglie, quote e autorizzazioni.",
      en: "An 8-hour day for fishing enthusiasts: bottom fishing, trolling, drifting and catch and release are selected by the skipper according to season, sea state, target species and AMP/MASAF rules. Catches can be released or kept only within legal limits, sizes, quotas and authorisations.",
      es: "Una jornada de 8 horas para aficionados: pesca de fondo, curricán, drifting y catch and release se eligen según temporada, mar, especies y normativa AMP/MASAF. Las capturas pueden soltarse o conservarse solo dentro de límites legales, tallas, cupos y autorizaciones.",
      fr: "Une journée de 8 heures pour passionnés : pêche de fond, traîne, drifting et catch and release sont choisis selon saison, mer, espèces et règles AMP/MASAF. Les prises peuvent être relâchées ou gardées uniquement dans les limites légales, tailles, quotas et autorisations.",
      de: "Ein 8-Stunden-Tag für Angelbegeisterte: Grundangeln, Schleppangeln, Drifting und Catch and Release werden je nach Saison, Meer, Fischarten und AMP/MASAF-Regeln gewählt. Fänge dürfen nur innerhalb gesetzlicher Limits, Mindestmaße, Quoten und Genehmigungen behalten oder freigelassen werden.",
    },
    seoTitle: {
      it: "Charter di pesca Isole Egadi da Trapani",
      en: "Egadi Islands Fishing Charter from Trapani",
      es: "Charter de pesca en las Islas Egadi desde Trapani",
      fr: "Charter de pêche aux îles Égades depuis Trapani",
      de: "Angelcharter Ägadische Inseln ab Trapani",
    },
    seoDescription: {
      it: "Charter di pesca alle Isole Egadi da Trapani su gommone privato fino a 4 persone, con canne professionali, bolentino, traina, drifting e catch and release secondo normativa AMP.",
      en: "Fishing charter in the Egadi Islands from Trapani on a private RIB for up to 4 guests, with professional rods, bottom fishing, trolling, drifting and catch and release according to AMP rules.",
      es: "Charter de pesca en las Islas Egadi desde Trapani en neumática privada hasta 4 personas, con cañas profesionales, pesca de fondo, curricán, drifting y catch and release según normativa AMP.",
      fr: "Charter de pêche aux îles Égades depuis Trapani sur semi-rigide privé jusqu'à 4 personnes, avec cannes professionnelles, pêche de fond, traîne, drifting et catch and release selon les règles AMP.",
      de: "Angelcharter auf den Ägadischen Inseln ab Trapani auf privatem RIB bis 4 Personen, mit professionellen Ruten, Grundangeln, Schleppangeln, Drifting und Catch and Release nach AMP-Regeln.",
    },
    media: [
      {
        caption: {
          it: "Gommone Pesca",
          en: "Fishing RIB",
          es: "Neumática de pesca",
          fr: "Semi-rigide de pêche",
          de: "Angel-RIB",
        },
        alt: {
          it: "Gommone Pesca per il charter di pesca alle Isole Egadi",
          en: "Fishing RIB for the Egadi fishing charter",
          es: "Neumática para el charter de pesca en las Islas Egadi",
          fr: "Semi-rigide pour le charter de pêche aux îles Égades",
          de: "Angel-RIB für den Angelcharter auf den Ägadischen Inseln",
        },
        color: "#BAE6FD",
        src: "/images/boats/fishing-rib/fishing-rib-hero.webp",
      },
      {
        caption: {
          it: "Setup tecnico",
          en: "Technical setup",
          es: "Setup técnico",
          fr: "Setup technique",
          de: "Technisches Setup",
        },
        alt: {
          it: "Placeholder setup tecnico per canne e attrezzatura da pesca sportiva",
          en: "Placeholder technical setup for sport fishing rods and gear",
          es: "Imagen provisional del setup técnico de cañas y equipo de pesca deportiva",
          fr: "Image provisoire du setup technique pour cannes et matériel de pêche sportive",
          de: "Platzhalterbild des technischen Setups für Sportangelruten und Ausrüstung",
        },
        color: "#FDE68A",
        src: "/images/experience-polaroids/fishing-charter-setup.webp",
      },
      {
        caption: {
          it: "Spot consentiti",
          en: "Permitted spots",
          es: "Zonas permitidas",
          fr: "Zones autorisées",
          de: "Erlaubte Spots",
        },
        alt: {
          it: "Placeholder navigazione verso spot di pesca consentiti alle Isole Egadi",
          en: "Placeholder navigation towards permitted fishing spots in the Egadi Islands",
          es: "Imagen provisional de navegación hacia zonas de pesca permitidas en las Egadi",
          fr: "Image provisoire de navigation vers les zones de pêche autorisées aux Égades",
          de: "Platzhalterbild der Fahrt zu erlaubten Angelspots auf den Ägadischen Inseln",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/fishing-charter-navigation.webp",
      },
    ],
    itinerary: fishingItinerary,
    includes: fishingIncludes,
    bringItems: fishingBringItems,
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
      en: "The Egadisailing trimaran with chef, skipper and hostess for a premium day of local flavours, sea and swim stops at anchor.",
    },
    seoTitle: {
      it: "Chef a bordo alle Egadi sul Neel 47",
      en: "Neel 47 Chef Experience in the Egadi",
    },
    seoDescription: {
      it: "Giornata privata sul Trimarano con chef a bordo, skipper, hostess e rotta tra Favignana e Levanzo.",
      en: "Private day on the Egadisailing trimaran with an on-board chef, skipper, hostess and route around Favignana and Levanzo.",
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
      it: "Charter Egadi in trimarano Neel 47",
      en: "Egadi Trimaran Charter on the Neel 47",
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
      en: "The agile half-day way to experience the Egadi Islands, with a reserved boat, swimming, relaxation and a route shaped by the sea.",
    },
    seoTitle: {
      it: "Tour Egadi 4 ore privato da Trapani",
      en: "Private 4-Hour Egadi Boat Tour from Trapani",
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
      it: "Tour Egadi 8 ore da Trapani",
      en: "8-Hour Egadi Boat Tour from Trapani",
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
  {
    key: "charter-pesca-egadi",
    order: 50,
    serviceIds: ["fishing-full-day"],
    title: {
      it: "Charter di pesca alle Egadi",
      en: "Egadi fishing charter",
      es: "Charter de pesca Islas Egadi",
      fr: "Charter de pêche îles Égades",
      de: "Angelcharter Ägadische Inseln",
    },
    subtitle: {
      it: "Giornata privata da 8 ore su Gommone Pesca, con canne professionali, tecniche miste e rotta conforme alle regole AMP.",
      en: "Private 8-hour day on the Fishing RIB, with professional rods, mixed techniques and a route compliant with AMP rules.",
      es: "Jornada privada de 8 horas en neumática de pesca, con cañas profesionales, técnicas mixtas y ruta conforme a la normativa AMP.",
      fr: "Journée privée de 8 heures sur semi-rigide de pêche, avec cannes professionnelles, techniques mixtes et route conforme aux règles AMP.",
      de: "Privater 8-Stunden-Tag auf dem Angel-RIB, mit professionellen Ruten, gemischten Techniken und Route nach AMP-Regeln.",
    },
    seoTitle: {
      it: "Charter di pesca alle Isole Egadi da Trapani",
      en: "Egadi Islands Fishing Charter from Trapani",
      es: "Charter de pesca en las Islas Egadi desde Trapani",
      fr: "Charter de pêche aux îles Égades depuis Trapani",
      de: "Angelcharter Ägadische Inseln ab Trapani",
    },
    seoDescription: {
      it: "Pacchetto privato di pesca sportiva alle Egadi da Trapani, 8 ore, fino a 4 persone, gommone dedicato e attrezzatura professionale.",
      en: "Private sport fishing package in the Egadi Islands from Trapani, 8 hours, up to 4 guests, dedicated RIB and professional gear.",
      es: "Paquete privado de pesca deportiva en las Islas Egadi desde Trapani, 8 horas, hasta 4 personas, neumática dedicada y equipo profesional.",
      fr: "Forfait privé de pêche sportive aux îles Égades depuis Trapani, 8 heures, jusqu'à 4 personnes, semi-rigide dédié et matériel professionnel.",
      de: "Privates Sportangel-Paket auf den Ägadischen Inseln ab Trapani, 8 Stunden, bis 4 Personen, spezielles RIB und professionelle Ausrüstung.",
    },
    durationLabel: {
      it: "8 ore",
      en: "8 hours",
      es: "8 horas",
      fr: "8 heures",
      de: "8 Stunden",
    },
    detailLabel: {
      it: "Gommone da pesca professionale",
      en: "Professional fishing RIB",
      es: "Neumática de pesca profesional",
      fr: "Semi-rigide de pêche professionnel",
      de: "Professionelles Angel-RIB",
    },
    priceUnitLabel: {
      it: "per gruppo",
      en: "per group",
      es: "por grupo",
      fr: "par groupe",
      de: "pro Gruppe",
    },
    primaryCtaLabel: {
      it: "Scopri il pacchetto",
      en: "View package",
      es: "Ver paquete",
      fr: "Voir le forfait",
      de: "Paket ansehen",
    },
    primaryHref: "/experiences/charter-pesca-egadi",
    media: EXPERIENCE_CATALOG["fishing-full-day"].media,
  },
] as const satisfies readonly ExperiencePackageEntry[];

export type ExperienceServiceId = keyof typeof EXPERIENCE_CATALOG;

const EXPERIENCE_PUBLIC_SLUGS: Partial<Record<ExperienceServiceId, string>> = {
  "cabin-charter": "charter",
  "fishing-full-day": "charter-pesca-egadi",
};

const EXPERIENCE_PUBLIC_SLUGS_BY_LOCALE: Partial<
  Record<ExperienceServiceId, Partial<Record<"it" | "en" | "es" | "fr" | "de", string>>>
> = {
  "exclusive-experience": {
    es: "chef-a-bordo-neel-47",
    fr: "chef-a-bord-neel-47",
    de: "chef-an-bord-neel-47",
  },
  "cabin-charter": {
    it: "charter",
    en: "charter",
    es: "charter-islas-egadi",
    fr: "charter-iles-egades",
    de: "charter-aegadische-inseln",
  },
  "boat-shared-full-day": {
    es: "excursion-compartida-islas-egadi-8-horas",
    fr: "excursion-partagee-iles-egades-8-heures",
    de: "geteilte-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-full-day": {
    es: "excursion-privada-islas-egadi-8-horas",
    fr: "excursion-privee-iles-egades-8-heures",
    de: "private-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-morning": {
    es: "excursion-privada-islas-egadi-4-horas-manana",
    fr: "excursion-privee-iles-egades-4-heures-matin",
    de: "private-bootstour-aegadische-inseln-4-stunden-vormittag",
  },
  "boat-exclusive-afternoon": {
    es: "excursion-privada-islas-egadi-4-horas-tarde",
    fr: "excursion-privee-iles-egades-4-heures-apres-midi",
    de: "private-bootstour-aegadische-inseln-4-stunden-nachmittag",
  },
  "fishing-full-day": {
    it: "charter-pesca-egadi",
    en: "egadi-fishing-charter",
    es: "charter-pesca-islas-egadi",
    fr: "charter-peche-iles-egades",
    de: "angelcharter-aegadische-inseln",
  },
};

const EXPERIENCE_SLUG_ALIASES: Record<string, ExperienceServiceId> = {
  charter: "cabin-charter",
  "charter-pesca-egadi": "fishing-full-day",
  "egadi-fishing-charter": "fishing-full-day",
  "charter-pesca-islas-egadi": "fishing-full-day",
  "charter-peche-iles-egades": "fishing-full-day",
  "angelcharter-aegadische-inseln": "fishing-full-day",
  "chef-a-bordo-neel-47": "exclusive-experience",
  "charter-islas-egadi": "cabin-charter",
  "excursion-compartida-islas-egadi-8-horas": "boat-shared-full-day",
  "excursion-privada-islas-egadi-8-horas": "boat-exclusive-full-day",
  "excursion-privada-islas-egadi-4-horas-manana": "boat-exclusive-morning",
  "excursion-privada-islas-egadi-4-horas-tarde": "boat-exclusive-afternoon",
  "chef-a-bord-neel-47": "exclusive-experience",
  "charter-iles-egades": "cabin-charter",
  "excursion-partagee-iles-egades-8-heures": "boat-shared-full-day",
  "excursion-privee-iles-egades-8-heures": "boat-exclusive-full-day",
  "excursion-privee-iles-egades-4-heures-matin": "boat-exclusive-morning",
  "excursion-privee-iles-egades-4-heures-apres-midi": "boat-exclusive-afternoon",
  "chef-an-bord-neel-47": "exclusive-experience",
  "charter-aegadische-inseln": "cabin-charter",
  "geteilte-bootstour-aegadische-inseln-8-stunden": "boat-shared-full-day",
  "private-bootstour-aegadische-inseln-8-stunden": "boat-exclusive-full-day",
  "private-bootstour-aegadische-inseln-4-stunden-vormittag": "boat-exclusive-morning",
  "private-bootstour-aegadische-inseln-4-stunden-nachmittag": "boat-exclusive-afternoon",
};

export function isExperienceServiceId(serviceId: string): serviceId is ExperienceServiceId {
  return serviceId in EXPERIENCE_CATALOG;
}

export function resolveExperienceServiceIdFromSlug(slug: string): string {
  return EXPERIENCE_SLUG_ALIASES[slug] ?? slug;
}

export function getExperiencePublicSlug(serviceId: string, locale?: string | null): string {
  if (!isExperienceServiceId(serviceId)) return serviceId;
  if (locale) {
    const localized = EXPERIENCE_PUBLIC_SLUGS_BY_LOCALE[serviceId]?.[locale as "it" | "en" | "es" | "fr" | "de"];
    if (localized) return localized;
  }
  return EXPERIENCE_PUBLIC_SLUGS[serviceId] ?? serviceId;
}

export function getExperienceCatalogEntry(serviceId: string): ExperienceCatalogEntry | null {
  return isExperienceServiceId(serviceId) ? EXPERIENCE_CATALOG[serviceId] : null;
}

const spanishBringItems = [
  "Bañador",
  "Toalla personal",
  "Protector solar reef-safe",
  "Gafas de sol y sombrero",
  "Bolsa blanda fácil de guardar",
];

const spanishPrivateBoatIncludes = [
  "Barco reservado para tu grupo",
  "Patrón profesional",
  "Combustible incluido según ruta prevista",
  "Paradas de baño y snorkel",
  "Agua y refrescos",
  "Ruta ajustada a mar y viento",
];

const spanishSharedBoatIncludes = [
  "Plaza individual a bordo",
  "Patrón profesional",
  "Combustible incluido",
  "Paradas de baño y snorkel",
  "Agua a bordo",
  "Ruta elegida según condiciones del mar",
];

const SPANISH_EXPERIENCE_OVERRIDES: Partial<
  Record<
    ExperienceServiceId,
    Partial<
      Pick<
        ResolvedExperienceContent,
        | "title"
        | "subtitle"
        | "detailDescription"
        | "seoTitle"
        | "seoDescription"
        | "itinerary"
        | "includes"
        | "bringItems"
      >
    >
  >
> = {
  "exclusive-experience": {
    title: "Chef a Bordo - Premium Experience",
    subtitle:
      "Día privado en el Neel 47 con chef, patrón y azafata entre Favignana y Levanzo.",
    detailDescription:
      "Una experiencia gourmet privada en trimarán para descubrir las Islas Egadi con ritmo lento, comida a bordo y la comodidad del Neel 47.",
    seoTitle: "Chef a bordo en Neel 47 por las Islas Egadi",
    seoDescription:
      "Experiencia gourmet privada en trimarán Neel 47 desde Trapani, con chef a bordo, patrón, azafata, comida siciliana y ruta entre Favignana y Levanzo.",
    itinerary: [
      {
        time: "09:30",
        title: "Bienvenida a bordo",
        text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        time: "11:30",
        title: "Cala Azzurra",
        location: "Favignana",
        text: "Primer baño en aguas claras, con la ruta ajustada por la tripulación según viento y mar.",
      },
      {
        time: "12:30",
        title: "Cala Rossa",
        location: "Favignana",
        text: "Fondeo en una de las calas más famosas de Favignana para vivir la parte gourmet de la jornada.",
      },
      {
        time: "13:00",
        title: "Cocina en vivo a bordo",
        text: "El chef prepara la comida con pescado local y productos sicilianos.",
      },
      {
        time: "14:30",
        title: "Relax y baño",
        location: "Favignana",
        text: "Tiempo para nadar, descansar en cubierta y disfrutar del espacio del trimarán.",
      },
      {
        time: "16:00",
        title: "Levanzo",
        location: "Levanzo",
        text: "Parada entre Cala Dogana, Cala Fredda u otra zona protegida según las condiciones del día.",
      },
      {
        time: "18:00",
        title: "Regreso a Trapani",
        text: "Navegación de vuelta con aperitivo y llegada al puerto.",
      },
    ],
    includes: [
      "Neel 47 en privado",
      "Patrón, chef y azafata",
      "Comida gourmet a bordo",
      "Vino trapanese, agua y refrescos",
      "Aperitivo",
      "Equipo de snorkel",
      "Combustible incluido",
    ],
    bringItems: spanishBringItems,
  },
  "cabin-charter": {
    title: "Charter Islas Egadi",
    subtitle:
      "De 3 a 7 días en trimarán entre Favignana, Levanzo y Marettimo, con ruta a medida.",
    detailDescription:
      "Un charter privado para vivir las Islas Egadi con más tiempo: noches al fondeo, camarotes, cocina y una ruta flexible diseñada con la tripulación.",
    seoTitle: "Charter en trimarán por las Islas Egadi desde Trapani",
    seoDescription:
      "Charter privado en Neel 47 por las Islas Egadi, de 3 a 7 días, con patrón, camarotes, noches al fondeo y ruta por Favignana, Levanzo y Marettimo.",
    itinerary: [
      {
        time: "Día 1",
        title: "Embarque en Trapani",
        text: "Briefing de seguridad, organización de la cambusa y primera rada entre Favignana y Levanzo.",
      },
      {
        time: "Día 2",
        title: "Favignana",
        text: "Cala Rossa, Bue Marino y paradas de baño elegidas según mar, viento y afluencia.",
      },
      {
        time: "Día 3",
        title: "Levanzo",
        text: "Rada tranquila, aguas claras y regreso suave a Trapani si eliges el charter de 3 días.",
      },
      {
        time: "Días 4-7",
        title: "Marettimo y ruta extendida",
        text: "Extensión hacia Marettimo, noches al fondeo y programa adaptado día a día con la tripulación.",
      },
    ],
    includes: [
      "Trimarán con camarotes",
      "Patrón",
      "Hostess extra bajo petición",
      "Cocina y zonas comunes",
      "Planificación de ruta según meteorología",
      "Equipo de snorkel",
      "Cambusa no incluida",
    ],
    bringItems: [
      "Equipaje blando",
      "Bañadores y ropa ligera",
      "Sudadera para la noche",
      "Protector solar reef-safe",
      "Documentos personales",
    ],
  },
  "boat-shared-full-day": {
    title: "Excursión compartida Islas Egadi 8 horas",
    subtitle:
      "Una plaza a bordo para un día completo entre calas, snorkel y mar desde Trapani.",
    detailDescription:
      "La forma más sencilla de vivir una excursión en barco por las Islas Egadi: eliges fecha, reservas tu plaza y compartes la jornada con otros huéspedes.",
    seoTitle: "Excursión compartida en barco a las Islas Egadi 8 horas",
    seoDescription:
      "Tour compartido de 8 horas por las Islas Egadi desde Trapani, con paradas de baño, snorkel y reserva online por persona.",
    itinerary: [
      {
        time: "10:00",
        title: "Salida desde Trapani",
        location: "Puerto de Trapani",
        text: "Embarque, briefing de seguridad y ruta definida por el patrón según viento y mar.",
      },
      {
        time: "11:00",
        title: "Favignana",
        text: "Navegación hacia las calas más adecuadas del día, con tiempo para baño y snorkel.",
      },
      {
        time: "13:00",
        title: "Pausa en el mar",
        text: "Tiempo relajado a bordo y posibilidad de comer según la fórmula elegida.",
      },
      {
        time: "15:30",
        title: "Levanzo o costa protegida",
        text: "Segunda parte de la ruta entre aguas claras y zonas más resguardadas.",
      },
      {
        time: "18:00",
        title: "Regreso",
        text: "Llegada al puerto de Trapani tras una jornada completa en el archipiélago.",
      },
    ],
    includes: spanishSharedBoatIncludes,
    bringItems: spanishBringItems,
  },
  "boat-exclusive-full-day": {
    title: "Excursión privada Islas Egadi 8 horas",
    subtitle:
      "Barco reservado para tu grupo durante un día completo entre calas, snorkel y ruta flexible.",
    detailDescription:
      "Una jornada privada y flexible por las Islas Egadi, con salida desde Trapani y paradas decididas con el patrón según viento, mar y ritmo del grupo.",
    seoTitle: "Excursión privada en barco a las Islas Egadi 8 horas",
    seoDescription:
      "Reserva una excursión privada de 8 horas por las Islas Egadi desde Trapani, con patrón, paradas de baño y ruta flexible.",
    includes: spanishPrivateBoatIncludes,
    bringItems: spanishBringItems,
  },
  "boat-exclusive-morning": {
    title: "Excursión privada Islas Egadi 4 horas por la mañana",
    subtitle:
      "Medio día privado por la mañana, con barco reservado y ruta elegida con el patrón.",
    detailDescription:
      "Tour privado de 4 horas desde Trapani, ideal para grupos que quieren mar, privacidad y una salida compacta con baño.",
    seoTitle: "Excursión privada Islas Egadi 4 horas por la mañana",
    seoDescription:
      "Tour privado de 4 horas por la mañana en las Islas Egadi desde Trapani, con patrón, paradas de baño y ruta flexible.",
    includes: spanishPrivateBoatIncludes,
    bringItems: spanishBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Excursión privada Islas Egadi 4 horas por la tarde",
    subtitle:
      "Medio día privado por la tarde para disfrutar de las Egadi con baño, descanso y una ruta flexible.",
    detailDescription:
      "Barco reservado durante 4 horas por la tarde desde Trapani, pensado para grupos que buscan privacidad, baño y una ruta sencilla de organizar.",
    seoTitle: "Excursión privada Islas Egadi 4 horas por la tarde",
    seoDescription:
      "Reserva una excursión privada de 4 horas por la tarde en las Islas Egadi desde Trapani, con patrón, baño y ruta flexible.",
    includes: spanishPrivateBoatIncludes,
    bringItems: spanishBringItems,
  },
};

const frenchBringItems = [
  "Maillot de bain et serviette",
  "Crème solaire respectueuse de la mer",
  "Lunettes de soleil et chapeau",
  "Sac souple facile à ranger",
];

const frenchPrivateBoatIncludes = [
  "Bateau réservé pour votre groupe",
  "Skipper professionnel",
  "Carburant inclus selon l'itinéraire prévu",
  "Arrêts baignade et snorkeling",
  "Eau et boissons fraîches",
  "Route adaptée à la mer et au vent",
];

const frenchSharedBoatIncludes = [
  "Place individuelle à bord",
  "Skipper professionnel",
  "Carburant inclus",
  "Arrêts baignade et snorkeling",
  "Eau à bord",
  "Route choisie selon les conditions de mer",
];

const germanBringItems = [
  "Badebekleidung und Handtuch",
  "Meeresfreundliche Sonnencreme",
  "Sonnenbrille und Hut",
  "Weiche Tasche, die leicht zu verstauen ist",
];

const germanPrivateBoatIncludes = [
  "Boot exklusiv für Ihre Gruppe",
  "Professioneller Skipper",
  "Treibstoff gemäß geplanter Route inklusive",
  "Badestopps und Schnorcheln",
  "Wasser und Softdrinks",
  "Route angepasst an Meer und Wind",
];

const germanSharedBoatIncludes = [
  "Einzelplatz an Bord",
  "Professioneller Skipper",
  "Treibstoff inklusive",
  "Badestopps und Schnorcheln",
  "Wasser an Bord",
  "Route je nach Seebedingungen gewählt",
];

const FRENCH_EXPERIENCE_OVERRIDES: Partial<
  Record<
    ExperienceServiceId,
    Partial<
      Pick<
        ResolvedExperienceContent,
        | "title"
        | "subtitle"
        | "detailDescription"
        | "seoTitle"
        | "seoDescription"
        | "itinerary"
        | "includes"
        | "bringItems"
      >
    >
  >
> = {
  "exclusive-experience": {
    title: "Chef à Bord - Premium Experience",
    subtitle:
      "Journée privée sur le Neel 47 avec chef, skipper et hôtesse entre Favignana et Levanzo.",
    detailDescription:
      "Une expérience gourmet privée en trimaran pour découvrir les îles Égades avec un rythme lent, déjeuner à bord et le confort du Neel 47.",
    seoTitle: "Chef à bord sur Neel 47 aux îles Égades",
    seoDescription:
      "Expérience gourmet privée en trimaran Neel 47 depuis Trapani, avec chef à bord, skipper, hôtesse, déjeuner sicilien et itinéraire entre Favignana et Levanzo.",
    itinerary: [
      { time: "09:30", title: "Accueil à bord", text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani." },
      {
        time: "11:30",
        title: "Cala Azzurra",
        location: "Favignana",
        text: "Premier bain dans une eau claire, avec route ajustée par l'équipage selon le vent et la mer.",
      },
      {
        time: "12:30",
        title: "Cala Rossa",
        location: "Favignana",
        text: "Mouillage dans l'une des criques les plus célèbres de Favignana pour vivre le moment gourmet de la journée.",
      },
      { time: "13:00", title: "Cuisine en direct à bord", text: "Le chef prépare le déjeuner avec poisson local et produits siciliens." },
      {
        time: "14:30",
        title: "Relax et baignade",
        location: "Favignana",
        text: "Temps pour nager, se détendre sur le pont et profiter de l'espace du trimaran.",
      },
      {
        time: "16:00",
        title: "Levanzo",
        location: "Levanzo",
        text: "Arrêt entre Cala Dogana, Cala Fredda ou une zone protégée selon les conditions du jour.",
      },
      { time: "18:00", title: "Retour à Trapani", text: "Navigation de retour avec apéritif et arrivée au port." },
    ],
    includes: [
      "Neel 47 en privé",
      "Skipper, chef et hôtesse",
      "Déjeuner gourmet à bord",
      "Vin de Trapani, eau et boissons fraîches",
      "Apéritif",
      "Équipement de snorkeling",
      "Carburant inclus",
    ],
    bringItems: frenchBringItems,
  },
  "cabin-charter": {
    title: "Charter aux îles Égades",
    subtitle:
      "De 3 à 7 jours en trimaran entre Favignana, Levanzo et Marettimo, avec itinéraire sur mesure.",
    detailDescription:
      "Un charter privé pour vivre les îles Égades avec plus de temps : nuits au mouillage, cabines, cuisine et route flexible conçue avec l'équipage.",
    seoTitle: "Charter en trimaran aux îles Égades depuis Trapani",
    seoDescription:
      "Charter privé en Neel 47 aux îles Égades, de 3 à 7 jours, avec skipper, cabines, nuits au mouillage et route vers Favignana, Levanzo et Marettimo.",
    itinerary: [
      { time: "Jour 1", title: "Embarquement à Trapani", text: "Briefing sécurité, organisation de l'avitaillement et premier mouillage entre Favignana et Levanzo." },
      { time: "Jour 2", title: "Favignana", text: "Cala Rossa, Bue Marino et arrêts baignade choisis selon mer, vent et affluence." },
      { time: "Jour 3", title: "Levanzo", text: "Mouillage calme, eaux claires et retour doux à Trapani si vous choisissez le charter de 3 jours." },
      { time: "Jours 4-7", title: "Marettimo et route étendue", text: "Extension vers Marettimo, nuits au mouillage et programme adapté jour après jour avec l'équipage." },
    ],
    includes: [
      "Trimaran avec cabines",
      "Skipper",
      "Hôtesse en supplément sur demande",
      "Cuisine et espaces communs",
      "Planification de route selon la météo",
      "Équipement de snorkeling",
      "Avitaillement non inclus",
    ],
    bringItems: [
      "Bagage souple",
      "Maillots et vêtements légers",
      "Sweat pour le soir",
      "Crème solaire respectueuse de la mer",
      "Documents personnels",
    ],
  },
  "boat-shared-full-day": {
    title: "Excursion partagée îles Égades 8 heures",
    subtitle:
      "Une place à bord pour une journée complète entre criques, snorkeling et mer depuis Trapani.",
    detailDescription:
      "La façon la plus simple de vivre une excursion en bateau aux îles Égades : choisissez la date, réservez votre place et partagez la journée avec d'autres hôtes.",
    seoTitle: "Excursion partagée en bateau aux îles Égades 8 heures",
    seoDescription:
      "Tour partagé de 8 heures aux îles Égades depuis Trapani, avec arrêts baignade, snorkeling et réservation en ligne par personne.",
    itinerary: [
      { time: "10:00", title: "Départ de Trapani", location: "Port de Trapani", text: "Embarquement, briefing sécurité et route définie par le skipper selon le vent et la mer." },
      { time: "11:00", title: "Favignana", text: "Navigation vers les criques les plus adaptées du jour, avec temps pour baignade et snorkeling." },
      { time: "13:00", title: "Pause en mer", text: "Temps détendu à bord et possibilité de déjeuner selon la formule choisie." },
      { time: "15:30", title: "Levanzo ou côte protégée", text: "Deuxième partie de la route entre eaux claires et zones plus abritées." },
      { time: "18:00", title: "Retour", text: "Arrivée au port de Trapani après une journée complète dans l'archipel." },
    ],
    includes: frenchSharedBoatIncludes,
    bringItems: frenchBringItems,
  },
  "boat-exclusive-full-day": {
    title: "Excursion privée îles Égades 8 heures",
    subtitle:
      "Bateau réservé pour votre groupe pendant une journée complète entre criques, snorkeling et route flexible.",
    detailDescription:
      "Une journée privée et flexible aux îles Égades, avec départ de Trapani et arrêts décidés avec le skipper selon le vent, la mer et le rythme du groupe.",
    seoTitle: "Excursion privée en bateau aux îles Égades 8 heures",
    seoDescription:
      "Réservez une excursion privée de 8 heures aux îles Égades depuis Trapani, avec skipper, arrêts baignade et route flexible.",
    includes: frenchPrivateBoatIncludes,
    bringItems: frenchBringItems,
  },
  "boat-exclusive-morning": {
    title: "Excursion privée îles Égades 4 heures le matin",
    subtitle:
      "Demi-journée privée le matin, avec bateau réservé et route choisie avec le skipper.",
    detailDescription:
      "Tour privé de 4 heures depuis Trapani, idéal pour les groupes qui veulent mer, intimité et sortie compacte avec baignade.",
    seoTitle: "Excursion privée îles Égades 4 heures le matin",
    seoDescription:
      "Tour privé de 4 heures le matin aux îles Égades depuis Trapani, avec skipper, arrêts baignade et route flexible.",
    includes: frenchPrivateBoatIncludes,
    bringItems: frenchBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Excursion privée îles Égades 4 heures l'après-midi",
    subtitle:
      "Demi-journée privée l'après-midi pour profiter des Égades avec baignade, détente et route flexible.",
    detailDescription:
      "Bateau réservé pendant 4 heures l'après-midi depuis Trapani, pensé pour les groupes qui cherchent intimité, baignade et organisation simple.",
    seoTitle: "Excursion privée îles Égades 4 heures l'après-midi",
    seoDescription:
      "Réservez une excursion privée de 4 heures l'après-midi aux îles Égades depuis Trapani, avec skipper, baignade et route flexible.",
    includes: frenchPrivateBoatIncludes,
    bringItems: frenchBringItems,
  },
};

const GERMAN_EXPERIENCE_OVERRIDES: Partial<
  Record<
    ExperienceServiceId,
    Partial<
      Pick<
        ResolvedExperienceContent,
        | "title"
        | "subtitle"
        | "detailDescription"
        | "seoTitle"
        | "seoDescription"
        | "itinerary"
        | "includes"
        | "bringItems"
      >
    >
  >
> = {
  "exclusive-experience": {
    title: "Chef an Bord - Premium Experience",
    subtitle:
      "Privater Tag auf dem Neel 47 mit Chefkoch, Skipper und Hostess zwischen Favignana und Levanzo.",
    detailDescription:
      "Ein privates Gourmet-Erlebnis auf dem Trimaran, um die Ägadischen Inseln mit ruhigem Rhythmus, Mittagessen an Bord und dem Komfort des Neel 47 zu entdecken.",
    seoTitle: "Chef an Bord auf dem Neel 47 bei den Ägadischen Inseln",
    seoDescription:
      "Privates Gourmet-Erlebnis auf dem Neel 47 ab Trapani mit Chef an Bord, Skipper, Hostess, sizilianischem Mittagessen und Route zwischen Favignana und Levanzo.",
    itinerary: [
      { time: "09:30", title: "Willkommen an Bord", text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani." },
      {
        time: "11:30",
        title: "Cala Azzurra",
        location: "Favignana",
        text: "Erster Badestopp in klarem Wasser, mit einer von der Crew an Wind und Meer angepassten Route.",
      },
      {
        time: "12:30",
        title: "Cala Rossa",
        location: "Favignana",
        text: "Ankern in einer der berühmtesten Buchten von Favignana für den Gourmet-Moment des Tages.",
      },
      { time: "13:00", title: "Live Cooking an Bord", text: "Der Chefkoch bereitet das Mittagessen mit lokalem Fisch und sizilianischen Produkten zu." },
      {
        time: "14:30",
        title: "Entspannung und Baden",
        location: "Favignana",
        text: "Zeit zum Schwimmen, Entspannen an Deck und Genießen der großzügigen Trimaran-Flächen.",
      },
      {
        time: "16:00",
        title: "Levanzo",
        location: "Levanzo",
        text: "Stopp bei Cala Dogana, Cala Fredda oder einer geschützten Zone, je nach Bedingungen des Tages.",
      },
      { time: "18:00", title: "Rückkehr nach Trapani", text: "Rückfahrt mit Aperitif und Ankunft im Hafen." },
    ],
    includes: [
      "Neel 47 privat",
      "Skipper, Chefkoch und Hostess",
      "Gourmet-Mittagessen an Bord",
      "Wein aus Trapani, Wasser und Softdrinks",
      "Aperitif",
      "Schnorchelausrüstung",
      "Treibstoff inklusive",
    ],
    bringItems: germanBringItems,
  },
  "cabin-charter": {
    title: "Charter Ägadische Inseln",
    subtitle:
      "3 bis 7 Tage auf dem Trimaran zwischen Favignana, Levanzo und Marettimo, mit Route nach Maß.",
    detailDescription:
      "Ein privater Charter, um die Ägadischen Inseln mit mehr Zeit zu erleben: Nächte vor Anker, Kabinen, Bordküche und eine flexible Route mit der Crew.",
    seoTitle: "Trimaran-Charter auf den Ägadischen Inseln ab Trapani",
    seoDescription:
      "Privater Neel 47 Charter auf den Ägadischen Inseln, 3 bis 7 Tage, mit Skipper, Kabinen, Nächten vor Anker und Route nach Favignana, Levanzo und Marettimo.",
    itinerary: [
      { time: "Tag 1", title: "Einschiffung in Trapani", text: "Sicherheitsbriefing, Proviantorganisation und erster Ankerplatz zwischen Favignana und Levanzo." },
      { time: "Tag 2", title: "Favignana", text: "Cala Rossa, Bue Marino und Badestopps, gewählt nach Meer, Wind und Besucheraufkommen." },
      { time: "Tag 3", title: "Levanzo", text: "Ruhiger Ankerplatz, klares Wasser und entspannte Rückkehr nach Trapani, wenn Sie den 3-Tage-Charter wählen." },
      { time: "Tage 4-7", title: "Marettimo und erweiterte Route", text: "Erweiterung nach Marettimo, Nächte vor Anker und täglich mit der Crew angepasster Ablauf." },
    ],
    includes: [
      "Trimaran mit Kabinen",
      "Skipper",
      "Hostess gegen Aufpreis auf Anfrage",
      "Bordküche und Gemeinschaftsbereiche",
      "Routenplanung nach Wetterlage",
      "Schnorchelausrüstung",
      "Proviant nicht inklusive",
    ],
    bringItems: [
      "Weiche Reisetasche",
      "Badebekleidung und leichte Kleidung",
      "Pullover für den Abend",
      "Meeresfreundliche Sonnencreme",
      "Persönliche Dokumente",
    ],
  },
  "boat-shared-full-day": {
    title: "Geteilte Bootstour Ägadische Inseln 8 Stunden",
    subtitle:
      "Ein Platz an Bord für einen ganzen Tag zwischen Buchten, Schnorcheln und Meer ab Trapani.",
    detailDescription:
      "Die einfachste Art, eine Bootstour zu den Ägadischen Inseln zu erleben: Datum wählen, Platz buchen und den Tag mit anderen Gästen teilen.",
    seoTitle: "Geteilte Bootstour Ägadische Inseln 8 Stunden ab Trapani",
    seoDescription:
      "Geteilte 8-Stunden-Bootstour zu den Ägadischen Inseln ab Trapani mit Badestopps, Schnorcheln und Online-Buchung pro Person.",
    itinerary: [
      { time: "10:00", title: "Abfahrt von Trapani", location: "Hafen von Trapani", text: "Einschiffung, Sicherheitsbriefing und Route durch den Skipper nach Wind und Meer." },
      { time: "11:00", title: "Favignana", text: "Fahrt zu den passendsten Buchten des Tages, mit Zeit zum Baden und Schnorcheln." },
      { time: "13:00", title: "Pause auf dem Meer", text: "Entspannte Zeit an Bord und Möglichkeit zum Mittagessen je nach gewählter Formel." },
      { time: "15:30", title: "Levanzo oder geschützte Küste", text: "Zweite Etappe der Route zwischen klarem Wasser und ruhigeren Bereichen." },
      { time: "18:00", title: "Rückkehr", text: "Ankunft im Hafen von Trapani nach einem ganzen Tag im Archipel." },
    ],
    includes: germanSharedBoatIncludes,
    bringItems: germanBringItems,
  },
  "boat-exclusive-full-day": {
    title: "Private Bootstour Ägadische Inseln 8 Stunden",
    subtitle:
      "Boot exklusiv für Ihre Gruppe für einen ganzen Tag zwischen Buchten, Schnorcheln und flexibler Route.",
    detailDescription:
      "Ein privater und flexibler Tag auf den Ägadischen Inseln, mit Abfahrt ab Trapani und Stopps, die mit dem Skipper nach Wind, Meer und Rhythmus der Gruppe gewählt werden.",
    seoTitle: "Private Bootstour Ägadische Inseln 8 Stunden ab Trapani",
    seoDescription:
      "Buchen Sie eine private 8-Stunden-Bootstour zu den Ägadischen Inseln ab Trapani, mit Skipper, Badestopps und flexibler Route.",
    includes: germanPrivateBoatIncludes,
    bringItems: germanBringItems,
  },
  "boat-exclusive-morning": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden vormittags",
    subtitle:
      "Privater Halbtagesausflug am Vormittag mit reserviertem Boot und Route nach Absprache mit dem Skipper.",
    detailDescription:
      "Private 4-Stunden-Tour ab Trapani, ideal für Gruppen, die Meer, Privatsphäre und eine kompakte Ausfahrt mit Badestopp suchen.",
    seoTitle: "Private Bootstour Ägadische Inseln 4 Stunden vormittags",
    seoDescription:
      "Private 4-Stunden-Bootstour am Vormittag zu den Ägadischen Inseln ab Trapani, mit Skipper, Badestopps und flexibler Route.",
    includes: germanPrivateBoatIncludes,
    bringItems: germanBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden nachmittags",
    subtitle:
      "Privater Halbtagesausflug am Nachmittag, um die Ägadischen Inseln mit Baden, Entspannung und flexibler Route zu genießen.",
    detailDescription:
      "Reserviertes Boot für 4 Stunden am Nachmittag ab Trapani, gedacht für Gruppen, die Privatsphäre, Baden und eine einfache Organisation suchen.",
    seoTitle: "Private Bootstour Ägadische Inseln 4 Stunden nachmittags",
    seoDescription:
      "Buchen Sie eine private 4-Stunden-Bootstour am Nachmittag zu den Ägadischen Inseln ab Trapani, mit Skipper, Baden und flexibler Route.",
    includes: germanPrivateBoatIncludes,
    bringItems: germanBringItems,
  },
};

function applyLocalizedExperienceOverride(
  content: ResolvedExperienceContent,
  locale?: string | null,
): ResolvedExperienceContent {
  const overrides =
    locale === "es"
      ? SPANISH_EXPERIENCE_OVERRIDES
      : locale === "fr"
        ? FRENCH_EXPERIENCE_OVERRIDES
        : locale === "de"
          ? GERMAN_EXPERIENCE_OVERRIDES
        : undefined;
  const override = overrides?.[content.serviceId as ExperienceServiceId];
  return override ? { ...content, ...override } : content;
}

export function getExperienceContent(
  serviceId: string,
  locale?: string | null,
): ResolvedExperienceContent | null {
  const entry = getExperienceCatalogEntry(serviceId);
  if (!entry) return null;

  return applyLocalizedExperienceOverride({
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
  }, locale);
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

function experienceHref(serviceId: string, locale?: string | null): string {
  const base =
    locale === "it"
      ? "/esperienze"
      : locale === "es"
        ? "/experiencias"
        : locale === "de"
          ? "/erlebnisse"
          : "/experiences";
  return `${base}/${getExperiencePublicSlug(serviceId, locale)}`;
}

const SPANISH_PACKAGE_OVERRIDES: Record<
  string,
  Partial<
    Pick<
      ResolvedExperiencePackageContent,
      | "title"
      | "subtitle"
      | "seoTitle"
      | "seoDescription"
      | "durationLabel"
      | "detailLabel"
      | "priceUnitLabel"
      | "primaryCtaLabel"
    >
  >
> = {
  "esperienza-gourmet-trimarano": {
    title: "Chef a Bordo - Premium Experience",
    subtitle:
      "Neel 47 con chef, patrón y azafata para una jornada premium entre sabores locales, mar y calas protegidas.",
    seoTitle: "Chef a bordo en Neel 47 por las Islas Egadi",
    seoDescription:
      "Día privado en trimarán Neel 47 con chef a bordo, patrón, azafata y ruta entre Favignana y Levanzo.",
    durationLabel: "8 horas",
    detailLabel: "Chef, patrón y azafata",
    priceUnitLabel: "por paquete",
    primaryCtaLabel: "Ver paquete",
  },
  "charter-egadi": {
    title: "Charter Islas Egadi",
    subtitle:
      "De 3 a 7 días en el trimarán, con itinerario a medida entre Favignana, Levanzo y Marettimo.",
    seoTitle: "Charter en trimarán Neel 47 por las Islas Egadi",
    seoDescription:
      "Charter en trimarán por las Islas Egadi de 3 a 7 días, con patrón, camarotes y ruta flexible desde Trapani.",
    durationLabel: "3-7 días",
    detailLabel: "Itinerario a medida",
    priceUnitLabel: "por paquete",
    primaryCtaLabel: "Ver paquete",
  },
  "tour-barca-egadi-4-ore": {
    title: "Excursión privada Islas Egadi 4 horas",
    subtitle:
      "La fórmula ágil de medio día, con barco reservado, baño, descanso y ruta elegida según el mar.",
    seoTitle: "Excursión privada Islas Egadi 4 horas desde Trapani",
    seoDescription:
      "Tour privado de 4 horas por las Islas Egadi desde Trapani, con barco exclusivo, paradas de baño y ruta flexible.",
    durationLabel: "4 horas",
    detailLabel: "Barco privado",
    priceUnitLabel: "por barco",
    primaryCtaLabel: "Ver paquete",
  },
  "tour-barca-egadi-8-ore": {
    title: "Excursión en barco Islas Egadi 8 horas",
    subtitle:
      "Un día completo entre calas, snorkel y tiempo relajado a bordo. Puedes elegir plazas compartidas o barco privado.",
    seoTitle: "Excursión en barco Islas Egadi 8 horas desde Trapani",
    seoDescription:
      "Tour de 8 horas por las Islas Egadi desde Trapani, compartido o privado, con snorkel, paradas de baño y jornada completa.",
    durationLabel: "8 horas",
    detailLabel: "Compartido o privado",
    priceUnitLabel: "por persona o por barco",
    primaryCtaLabel: "Ver paquete",
  },
};

const FRENCH_PACKAGE_OVERRIDES: Record<
  string,
  Partial<
    Pick<
      ResolvedExperiencePackageContent,
      | "title"
      | "subtitle"
      | "seoTitle"
      | "seoDescription"
      | "durationLabel"
      | "detailLabel"
      | "priceUnitLabel"
      | "primaryCtaLabel"
    >
  >
> = {
  "esperienza-gourmet-trimarano": {
    title: "Chef à Bord - Premium Experience",
    subtitle:
      "Neel 47 avec chef, skipper et hôtesse pour une journée premium entre saveurs locales, mer et criques protégées.",
    seoTitle: "Chef à bord sur Neel 47 aux îles Égades",
    seoDescription:
      "Journée privée en trimaran Neel 47 avec chef à bord, skipper, hôtesse et itinéraire entre Favignana et Levanzo.",
    durationLabel: "8 heures",
    detailLabel: "Chef, skipper et hôtesse",
    priceUnitLabel: "par forfait",
    primaryCtaLabel: "Voir le forfait",
  },
  "charter-egadi": {
    title: "Charter aux îles Égades",
    subtitle:
      "De 3 à 7 jours en trimaran, avec itinéraire sur mesure entre Favignana, Levanzo et Marettimo.",
    seoTitle: "Charter en trimaran Neel 47 aux îles Égades",
    seoDescription:
      "Charter en trimaran aux îles Égades de 3 à 7 jours, avec skipper, cabines et route flexible depuis Trapani.",
    durationLabel: "3-7 jours",
    detailLabel: "Itinéraire sur mesure",
    priceUnitLabel: "par forfait",
    primaryCtaLabel: "Voir le forfait",
  },
  "tour-barca-egadi-4-ore": {
    title: "Excursion privée îles Égades 4 heures",
    subtitle:
      "La formule agile de demi-journée, avec bateau réservé, baignade, détente et route choisie selon la mer.",
    seoTitle: "Excursion privée îles Égades 4 heures depuis Trapani",
    seoDescription:
      "Tour privé de 4 heures aux îles Égades depuis Trapani, avec bateau exclusif, arrêts baignade et route flexible.",
    durationLabel: "4 heures",
    detailLabel: "Bateau privé",
    priceUnitLabel: "par bateau",
    primaryCtaLabel: "Voir le forfait",
  },
  "tour-barca-egadi-8-ore": {
    title: "Excursion en bateau îles Égades 8 heures",
    subtitle:
      "Une journée complète entre criques, snorkeling et temps détendu à bord. Places partagées ou bateau privé.",
    seoTitle: "Excursion en bateau îles Égades 8 heures depuis Trapani",
    seoDescription:
      "Tour de 8 heures aux îles Égades depuis Trapani, partagé ou privé, avec snorkeling, arrêts baignade et journée complète.",
    durationLabel: "8 heures",
    detailLabel: "Partagé ou privé",
    priceUnitLabel: "par personne ou par bateau",
    primaryCtaLabel: "Voir le forfait",
  },
};

const GERMAN_PACKAGE_OVERRIDES: Record<
  string,
  Partial<
    Pick<
      ResolvedExperiencePackageContent,
      | "title"
      | "subtitle"
      | "seoTitle"
      | "seoDescription"
      | "durationLabel"
      | "detailLabel"
      | "priceUnitLabel"
      | "primaryCtaLabel"
    >
  >
> = {
  "esperienza-gourmet-trimarano": {
    title: "Chef an Bord - Premium Experience",
    subtitle:
      "Neel 47 mit Chefkoch, Skipper und Hostess für einen Premium-Tag zwischen lokalen Aromen, Meer und geschützten Buchten.",
    seoTitle: "Chef an Bord auf dem Neel 47 bei den Ägadischen Inseln",
    seoDescription:
      "Privater Tag auf dem Neel 47 Trimaran mit Chef an Bord, Skipper, Hostess und Route zwischen Favignana und Levanzo.",
    durationLabel: "8 Stunden",
    detailLabel: "Chefkoch, Skipper und Hostess",
    priceUnitLabel: "pro Paket",
    primaryCtaLabel: "Paket ansehen",
  },
  "charter-egadi": {
    title: "Charter Ägadische Inseln",
    subtitle:
      "3 bis 7 Tage auf dem Trimaran, mit Route nach Maß zwischen Favignana, Levanzo und Marettimo.",
    seoTitle: "Neel 47 Trimaran-Charter auf den Ägadischen Inseln",
    seoDescription:
      "Trimaran-Charter auf den Ägadischen Inseln von 3 bis 7 Tagen, mit Skipper, Kabinen und flexibler Route ab Trapani.",
    durationLabel: "3-7 Tage",
    detailLabel: "Route nach Maß",
    priceUnitLabel: "pro Paket",
    primaryCtaLabel: "Paket ansehen",
  },
  "tour-barca-egadi-4-ore": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden",
    subtitle:
      "Die agile Halbtagesformel mit reserviertem Boot, Baden, Entspannung und Route je nach Meer.",
    seoTitle: "Private Bootstour Ägadische Inseln 4 Stunden ab Trapani",
    seoDescription:
      "Private 4-Stunden-Tour zu den Ägadischen Inseln ab Trapani, mit exklusivem Boot, Badestopps und flexibler Route.",
    durationLabel: "4 Stunden",
    detailLabel: "Privates Boot",
    priceUnitLabel: "pro Boot",
    primaryCtaLabel: "Paket ansehen",
  },
  "tour-barca-egadi-8-ore": {
    title: "Bootstour Ägadische Inseln 8 Stunden",
    subtitle:
      "Ein ganzer Tag zwischen Buchten, Schnorcheln und entspannter Zeit an Bord. Geteilte Plätze oder privates Boot.",
    seoTitle: "Bootstour Ägadische Inseln 8 Stunden ab Trapani",
    seoDescription:
      "8-Stunden-Bootstour zu den Ägadischen Inseln ab Trapani, geteilt oder privat, mit Schnorcheln, Badestopps und ganztägiger Route.",
    durationLabel: "8 Stunden",
    detailLabel: "Geteilt oder privat",
    priceUnitLabel: "pro Person oder pro Boot",
    primaryCtaLabel: "Paket ansehen",
  },
};

function applyLocalizedPackageOverride(
  content: ResolvedExperiencePackageContent,
  locale?: string | null,
): ResolvedExperiencePackageContent {
  const overrides =
    locale === "es"
      ? SPANISH_PACKAGE_OVERRIDES
      : locale === "fr"
        ? FRENCH_PACKAGE_OVERRIDES
        : locale === "de"
          ? GERMAN_PACKAGE_OVERRIDES
        : undefined;
  const primaryServiceByPackage: Record<string, string> = {
    "esperienza-gourmet-trimarano": "exclusive-experience",
    "charter-egadi": "cabin-charter",
    "tour-barca-egadi-4-ore": "boat-exclusive-afternoon",
    "tour-barca-egadi-8-ore": "boat-shared-full-day",
    "charter-pesca-egadi": "fishing-full-day",
  };
  const primaryHref = experienceHref(
    primaryServiceByPackage[content.key] ?? content.serviceIds[0] ?? "",
    locale,
  );
  const variants = content.variants.map((variant) => {
    if (variant.serviceId === "boat-exclusive-morning") {
      return {
        ...variant,
        label: locale === "fr" ? "Privé le matin" : locale === "de" ? "Privat am Vormittag" : "Privado por la mañana",
        description:
          locale === "fr"
            ? "Bateau réservé le matin, avec retour autour de 13:00."
            : locale === "de"
              ? "Boot am Vormittag reserviert, Rückkehr gegen 13:00 Uhr."
            : "Barco reservado por la mañana, con regreso alrededor de las 13:00.",
        href: experienceHref(variant.serviceId, locale),
      };
    }
    if (variant.serviceId === "boat-exclusive-afternoon") {
      return {
        ...variant,
        label: locale === "fr" ? "Privé l'après-midi" : locale === "de" ? "Privat am Nachmittag" : "Privado por la tarde",
        description:
          locale === "fr"
            ? "Bateau réservé pour votre groupe."
            : locale === "de"
              ? "Boot exklusiv für Ihre Gruppe."
              : "Barco reservado para tu grupo.",
        href: experienceHref(variant.serviceId, locale),
      };
    }
    if (variant.serviceId === "boat-shared-full-day") {
      return {
        ...variant,
        label: locale === "fr" ? "Partagé" : locale === "de" ? "Geteilt" : "Compartido",
        description:
          locale === "fr"
            ? "Places individuelles pour une journée complète."
            : locale === "de"
              ? "Einzelplätze für einen ganzen Tag."
              : "Plazas individuales para un día completo.",
        href: experienceHref(variant.serviceId, locale),
      };
    }
    if (variant.serviceId === "boat-exclusive-full-day") {
      return {
        ...variant,
        label: locale === "fr" ? "Privé" : locale === "de" ? "Privat" : "Privado",
        description:
          locale === "fr"
            ? "Journée complète avec bateau réservé."
            : locale === "de"
              ? "Ganzer Tag mit reserviertem Boot."
              : "Día completo con barco reservado.",
        href: experienceHref(variant.serviceId, locale),
      };
    }
    return { ...variant, href: experienceHref(variant.serviceId, locale) };
  });

  if (!overrides) return { ...content, primaryHref, variants };
  const override = overrides[content.key];
  return {
    ...content,
    ...override,
    primaryHref,
    variants,
  };
}

export function getExperiencePackageContents(
  locale?: string | null,
): ResolvedExperiencePackageContent[] {
  return [...EXPERIENCE_PACKAGE_CATALOG]
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const variants = "variants" in entry ? entry.variants : [];
      return applyLocalizedPackageOverride({
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
      }, locale);
    });
}

export function getExperiencePackageServiceIds(): string[] {
  return Array.from(
    new Set(EXPERIENCE_PACKAGE_CATALOG.flatMap((entry) => [...entry.serviceIds])),
  ).filter(isPublicBookingServiceEnabled);
}
