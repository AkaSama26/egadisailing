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
      it: "Partenza dal Porto di Trapani",
      en: "Departure from Trapani harbour",
      es: "Salida desde el Puerto de Trapani",
      fr: "Départ du port de Trapani",
      de: "Abfahrt vom Hafen Trapani",
    },
    location: {
      it: "Via dei Gladioli 15, 91100 Trapani",
      en: "Via dei Gladioli 15, 91100 Trapani",
      es: "Via dei Gladioli 15, 91100 Trapani",
      fr: "Via dei Gladioli 15, 91100 Trapani",
      de: "Via dei Gladioli 15, 91100 Trapani",
    },
    text: {
      it: "Imbarco, briefing sicurezza e partenza per un tour in barca di 8 ore verso Favignana e Levanzo, con rotta definita dallo skipper in base a vento e mare.",
      en: "Boarding, safety briefing and departure for an 8-hour boat tour towards Favignana and Levanzo, with the skipper shaping the route around wind and sea conditions.",
      es: "Embarque, briefing de seguridad y salida para una excursión en barco de 8 horas hacia Favignana y Levanzo, con ruta definida por el patrón según viento y mar.",
      fr: "Embarquement, briefing sécurité et départ pour une excursion en bateau de 8 heures vers Favignana et Levanzo, avec route définie par le skipper selon vent et mer.",
      de: "Einschiffung, Sicherheitsbriefing und Start zu einer 8-stündigen Bootstour nach Favignana und Levanzo, mit Route nach Wind und Meer.",
    },
  },
  {
    time: "11:00",
    title: {
      it: "Favignana: Cala Rossa, Cala Azzurra e Bue Marino",
      en: "Favignana: Cala Rossa, Cala Azzurra and Bue Marino",
      es: "Favignana: Cala Rossa, Cala Azzurra y Bue Marino",
      fr: "Favignana : Cala Rossa, Cala Azzurra et Bue Marino",
      de: "Favignana: Cala Rossa, Cala Azzurra und Bue Marino",
    },
    location: {
      it: "Favignana",
      en: "Favignana",
      es: "Favignana",
      fr: "Favignana",
      de: "Favignana",
    },
    text: {
      it: "Prime possibili soste bagno e snorkeling tra Cala Rossa, Cala Azzurra, Bue Marino, Scalo Cavallo o Grotta degli Innamorati, sempre secondo meteo, mare e affollamento.",
      en: "Possible first swim and snorkelling stops around Cala Rossa, Cala Azzurra, Bue Marino, Scalo Cavallo or Grotta degli Innamorati, always according to weather, sea state and crowds.",
      es: "Primeras posibles paradas de baño y snorkel entre Cala Rossa, Cala Azzurra, Bue Marino, Scalo Cavallo o Grotta degli Innamorati, siempre según meteorología, mar y afluencia.",
      fr: "Premiers arrêts baignade et snorkeling possibles entre Cala Rossa, Cala Azzurra, Bue Marino, Scalo Cavallo ou Grotta degli Innamorati, toujours selon météo, mer et affluence.",
      de: "Mögliche erste Bade- und Schnorchelstopps bei Cala Rossa, Cala Azzurra, Bue Marino, Scalo Cavallo oder Grotta degli Innamorati, immer je nach Wetter, Meer und Andrang.",
    },
  },
  {
    time: "13:00",
    title: {
      it: "Pausa in rada e pranzo libero",
      en: "Anchorage break and free lunch",
      es: "Pausa fondeados y comida libre",
      fr: "Pause au mouillage et déjeuner libre",
      de: "Ankerpause und freie Mittagspause",
    },
    text: {
      it: "Tempo per relax, snorkeling e pranzo libero in rada. Eventuali servizi extra a bordo sono organizzati solo se concordati prima della partenza.",
      en: "Time to relax, snorkel and enjoy lunch independently at anchor. Any extra on-board services are arranged only if agreed before departure.",
      es: "Tiempo para relajarse, hacer snorkel y comer libremente fondeados. Los servicios extra a bordo se organizan solo si se acuerdan antes de la salida.",
      fr: "Temps pour se détendre, faire du snorkeling et déjeuner librement au mouillage. Les services extra à bord sont organisés uniquement s'ils sont convenus avant le départ.",
      de: "Zeit zum Entspannen, Schnorcheln und freien Mittagessen vor Anker. Zusätzliche Bordservices werden nur organisiert, wenn sie vor der Abfahrt vereinbart wurden.",
    },
  },
  {
    time: "15:00",
    title: {
      it: "Levanzo: Cala Fredda, Cala Minnola e Faraglione",
      en: "Levanzo: Cala Fredda, Cala Minnola and the Faraglione",
      es: "Levanzo: Cala Fredda, Cala Minnola y el Faraglione",
      fr: "Levanzo : Cala Fredda, Cala Minnola et le Faraglione",
      de: "Levanzo: Cala Fredda, Cala Minnola und Faraglione",
    },
    location: {
      it: "Levanzo",
      en: "Levanzo",
      es: "Levanzo",
      fr: "Levanzo",
      de: "Levanzo",
    },
    text: {
      it: "Seconda parte dell'itinerario tra Cala Fredda, Cala Minnola, Cala Dogana o il Faraglione di Levanzo, con soste bagno scelte in base al lato più riparato.",
      en: "Second part of the itinerary around Cala Fredda, Cala Minnola, Cala Dogana or the Faraglione di Levanzo, with swim stops chosen on the most sheltered side.",
      es: "Segunda parte del itinerario entre Cala Fredda, Cala Minnola, Cala Dogana o el Faraglione de Levanzo, con paradas de baño elegidas en la zona más resguardada.",
      fr: "Deuxième partie de l'itinéraire entre Cala Fredda, Cala Minnola, Cala Dogana ou le Faraglione de Levanzo, avec arrêts baignade choisis du côté le plus abrité.",
      de: "Zweiter Teil der Route bei Cala Fredda, Cala Minnola, Cala Dogana oder dem Faraglione di Levanzo, mit Badestopps auf der geschütztesten Seite.",
    },
  },
  {
    time: "17:00",
    title: {
      it: "Navigazione panoramica",
      en: "Scenic navigation",
      es: "Navegación panorámica",
      fr: "Navigation panoramique",
      de: "Panoramafahrt",
    },
    text: {
      it: "Ultimo bagno se le condizioni lo permettono, poi rientro morbido verso il Porto di Trapani con vista sulle Isole Egadi.",
      en: "Final swim if conditions allow, then an easy return towards Trapani harbour with views of the Egadi Islands.",
      es: "Último baño si las condiciones lo permiten y regreso suave hacia el Puerto de Trapani con vistas a las Islas Egadi.",
      fr: "Dernier bain si les conditions le permettent, puis retour doux vers le port de Trapani avec vue sur les îles Égades.",
      de: "Letzter Badestopp, wenn die Bedingungen es erlauben, dann entspannte Rückfahrt zum Hafen Trapani mit Blick auf die Ägadischen Inseln.",
    },
  },
  {
    time: "18:00",
    title: {
      it: "Rientro al Porto di Trapani",
      en: "Return to Trapani harbour",
      es: "Regreso al Puerto de Trapani",
      fr: "Retour au port de Trapani",
      de: "Rückkehr zum Hafen Trapani",
    },
    location: {
      it: "Porto di Trapani",
      en: "Trapani harbour",
      es: "Puerto de Trapani",
      fr: "Port de Trapani",
      de: "Hafen Trapani",
    },
    text: {
      it: "Sbarco a Trapani dopo la giornata tra Favignana e Levanzo.",
      en: "Disembarkation in Trapani after the day between Favignana and Levanzo.",
      es: "Desembarque en Trapani después de la jornada entre Favignana y Levanzo.",
      fr: "Débarquement à Trapani après la journée entre Favignana et Levanzo.",
      de: "Ausschiffung in Trapani nach dem Tag zwischen Favignana und Levanzo.",
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
      it: "Chef a bordo alle Egadi in trimarano da Trapani",
      en: "Chef on board in an Egadi trimaran from Trapani",
    },
    subtitle: {
      it: "Il trimarano tutto per te, con chef a bordo e comfort da catamarano tra Favignana e Levanzo.",
      en: "The trimaran reserved for you, with an on-board chef and catamaran-style comfort between Favignana and Levanzo.",
    },
    detailDescription: {
      it: "Una giornata privata sul trimarano con comfort da catamarano: skipper, hostess e chef coordinano ritmo, pranzo a bordo e soste bagno tra Favignana e Levanzo.",
      en: "A private day on the trimaran with catamaran-style comfort: skipper, hostess and chef coordinate the pace, lunch on board and swim stops between Favignana and Levanzo.",
    },
    seoTitle: {
      it: "Chef a bordo alle Egadi in trimarano da Trapani",
      en: "Chef on Board in an Egadi Trimaran from Trapani",
    },
    seoDescription: {
      it: "Chef a bordo alle Egadi in trimarano da Trapani: pranzo a bordo, skipper, hostess, Favignana e Levanzo, snorkeling e comfort da catamarano.",
      en: "Chef on board in an Egadi trimaran from Trapani: lunch on board, skipper, hostess, Favignana and Levanzo, snorkelling and catamaran-style comfort.",
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
      it: "Charter Egadi in trimarano da Trapani",
      en: "Egadi trimaran charter from Trapani",
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
      it: "Charter Egadi in trimarano da Trapani",
      en: "Egadi Trimaran Charter from Trapani",
    },
    seoDescription: {
      it: "Charter Egadi in trimarano da Trapani da 3 a 7 giorni: Favignana, Levanzo, Marettimo, skipper, cabine, pernottamento e rotta meteo.",
      en: "Egadi trimaran charter from Trapani for 3 to 7 days: Favignana, Levanzo, Marettimo, skipper, cabins, overnight stay and weather-aware route.",
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
    title: {
      it: "Escursione in barca Favignana e Levanzo da Trapani",
      en: "Favignana and Levanzo boat tour from Trapani",
    },
    subtitle: {
      it: "Tour condiviso di 8 ore tra Cala Rossa, Cala Azzurra, Bue Marino, soste bagno e snorkeling.",
      en: "Shared 8-hour boat tour with Cala Rossa, Cala Azzurra, Bue Marino, swim stops and snorkelling.",
    },
    detailDescription: {
      it: "Escursione condivisa in barca da Trapani a Favignana e Levanzo: 8 ore con skipper, soste bagno, snorkeling e possibili tappe a Cala Rossa, Cala Azzurra e Bue Marino.",
      en: "Shared boat tour from Trapani to Favignana and Levanzo: 8 hours with skipper, swim stops, snorkelling and possible stops at Cala Rossa, Cala Azzurra and Bue Marino.",
    },
    seoTitle: {
      it: "Escursione in barca Favignana e Levanzo da Trapani",
      en: "Favignana and Levanzo Boat Tour from Trapani",
    },
    seoDescription: {
      it: "Escursione condivisa in barca Favignana e Levanzo da Trapani: 8 ore, Cala Rossa, Cala Azzurra, Bue Marino, snorkeling e soste bagno.",
      en: "Shared Favignana and Levanzo boat tour from Trapani: 8 hours, Cala Rossa, Cala Azzurra, Bue Marino, snorkelling and swim stops.",
    },
    media: [
      {
        caption: { it: "Giornata intera", en: "Full day" },
        alt: {
          it: "Gruppo a bordo durante escursione in barca Favignana e Levanzo da Trapani di 8 ore",
          en: "Group on board during an 8-hour Favignana and Levanzo boat tour from Trapani",
          es: "Grupo a bordo durante excursión en barco Favignana y Levanzo desde Trapani de 8 horas",
          fr: "Groupe à bord pendant une excursion en bateau Favignana et Levanzo depuis Trapani de 8 heures",
          de: "Gruppe an Bord während einer 8-stündigen Bootstour Favignana und Levanzo ab Trapani",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      },
      {
        caption: { it: "Snorkeling", en: "Snorkelling" },
        alt: {
          it: "Snorkeling durante il tour condiviso Favignana e Levanzo con soste bagno",
          en: "Snorkelling during the shared Favignana and Levanzo boat tour with swim stops",
          es: "Snorkel durante la excursión compartida Favignana y Levanzo con paradas de baño",
          fr: "Snorkeling pendant l'excursion partagée Favignana et Levanzo avec arrêts baignade",
          de: "Schnorcheln während der geteilten Bootstour Favignana und Levanzo mit Badestopps",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      },
      {
        caption: { it: "Rientro dorato", en: "Golden return" },
        alt: {
          it: "Rientro al Porto di Trapani dopo escursione in barca a Favignana e Levanzo",
          en: "Return to Trapani harbour after a Favignana and Levanzo boat excursion",
          es: "Regreso al Puerto de Trapani tras excursión en barco a Favignana y Levanzo",
          fr: "Retour au port de Trapani après excursion en bateau à Favignana et Levanzo",
          de: "Rückkehr zum Hafen Trapani nach der Bootstour nach Favignana und Levanzo",
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
    title: {
      it: "Tour privato in barca Favignana e Levanzo da Trapani",
      en: "Private Favignana and Levanzo boat tour from Trapani",
    },
    subtitle: {
      it: "Barca riservata per 8 ore tra Cala Rossa, Cala Azzurra, Bue Marino, soste bagno e snorkeling.",
      en: "Reserved boat for 8 hours around Cala Rossa, Cala Azzurra, Bue Marino, swim stops and snorkelling.",
    },
    detailDescription: {
      it: "Tour privato in barca da Trapani a Favignana e Levanzo: 8 ore con skipper, rotta flessibile, soste bagno, snorkeling e possibili tappe a Cala Rossa, Cala Azzurra e Bue Marino.",
      en: "Private boat tour from Trapani to Favignana and Levanzo: 8 hours with skipper, flexible route, swim stops, snorkelling and possible stops at Cala Rossa, Cala Azzurra and Bue Marino.",
    },
    seoTitle: {
      it: "Tour privato in barca Favignana e Levanzo da Trapani",
      en: "Private Favignana and Levanzo Boat Tour from Trapani",
    },
    seoDescription: {
      it: "Tour privato in barca Favignana e Levanzo da Trapani: 8 ore, Cala Rossa, Cala Azzurra, Bue Marino, snorkeling e rotta flessibile.",
      en: "Private Favignana and Levanzo boat tour from Trapani: 8 hours, Cala Rossa, Cala Azzurra, Bue Marino, snorkelling and flexible route.",
    },
    media: [
      {
        caption: { it: "Barca privata", en: "Private boat" },
        alt: {
          it: "Gruppo su barca privata per tour Favignana e Levanzo da Trapani di 8 ore",
          en: "Group on a private boat for an 8-hour Favignana and Levanzo tour from Trapani",
          es: "Grupo en barco privado para tour Favignana y Levanzo desde Trapani de 8 horas",
          fr: "Groupe sur bateau privé pour tour Favignana et Levanzo depuis Trapani de 8 heures",
          de: "Gruppe auf privatem Boot für eine 8-stündige Tour Favignana und Levanzo ab Trapani",
        },
        color: "#A7F3D0",
        src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      },
      {
        caption: { it: "Snorkeling", en: "Snorkelling" },
        alt: {
          it: "Snorkeling durante tour privato Favignana e Levanzo con soste bagno",
          en: "Snorkelling during a private Favignana and Levanzo boat tour with swim stops",
          es: "Snorkel durante tour privado Favignana y Levanzo con paradas de baño",
          fr: "Snorkeling pendant tour privé Favignana et Levanzo avec arrêts baignade",
          de: "Schnorcheln während privater Bootstour Favignana und Levanzo mit Badestopps",
        },
        color: "#BFDBFE",
        src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      },
      {
        caption: { it: "Luce dorata", en: "Golden light" },
        alt: {
          it: "Rientro al Porto di Trapani dopo tour privato in barca Favignana e Levanzo",
          en: "Return to Trapani harbour after a private Favignana and Levanzo boat tour",
          es: "Regreso al Puerto de Trapani tras tour privado en barco Favignana y Levanzo",
          fr: "Retour au port de Trapani après tour privé en bateau Favignana et Levanzo",
          de: "Rückkehr zum Hafen Trapani nach privater Bootstour Favignana und Levanzo",
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
    title: {
      it: "Tour privato in barca alle Egadi 4 ore da Trapani",
      en: "Private 4-hour Egadi boat tour from Trapani",
    },
    subtitle: {
      it: "Mezza giornata privata al mattino, con barca riservata e rotta scelta con lo skipper.",
      en: "A private morning half-day, with a reserved boat and route chosen with the skipper.",
    },
    detailDescription: {
      it: "Tour privato di 4 ore alle Isole Egadi da Trapani, ideale per gruppi che vogliono mare, privacy e soste bagno in una fascia compatta.",
      en: "A private 4-hour tour in the Egadi Islands from Trapani, ideal for groups who want sea, privacy and swim stops in a compact slot.",
    },
    seoTitle: {
      it: "Tour privato Egadi 4 ore mattina da Trapani",
      en: "Private 4-Hour Morning Egadi Boat Tour from Trapani",
    },
    seoDescription: {
      it: "Tour privato in barca alle Egadi di 4 ore al mattino da Trapani, con skipper, carburante, soste bagno, snorkeling e rotta flessibile.",
      en: "Private 4-hour morning boat tour in the Egadi from Trapani, with skipper, fuel, swim stops, snorkelling and flexible route.",
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
    title: {
      it: "Tour privato in barca alle Egadi 4 ore da Trapani",
      en: "Private 4-hour Egadi boat tour from Trapani",
    },
    subtitle: {
      it: "Una mezza giornata privata nel pomeriggio per godersi le Egadi con ritmo rilassato, soste bagno e rotta flessibile.",
      en: "A private afternoon half-day to enjoy the Egadi Islands at a relaxed pace, with swim stops and a flexible route.",
    },
    detailDescription: {
      it: "Barca riservata per 4 ore nel pomeriggio alle Isole Egadi da Trapani, pensata per gruppi che vogliono privacy, soste bagno e una rotta decisa con lo skipper.",
      en: "A private 4-hour afternoon boat tour in the Egadi Islands from Trapani, designed for groups who want privacy, swim stops and a route shaped with the skipper.",
    },
    seoTitle: {
      it: "Tour privato Egadi 4 ore pomeriggio da Trapani",
      en: "Private 4-Hour Afternoon Egadi Boat Tour from Trapani",
    },
    seoDescription: {
      it: "Prenota un tour privato in barca alle Egadi di 4 ore al pomeriggio da Trapani, con skipper, carburante, soste bagno, snorkeling e rotta flessibile.",
      en: "Book a private 4-hour afternoon boat tour in the Egadi from Trapani, with skipper, fuel, swim stops, snorkelling and flexible route.",
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
      it: "Charter pesca Egadi da Trapani",
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
      it: "Charter pesca Egadi da Trapani",
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
          it: "Setup tecnico con canne e attrezzatura da pesca sportiva",
          en: "Technical setup with sport fishing rods and gear",
          es: "Setup técnico con cañas y equipo de pesca deportiva",
          fr: "Setup technique avec cannes et matériel de pêche sportive",
          de: "Technisches Setup mit Sportangelruten und Ausrüstung",
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
          it: "Navigazione verso spot di pesca consentiti alle Isole Egadi",
          en: "Navigation towards permitted fishing spots in the Egadi Islands",
          es: "Navegación hacia zonas de pesca permitidas en las Islas Egadi",
          fr: "Navigation vers les zones de pêche autorisées aux îles Égades",
          de: "Fahrt zu erlaubten Angelspots auf den Ägadischen Inseln",
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

const EXPERIENCE_HUB_8_HOUR_MEDIA = [
  {
    caption: {
      it: "Tour Favignana",
      en: "Favignana tour",
      es: "Tour Favignana",
      fr: "Tour Favignana",
      de: "Favignana Tour",
    },
    alt: {
      it: "Barca alle Isole Egadi durante un'escursione in barca Favignana e Levanzo da Trapani",
      en: "Boat in the Egadi Islands during a Favignana and Levanzo boat tour from Trapani",
      es: "Barco en las Islas Egadi durante una excursión en barco Favignana y Levanzo desde Trapani",
      fr: "Bateau aux îles Égades pendant une excursion en bateau Favignana et Levanzo depuis Trapani",
      de: "Boot auf den Ägadischen Inseln während einer Bootstour Favignana und Levanzo ab Trapani",
    },
    color: "#BAE6FD",
    src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
  },
  {
    caption: {
      it: "Barca alle Egadi",
      en: "Egadi boat",
      es: "Barco Egadi",
      fr: "Bateau Égades",
      de: "Egadi Boot",
    },
    alt: {
      it: "Cigala Bertinetti in primo piano per tour in barca Favignana e Levanzo da Trapani",
      en: "Cigala Bertinetti close-up for a Favignana and Levanzo boat tour from Trapani",
      es: "Cigala Bertinetti en primer plano para tour en barco Favignana y Levanzo desde Trapani",
      fr: "Cigala Bertinetti en premier plan pour tour en bateau Favignana et Levanzo depuis Trapani",
      de: "Cigala Bertinetti in Nahaufnahme für Bootstour Favignana und Levanzo ab Trapani",
    },
    color: "#A7F3D0",
    src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-primo-piano.webp",
  },
  {
    caption: {
      it: "Nuoto a Cala Rossa",
      en: "Swimming at Cala Rossa",
      es: "Baño en Cala Rossa",
      fr: "Baignade à Cala Rossa",
      de: "Schwimmen in Cala Rossa",
    },
    alt: {
      it: "Nuoto in acqua cristallina a Cala Rossa durante escursione Favignana e Levanzo 8 ore",
      en: "Swimming in crystal-clear water at Cala Rossa during an 8-hour Favignana and Levanzo tour",
      es: "Baño en agua cristalina en Cala Rossa durante excursión Favignana y Levanzo de 8 horas",
      fr: "Baignade en eau cristalline à Cala Rossa pendant excursion Favignana et Levanzo de 8 heures",
      de: "Schwimmen in kristallklarem Wasser in Cala Rossa während 8-Stunden-Tour Favignana und Levanzo",
    },
    color: "#BFDBFE",
    src: "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp",
  },
] as const satisfies readonly ExperienceCatalogMedia[];

const EXPERIENCE_HUB_4_HOUR_MEDIA = [
  {
    caption: {
      it: "Tour Egadi 4 ore",
      en: "4-hour Egadi tour",
      es: "Tour Egadi 4 horas",
      fr: "Tour Égades 4 heures",
      de: "Egadi Tour 4 Stunden",
    },
    alt: {
      it: "Tour privato alle Egadi 4 ore da Trapani con barca in navigazione",
      en: "Private 4-hour Egadi boat tour from Trapani with boat sailing",
      es: "Tour privado por las Egadi de 4 horas desde Trapani con barco navegando",
      fr: "Tour privé aux Égades de 4 heures depuis Trapani avec bateau en navigation",
      de: "Private 4-Stunden-Bootstour zu den Egadi ab Trapani mit fahrendem Boot",
    },
    color: "#BAE6FD",
    src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
  },
  {
    caption: {
      it: "Cala Rossa",
      en: "Cala Rossa",
      es: "Cala Rossa",
      fr: "Cala Rossa",
      de: "Cala Rossa",
    },
    alt: {
      it: "Cala Rossa durante un tour privato in barca alle Egadi da Trapani",
      en: "Cala Rossa during a private Egadi boat tour from Trapani",
      es: "Cala Rossa durante un tour privado en barco por las Egadi desde Trapani",
      fr: "Cala Rossa pendant un tour privé en bateau aux Égades depuis Trapani",
      de: "Cala Rossa während einer privaten Bootstour zu den Egadi ab Trapani",
    },
    color: "#FDE68A",
    src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
  },
  {
    caption: {
      it: "Barca privata",
      en: "Private boat",
      es: "Barco privado",
      fr: "Bateau privé",
      de: "Privates Boot",
    },
    alt: {
      it: "Barca privata Cigala Bertinetti per tour alle Isole Egadi di 4 ore",
      en: "Private Cigala Bertinetti boat for a 4-hour Egadi Islands tour",
      es: "Barco privado Cigala Bertinetti para tour de 4 horas por las Islas Egadi",
      fr: "Bateau privé Cigala Bertinetti pour tour de 4 heures aux îles Égades",
      de: "Privates Cigala Bertinetti Boot für 4-Stunden-Tour zu den Ägadischen Inseln",
    },
    color: "#C7D2FE",
    src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
  },
] as const satisfies readonly ExperienceCatalogMedia[];

const EXPERIENCE_HUB_GOURMET_MEDIA = [
  {
    caption: {
      it: "Chef e ingredienti",
      en: "Chef and ingredients",
      es: "Chef e ingredientes",
      fr: "Chef et ingrédients",
      de: "Chef und Zutaten",
    },
    alt: {
      it: "Chef a bordo con ingredienti freschi per esperienza gourmet in trimarano alle Egadi",
      en: "Chef on board with fresh ingredients for a gourmet trimaran experience in the Egadi Islands",
      es: "Chef a bordo con ingredientes frescos para experiencia gourmet en trimarán por las Egadi",
      fr: "Chef à bord avec ingrédients frais pour expérience gourmet en trimaran aux Égades",
      de: "Chef an Bord mit frischen Zutaten für Gourmet-Erlebnis im Trimaran auf den Egadi",
    },
    color: "#FFDAB9",
    src: "/images/boats/neel-47/trimarano-chef-ingredienti.webp",
  },
  {
    caption: {
      it: "Ingredienti locali",
      en: "Local ingredients",
      es: "Ingredientes locales",
      fr: "Ingrédients locaux",
      de: "Lokale Zutaten",
    },
    alt: {
      it: "Ingredienti locali e pesce fresco per pranzo a bordo del trimarano alle Egadi",
      en: "Local ingredients and fresh fish for lunch on board the Egadi trimaran",
      es: "Ingredientes locales y pescado fresco para comida a bordo del trimarán en las Egadi",
      fr: "Ingrédients locaux et poisson frais pour déjeuner à bord du trimaran aux Égades",
      de: "Lokale Zutaten und frischer Fisch für Mittagessen an Bord des Egadi Trimarans",
    },
    color: "#FDE68A",
    src: "/images/boats/neel-47/trimarano-ingredienti.webp",
  },
  {
    caption: {
      it: "Pranzo a bordo",
      en: "Lunch on board",
      es: "Comida a bordo",
      fr: "Déjeuner à bord",
      de: "Mittagessen an Bord",
    },
    alt: {
      it: "Pasta cucinata a bordo durante chef experience in trimarano alle Isole Egadi",
      en: "Pasta cooked on board during a chef experience on an Egadi Islands trimaran",
      es: "Pasta cocinada a bordo durante experiencia chef en trimarán por las Islas Egadi",
      fr: "Pâtes cuisinées à bord pendant expérience chef en trimaran aux îles Égades",
      de: "Pasta an Bord gekocht während Chef-Erlebnis im Trimaran auf den Ägadischen Inseln",
    },
    color: "#DDA0DD",
    src: "/images/boats/neel-47/trimarano-pasta-saltata.webp",
  },
] as const satisfies readonly ExperienceCatalogMedia[];

const EXPERIENCE_HUB_CHARTER_MEDIA = [
  {
    caption: {
      it: "Relax in trimarano",
      en: "Trimaran relaxation",
      es: "Relax en trimarán",
      fr: "Relax en trimaran",
      de: "Relax im Trimaran",
    },
    alt: {
      it: "Relax al sole durante charter Egadi in trimarano da Trapani",
      en: "Relaxing in the sun during an Egadi trimaran charter from Trapani",
      es: "Relax al sol durante charter Egadi en trimarán desde Trapani",
      fr: "Relax au soleil pendant charter Égades en trimaran depuis Trapani",
      de: "Entspannung in der Sonne während Egadi Trimaran-Charter ab Trapani",
    },
    color: "#FED7AA",
    src: "/images/boats/neel-47/trimarano-relax-sole.webp",
  },
  {
    caption: {
      it: "Prendisole a Levanzo",
      en: "Sundeck in Levanzo",
      es: "Solárium en Levanzo",
      fr: "Bain de soleil à Levanzo",
      de: "Sonnendeck vor Levanzo",
    },
    alt: {
      it: "Prendisole del trimarano davanti a Levanzo durante charter alle Egadi",
      en: "Trimaran sundeck off Levanzo during an Egadi charter",
      es: "Solárium del trimarán frente a Levanzo durante charter por las Egadi",
      fr: "Bain de soleil du trimaran face à Levanzo pendant charter aux Égades",
      de: "Sonnendeck des Trimarans vor Levanzo während Egadi Charter",
    },
    color: "#C5CAE9",
    src: "/images/boats/neel-47/trimarano-wow-prendisole-levanzo.webp",
  },
  {
    caption: {
      it: "Trimarano alle Egadi",
      en: "Egadi trimaran",
      es: "Trimarán Egadi",
      fr: "Trimaran Égades",
      de: "Egadi Trimaran",
    },
    alt: {
      it: "Trimarano visto dal drone durante charter alle Isole Egadi",
      en: "Trimaran seen from above during a charter in the Egadi Islands",
      es: "Trimarán visto desde dron durante charter por las Islas Egadi",
      fr: "Trimaran vu par drone pendant charter aux îles Égades",
      de: "Trimaran aus Drohnenperspektive während Charter auf den Ägadischen Inseln",
    },
    color: "#B2DFDB",
    src: "/images/home/trimarano-relax-drone.webp",
  },
] as const satisfies readonly ExperienceCatalogMedia[];

export const EXPERIENCE_PACKAGE_CATALOG = [
  {
    key: "esperienza-gourmet-trimarano",
    order: 30,
    serviceIds: ["exclusive-experience"],
    title: {
      it: "Chef a bordo alle Egadi in trimarano",
      en: "Chef on board in an Egadi trimaran",
    },
    subtitle: {
      it: "Trimarano con comfort da catamarano, chef, skipper e hostess per pranzo a bordo, snorkeling e soste tra Favignana e Levanzo.",
      en: "Trimaran with catamaran-style comfort, chef, skipper and hostess for lunch on board, snorkelling and stops between Favignana and Levanzo.",
    },
    seoTitle: {
      it: "Chef a bordo alle Egadi in trimarano",
      en: "Chef on Board in an Egadi Trimaran",
    },
    seoDescription: {
      it: "Giornata privata alle Egadi con chef a bordo, trimarano con comfort da catamarano, skipper, hostess, Favignana e Levanzo.",
      en: "Private Egadi day with chef on board, trimaran with catamaran-style comfort, skipper, hostess, Favignana and Levanzo.",
    },
    durationLabel: { it: "8 ore", en: "8 hours" },
    detailLabel: { it: "Chef, skipper e hostess", en: "Chef, skipper and hostess" },
    priceUnitLabel: { it: "per pacchetto", en: "per package" },
    primaryCtaLabel: { it: "Scopri il pacchetto", en: "View package" },
    primaryHref: "/experiences/exclusive-experience",
    media: EXPERIENCE_HUB_GOURMET_MEDIA,
  },
  {
    key: "charter-egadi",
    order: 40,
    serviceIds: ["cabin-charter"],
    title: {
      it: "Charter Egadi in trimarano da Trapani",
      en: "Egadi trimaran charter from Trapani",
    },
    subtitle: {
      it: "Da 3 a 7 giornate sul trimarano, con itinerario concordato tra Favignana, Levanzo e Marettimo in base alle tue preferenze.",
      en: "Three to seven days on the trimaran, with an itinerary agreed around Favignana, Levanzo and Marettimo according to your preferences.",
    },
    seoTitle: {
      it: "Charter Egadi in trimarano da Trapani",
      en: "Egadi Trimaran Charter from Trapani",
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
    media: EXPERIENCE_HUB_CHARTER_MEDIA,
  },
  {
    key: "tour-barca-egadi-4-ore",
    order: 20,
    serviceIds: ["boat-exclusive-morning", "boat-exclusive-afternoon"],
    title: {
      it: "Tour privato alle Egadi 4 ore da Trapani",
      en: "Private 4-hour Egadi boat tour from Trapani",
    },
    subtitle: {
      it: "La formula agile per vivere le Egadi in mezza giornata, con barca riservata, bagno, relax e rotta scelta in base al mare.",
      en: "The agile half-day way to experience the Egadi Islands, with a reserved boat, swimming, relaxation and a route shaped by the sea.",
    },
    seoTitle: {
      it: "Tour privato alle Egadi 4 ore da Trapani",
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
    media: EXPERIENCE_HUB_4_HOUR_MEDIA,
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
    order: 10,
    serviceIds: ["boat-shared-full-day", "boat-exclusive-full-day"],
    title: {
      it: "Escursione in barca Favignana e Levanzo 8 ore da Trapani",
      en: "Favignana and Levanzo 8-hour boat tour from Trapani",
    },
    subtitle: {
      it: "Una giornata completa tra baie, snorkeling e tempo lento a bordo. Puoi scegliere posti condivisi o la barca in esclusiva.",
      en: "A full day of bays, snorkelling and slow time on board. Choose shared seats or the whole boat privately.",
    },
    seoTitle: {
      it: "Escursione in barca Favignana e Levanzo 8 ore da Trapani",
      en: "Favignana and Levanzo 8-Hour Boat Tour from Trapani",
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
    media: EXPERIENCE_HUB_8_HOUR_MEDIA,
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
      it: "Charter pesca Egadi da Trapani",
      en: "Egadi fishing charter from Trapani",
      es: "Charter de pesca Islas Egadi desde Trapani",
      fr: "Charter de pêche îles Égades depuis Trapani",
      de: "Angelcharter Ägadische Inseln ab Trapani",
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
  "exclusive-experience": "chef-a-bordo-egadi-trimarano-da-trapani",
  "boat-shared-full-day": "escursione-barca-favignana-levanzo-da-trapani",
  "boat-exclusive-full-day": "tour-privato-favignana-levanzo-da-trapani",
  "cabin-charter": "charter-egadi-trimarano-da-trapani",
  "boat-exclusive-morning": "tour-privato-egadi-4-ore-mattina-da-trapani",
  "boat-exclusive-afternoon": "tour-privato-egadi-4-ore-pomeriggio-da-trapani",
  "fishing-full-day": "charter-pesca-egadi-da-trapani",
};

const EXPERIENCE_PUBLIC_SLUGS_BY_LOCALE: Partial<
  Record<ExperienceServiceId, Partial<Record<"it" | "en" | "es" | "fr" | "de", string>>>
> = {
  "exclusive-experience": {
    en: "chef-on-board-egadi-trimaran-from-trapani",
    es: "chef-a-bordo-egadi-trimaran-desde-trapani",
    fr: "chef-a-bord-egades-trimaran-depuis-trapani",
    de: "chef-an-bord-aegadische-inseln-trimaran-ab-trapani",
  },
  "cabin-charter": {
    it: "charter-egadi-trimarano-da-trapani",
    en: "egadi-trimaran-charter-from-trapani",
    es: "charter-egadi-trimaran-desde-trapani",
    fr: "charter-egades-trimaran-depuis-trapani",
    de: "trimaran-charter-aegadische-inseln-ab-trapani",
  },
  "boat-shared-full-day": {
    en: "favignana-levanzo-boat-tour-from-trapani",
    es: "excursion-compartida-islas-egadi-8-horas",
    fr: "excursion-partagee-iles-egades-8-heures",
    de: "geteilte-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-full-day": {
    en: "private-favignana-levanzo-boat-tour-from-trapani",
    es: "excursion-privada-islas-egadi-8-horas",
    fr: "excursion-privee-iles-egades-8-heures",
    de: "private-bootstour-aegadische-inseln-8-stunden",
  },
  "boat-exclusive-morning": {
    en: "private-egadi-4-hour-morning-boat-tour-from-trapani",
    es: "tour-privado-egadi-4-horas-manana-desde-trapani",
    fr: "excursion-privee-egades-4-heures-matin-depuis-trapani",
    de: "private-bootstour-aegadische-inseln-4-stunden-vormittag-ab-trapani",
  },
  "boat-exclusive-afternoon": {
    en: "private-egadi-4-hour-afternoon-boat-tour-from-trapani",
    es: "tour-privado-egadi-4-horas-tarde-desde-trapani",
    fr: "excursion-privee-egades-4-heures-apres-midi-depuis-trapani",
    de: "private-bootstour-aegadische-inseln-4-stunden-nachmittag-ab-trapani",
  },
  "fishing-full-day": {
    it: "charter-pesca-egadi-da-trapani",
    en: "egadi-fishing-charter-from-trapani",
    es: "charter-pesca-egadi-desde-trapani",
    fr: "charter-peche-egades-depuis-trapani",
    de: "angelcharter-aegadische-inseln-ab-trapani",
  },
};

const EXPERIENCE_SLUG_ALIASES: Record<string, ExperienceServiceId> = {
  "chef-a-bordo-egadi-trimarano-da-trapani": "exclusive-experience",
  "chef-on-board-egadi-trimaran-from-trapani": "exclusive-experience",
  "chef-a-bordo-egadi-trimaran-desde-trapani": "exclusive-experience",
  "chef-a-bord-egades-trimaran-depuis-trapani": "exclusive-experience",
  "chef-an-bord-aegadische-inseln-trimaran-ab-trapani": "exclusive-experience",
  "escursione-barca-favignana-levanzo-da-trapani": "boat-shared-full-day",
  "tour-privato-favignana-levanzo-da-trapani": "boat-exclusive-full-day",
  "favignana-levanzo-boat-tour-from-trapani": "boat-shared-full-day",
  "private-favignana-levanzo-boat-tour-from-trapani": "boat-exclusive-full-day",
  "charter-egadi-trimarano-da-trapani": "cabin-charter",
  "egadi-trimaran-charter-from-trapani": "cabin-charter",
  "charter-egadi-trimaran-desde-trapani": "cabin-charter",
  "charter-egades-trimaran-depuis-trapani": "cabin-charter",
  "trimaran-charter-aegadische-inseln-ab-trapani": "cabin-charter",
  "tour-privato-egadi-4-ore-mattina-da-trapani": "boat-exclusive-morning",
  "tour-privato-egadi-4-ore-pomeriggio-da-trapani": "boat-exclusive-afternoon",
  "private-egadi-4-hour-morning-boat-tour-from-trapani": "boat-exclusive-morning",
  "private-egadi-4-hour-afternoon-boat-tour-from-trapani": "boat-exclusive-afternoon",
  "tour-privado-egadi-4-horas-manana-desde-trapani": "boat-exclusive-morning",
  "tour-privado-egadi-4-horas-tarde-desde-trapani": "boat-exclusive-afternoon",
  "excursion-privee-egades-4-heures-matin-depuis-trapani": "boat-exclusive-morning",
  "excursion-privee-egades-4-heures-apres-midi-depuis-trapani": "boat-exclusive-afternoon",
  "private-bootstour-aegadische-inseln-4-stunden-vormittag-ab-trapani": "boat-exclusive-morning",
  "private-bootstour-aegadische-inseln-4-stunden-nachmittag-ab-trapani": "boat-exclusive-afternoon",
  "charter-pesca-egadi-da-trapani": "fishing-full-day",
  "egadi-fishing-charter-from-trapani": "fishing-full-day",
  "charter-pesca-egadi-desde-trapani": "fishing-full-day",
  "charter-peche-egades-depuis-trapani": "fishing-full-day",
  "angelcharter-aegadische-inseln-ab-trapani": "fishing-full-day",
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
    title: "Chef a bordo en trimarán por las Islas Egadi desde Trapani",
    subtitle:
      "Día privado en trimarán con comodidad de catamarán, chef, patrón y azafata entre Favignana y Levanzo.",
    detailDescription:
      "Una experiencia gourmet privada en trimarán con comodidad de catamarán para descubrir las Islas Egadi con ritmo lento, comida a bordo y ruta entre Favignana y Levanzo.",
    seoTitle: "Chef a bordo en trimarán por las Islas Egadi desde Trapani",
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
    title: "Charter Islas Egadi en trimarán desde Trapani",
    subtitle:
      "De 3 a 7 días en trimarán entre Favignana, Levanzo y Marettimo, con ruta a medida.",
    detailDescription:
      "Un charter privado para vivir las Islas Egadi con más tiempo: noches al fondeo, camarotes, cocina y una ruta flexible diseñada con la tripulación.",
    seoTitle: "Charter Islas Egadi en trimarán desde Trapani",
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
    title: "Excursión en barco Favignana y Levanzo desde Trapani",
    subtitle:
      "Tour compartido de 8 horas entre Cala Rossa, Cala Azzurra, Bue Marino, paradas de baño y snorkel.",
    detailDescription:
      "Excursión compartida en barco desde Trapani a Favignana y Levanzo: 8 horas con patrón, paradas de baño, snorkel y posibles paradas en Cala Rossa, Cala Azzurra y Bue Marino.",
    seoTitle: "Excursión en barco Favignana y Levanzo desde Trapani",
    seoDescription:
      "Excursión compartida en barco Favignana y Levanzo desde Trapani: 8 horas, Cala Rossa, Cala Azzurra, Bue Marino, snorkel y baño.",
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
    title: "Tour privado en barco Favignana y Levanzo desde Trapani",
    subtitle:
      "Barco reservado durante 8 horas entre Cala Rossa, Cala Azzurra, Bue Marino, paradas de baño y snorkel.",
    detailDescription:
      "Tour privado en barco desde Trapani a Favignana y Levanzo: 8 horas con patrón, ruta flexible, paradas de baño, snorkel y posibles paradas en Cala Rossa, Cala Azzurra y Bue Marino.",
    seoTitle: "Tour privado en barco Favignana y Levanzo desde Trapani",
    seoDescription:
      "Tour privado en barco Favignana y Levanzo desde Trapani: 8 horas, Cala Rossa, Cala Azzurra, Bue Marino, snorkel y ruta flexible.",
    includes: spanishPrivateBoatIncludes,
    bringItems: spanishBringItems,
  },
  "boat-exclusive-morning": {
    title: "Tour privado en barco Islas Egadi 4 horas desde Trapani",
    subtitle:
      "Medio día privado por la mañana, con barco reservado y ruta elegida con el patrón.",
    detailDescription:
      "Tour privado de 4 horas desde Trapani, ideal para grupos que quieren mar, privacidad y una salida compacta con baño.",
    seoTitle: "Tour privado Islas Egadi 4 horas por la mañana desde Trapani",
    seoDescription:
      "Tour privado de 4 horas por la mañana en las Islas Egadi desde Trapani, con patrón, combustible, paradas de baño, snorkel y ruta flexible.",
    includes: spanishPrivateBoatIncludes,
    bringItems: spanishBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Tour privado en barco Islas Egadi 4 horas desde Trapani",
    subtitle:
      "Medio día privado por la tarde para disfrutar de las Egadi con baño, descanso y una ruta flexible.",
    detailDescription:
      "Barco reservado durante 4 horas por la tarde desde Trapani, pensado para grupos que buscan privacidad, baño y una ruta sencilla de organizar.",
    seoTitle: "Tour privado Islas Egadi 4 horas por la tarde desde Trapani",
    seoDescription:
      "Reserva un tour privado de 4 horas por la tarde en las Islas Egadi desde Trapani, con patrón, combustible, baño, snorkel y ruta flexible.",
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
    title: "Chef à bord aux îles Égades en trimaran depuis Trapani",
    subtitle:
      "Journée privée en trimaran avec confort de catamaran, chef, skipper et hôtesse entre Favignana et Levanzo.",
    detailDescription:
      "Une expérience gourmet privée en trimaran avec confort de catamaran pour découvrir les îles Égades avec rythme lent, déjeuner à bord et route entre Favignana et Levanzo.",
    seoTitle: "Chef à bord aux îles Égades en trimaran depuis Trapani",
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
    title: "Charter aux îles Égades en trimaran depuis Trapani",
    subtitle:
      "De 3 à 7 jours en trimaran entre Favignana, Levanzo et Marettimo, avec itinéraire sur mesure.",
    detailDescription:
      "Un charter privé pour vivre les îles Égades avec plus de temps : nuits au mouillage, cabines, cuisine et route flexible conçue avec l'équipage.",
    seoTitle: "Charter aux îles Égades en trimaran depuis Trapani",
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
    title: "Excursion en bateau Favignana et Levanzo depuis Trapani",
    subtitle:
      "Excursion partagée de 8 heures entre Cala Rossa, Cala Azzurra, Bue Marino, arrêts baignade et snorkeling.",
    detailDescription:
      "Excursion partagée en bateau depuis Trapani vers Favignana et Levanzo : 8 heures avec skipper, arrêts baignade, snorkeling et possibles étapes à Cala Rossa, Cala Azzurra et Bue Marino.",
    seoTitle: "Excursion en bateau Favignana et Levanzo depuis Trapani",
    seoDescription:
      "Excursion partagée en bateau Favignana et Levanzo depuis Trapani : 8 heures, Cala Rossa, Cala Azzurra, Bue Marino, snorkeling et baignade.",
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
    title: "Excursion privée en bateau Favignana et Levanzo depuis Trapani",
    subtitle:
      "Bateau réservé 8 heures entre Cala Rossa, Cala Azzurra, Bue Marino, arrêts baignade et snorkeling.",
    detailDescription:
      "Excursion privée en bateau depuis Trapani vers Favignana et Levanzo : 8 heures avec skipper, route flexible, arrêts baignade, snorkeling et possibles étapes à Cala Rossa, Cala Azzurra et Bue Marino.",
    seoTitle: "Excursion privée en bateau Favignana et Levanzo depuis Trapani",
    seoDescription:
      "Excursion privée en bateau Favignana et Levanzo depuis Trapani : 8 heures, Cala Rossa, Cala Azzurra, Bue Marino, snorkeling et route flexible.",
    includes: frenchPrivateBoatIncludes,
    bringItems: frenchBringItems,
  },
  "boat-exclusive-morning": {
    title: "Excursion privée en bateau îles Égades 4 heures depuis Trapani",
    subtitle:
      "Demi-journée privée le matin, avec bateau réservé et route choisie avec le skipper.",
    detailDescription:
      "Tour privé de 4 heures depuis Trapani, idéal pour les groupes qui veulent mer, intimité et sortie compacte avec baignade.",
    seoTitle: "Excursion privée îles Égades 4 heures le matin depuis Trapani",
    seoDescription:
      "Tour privé de 4 heures le matin aux îles Égades depuis Trapani, avec skipper, carburant, arrêts baignade, snorkeling et route flexible.",
    includes: frenchPrivateBoatIncludes,
    bringItems: frenchBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Excursion privée en bateau îles Égades 4 heures depuis Trapani",
    subtitle:
      "Demi-journée privée l'après-midi pour profiter des Égades avec baignade, détente et route flexible.",
    detailDescription:
      "Bateau réservé pendant 4 heures l'après-midi depuis Trapani, pensé pour les groupes qui cherchent intimité, baignade et organisation simple.",
    seoTitle: "Excursion privée îles Égades 4 heures l'après-midi depuis Trapani",
    seoDescription:
      "Réservez une excursion privée de 4 heures l'après-midi aux îles Égades depuis Trapani, avec skipper, carburant, baignade, snorkeling et route flexible.",
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
    title: "Chef an Bord auf Trimaran zu den Ägadischen Inseln ab Trapani",
    subtitle:
      "Privater Tag auf dem Trimaran mit Katamaran-Komfort, Chefkoch, Skipper und Hostess zwischen Favignana und Levanzo.",
    detailDescription:
      "Ein privates Gourmet-Erlebnis auf dem Trimaran mit Katamaran-Komfort, um die Ägadischen Inseln mit ruhigem Rhythmus, Mittagessen an Bord und Route zwischen Favignana und Levanzo zu entdecken.",
    seoTitle: "Chef an Bord auf Trimaran zu den Ägadischen Inseln ab Trapani",
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
    title: "Trimaran-Charter Ägadische Inseln ab Trapani",
    subtitle:
      "3 bis 7 Tage auf dem Trimaran zwischen Favignana, Levanzo und Marettimo, mit Route nach Maß.",
    detailDescription:
      "Ein privater Charter, um die Ägadischen Inseln mit mehr Zeit zu erleben: Nächte vor Anker, Kabinen, Bordküche und eine flexible Route mit der Crew.",
    seoTitle: "Trimaran-Charter Ägadische Inseln ab Trapani",
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
    title: "Bootstour Favignana und Levanzo ab Trapani",
    subtitle:
      "Geteilte 8-Stunden-Tour mit Cala Rossa, Cala Azzurra, Bue Marino, Badestopps und Schnorcheln.",
    detailDescription:
      "Geteilte Bootstour ab Trapani nach Favignana und Levanzo: 8 Stunden mit Skipper, Badestopps, Schnorcheln und möglichen Stopps bei Cala Rossa, Cala Azzurra und Bue Marino.",
    seoTitle: "Bootstour Favignana und Levanzo ab Trapani",
    seoDescription:
      "Geteilte Bootstour Favignana und Levanzo ab Trapani: 8 Stunden, Cala Rossa, Cala Azzurra, Bue Marino, Schnorcheln und Badestopps.",
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
    title: "Private Bootstour Favignana und Levanzo ab Trapani",
    subtitle:
      "Reserviertes Boot für 8 Stunden mit Cala Rossa, Cala Azzurra, Bue Marino, Badestopps und Schnorcheln.",
    detailDescription:
      "Private Bootstour ab Trapani nach Favignana und Levanzo: 8 Stunden mit Skipper, flexibler Route, Badestopps, Schnorcheln und möglichen Stopps bei Cala Rossa, Cala Azzurra und Bue Marino.",
    seoTitle: "Private Bootstour Favignana und Levanzo ab Trapani",
    seoDescription:
      "Private Bootstour Favignana und Levanzo ab Trapani: 8 Stunden, Cala Rossa, Cala Azzurra, Bue Marino, Schnorcheln und flexible Route.",
    includes: germanPrivateBoatIncludes,
    bringItems: germanBringItems,
  },
  "boat-exclusive-morning": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden ab Trapani",
    subtitle:
      "Privater Halbtagesausflug am Vormittag mit reserviertem Boot und Route nach Absprache mit dem Skipper.",
    detailDescription:
      "Private 4-Stunden-Tour ab Trapani, ideal für Gruppen, die Meer, Privatsphäre und eine kompakte Ausfahrt mit Badestopp suchen.",
    seoTitle: "Private Bootstour Ägadische Inseln 4 Stunden vormittags ab Trapani",
    seoDescription:
      "Private 4-Stunden-Bootstour am Vormittag zu den Ägadischen Inseln ab Trapani, mit Skipper, Treibstoff, Badestopps, Schnorcheln und flexibler Route.",
    includes: germanPrivateBoatIncludes,
    bringItems: germanBringItems,
  },
  "boat-exclusive-afternoon": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden ab Trapani",
    subtitle:
      "Privater Halbtagesausflug am Nachmittag, um die Ägadischen Inseln mit Baden, Entspannung und flexibler Route zu genießen.",
    detailDescription:
      "Reserviertes Boot für 4 Stunden am Nachmittag ab Trapani, gedacht für Gruppen, die Privatsphäre, Baden und eine einfache Organisation suchen.",
    seoTitle: "Private Bootstour Ägadische Inseln 4 Stunden nachmittags ab Trapani",
    seoDescription:
      "Buchen Sie eine private 4-Stunden-Bootstour am Nachmittag zu den Ägadischen Inseln ab Trapani, mit Skipper, Treibstoff, Baden, Schnorcheln und flexibler Route.",
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
  if (!override) return content;

  if (
    content.serviceId === "boat-shared-full-day" ||
    content.serviceId === "boat-exclusive-full-day"
  ) {
    const localizedOverride = { ...override };
    delete localizedOverride.itinerary;
    return { ...content, ...localizedOverride };
  }

  return { ...content, ...override };
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
    title: "Chef a bordo en trimarán por las Islas Egadi",
    subtitle:
      "Trimarán con comodidad de catamarán, chef, patrón y azafata para comida a bordo, snorkel y paradas entre Favignana y Levanzo.",
    seoTitle: "Chef a bordo en trimarán por las Islas Egadi",
    seoDescription:
      "Día privado en trimarán Neel 47 con chef a bordo, patrón, azafata y ruta entre Favignana y Levanzo.",
    durationLabel: "8 horas",
    detailLabel: "Chef, patrón y azafata",
    priceUnitLabel: "por paquete",
    primaryCtaLabel: "Ver paquete",
  },
  "charter-egadi": {
    title: "Charter Islas Egadi en trimarán desde Trapani",
    subtitle:
      "De 3 a 7 días en el trimarán, con itinerario a medida entre Favignana, Levanzo y Marettimo.",
    seoTitle: "Charter Islas Egadi en trimarán desde Trapani",
    seoDescription:
      "Charter en trimarán por las Islas Egadi de 3 a 7 días, con patrón, camarotes y ruta flexible desde Trapani.",
    durationLabel: "3-7 días",
    detailLabel: "Itinerario a medida",
    priceUnitLabel: "por paquete",
    primaryCtaLabel: "Ver paquete",
  },
  "tour-barca-egadi-4-ore": {
    title: "Tour privado Islas Egadi 4 horas desde Trapani",
    subtitle:
      "La fórmula ágil de medio día, con barco reservado, baño, descanso y ruta elegida según el mar.",
    seoTitle: "Tour privado Islas Egadi 4 horas desde Trapani",
    seoDescription:
      "Tour privado de 4 horas por las Islas Egadi desde Trapani, con barco exclusivo, paradas de baño y ruta flexible.",
    durationLabel: "4 horas",
    detailLabel: "Barco privado",
    priceUnitLabel: "por barco",
    primaryCtaLabel: "Ver paquete",
  },
  "tour-barca-egadi-8-ore": {
    title: "Excursión en barco Favignana y Levanzo 8 horas desde Trapani",
    subtitle:
      "Un día completo entre calas, snorkel y tiempo relajado a bordo. Puedes elegir plazas compartidas o barco privado.",
    seoTitle: "Excursión en barco Favignana y Levanzo 8 horas desde Trapani",
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
    title: "Chef à bord aux îles Égades en trimaran",
    subtitle:
      "Trimaran avec confort de catamaran, chef, skipper et hôtesse pour déjeuner à bord, snorkeling et arrêts entre Favignana et Levanzo.",
    seoTitle: "Chef à bord aux îles Égades en trimaran",
    seoDescription:
      "Journée privée en trimaran Neel 47 avec chef à bord, skipper, hôtesse et itinéraire entre Favignana et Levanzo.",
    durationLabel: "8 heures",
    detailLabel: "Chef, skipper et hôtesse",
    priceUnitLabel: "par forfait",
    primaryCtaLabel: "Voir le forfait",
  },
  "charter-egadi": {
    title: "Charter aux îles Égades en trimaran depuis Trapani",
    subtitle:
      "De 3 à 7 jours en trimaran, avec itinéraire sur mesure entre Favignana, Levanzo et Marettimo.",
    seoTitle: "Charter aux îles Égades en trimaran depuis Trapani",
    seoDescription:
      "Charter en trimaran aux îles Égades de 3 à 7 jours, avec skipper, cabines et route flexible depuis Trapani.",
    durationLabel: "3-7 jours",
    detailLabel: "Itinéraire sur mesure",
    priceUnitLabel: "par forfait",
    primaryCtaLabel: "Voir le forfait",
  },
  "tour-barca-egadi-4-ore": {
    title: "Excursion privée îles Égades 4 heures depuis Trapani",
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
    title: "Excursion en bateau Favignana et Levanzo 8 heures depuis Trapani",
    subtitle:
      "Une journée complète entre criques, snorkeling et temps détendu à bord. Places partagées ou bateau privé.",
    seoTitle: "Excursion en bateau Favignana et Levanzo 8 heures depuis Trapani",
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
    title: "Chef an Bord auf Trimaran zu den Ägadischen Inseln",
    subtitle:
      "Trimaran mit Katamaran-Komfort, Chefkoch, Skipper und Hostess für Mittagessen an Bord, Schnorcheln und Stopps zwischen Favignana und Levanzo.",
    seoTitle: "Chef an Bord auf Trimaran zu den Ägadischen Inseln",
    seoDescription:
      "Privater Tag auf dem Neel 47 Trimaran mit Chef an Bord, Skipper, Hostess und Route zwischen Favignana und Levanzo.",
    durationLabel: "8 Stunden",
    detailLabel: "Chefkoch, Skipper und Hostess",
    priceUnitLabel: "pro Paket",
    primaryCtaLabel: "Paket ansehen",
  },
  "charter-egadi": {
    title: "Trimaran-Charter Ägadische Inseln ab Trapani",
    subtitle:
      "3 bis 7 Tage auf dem Trimaran, mit Route nach Maß zwischen Favignana, Levanzo und Marettimo.",
    seoTitle: "Trimaran-Charter Ägadische Inseln ab Trapani",
    seoDescription:
      "Trimaran-Charter auf den Ägadischen Inseln von 3 bis 7 Tagen, mit Skipper, Kabinen und flexibler Route ab Trapani.",
    durationLabel: "3-7 Tage",
    detailLabel: "Route nach Maß",
    priceUnitLabel: "pro Paket",
    primaryCtaLabel: "Paket ansehen",
  },
  "tour-barca-egadi-4-ore": {
    title: "Private Bootstour Ägadische Inseln 4 Stunden ab Trapani",
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
    title: "Bootstour Favignana und Levanzo 8 Stunden ab Trapani",
    subtitle:
      "Ein ganzer Tag zwischen Buchten, Schnorcheln und entspannter Zeit an Bord. Geteilte Plätze oder privates Boot.",
    seoTitle: "Bootstour Favignana und Levanzo 8 Stunden ab Trapani",
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
    const localizedVariant = { ...variant, href: experienceHref(variant.serviceId, locale) };

    if (variant.serviceId === "boat-exclusive-morning") {
      if (locale !== "es" && locale !== "fr" && locale !== "de") {
        return localizedVariant;
      }
      return {
        ...localizedVariant,
        label:
          locale === "fr"
            ? "Privé le matin"
            : locale === "de"
              ? "Privat am Vormittag"
              : "Privado por la mañana",
        description:
          locale === "fr"
            ? "Bateau réservé le matin, avec retour autour de 13:00."
            : locale === "de"
              ? "Boot am Vormittag reserviert, Rückkehr gegen 13:00 Uhr."
              : "Barco reservado por la mañana, con regreso alrededor de las 13:00.",
      };
    }
    if (variant.serviceId === "boat-exclusive-afternoon") {
      if (locale !== "es" && locale !== "fr" && locale !== "de") {
        return localizedVariant;
      }
      return {
        ...localizedVariant,
        label:
          locale === "fr"
            ? "Privé l'après-midi"
            : locale === "de"
              ? "Privat am Nachmittag"
              : "Privado por la tarde",
        description:
          locale === "fr"
            ? "Bateau réservé pour votre groupe."
            : locale === "de"
              ? "Boot exklusiv für Ihre Gruppe."
              : "Barco reservado para tu grupo.",
      };
    }
    if (variant.serviceId === "boat-shared-full-day") {
      if (locale !== "es" && locale !== "fr" && locale !== "de") {
        return localizedVariant;
      }
      return {
        ...localizedVariant,
        label: locale === "fr" ? "Partagé" : locale === "de" ? "Geteilt" : "Compartido",
        description:
          locale === "fr"
            ? "Places individuelles pour une journée complète."
            : locale === "de"
              ? "Einzelplätze für einen ganzen Tag."
              : "Plazas individuales para un día completo.",
      };
    }
    if (variant.serviceId === "boat-exclusive-full-day") {
      if (locale !== "es" && locale !== "fr" && locale !== "de") {
        return localizedVariant;
      }
      return {
        ...localizedVariant,
        label: locale === "fr" ? "Privé" : locale === "de" ? "Privat" : "Privado",
        description:
          locale === "fr"
            ? "Journée complète avec bateau réservé."
            : locale === "de"
              ? "Ganzer Tag mit reserviertem Boot."
              : "Día completo con barco reservado.",
      };
    }
    return localizedVariant;
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
