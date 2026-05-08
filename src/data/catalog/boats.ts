import { localize, type LocalizedString } from "./locales";
import { getExperienceContent } from "./experiences";
import { publicAsset } from "@/lib/public-assets";

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
  detail: {
    eyebrow: LocalizedString;
    title: LocalizedString;
    paragraphs: LocalizedString[];
  };
  seoTitle: LocalizedString;
  seoDescription: LocalizedString;
  imageSrc?: string;
  heroVideoSrc?: string;
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
  detail: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
  };
  seoTitle: string;
  seoDescription: string;
  imageSrc?: string;
  heroVideoSrc?: string;
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
    it: "Barche per tour alle Egadi da Trapani",
    en: "Boats for Egadi Tours from Trapani",
    es: "Barcos para excursiones a las Islas Egadi desde Trapani",
    fr: "Bateaux pour excursions aux îles Égades depuis Trapani",
  },
  seoDescription: {
    it: "Scopri le barche Egadisailing per tour alle Egadi da Trapani: Trimarano con chef e charter, Cigala & Bertinetti 34 Offshore Open per 4 ore private o 8 ore condivise/private.",
    en: "Discover Egadisailing boats for Egadi tours from Trapani: Trimarano with chef and charter, Cigala & Bertinetti 34 Offshore Open for private 4-hour or shared/private 8-hour tours.",
    es: "Descubre los barcos de Egadisailing para excursiones a las Islas Egadi desde Trapani: Neel 47 con chef y charter, Cigala & Bertinetti para tours privados o compartidos.",
    fr: "Découvrez les bateaux Egadisailing pour excursions aux îles Égades depuis Trapani : Neel 47 avec chef et charter, Cigala & Bertinetti pour tours privés ou partagés.",
  },
  eyebrow: {
    it: "Flotta Egadisailing",
    en: "Egadisailing fleet",
    es: "Flota Egadisailing",
    fr: "Flotte Egadisailing",
  },
  title: {
    it: "Le nostre barche per scoprire le Egadi da Trapani",
    en: "Our boats for discovering the Egadi Islands from Trapani",
    es: "Nuestros barcos para descubrir las Islas Egadi desde Trapani",
    fr: "Nos bateaux pour découvrir les îles Égades depuis Trapani",
  },
  subtitle: {
    it: "Dal Trimarano con chef a bordo alla Cigala & Bertinetti 34 Offshore Open per 4 ore in esclusiva o 8 ore condivise/private: scegli il ritmo giusto per Favignana, Levanzo e Marettimo.",
    en: "From the Trimarano with chef on board to the Cigala & Bertinetti 34 Offshore Open for private 4-hour or shared/private 8-hour tours: choose the right pace for Favignana, Levanzo and Marettimo.",
    es: "Del Neel 47 con chef a bordo a la Cigala & Bertinetti 34 Offshore Open para tours privados de 4 horas o salidas de 8 horas compartidas/privadas.",
    fr: "Du Neel 47 avec chef à bord au Cigala & Bertinetti 34 Offshore Open pour tours privés de 4 heures ou sorties de 8 heures partagées/privées.",
  },
  comparisonTitle: {
    it: "Due barche, due modi di vivere il mare",
    en: "Two boats, two ways to experience the sea",
    es: "Dos barcos, dos formas de vivir el mar",
    fr: "Deux bateaux, deux façons de vivre la mer",
  },
  comparisonText: {
    it: "Il Trimarano è pensato per comfort, chef e charter. La Cigala & Bertinetti 34 Offshore Open è la scelta agile per 4 ore private o giornate da 8 ore condivise/private.",
    en: "The Trimarano is designed for comfort, chef experiences and charter. The Cigala & Bertinetti 34 Offshore Open is the agile choice for private 4-hour or shared/private 8-hour days.",
    es: "El Neel 47 está pensado para confort, chef y charter. La Cigala & Bertinetti 34 Offshore Open es la opción ágil para 4 horas privadas o jornadas de 8 horas compartidas/privadas.",
    fr: "Le Neel 47 est pensé pour le confort, le chef à bord et le charter. Le Cigala & Bertinetti 34 Offshore Open est le choix agile pour 4 heures privées ou journées de 8 heures partagées/privées.",
  },
  chooserTitle: {
    it: "Quale barca scegliere?",
    en: "Which boat should you choose?",
    es: "¿Qué barco elegir?",
    fr: "Quel bateau choisir ?",
  },
  chooserText: {
    it: "Se cerchi spazio, tavola e privacy scegli il Trimarano. Se vuoi una rotta snella tra le baie, scegli la Cigala & Bertinetti 34 Offshore Open per tour da 4 o 8 ore.",
    en: "If you want space, food and privacy, choose the Trimarano. If you want an agile route between bays, choose the Cigala & Bertinetti 34 Offshore Open for 4- or 8-hour tours.",
    es: "Si buscas espacio, comida y privacidad, elige el Neel 47. Si quieres una ruta ágil entre calas, elige la Cigala & Bertinetti para tours de 4 u 8 horas.",
    fr: "Si vous cherchez espace, déjeuner et intimité, choisissez le Neel 47. Si vous voulez une route agile entre les criques, choisissez le Cigala & Bertinetti pour 4 ou 8 heures.",
  },
  detailCtaLabel: {
    it: "Scopri la barca",
    en: "Discover the boat",
    es: "Ver el barco",
    fr: "Voir le bateau",
  },
  experiencesCtaLabel: {
    it: "Vedi esperienze",
    en: "View experiences",
    es: "Ver experiencias",
    fr: "Voir les expériences",
  },
  availableExperiencesLabel: {
    it: "Esperienze disponibili",
    en: "Available experiences",
    es: "Experiencias disponibles",
    fr: "Expériences disponibles",
  },
  fallbackImageNote: {
    it: "Foto completa in arrivo",
    en: "Full photo coming soon",
    es: "Foto completa próximamente",
    fr: "Photo complète à venir",
  },
} as const satisfies Record<string, LocalizedString>;

export const BOAT_CATALOG = {
  trimarano: {
    id: "trimarano",
    slug: "neel-47",
    aliases: ["trimarano-egadisailing", "neel-43"],
    externalUrl: "https://www.neel-trimarans.com/range/neel-47/",
    order: 10,
    title: {
      it: "Trimarano",
      en: "Trimarano",
    },
    shortTitle: {
      it: "Trimarano",
      en: "Trimarano",
    },
    eyebrow: {
      it: "Comfort, chef e charter",
      en: "Comfort, chef and charter",
    },
    description: {
      it: "Il trimarano è la barca per le esperienze più complete alle Egadi: spazi ampi, cabine, cucina e comfort per giornate private, chef a bordo e charter di più giorni.",
      en: "The trimaran is the boat for the most complete Egadi experiences: spacious areas, cabins, galley and comfort for private day trips, chef experiences and multi-day charters.",
    },
    detail: {
      eyebrow: {
        it: "Trimarano per tour Egadi",
        en: "Trimarano for Egadi tours",
      },
      title: {
        it: "Trimarano: comfort, chef e charter alle Egadi",
        en: "Trimarano: the Egadisailing trimaran for space, chef experiences and comfort in the Egadi Islands",
      },
      paragraphs: [
        {
          it: "Il Trimarano è pensato per chi cerca un'esperienza in barca alle Isole Egadi più comoda, curata e privata rispetto a un classico tour veloce. È la scelta giusta per un tour Egadi da Trapani con chef a bordo, per una giornata gourmet tra Favignana e Levanzo o per un charter di più giorni con cabine, cucina e zone relax. La sua struttura a tre scafi offre ampiezza, stabilità e una sensazione di spazio che aiuta anche chi non è abituato alla vita in barca.",
          en: "The Trimarano is the Egadisailing trimaran for guests looking for a more comfortable, curated and private Egadi Islands boat experience than a classic fast tour. It is the right choice for an Egadi tour from Trapani with a chef on board, for a gourmet day between Favignana and Levanzo or for a multi-day charter with cabins, galley and relaxation areas. Its three-hull layout offers space, stability and comfort even for guests who are not used to life on board.",
        },
        {
          it: "A bordo il tempo non è solo navigazione: ci sono spazi per pranzare, rilassarsi, prendere il sole, cambiarsi e vivere la giornata con ritmo lento. Per l'esperienza gourmet la rotta viene costruita tra Favignana e Levanzo, scegliendo baie riparate per bagno, snorkeling e pranzo a base di pesce locale e prodotti del territorio. Nei programmi charter, invece, il Trimarano permette di allargare il viaggio verso Marettimo e organizzare un itinerario più completo nell'arcipelago.",
          en: "Time on board is not just navigation: there is space for lunch, relaxing, sunbathing, changing and enjoying the day at a slower pace. For the gourmet experience, the route is shaped between Favignana and Levanzo, choosing sheltered bays for swimming, snorkelling and lunch based on local fish and regional products. On charter programmes, the Trimarano can extend the trip towards Marettimo and create a more complete itinerary through the archipelago.",
        },
        {
          it: "Chi cerca parole semplici può immaginarlo così: è la barca per un'esperienza premium alle Egadi, con skipper, crew, comfort reale e un modo più elegante di vivere il mare. Non serve essere esperti di vela o conoscere già le cale: la rotta, gli orari e le soste vengono gestiti dalla crew in base a meteo, mare e obiettivo della giornata.",
          en: "In simple words, this is the boat for a premium Egadi experience, with skipper, crew, real comfort and a more elegant way to enjoy the sea. You do not need sailing experience or previous knowledge of the coves: route, timing and stops are managed by the crew according to weather, sea conditions and the goal of the day.",
        },
      ],
    },
    seoTitle: {
      it: "Neel 47 alle Egadi con chef a bordo",
      en: "Neel 47 Trimaran with Chef in the Egadi",
    },
    seoDescription: {
      it: "Trimarano da Trapani per tour Egadi con chef a bordo, esperienza gourmet Favignana e Levanzo, charter alle Isole Egadi, cabine e comfort privato.",
      en: "Neel 47 trimaran from Trapani for Egadi tours with a chef on board, gourmet experiences in Favignana and Levanzo, charters, cabins and private comfort.",
    },
    imageSrc: "/images/boats/neel-47/neel-47-hero.webp",
    heroVideoSrc: "/images/boats/neel-47/hero-video.webm",
    imageAlt: {
      it: "Trimarano",
      en: "Trimarano",
    },
    gallery: [
      {
        src: "/images/boats/neel-47/neel-47-hero.webp",
        alt: {
          it: "Trimarano in navigazione",
          en: "Trimarano sailing",
        },
        caption: { it: "Trimarano", en: "Trimarano" },
      },
      {
        src: "/images/boats/neel-47/neel-47-navigazione.webp",
        alt: {
          it: "Trimarano in navigazione davanti alla costa",
          en: "Trimarano sailing along the coast",
        },
        caption: { it: "Navigazione alle Egadi", en: "Egadi sailing" },
      },
      {
        src: "/images/boats/neel-47/neel-47-favignana.webp",
        alt: {
          it: "Trimarano ormeggiato a Favignana",
          en: "Trimarano moored in Favignana",
        },
        caption: { it: "Favignana", en: "Favignana" },
      },
      {
        src: "/images/boats/neel-47/neel-47-vela-grandangolare.webp",
        alt: {
          it: "Trimarano con vela e vista grandangolare",
          en: "Trimarano with sail in a wide-angle view",
        },
        caption: { it: "Vista in navigazione", en: "Sailing view" },
      },
      {
        src: "/images/boats/neel-47/neel-47-vela-chiusa.webp",
        alt: {
          it: "Trimarano con vela chiusa",
          en: "Trimarano with sail closed",
        },
        caption: { it: "Dettaglio vela", en: "Sail detail" },
      },
      {
        src: "/images/boats/neel-47/neel-47-esterni.webp",
        alt: {
          it: "Esterni del Trimarano",
          en: "Exterior view of the Trimarano",
        },
        caption: { it: "Esterni", en: "Exterior" },
      },
      {
        src: "/images/boats/neel-47/neel-47-prendisole.webp",
        alt: {
          it: "Prendisole del Trimarano",
          en: "Sun deck of the Trimarano",
        },
        caption: { it: "Prendisole", en: "Sun deck" },
      },
      {
        src: "/images/boats/neel-47/neel-47-ragazzo.webp",
        alt: {
          it: "Ospite sul ponte del Trimarano durante la navigazione",
          en: "Guest on the deck of the Trimarano while sailing",
        },
        caption: { it: "Vita sul ponte", en: "Deck life" },
      },
      {
        src: "/images/boats/neel-47/neel-47-.donna.webp",
        alt: {
          it: "Ospite sul Trimarano",
          en: "Guest on the Trimarano",
        },
        caption: { it: "Relax a bordo", en: "Relax on board" },
      },
      {
        src: "/images/boats/neel-47/neel-47-relax.webp",
        alt: {
          it: "Ospiti in relax nel salone del Trimarano",
          en: "Guests relaxing in the saloon of the Trimarano",
        },
        caption: { it: "Salone e relax", en: "Saloon and relaxation" },
      },
      {
        src: "/images/boats/neel-47/neel-47-relax1.webp",
        alt: {
          it: "Ospiti seduti nel salone interno del Trimarano",
          en: "Guests seated in the interior saloon of the Trimarano",
        },
        caption: { it: "Comfort interno", en: "Interior comfort" },
      },
      {
        src: "/images/boats/neel-47/neel-47-interno.webp",
        alt: {
          it: "Interni del Trimarano",
          en: "Interior of the Trimarano",
        },
        caption: { it: "Interni", en: "Interior" },
      },
      {
        src: "/images/boats/neel-47/neel-47-tavolo-a-bordo.webp",
        alt: {
          it: "Tavolo a bordo del Trimarano",
          en: "Table on board the Trimarano",
        },
        caption: { it: "Tavola a bordo", en: "Table on board" },
      },
      {
        src: "/images/boats/neel-47/neel-47-chef.webp",
        alt: {
          it: "Chef e crew preparano l'aperitivo a bordo del Trimarano",
          en: "Chef and crew preparing the aperitif on board the Trimarano",
        },
        caption: { it: "Chef a bordo", en: "Chef on board" },
      },
      {
        src: "/images/boats/neel-47/neel-47-cucina.webp",
        alt: {
          it: "Cucina del Trimarano",
          en: "Galley of the Trimarano",
        },
        caption: { it: "Cucina", en: "Galley" },
      },
      {
        src: "/images/boats/neel-47/neel-47-cucina1.webp",
        alt: {
          it: "Dettaglio cucina del Trimarano",
          en: "Galley detail of the Trimarano",
        },
        caption: { it: "Cucina e servizio", en: "Galley and service" },
      },
      {
        src: "/images/boats/neel-47/neel-47-aperitivo.webp",
        alt: {
          it: "Aperitivo con vino e prodotti locali servito sul Trimarano",
          en: "Aperitif with wine and local products served on the Trimarano",
        },
        caption: { it: "Aperitivo", en: "Aperitif" },
      },
      {
        src: "/images/boats/neel-47/neel-47-aperitivo1.webp",
        alt: {
          it: "Gamberi freschi serviti a bordo del Trimarano",
          en: "Fresh prawns served on board the Trimarano",
        },
        caption: { it: "Prodotti locali", en: "Local products" },
      },
      {
        src: "/images/boats/neel-47/neel-47-cabina.webp",
        alt: {
          it: "Cabina matrimoniale del Trimarano",
          en: "Double cabin of the Trimarano",
        },
        caption: { it: "Cabina matrimoniale", en: "Double cabin" },
      },
      {
        src: "/images/boats/neel-47/neel-47-cabina1.webp",
        alt: {
          it: "Cabina del Trimarano",
          en: "Cabin of the Trimarano",
        },
        caption: { it: "Cabina", en: "Cabin" },
      },
      {
        src: "/images/boats/neel-47/neel-47-cabina2.webp",
        alt: {
          it: "Seconda cabina del Trimarano",
          en: "Second cabin of the Trimarano",
        },
        caption: { it: "Seconda cabina", en: "Second cabin" },
      },
      {
        src: "/images/boats/neel-47/neel-47-bagno.webp",
        alt: {
          it: "Bagno con doccia del Trimarano",
          en: "Bathroom with shower of the Trimarano",
        },
        caption: { it: "Bagno", en: "Bathroom" },
      },
    ],
    idealFor: [
      {
        it: "Esperienze gourmet private con chef, pranzo a bordo e spazi comodi per vivere la giornata con calma.",
        en: "Private gourmet experiences with a chef, lunch on board and comfortable spaces for an easy-going day.",
      },
      {
        it: "Charter alle Egadi di più giorni, con cabine, cucina e zone relax pensate per dormire a bordo.",
        en: "Multi-day Egadi charters with cabins, galley and relaxation areas designed for overnight stays on board.",
      },
      {
        it: "Gruppi, famiglie e occasioni speciali che cercano privacy, comfort e una barca stabile anche per chi non è esperto.",
        en: "Groups, families and special occasions looking for privacy, comfort and a stable boat even for non-experts.",
      },
    ],
    routes: [
      {
        it: "Nelle giornate gourmet la rotta è costruita tra Favignana e Levanzo, scegliendo baie riparate per bagno, snorkeling e pranzo a bordo.",
        en: "On gourmet days the route is shaped between Favignana and Levanzo, choosing sheltered bays for swimming, snorkelling and lunch on board.",
      },
      {
        it: "Nei programmi charter di più giorni si possono includere Favignana, Levanzo e Marettimo, con soste più lunghe e notti in rada quando il meteo lo permette.",
        en: "Multi-day charter programs can include Favignana, Levanzo and Marettimo, with longer stops and nights at anchor when weather allows.",
      },
      {
        it: "La partenza è da Trapani e la rotta resta flessibile: skipper e crew scelgono il percorso migliore in base a vento, mare e durata dell'esperienza.",
        en: "Departure is from Trapani and the route stays flexible: skipper and crew choose the best course around wind, sea and experience length.",
      },
    ],
    serviceIds: ["exclusive-experience", "cabin-charter"],
    faqs: [
      {
        question: {
          it: "Il trimarano è adatto a un'esperienza con chef?",
          en: "Is the trimaran suitable for an experience with chef?",
        },
        answer: {
          it: "Sì. Il Trimarano ha cucina, tavolo, zone relax e spazi ampi per servire il pranzo a bordo senza trasformare la giornata in un semplice trasferimento in barca.",
          en: "Yes. The Trimarano has a galley, table, relax areas and wide spaces to serve lunch on board without turning the day into a simple boat transfer.",
        },
      },
      {
        question: {
          it: "Si può prenotare il trimarano per più giorni?",
          en: "Can the trimaran be booked for multiple days?",
        },
        answer: {
          it: "Sì. Il Trimarano è la barca dedicata al charter alle Egadi: permette di vivere più giorni tra rada, cabine, cucina a bordo e rotte costruite con lo skipper.",
          en: "Yes. The Trimarano is the boat dedicated to Egadi charters: it allows multi-day programmes with anchorages, cabins, on-board galley and routes shaped with the skipper.",
        },
      },
      {
        question: {
          it: "Quante persone possono partecipare all'esperienza gourmet?",
          en: "How many guests can join the gourmet experience?",
        },
        answer: {
          it: "L'esperienza gourmet è privata e viene organizzata fino a un massimo di 10 persone, così il pranzo, gli spazi a bordo e le soste restano comodi per tutti.",
          en: "The gourmet experience is private and is organized for up to 10 guests, so lunch, onboard spaces and swim stops stay comfortable for everyone.",
        },
      },
      {
        question: {
          it: "Le cabine si usano anche durante l'esperienza giornaliera?",
          en: "Are the cabins used during the day experience too?",
        },
        answer: {
          it: "Durante la giornata le cabine sono utili come appoggio per cambiarsi o riporre borse morbide. Per dormire a bordo, invece, bisogna scegliere un programma charter di più giorni.",
          en: "During the day, the cabins are useful for changing or storing soft bags. Sleeping on board is part of a multi-day charter programme.",
        },
      },
      {
        question: {
          it: "La rotta del Trimarano è sempre la stessa?",
          en: "Is the Trimarano route always the same?",
        },
        answer: {
          it: "No. La rotta viene definita in base al tipo di esperienza, alla durata e alle condizioni del mare. L'obiettivo è trovare baie belle ma anche comode e sicure.",
          en: "No. The route is defined around the experience type, duration and sea conditions. The goal is to find beautiful bays that are also comfortable and safe.",
        },
      },
      {
        question: {
          it: "Il Trimarano è indicato per chi non ha esperienza in barca?",
          en: "Is the Trimarano suitable for people with no boating experience?",
        },
        answer: {
          it: "Sì. Non serve esperienza nautica: a bordo ci sono skipper e crew, gli spazi sono ampi e la navigazione viene gestita in modo da rendere la giornata semplice anche per chi è alla prima uscita.",
          en: "Yes. No boating experience is required: skipper and crew are on board, spaces are wide and navigation is managed to keep the day simple even for first-time guests.",
        },
      },
      {
        question: {
          it: "Cosa comprende una giornata gourmet sul Trimarano?",
          en: "What is included in a gourmet day on the Trimarano?",
        },
        answer: {
          it: "L'esperienza gourmet include skipper, hostess, cuoco privato, pranzo a base di pesce locale e prodotti del territorio, carburante, aperitivo, acqua, vino, bevande e attrezzatura da snorkeling. È pensata come esperienza privata, non come semplice noleggio barca.",
          en: "The gourmet experience includes skipper, hostess, private chef, lunch based on local fish and regional products, fuel, aperitif, water, wine, drinks and snorkelling equipment. It is designed as a private experience, not a simple boat rental.",
        },
      },
      {
        question: {
          it: "Il Trimarano esce sempre verso Marettimo?",
          en: "Does the Trimarano always sail to Marettimo?",
        },
        answer: {
          it: "No. Nell'esperienza gourmet la rotta è tra Favignana e Levanzo. Marettimo può essere valutata nei programmi charter di più giorni, quando tempi, meteo e programma permettono una navigazione più ampia.",
          en: "No. On the gourmet experience, the route is between Favignana and Levanzo. Marettimo can be considered on multi-day charter programmes, when timing, weather and itinerary allow a wider navigation plan.",
        },
      },
      {
        question: {
          it: "Posso usare il Trimarano per un evento privato?",
          en: "Can I use the Trimarano for a private event?",
        },
        answer: {
          it: "Sì. Il trimarano viene scelto spesso per compleanni, anniversari, proposte, piccoli eventi aziendali e giornate speciali. La formula privata permette di gestire ritmo, pranzo, soste e atmosfera in modo più personale.",
          en: "Yes. The trimaran is often chosen for birthdays, anniversaries, proposals, small corporate events and special days. The private format makes it easier to shape timing, lunch, stops and atmosphere around the occasion.",
        },
      },
      {
        question: {
          it: "Che cosa devo portare a bordo?",
          en: "What should I bring on board?",
        },
        answer: {
          it: "Consigliamo costume, asciugamano, crema solare, occhiali da sole, cappello e una borsa morbida. Scarpe comode o piede scalzo sono preferibili a trolley rigidi e scarpe con tacchi o suole che possono segnare la coperta.",
          en: "We recommend swimwear, towel, sunscreen, sunglasses, hat and a soft bag. Comfortable shoes or bare feet are better than hard suitcases and shoes with heels or soles that may mark the deck.",
        },
      },
      {
        question: {
          it: "Il menu può cambiare per allergie o preferenze alimentari?",
          en: "Can the menu change for allergies or dietary preferences?",
        },
        answer: {
          it: "Sì, ma allergie, intolleranze e preferenze devono essere comunicate almeno 48 ore prima dell'esperienza. Il menu varia in base al pescato fresco e ai prodotti disponibili, quindi viene costruito con flessibilità ma anche con anticipo.",
          en: "Yes, but allergies, intolerances and preferences must be communicated at least 48 hours before the experience. The menu changes according to fresh catch and available products, so it is flexible but needs planning.",
        },
      },
      {
        question: {
          it: "Cosa succede se il meteo non permette l'uscita?",
          en: "What happens if the weather does not allow departure?",
        },
        answer: {
          it: "La sicurezza viene prima dell'itinerario. Se il mare consente di uscire, la rotta viene adattata verso zone più riparate. Se invece le condizioni non permettono l'esperienza, si valuta lo spostamento data o il rimborso secondo le condizioni previste.",
          en: "Safety comes before the itinerary. If the sea allows departure, the route is adjusted towards more sheltered areas. If conditions do not allow the experience, a date change or refund is handled according to the applicable conditions.",
        },
      },
    ],
    specs: [
      { icon: "cabins", value: "3", label: { it: "Cabine", en: "Cabins" } },
      { icon: "beds", value: "6", label: { it: "Posti letto", en: "Berths" } },
      { icon: "kitchen", value: "1", label: { it: "Cucina", en: "Galley" } },
      { icon: "bath", value: "3", label: { it: "Bagni", en: "Bathrooms" } },
      { icon: "relax", value: "1", label: { it: "Area relax", en: "Relax area" } },
    ],
  },
  boat: {
    id: "boat",
    slug: "cigala-bertinetti-34-offshore-open",
    aliases: ["barca-egadisailing", "ciagal-bertinetti-34-offshore-open"],
    order: 20,
    title: {
      it: "Cigala & Bertinetti 34 Offshore Open",
      en: "Cigala & Bertinetti 34 Offshore Open",
    },
    shortTitle: {
      it: "Cigala & Bertinetti 34",
      en: "Cigala & Bertinetti 34",
    },
    eyebrow: {
      it: "4 ore esclusiva · 8 ore condivisa o privata",
      en: "4 hours private · 8 hours shared or private",
    },
    description: {
      it: "La Cigala & Bertinetti 34 Offshore Open è una barca aperta, veloce e comoda per muoversi tra le cale delle Egadi. A bordo trovi sedute per il gruppo, spazio per prendere il sole, accesso al mare per bagno e snorkeling, skipper e una navigazione pensata per soste frequenti tra Favignana e Levanzo.",
      en: "The Cigala & Bertinetti 34 Offshore Open is an open, fast and comfortable boat for moving among coves in the Egadi Islands. On board you have seating for the group, space to enjoy the sun, sea access for swimming and snorkelling, a skipper and a route designed for frequent stops between Favignana and Levanzo.",
    },
    detail: {
      eyebrow: {
        it: "Barca open per tour Egadi da Trapani",
        en: "Open boat for Egadi tours from Trapani",
      },
      title: {
        it: "Cigala & Bertinetti 34 Offshore Open: la barca agile per tour Egadi, Favignana e Levanzo",
        en: "Cigala & Bertinetti 34 Offshore Open: the agile boat for Egadi, Favignana and Levanzo tours",
      },
      paragraphs: [
        {
          it: "La Cigala & Bertinetti 34 Offshore Open è la barca Egadisailing dedicata ai tour in barca alle Egadi da Trapani per chi vuole vivere Favignana e Levanzo in modo semplice, dinamico e vicino al mare. È una barca open, quindi aperta: non devi immaginarla come uno yacht con cabine, ma come una barca comoda e veloce per spostarsi tra le cale, fermarsi spesso, fare bagno, snorkeling e godersi il mare senza complicazioni.",
          en: "The Cigala & Bertinetti 34 Offshore Open is the Egadisailing boat for Egadi boat tours from Trapani, designed for guests who want to experience Favignana and Levanzo in a simple, dynamic and sea-focused way. It is an open boat: not a yacht with cabins, but a comfortable and fast boat for moving between coves, stopping often, swimming, snorkelling and enjoying the sea without complications.",
        },
        {
          it: "È adatta sia ai tour privati da 4 ore, al mattino o al pomeriggio, sia ai tour da 8 ore condivisi o privati. Nei tour brevi la rotta si concentra sulle soste migliori raggiungibili con tempi comodi; nella giornata intera c'è più margine per muoversi tra Favignana e Levanzo, scegliere baie riparate, alternare navigazione e pause in acqua e vivere l'arcipelago con meno fretta.",
          en: "It works for private 4-hour morning or afternoon tours and for 8-hour shared or private tours. Short tours focus on the best stops that fit comfortably into the schedule; full-day tours allow more time to move between Favignana and Levanzo, choose sheltered bays, alternate cruising and swim breaks and enjoy the archipelago without rushing.",
        },
        {
          it: "Per l'utente che non è esperto, la cosa importante è questa: a bordo ci sono skipper, sedute, spazio prendisole, accesso al mare e attrezzatura per vivere una giornata da tour Egadi senza dover decidere nulla di tecnico. La rotta viene adattata ogni giorno a vento, mare e affollamento delle cale, così il tour resta piacevole e sicuro.",
          en: "For non-expert guests, the important part is simple: on board there is a skipper, seating, sunbathing space, sea access and the equipment needed for an Egadi tour without having to make technical decisions. The route is adjusted every day around wind, sea and bay traffic, so the tour stays pleasant and safe.",
        },
      ],
    },
    seoTitle: {
      it: "Cigala & Bertinetti 34 per tour Egadi da Trapani",
      en: "Cigala & Bertinetti 34 for Egadi Tours from Trapani",
    },
    seoDescription: {
      it: "Cigala & Bertinetti 34 Offshore Open per tour Egadi da Trapani: barca open con skipper, snorkeling, soste bagno, Favignana, Levanzo e tour privati o condivisi.",
      en: "Cigala & Bertinetti 34 Offshore Open for Egadi tours from Trapani: open boat with skipper, snorkelling, swim stops, Favignana, Levanzo and private or shared tours.",
    },
    imageSrc: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
    heroVideoSrc: "/images/boats/cigala-bertinetti-34-offshore-open/hero-video.webm",
    imageAlt: {
      it: "Cigala & Bertinetti 34 Offshore Open durante un tour alle Egadi",
      en: "Cigala & Bertinetti 34 Offshore Open during an Egadi tour",
    },
    gallery: [
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
        alt: {
          it: "Gruppo a bordo della Cigala & Bertinetti 34 Offshore Open alle Egadi",
          en: "Group on board the Cigala & Bertinetti 34 Offshore Open in the Egadi",
        },
        caption: { it: "Tour 8 ore", en: "8-hour tour" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-drone.webp",
        alt: {
          it: "Cigala & Bertinetti 34 Offshore Open vista dall'alto durante la navigazione",
          en: "Cigala & Bertinetti 34 Offshore Open seen from above while sailing",
        },
        caption: { it: "Vista dall'alto", en: "Aerial view" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-frontale.webp",
        alt: {
          it: "Vista frontale della Cigala & Bertinetti 34 Offshore Open",
          en: "Front view of the Cigala & Bertinetti 34 Offshore Open",
        },
        caption: { it: "Vista frontale", en: "Front view" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-primo-piano.webp",
        alt: {
          it: "Dettaglio della Cigala & Bertinetti 34 Offshore Open",
          en: "Detail of the Cigala & Bertinetti 34 Offshore Open",
        },
        caption: { it: "Dettaglio barca", en: "Boat detail" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
        alt: {
          it: "Momento a bordo della Cigala & Bertinetti 34 Offshore Open alle Egadi",
          en: "Moment on board the Cigala & Bertinetti 34 Offshore Open in the Egadi",
        },
        caption: { it: "Esperienza a bordo", en: "On-board experience" },
      },
    ],
    idealFor: [
      {
        it: "Tour privati da 4 ore al mattino o al pomeriggio, ideali se vuoi una barca tutta per il tuo gruppo senza impegnare l'intera giornata.",
        en: "Private 4-hour morning or afternoon tours, ideal if you want the boat for your group without taking up the whole day.",
      },
      {
        it: "Tour da 8 ore condivisi o privati, con più tempo per soste bagno, snorkeling e spostamenti tra Favignana e Levanzo.",
        en: "Shared or private 8-hour tours, with more time for swim stops, snorkelling and moving between Favignana and Levanzo.",
      },
      {
        it: "Gruppi che vogliono una barca open veloce, semplice da vivere e adatta a tante soste in mare.",
        en: "Groups looking for a fast open boat that is easy to enjoy and suited to many sea stops.",
      },
    ],
    routes: [
      {
        it: "Nei tour da 4 ore la rotta è più compatta: si privilegiano cale raggiungibili bene dalla partenza, con soste bagno mirate e tempi semplici.",
        en: "On 4-hour tours the route is more compact: the focus is on coves that work well from departure, with targeted swim stops and easy timing.",
      },
      {
        it: "Nei tour da 8 ore si lavora tra Favignana e Levanzo, con più margine per snorkeling, baie riparate e pause più rilassate.",
        en: "On 8-hour tours, the route works between Favignana and Levanzo, with more time for snorkelling, sheltered bays and slower breaks.",
      },
      {
        it: "La partenza è da Trapani e la rotta viene adattata ogni giorno a vento, mare e affollamento delle cale, così l'esperienza resta piacevole anche per chi non conosce le Egadi.",
        en: "Departure is from Trapani and the route is adjusted each day around wind, sea and bay traffic, so the experience stays pleasant even for guests who do not know the Egadi.",
      },
    ],
    serviceIds: [
      "boat-exclusive-afternoon",
      "boat-shared-full-day",
      "boat-exclusive-full-day",
      "boat-exclusive-morning",
    ],
    faqs: [
      {
        question: {
          it: "La barca si può prenotare in esclusiva?",
          en: "Can the boat be booked privately?",
        },
        answer: {
          it: "Sì. Puoi scegliere i tour privati da 4 o 8 ore se vuoi la Cigala & Bertinetti riservata solo al tuo gruppo, con tempi e soste gestiti insieme allo skipper.",
          en: "Yes. You can choose private 4 or 8-hour tours if you want the Cigala & Bertinetti reserved for your group, with timing and stops managed with the skipper.",
        },
      },
      {
        question: {
          it: "La stessa barca fa anche tour condivisi?",
          en: "Does the same boat also run shared tours?",
        },
        answer: {
          it: "Sì, ma solo sulla giornata intera da 8 ore. Il tour da 4 ore è disponibile solo con barca in esclusiva.",
          en: "Yes, but only on the 8-hour full day. The 4-hour tour is available as a private boat only.",
        },
      },
      {
        question: {
          it: "Che tipo di barca è la Cigala & Bertinetti 34 Offshore Open?",
          en: "What kind of boat is the Cigala & Bertinetti 34 Offshore Open?",
        },
        answer: {
          it: "È una barca open, quindi aperta, veloce e pensata per vivere il mare durante la giornata. Non è una barca con cabine per dormire: è ideale per spostarsi tra le cale, fare bagno, snorkeling e rientrare a Trapani.",
          en: "It is an open boat, fast and designed for enjoying the sea during the day. It is not a cabin boat for sleeping on board: it is ideal for moving between coves, swimming, snorkelling and returning to Trapani.",
        },
      },
      {
        question: {
          it: "Quante persone può ospitare?",
          en: "How many guests can it host?",
        },
        answer: {
          it: "La barca ha 12 posti. Nei tour condivisi i posti vengono venduti singolarmente, mentre nei tour privati la barca resta riservata al gruppo che prenota.",
          en: "The boat has 12 seats. On shared tours seats are sold individually, while on private tours the boat is reserved for the booking group.",
        },
      },
      {
        question: {
          it: "Serve esperienza in barca per partecipare?",
          en: "Do I need boating experience to join?",
        },
        answer: {
          it: "No. A bordo c'è lo skipper, che gestisce navigazione, soste e sicurezza. Tu devi solo portare costume, asciugamano, crema solare e una borsa morbida.",
          en: "No. The skipper manages navigation, stops and safety. You only need to bring swimwear, towel, sunscreen and a soft bag.",
        },
      },
      {
        question: {
          it: "La rotta è garantita o può cambiare?",
          en: "Is the route guaranteed or can it change?",
        },
        answer: {
          it: "La rotta può cambiare in base al mare e al vento. È una scelta normale e serve a fare soste più belle, comode e sicure durante la giornata.",
          en: "The route can change depending on sea and wind. This is normal and helps the skipper choose stops that are more beautiful, comfortable and safe during the day.",
        },
      },
      {
        question: {
          it: "Qual è la differenza tra tour da 4 ore e tour da 8 ore?",
          en: "What is the difference between the 4-hour and 8-hour tours?",
        },
        answer: {
          it: "Il tour da 4 ore è più compatto e si concentra su poche soste scelte bene, ideale se vuoi un'uscita mattina o pomeriggio. Il tour da 8 ore dà più tempo per Favignana e Levanzo, snorkeling, bagni e pause senza correre.",
          en: "The 4-hour tour is more compact and focuses on a few well-chosen stops, ideal for a morning or afternoon outing. The 8-hour tour gives more time for Favignana and Levanzo, snorkelling, swimming and slower breaks.",
        },
      },
      {
        question: {
          it: "Meglio tour condiviso o barca privata?",
          en: "Is a shared tour or private boat better?",
        },
        answer: {
          it: "Il tour condiviso è adatto se vuoi acquistare posti singoli e vivere una giornata completa con altri ospiti. La barca privata è migliore se vuoi privacy, tempi più flessibili e la Cigala & Bertinetti riservata solo al tuo gruppo.",
          en: "The shared tour works well if you want to buy individual seats and enjoy a full day with other guests. The private boat is better if you want privacy, more flexible timing and the Cigala & Bertinetti reserved only for your group.",
        },
      },
      {
        question: {
          it: "La Cigala & Bertinetti ha cabine o spazi interni?",
          en: "Does the Cigala & Bertinetti have cabins or indoor spaces?",
        },
        answer: {
          it: "No, è una barca open pensata per il mare di giorno. Ha sedute, spazio prendisole e accesso all'acqua, ma non è la barca adatta per dormire a bordo o per un charter con cabine.",
          en: "No, it is an open boat designed for day use at sea. It has seating, sunbathing space and sea access, but it is not the right boat for sleeping on board or cabin charter programmes.",
        },
      },
      {
        question: {
          it: "Dove parte il tour in barca alle Egadi?",
          en: "Where does the Egadi boat tour depart from?",
        },
        answer: {
          it: "La partenza è da Trapani. Dopo la prenotazione vengono comunicate le indicazioni precise per il punto d'incontro, l'orario e le informazioni pratiche per arrivare senza stress.",
          en: "Departure is from Trapani. After booking, guests receive the exact meeting point, timing and practical information to arrive without stress.",
        },
      },
      {
        question: {
          it: "Lo snorkeling è adatto anche a chi è alle prime esperienze?",
          en: "Is snorkelling suitable for beginners?",
        },
        answer: {
          it: "Sì, le soste vengono scelte in base al mare e alla sicurezza. Chi vuole fare snorkeling può usare l'attrezzatura disponibile, mentre chi preferisce restare vicino alla barca può semplicemente fare bagno e rilassarsi.",
          en: "Yes, stops are chosen according to sea conditions and safety. Guests who want to snorkel can use the available equipment, while those who prefer staying near the boat can simply swim and relax.",
        },
      },
      {
        question: {
          it: "Cosa devo portare sulla Cigala & Bertinetti?",
          en: "What should I bring on the Cigala & Bertinetti?",
        },
        answer: {
          it: "Porta costume, asciugamano, crema solare, cappello, occhiali da sole e una borsa morbida. Evita valigie rigide e oggetti ingombranti: su una barca open è meglio viaggiare leggeri.",
          en: "Bring swimwear, towel, sunscreen, hat, sunglasses and a soft bag. Avoid hard suitcases and bulky items: on an open boat it is better to travel light.",
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

const SPANISH_BOAT_OVERRIDES: Partial<Record<string, Partial<ResolvedBoatContent>>> = {
  trimarano: {
    title: "Neel 47",
    shortTitle: "Neel 47",
    eyebrow: "Confort, chef y charter",
    description:
      "El Neel 47 es el trimarán para las experiencias más completas en las Islas Egadi: espacios amplios, camarotes, cocina y estabilidad para días privados, chef a bordo y charters de varios días.",
    detail: {
      eyebrow: "Trimarán para tours por las Egadi",
      title: "Neel 47: confort, chef y charter en las Islas Egadi",
      paragraphs: [
        "El Neel 47 es la opción de Egadisailing para quienes buscan una experiencia en barco más cómoda, cuidada y privada que un tour rápido clásico. Es ideal para una excursión con chef a bordo, una jornada gourmet entre Favignana y Levanzo o un charter de varios días.",
        "A bordo hay espacio para comer, relajarse, tomar el sol, cambiarse y vivir el día con un ritmo lento. Su estructura de trimarán ofrece estabilidad y amplitud incluso para huéspedes que no están acostumbrados a navegar.",
        "No hace falta conocer las calas ni tener experiencia en vela: la ruta, los horarios y las paradas se ajustan con la tripulación según meteorología, mar y objetivo de la jornada.",
      ],
    },
    seoTitle: "Neel 47 con chef a bordo en las Islas Egadi",
    seoDescription:
      "Trimarán Neel 47 desde Trapani para excursiones por las Islas Egadi con chef a bordo, experiencia gourmet, charter, camarotes y confort privado.",
    imageAlt: "Trimarán Neel 47 en las Islas Egadi",
    idealFor: [
      "Experiencia gourmet con chef a bordo",
      "Charter privado de varios días",
      "Grupos que buscan espacio, privacidad y ritmo lento",
      "Comida a bordo y paradas en calas protegidas",
    ],
    routes: [
      "Favignana y Levanzo para la experiencia gourmet",
      "Favignana, Levanzo y Marettimo para charters de varios días",
      "Rutas adaptadas a mar, viento y confort a bordo",
    ],
    faqs: [
      {
        question: "¿Por qué elegir el Neel 47?",
        answer:
          "Porque ofrece más espacio, estabilidad y confort que un barco abierto. Es la mejor elección para chef a bordo, charter y jornadas privadas premium.",
      },
      {
        question: "¿El Neel 47 es adecuado para familias?",
        answer:
          "Sí. Sus zonas amplias y protegidas ayudan a vivir el día con más calma, siempre con ruta y horarios adaptados por la tripulación.",
      },
      {
        question: "¿Se puede dormir a bordo?",
        answer:
          "Sí, en los programas de charter de varios días, siempre según condiciones meteorológicas y planificación de la ruta.",
      },
    ],
    specs: [
      { icon: "cabins", value: "4", label: "Camarotes" },
      { icon: "beds", value: "8", label: "Plazas noche" },
      { icon: "kitchen", value: "1", label: "Cocina" },
      { icon: "bath", value: "3", label: "Baños" },
    ],
  },
  boat: {
    title: "Cigala & Bertinetti 34 Offshore Open",
    shortTitle: "Cigala & Bertinetti",
    eyebrow: "Ágil, rápida y abierta",
    description:
      "La Cigala & Bertinetti 34 Offshore Open es el barco ágil para excursiones privadas de 4 horas y salidas de 8 horas compartidas o privadas entre Favignana y Levanzo.",
    detail: {
	      eyebrow: "Barco abierto para las Islas Egadi",
      title: "Cigala & Bertinetti: el barco ágil para calas, baños y rutas flexibles",
      paragraphs: [
        "La Cigala & Bertinetti es ideal para quienes quieren moverse con rapidez entre calas, hacer paradas de baño y vivir una experiencia más directa con el mar.",
        "Funciona muy bien para tours privados de 4 horas por la mañana o por la tarde, y para jornadas de 8 horas cuando quieres más tiempo para Favignana, Levanzo y las zonas protegidas del día.",
        "Es un barco abierto y deportivo: perfecto para grupos que buscan agua clara, snorkel y una ruta flexible con patrón.",
      ],
    },
    seoTitle: "Cigala & Bertinetti para excursiones en barco por las Islas Egadi",
    seoDescription:
      "Cigala & Bertinetti 34 Offshore Open desde Trapani para tours privados de 4 horas y excursiones de 8 horas compartidas o privadas por Favignana y Levanzo.",
    imageAlt: "Cigala & Bertinetti navegando por las Islas Egadi",
    idealFor: [
      "Excursiones privadas de 4 horas por la mañana o por la tarde",
      "Tour compartido de 8 horas con plazas individuales",
      "Grupos que quieren baño, snorkel y ruta flexible",
      "Quienes prefieren un barco abierto y dinámico",
    ],
    routes: [
      "Favignana y Levanzo en jornada completa",
      "Calas protegidas para medio día privado",
      "Ruta adaptada a viento, mar y afluencia",
    ],
    faqs: [
      {
        question: "¿La excursión de 4 horas es compartida?",
        answer:
          "No. La fórmula de 4 horas se ofrece como experiencia privada, por la mañana o por la tarde.",
      },
      {
        question: "¿La Cigala & Bertinetti sirve para un tour compartido?",
        answer:
          "Sí, el tour compartido disponible es el de 8 horas, con plazas individuales y salida desde Trapani.",
      },
      {
        question: "¿Qué debo llevar?",
        answer:
          "Bañador, toalla, protector solar, sombrero, gafas de sol y una bolsa blanda. En un barco abierto conviene viajar ligero.",
      },
    ],
    specs: [
      { icon: "users", value: "12", label: "Plazas" },
      { icon: "engine", value: "800", label: "HP" },
    ],
  },
};

const FRENCH_BOAT_OVERRIDES: Partial<Record<string, Partial<ResolvedBoatContent>>> = {
  trimarano: {
    title: "Neel 47",
    shortTitle: "Neel 47",
    eyebrow: "Confort, chef et charter",
    description:
      "Le Neel 47 est le trimaran des expériences les plus complètes aux îles Égades : grands espaces, cabines, cuisine et stabilité pour journées privées, chef à bord et charters de plusieurs jours.",
    detail: {
      eyebrow: "Trimaran pour excursions aux Égades",
      title: "Neel 47 : confort, chef et charter aux îles Égades",
      paragraphs: [
        "Le Neel 47 est l'option Egadisailing pour ceux qui cherchent une expérience en bateau plus confortable, soignée et privée qu'un tour rapide classique. Il est idéal pour une excursion avec chef à bord, une journée gourmet entre Favignana et Levanzo ou un charter de plusieurs jours.",
        "À bord, il y a de l'espace pour déjeuner, se détendre, prendre le soleil, se changer et vivre la journée à un rythme lent. Sa structure de trimaran offre stabilité et amplitude même aux hôtes peu habitués à naviguer.",
        "Il n'est pas nécessaire de connaître les criques ni d'avoir de l'expérience en voile : route, horaires et arrêts sont ajustés avec l'équipage selon la météo, la mer et l'objectif de la journée.",
      ],
    },
    seoTitle: "Neel 47 avec chef à bord aux îles Égades",
    seoDescription:
      "Trimaran Neel 47 depuis Trapani pour excursions aux îles Égades avec chef à bord, expérience gourmet, charter, cabines et confort privé.",
    imageAlt: "Trimaran Neel 47 aux îles Égades",
    idealFor: [
      "Expérience gourmet avec chef à bord",
      "Charter privé de plusieurs jours",
      "Groupes qui cherchent espace, intimité et rythme lent",
      "Déjeuner à bord et arrêts dans des criques protégées",
    ],
    routes: [
      "Favignana et Levanzo pour l'expérience gourmet",
      "Favignana, Levanzo et Marettimo pour les charters de plusieurs jours",
      "Routes adaptées à la mer, au vent et au confort à bord",
    ],
    faqs: [
      {
        question: "Pourquoi choisir le Neel 47 ?",
        answer:
          "Parce qu'il offre plus d'espace, de stabilité et de confort qu'un bateau ouvert. C'est le meilleur choix pour chef à bord, charter et journées privées premium.",
      },
      {
        question: "Le Neel 47 convient-il aux familles ?",
        answer:
          "Oui. Ses zones larges et protégées aident à vivre la journée plus calmement, toujours avec route et horaires adaptés par l'équipage.",
      },
      {
        question: "Peut-on dormir à bord ?",
        answer:
          "Oui, dans les programmes de charter de plusieurs jours, selon les conditions météo et la planification de route.",
      },
    ],
    specs: [
      { icon: "cabins", value: "4", label: "Cabines" },
      { icon: "beds", value: "8", label: "Couchages" },
      { icon: "kitchen", value: "1", label: "Cuisine" },
      { icon: "bath", value: "3", label: "Salles d'eau" },
    ],
  },
  boat: {
    title: "Cigala & Bertinetti 34 Offshore Open",
    shortTitle: "Cigala & Bertinetti",
    eyebrow: "Agile, rapide et ouvert",
    description:
      "Le Cigala & Bertinetti 34 Offshore Open est le bateau agile pour excursions privées de 4 heures et sorties de 8 heures partagées ou privées entre Favignana et Levanzo.",
    detail: {
      eyebrow: "Bateau ouvert pour les îles Égades",
      title: "Cigala & Bertinetti : le bateau agile pour criques, baignades et routes flexibles",
      paragraphs: [
        "Le Cigala & Bertinetti est idéal pour ceux qui veulent se déplacer rapidement entre les criques, faire des arrêts baignade et vivre une expérience plus directe avec la mer.",
        "Il fonctionne très bien pour les tours privés de 4 heures le matin ou l'après-midi, et pour les journées de 8 heures lorsque vous voulez plus de temps pour Favignana, Levanzo et les zones protégées du jour.",
        "C'est un bateau ouvert et sportif : parfait pour les groupes qui cherchent eau claire, snorkeling et route flexible avec skipper.",
      ],
    },
    seoTitle: "Cigala & Bertinetti pour excursions en bateau aux îles Égades",
    seoDescription:
      "Cigala & Bertinetti 34 Offshore Open depuis Trapani pour tours privés de 4 heures et excursions de 8 heures partagées ou privées à Favignana et Levanzo.",
    imageAlt: "Cigala & Bertinetti naviguant aux îles Égades",
    idealFor: [
      "Excursions privées de 4 heures le matin ou l'après-midi",
      "Tour partagé de 8 heures avec places individuelles",
      "Groupes qui veulent baignade, snorkeling et route flexible",
      "Ceux qui préfèrent un bateau ouvert et dynamique",
    ],
    routes: [
      "Favignana et Levanzo en journée complète",
      "Criques protégées pour demi-journée privée",
      "Route adaptée au vent, à la mer et à l'affluence",
    ],
    faqs: [
      {
        question: "L'excursion de 4 heures est-elle partagée ?",
        answer:
          "Non. La formule de 4 heures est proposée comme expérience privée, le matin ou l'après-midi.",
      },
      {
        question: "Le Cigala & Bertinetti convient-il à un tour partagé ?",
        answer:
          "Oui, le tour partagé disponible est celui de 8 heures, avec places individuelles et départ depuis Trapani.",
      },
      {
        question: "Que faut-il apporter ?",
        answer:
          "Maillot, serviette, crème solaire, chapeau, lunettes de soleil et sac souple. Sur un bateau ouvert, mieux vaut voyager léger.",
      },
    ],
    specs: [
      { icon: "users", value: "12", label: "Places" },
      { icon: "engine", value: "800", label: "HP" },
    ],
  },
};

export function getBoatContent(boatId: string, locale?: string | null): ResolvedBoatContent | null {
  const entry = getBoatCatalogEntry(boatId);
  if (!entry) return null;
  const content: ResolvedBoatContent = {
    id: entry.id,
    slug: entry.slug,
    externalUrl: entry.externalUrl,
    order: entry.order,
    title: localize(entry.title, locale),
    shortTitle: localize(entry.shortTitle, locale),
    eyebrow: localize(entry.eyebrow, locale),
    description: localize(entry.description, locale),
    detail: {
      eyebrow: localize(entry.detail.eyebrow, locale),
      title: localize(entry.detail.title, locale),
      paragraphs: entry.detail.paragraphs.map((paragraph) => localize(paragraph, locale)),
    },
    seoTitle: localize(entry.seoTitle, locale),
    seoDescription: localize(entry.seoDescription, locale),
    imageSrc: entry.imageSrc,
    heroVideoSrc: entry.heroVideoSrc ? publicAsset(entry.heroVideoSrc) : undefined,
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
  const override =
    locale === "es"
      ? SPANISH_BOAT_OVERRIDES[content.id]
      : locale === "fr"
        ? FRENCH_BOAT_OVERRIDES[content.id]
        : undefined;
  return override ? { ...content, ...override } : content;
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
