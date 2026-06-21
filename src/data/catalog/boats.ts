import { localize, type LocalizedString } from "./locales";
import { getExperienceContent } from "./experiences";
import { publicAsset } from "@/lib/public-assets";

export type BoatSpecIcon = "cabins" | "beds" | "kitchen" | "bath" | "relax" | "users" | "engine";

export interface BoatCatalogEntry {
  id: string;
  slug: string;
  listed?: boolean;
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

const BOAT_DETAIL_PAGE_IDS = new Set(["trimarano"]);

const BOATS_PAGE_COPY = {
  seoTitle: {
    it: "Catamarano Egadi, trimarano e barche da Trapani",
    en: "Egadi catamaran, trimaran and boats from Trapani",
    es: "Catamarán, trimarán y barcos a las Egadi desde Trapani",
    fr: "Catamaran, trimaran et bateaux aux Égades depuis Trapani",
    de: "Katamaran, Trimaran und Boote auf den Egadi ab Trapani",
  },
  seoDescription: {
    it: "Cerchi un catamarano alle Egadi? Scopri il trimarano con comfort da catamarano da Trapani e la barca open per tour privati o condivisi.",
    en: "Looking for a catamaran in the Egadi Islands? Discover the trimaran with catamaran-style comfort from Trapani and the open boat for private or shared tours.",
    es: "¿Buscas un catamarán en las Egadi? Descubre el trimarán con confort de catamarán desde Trapani y el barco open para tours privados o compartidos.",
    fr: "Vous cherchez un catamaran aux Égades ? Découvrez le trimaran au confort de catamaran depuis Trapani et le bateau open pour sorties privées ou partagées.",
    de: "Sie suchen einen Katamaran auf den Egadi? Entdecken Sie den Trimaran mit Katamaran-Komfort ab Trapani und das offene Boot für private oder geteilte Touren.",
  },
  eyebrow: {
    it: "Flotta Egadisailing",
    en: "Egadisailing fleet",
    es: "Flota Egadisailing",
    fr: "Flotte Egadisailing",
    de: "Egadisailing-Flotte",
  },
  title: {
    it: "Catamarano, trimarano e barche per scoprire le Egadi da Trapani",
    en: "Catamaran, trimaran and boats for discovering the Egadi Islands from Trapani",
    es: "Catamarán, trimarán y barcos para descubrir las Egadi desde Trapani",
    fr: "Catamaran, trimaran et bateaux pour découvrir les Égades depuis Trapani",
    de: "Katamaran, Trimaran und Boote für die Egadi ab Trapani",
  },
  subtitle: {
    it: "La flotta Egadisailing nasce per vivere le Isole Egadi da Trapani con due esperienze diverse: il trimarano con comfort da catamarano per charter e giornate premium con skipper, e la Barca Egadi Sailing Cigala & Bertinetti 34 per escursioni in barca a Favignana e Levanzo, tour privati, uscite condivise, soste bagno e snorkeling. Se stai cercando un catamarano alle Egadi, la soluzione premium è il nostro trimarano: spazi ampi, stabilità da multiscafo e una vita a bordo più comoda.",
    en: "The Egadisailing fleet is built for experiencing the Egadi Islands from Trapani in two different ways: a trimaran with catamaran-style comfort for skippered charters and premium days, and Barca Egadi Sailing Cigala & Bertinetti 34 for Favignana and Levanzo boat tours, private trips, shared outings, swim stops and snorkelling. If you are looking for an Egadi catamaran, our premium solution is the trimaran: wide spaces, multihull stability and more comfortable life on board.",
    es: "La flota Egadisailing está pensada para vivir las Islas Egadi desde Trapani de dos formas: un trimarán con confort de catamarán para charter con patrón y jornadas premium, y Barca Egadi Sailing Cigala & Bertinetti 34 para excursiones en barco a Favignana y Levanzo, tours privados, salidas compartidas, baños y snorkel. Si buscas un catamarán en las Egadi, nuestra solución premium es el trimarán: espacios amplios, estabilidad de multicasco y una vida a bordo más cómoda.",
    fr: "La flotte Egadisailing permet de vivre les îles Égades depuis Trapani de deux façons : un trimaran au confort de catamaran pour charter avec skipper et journées premium, et Barca Egadi Sailing Cigala & Bertinetti 34 pour excursions en bateau à Favignana et Levanzo, sorties privées ou partagées, baignades et snorkeling. Si vous cherchez un catamaran aux Égades, notre solution premium est le trimaran : grands espaces, stabilité de multicoque et vie à bord plus confortable.",
    de: "Die Egadisailing-Flotte ist für zwei Arten gedacht, die Egadi ab Trapani zu erleben: ein Trimaran mit Katamaran-Komfort für Charter mit Skipper und Premium-Tage sowie die Barca Egadi Sailing Cigala & Bertinetti 34 für Bootstouren nach Favignana und Levanzo, private Touren, geteilte Ausfahrten, Badestopps und Schnorcheln. Wenn Sie einen Katamaran auf den Egadi suchen, ist unser Trimaran die Premium-Lösung: viel Platz, Multihull-Stabilität und komfortableres Leben an Bord.",
  },
  comparisonTitle: {
    it: "Due barche, due modi di vivere il mare",
    en: "Two boats, two ways to experience the sea",
    es: "Dos barcos, dos formas de vivir el mar",
    fr: "Deux bateaux, deux façons de vivre la mer",
    de: "Zwei Boote, zwei Arten, das Meer zu erleben",
  },
  comparisonText: {
    it: "Il Trimarano è pensato per comfort e charter con skipper: una soluzione multiscafo ideale se stai valutando un tour in catamarano alle Egadi ma vuoi più spazio e servizio a bordo. La Barca è la scelta agile per tour in barca, soste bagno e rotte più snelle.",
    en: "The trimaran is for comfort and skippered charter: a multihull solution if you are considering a catamaran tour in the Egadi Islands but want more space and onboard service. The Boat is the agile choice for boat tours, swim stops and lighter routes.",
    es: "El trimarán está pensado para confort y charter con patrón: una solución multicasco si estás valorando un tour en catamarán por las Egadi y quieres más espacio y servicio a bordo. El barco es la opción ágil para tours, baños y rutas más ligeras.",
    fr: "Le trimaran est pensé pour le confort et le charter avec skipper : une solution multicoque si vous envisagez un tour en catamaran aux Égades et souhaitez plus d'espace et de service à bord. Le bateau est le choix agile pour les sorties, baignades et routes plus souples.",
    de: "Der Trimaran steht für Komfort und Charter mit Skipper: eine Multihull-Lösung, wenn Sie eine Katamaran-Tour auf den Egadi suchen und mehr Platz sowie Service an Bord wünschen. Das Boot ist die agile Wahl für Touren, Badestopps und leichtere Routen.",
  },
  chooserTitle: {
    it: "Quale barca scegliere?",
    en: "Which boat should you choose?",
    es: "¿Qué barco elegir?",
    fr: "Quel bateau choisir ?",
    de: "Welches Boot passt zu Ihnen?",
  },
  chooserText: {
    it: "Se cerchi spazio, tavola e privacy scegli il Trimarano, soprattutto se il tuo riferimento è una giornata in catamarano alle Egadi con skipper e comfort. Se vuoi una rotta snella tra baie, bagni e snorkeling scegli la Barca.",
    en: "Choose the trimaran for space, dining and privacy, especially if you are looking for a catamaran-style day in the Egadi Islands with skipper and comfort. Choose the Boat for an agile route between bays, swimming and snorkelling.",
    es: "Elige el trimarán para espacio, mesa y privacidad, sobre todo si buscas una jornada tipo catamarán en las Egadi con patrón y confort. Elige el barco para una ruta ágil entre calas, baños y snorkel.",
    fr: "Choisissez le trimaran pour l'espace, le déjeuner et l'intimité, surtout si vous cherchez une journée type catamaran aux Égades avec skipper et confort. Choisissez le bateau pour une route agile entre criques, baignades et snorkeling.",
    de: "Wählen Sie den Trimaran für Platz, Essen und Privatsphäre, besonders wenn Sie einen Tag wie auf einem Katamaran auf den Egadi mit Skipper und Komfort suchen. Wählen Sie das Boot für eine agile Route zwischen Buchten, Badestopps und Schnorcheln.",
  },
  detailCtaLabel: {
    it: "Scopri la barca",
    en: "Discover the boat",
    es: "Ver el barco",
    fr: "Voir le bateau",
    de: "Boot ansehen",
  },
  experiencesCtaLabel: {
    it: "Vedi esperienze",
    en: "View experiences",
    es: "Ver experiencias",
    fr: "Voir les expériences",
    de: "Erlebnisse ansehen",
  },
  availableExperiencesLabel: {
    it: "Esperienze disponibili",
    en: "Available experiences",
    es: "Experiencias disponibles",
    fr: "Expériences disponibles",
    de: "Verfügbare Erlebnisse",
  },
  fallbackImageNote: {
    it: "Foto completa in arrivo",
    en: "Full photo coming soon",
    es: "Foto completa próximamente",
    fr: "Photo complète à venir",
    de: "Vollständiges Foto folgt",
  },
} as const satisfies Record<string, LocalizedString>;

function createNeelGalleryMedia(
  src: string,
  caption: LocalizedString,
  alt: LocalizedString = caption,
): BoatCatalogEntry["gallery"][number] {
  return {
    src,
    alt: {
      it: `${alt.it} a bordo del trimarano alle Isole Egadi`,
      en: `${alt.en} on board the trimaran in the Egadi Islands`,
    },
    caption,
  };
}

const NEW_NEEL_47_GALLERY_MEDIA: BoatCatalogEntry["gallery"] = [
  createNeelGalleryMedia("/images/boats/neel-47/_49A7777.webp", {
    it: "Tramonto a bordo",
    en: "Sunset on board",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_49A7816.webp", {
    it: "Ponte al tramonto",
    en: "Sunset deck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8002.webp", {
    it: "Relax a prua",
    en: "Relax on the bow",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8022.webp", {
    it: "Navigazione con skipper",
    en: "Sailing with skipper",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8028.webp", {
    it: "Vita sul ponte",
    en: "Deck life",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8033.webp", {
    it: "Luce dorata in coperta",
    en: "Golden light on deck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8046.webp", {
    it: "Prendisole al tramonto",
    en: "Sunset sundeck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8064_1.webp", {
    it: "Dettagli aperitivo",
    en: "Aperitif details",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8080_1.webp", {
    it: "Brindisi vista mare",
    en: "Sea-view toast",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8090.webp", {
    it: "Cucina a bordo",
    en: "Cooking on board",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8092.webp", {
    it: "Preparazione in cucina",
    en: "Galley preparation",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8107.webp", {
    it: "Prua in rada",
    en: "Bow at anchor",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8121.webp", {
    it: "Prendisole panoramico",
    en: "Panoramic sundeck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8156.webp", {
    it: "Ponte vista costa",
    en: "Deck with coastal view",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8214.webp", {
    it: "Bagno in rada",
    en: "Swim stop at anchor",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8263.webp", {
    it: "Relax sulla rete",
    en: "Relax on the net",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8278.webp", {
    it: "Relax di coppia",
    en: "Couple relaxation",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8298_2.webp", {
    it: "Momenti in coperta",
    en: "Moments on deck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8344_1.webp", {
    it: "Tavola con prodotti locali",
    en: "Table with local products",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8364.webp", {
    it: "Tramonto elegante",
    en: "Elegant sunset",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8388.webp", {
    it: "Orizzonte dal ponte",
    en: "Horizon from the deck",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8428.webp", {
    it: "Aperitivo sul tavolo",
    en: "Aperitif on the table",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8435_1.webp", {
    it: "Vino e sapori siciliani",
    en: "Wine and Sicilian flavours",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8462.webp", {
    it: "Silhouette al tramonto",
    en: "Sunset silhouette",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8475.webp", {
    it: "Relax serale",
    en: "Evening relaxation",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8516.webp", {
    it: "Crudo di mare",
    en: "Seafood close-up",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8520.webp", {
    it: "Calice e mare",
    en: "Glass and sea",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8525.webp", {
    it: "Cena in pozzetto",
    en: "Dinner in the cockpit",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8548.webp", {
    it: "Serata a bordo",
    en: "Evening on board",
  }),
  createNeelGalleryMedia("/images/boats/neel-47/_V6B8563.webp", {
    it: "Pasta di mare",
    en: "Seafood pasta",
  }),
];

export const BOAT_CATALOG = {
  trimarano: {
    id: "trimarano",
    slug: "catamarano-egadi-trimarano-da-trapani",
    listed: true,
    aliases: ["neel-47", "trimarano-egadisailing", "trimarano-egadi", "catamarano-egadi", "neel-43"],
    externalUrl: "https://www.neel-trimarans.com/range/neel-47/",
    order: 10,
    title: {
      it: "Catamarano e trimarano alle Egadi",
      en: "Catamaran and trimaran in the Egadi",
    },
    shortTitle: {
      it: "Catamarano / Trimarano",
      en: "Catamaran / Trimaran",
    },
    eyebrow: {
      it: "Comfort e charter",
      en: "Comfort and charter",
    },
    description: {
      it: "Cerchi un catamarano alle Egadi? La nostra proposta premium è un trimarano multiscafo con spazi ampi, cabine, cucina, stabilità e comfort da catamarano per giornate private con skipper e charter di più giorni.",
      en: "Looking for a catamaran in the Egadi Islands? Our premium proposal is a trimaran multihull with wide spaces, cabins, galley, stability and catamaran-style comfort for private skippered days and multi-day charters.",
    },
    detail: {
      eyebrow: {
        it: "Trimarano per tour Egadi",
        en: "Trimarano for Egadi tours",
      },
      title: {
        it: "Catamarano alle Egadi? Il trimarano con skipper da Trapani",
        en: "Catamaran in the Egadi Islands? The skippered trimaran from Trapani",
      },
      paragraphs: [
        {
          it: "Questa barca è pensata per chi cerca un'esperienza in barca alle Isole Egadi più comoda, curata e privata rispetto a un classico tour veloce. Molti ospiti arrivano cercando un catamarano alle Egadi, un tour in catamarano da Trapani o un charter catamarano con skipper: tecnicamente è un trimarano, quindi ha tre scafi, grande stabilità e spazi molto vivibili.",
          en: "This boat is designed for guests looking for a more comfortable, curated and private Egadi Islands boat experience than a classic fast tour. Many guests search for an Egadi catamaran, a catamaran tour from Trapani or a skippered catamaran charter: technically, this is a trimaran, with three hulls, excellent stability and highly liveable spaces.",
        },
        {
          it: "A bordo il tempo non è solo navigazione: ci sono spazi per rilassarsi, prendere il sole, cambiarsi e vivere la giornata con ritmo lento. Nei programmi charter il trimarano permette di allargare il viaggio verso Favignana, Levanzo, Marettimo e, su richiesta, valutare anche San Vito Lo Capo quando durata e meteo lo consentono.",
          en: "Time on board is not just navigation: there is space for relaxing, sunbathing, changing and enjoying the day at a slower pace. On charter programmes, the trimaran can extend the trip towards Favignana, Levanzo, Marettimo and, on request, San Vito Lo Capo when duration and weather allow it.",
        },
        {
          it: "Chi cerca parole semplici può immaginarlo così: è l'alternativa premium al noleggio catamarano alle Egadi, con skipper, crew, comfort reale e un modo più elegante di vivere il mare. Non serve essere esperti di vela o conoscere già le cale: rotta, orari e soste vengono gestiti dalla crew in base a meteo, mare e obiettivo della giornata.",
          en: "In simple words, it is the premium alternative to catamaran rental in the Egadi Islands, with skipper, crew, real comfort and a more elegant way to enjoy the sea. You do not need sailing experience or previous knowledge of the coves: route, timing and stops are managed by the crew according to weather, sea conditions and the goal of the day.",
        },
      ],
    },
    seoTitle: {
      it: "Catamarano Egadi da Trapani: trimarano con skipper",
      en: "Egadi catamaran from Trapani: skippered trimaran",
    },
    seoDescription: {
      it: "Catamarano alle Egadi da Trapani: trimarano multiscafo con comfort da catamarano, charter con skipper, cabine, Favignana, Levanzo e Marettimo.",
      en: "Catamaran-style charter in the Egadi Islands from Trapani: multihull trimaran with skipper, cabins, Favignana, Levanzo and Marettimo.",
    },
    imageSrc: "/images/home/traimarano-levanzo.webp",
    heroVideoSrc: "/images/boats/neel-47/hero-video.webm",
    imageAlt: {
      it: "Catamarano alle Egadi in trimarano con comfort multiscafo",
      en: "Catamaran-style trimaran in the Egadi Islands",
    },
    gallery: [
      {
        src: "/images/boats/neel-47/neel-47-hero.webp",
        alt: {
          it: "Trimarano in navigazione alle Egadi con comfort da catamarano",
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
        src: "/images/boats/neel-47/trimarano-ancorato.webp",
        alt: {
          it: "Trimarano all'ancora con pozzetto aperto e ospiti a bordo",
          en: "Trimaran at anchor with an open cockpit and guests on board",
          es: "Trimarán fondeado con bañera abierta y huéspedes a bordo",
          fr: "Trimaran au mouillage avec cockpit ouvert et invités à bord",
          de: "Trimaran vor Anker mit offenem Cockpit und Gästen an Bord",
        },
        caption: {
          it: "All'ancora",
          en: "At anchor",
          es: "Fondeado",
          fr: "Au mouillage",
          de: "Vor Anker",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-fuori.webp",
        alt: {
          it: "Trimarano in rada vicino alla costa con i fari sullo sfondo",
          en: "Trimaran at anchor near the coast with lighthouses in the background",
          es: "Trimarán fondeado cerca de la costa con faros al fondo",
          fr: "Trimaran au mouillage près de la côte avec des phares en arrière-plan",
          de: "Trimaran vor Anker nahe der Küste mit Leuchttürmen im Hintergrund",
        },
        caption: {
          it: "Vista esterna",
          en: "Exterior view",
          es: "Vista exterior",
          fr: "Vue extérieure",
          de: "Außenansicht",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-navigazione-drone.webp",
        alt: {
          it: "Trimarano visto dall'alto con vela rossa in navigazione",
          en: "Trimaran seen from above sailing with a red sail",
          es: "Trimarán visto desde arriba navegando con vela roja",
          fr: "Trimaran vu d'en haut en navigation avec une voile rouge",
          de: "Trimaran von oben beim Segeln mit rotem Segel",
        },
        caption: {
          it: "Vista drone",
          en: "Drone view",
          es: "Vista dron",
          fr: "Vue drone",
          de: "Drohnenansicht",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-navigazione-drone2.webp",
        alt: {
          it: "Trimarano in navigazione visto dal drone con gennaker rosso",
          en: "Trimaran sailing with a red gennaker seen from a drone",
          es: "Trimarán navegando con gennaker rojo visto desde dron",
          fr: "Trimaran en navigation avec gennaker rouge vu par drone",
          de: "Trimaran mit rotem Gennaker aus Drohnenperspektive",
        },
        caption: {
          it: "Vela rossa",
          en: "Red sail",
          es: "Vela roja",
          fr: "Voile rouge",
          de: "Rotes Segel",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-navigazione-drone3.webp",
        alt: {
          it: "Vista aerea del trimarano in navigazione a vela",
          en: "Aerial view of the trimaran sailing",
          es: "Vista aérea del trimarán navegando a vela",
          fr: "Vue aérienne du trimaran en navigation à voile",
          de: "Luftaufnahme des Trimarans unter Segel",
        },
        caption: {
          it: "Navigazione dall'alto",
          en: "Sailing from above",
          es: "Navegación desde arriba",
          fr: "Navigation vue d'en haut",
          de: "Segeln von oben",
        },
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
        src: "/images/boats/neel-47/trimarano-prendisole-wide.webp",
        alt: {
          it: "Ospiti sul prendisole del trimarano durante un aperitivo vista mare",
          en: "Guests on the trimaran sun deck during an aperitif with sea view",
          es: "Huéspedes en el solárium del trimarán durante un aperitivo con vistas al mar",
          fr: "Invités sur le bain de soleil du trimaran pendant un apéritif vue mer",
          de: "Gäste auf dem Sonnendeck des Trimarans bei einem Aperitif mit Meerblick",
        },
        caption: {
          it: "Prendisole panoramico",
          en: "Panoramic sun deck",
          es: "Solárium panorámico",
          fr: "Bain de soleil panoramique",
          de: "Panorama-Sonnendeck",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-relax2.webp",
        alt: {
          it: "Ospiti in relax sulla rete del trimarano al tramonto",
          en: "Guests relaxing on the trimaran net at sunset",
          es: "Huéspedes relajándose en la red del trimarán al atardecer",
          fr: "Invités en détente sur le filet du trimaran au coucher du soleil",
          de: "Gäste entspannen auf dem Netz des Trimarans bei Sonnenuntergang",
        },
        caption: {
          it: "Relax al tramonto",
          en: "Sunset relaxation",
          es: "Relax al atardecer",
          fr: "Relax au coucher du soleil",
          de: "Entspannung bei Sonnenuntergang",
        },
      },
      ...NEW_NEEL_47_GALLERY_MEDIA,
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
        src: "/images/boats/neel-47/trimarano-salotto.webp",
        alt: {
          it: "Salone del trimarano aperto sul pozzetto e sul mare",
          en: "Trimaran saloon opening onto the cockpit and the sea",
          es: "Salón del trimarán abierto hacia la bañera y el mar",
          fr: "Salon du trimaran ouvert sur le cockpit et la mer",
          de: "Salon des Trimarans mit offenem Übergang zum Cockpit und Meer",
        },
        caption: {
          it: "Salone vista mare",
          en: "Sea-view saloon",
          es: "Salón con vistas al mar",
          fr: "Salon vue mer",
          de: "Salon mit Meerblick",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-salotto2.webp",
        alt: {
          it: "Divano del salone interno del trimarano con vista sul mare",
          en: "Interior saloon sofa on the trimaran with sea view",
          es: "Sofá del salón interior del trimarán con vistas al mar",
          fr: "Canapé du salon intérieur du trimaran avec vue sur la mer",
          de: "Sofa in der Innenlounge des Trimarans mit Meerblick",
        },
        caption: {
          it: "Salotto interno",
          en: "Interior lounge",
          es: "Salón interior",
          fr: "Salon intérieur",
          de: "Innenlounge",
        },
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
          it: "Crew prepara il servizio a bordo del Trimarano",
          en: "Crew preparing onboard service on the Trimarano",
        },
        caption: { it: "Servizio a bordo", en: "Onboard service" },
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
        src: "/images/boats/neel-47/trimarano-cucina3.webp",
        alt: {
          it: "Cucina del trimarano con piano di lavoro e vista mare",
          en: "Trimaran galley with worktop and sea view",
          es: "Cocina del trimarán con encimera y vistas al mar",
          fr: "Cuisine du trimaran avec plan de travail et vue mer",
          de: "Bordküche des Trimarans mit Arbeitsfläche und Meerblick",
        },
        caption: {
          it: "Cucina vista mare",
          en: "Sea-view galley",
          es: "Cocina con vistas al mar",
          fr: "Cuisine vue mer",
          de: "Bordküche mit Meerblick",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-cucina-copy.webp",
        alt: {
          it: "Cucina e salone del trimarano con pozzetto aperto sul mare",
          en: "Trimaran galley and saloon with the cockpit open to the sea",
          es: "Cocina y salón del trimarán con la bañera abierta al mar",
          fr: "Cuisine et salon du trimaran avec cockpit ouvert sur la mer",
          de: "Bordküche und Salon des Trimarans mit offenem Cockpit zum Meer",
        },
        caption: {
          it: "Cucina e salone",
          en: "Galley and saloon",
          es: "Cocina y salón",
          fr: "Cuisine et salon",
          de: "Bordküche und Salon",
        },
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
        src: "/images/boats/neel-47/trimarano-camera1.webp",
        alt: {
          it: "Cabina matrimoniale del trimarano con vista sul mare",
          en: "Trimaran double cabin with sea view",
          es: "Cabina doble del trimarán con vistas al mar",
          fr: "Cabine double du trimaran avec vue sur la mer",
          de: "Doppelkabine des Trimarans mit Meerblick",
        },
        caption: {
          it: "Cabina vista mare",
          en: "Sea-view cabin",
          es: "Cabina con vistas al mar",
          fr: "Cabine vue mer",
          de: "Kabine mit Meerblick",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-camera2.webp",
        alt: {
          it: "Cabina matrimoniale del trimarano collegata al salone",
          en: "Trimaran double cabin connected to the saloon",
          es: "Cabina doble del trimarán conectada con el salón",
          fr: "Cabine double du trimaran reliée au salon",
          de: "Doppelkabine des Trimarans mit Verbindung zum Salon",
        },
        caption: {
          it: "Cabina e salone",
          en: "Cabin and saloon",
          es: "Cabina y salón",
          fr: "Cabine et salon",
          de: "Kabine und Salon",
        },
      },
      {
        src: "/images/boats/neel-47/trimarano-camera3.webp",
        alt: {
          it: "Cabina del trimarano con finestra panoramica sul mare",
          en: "Trimaran cabin with a panoramic sea-facing window",
          es: "Cabina del trimarán con ventana panorámica al mar",
          fr: "Cabine du trimaran avec fenêtre panoramique sur la mer",
          de: "Kabine des Trimarans mit Panoramafenster zum Meer",
        },
        caption: {
          it: "Cabina panoramica",
          en: "Panoramic cabin",
          es: "Cabina panorámica",
          fr: "Cabine panoramique",
          de: "Panoramakabine",
        },
      },
      {
        src: "/images/boats/neel-47/neel-47-bagno.webp",
        alt: {
          it: "Bagno con doccia del Trimarano",
          en: "Bathroom with shower of the Trimarano",
        },
        caption: { it: "Bagno", en: "Bathroom" },
      },
      {
        src: "/images/boats/neel-47/trimarano-pianta.webp",
        alt: {
          it: "Pianta del layout interno del trimarano con cabine e spazi comuni",
          en: "Trimaran interior layout plan with cabins and shared spaces",
          es: "Plano del layout interior del trimarán con cabinas y espacios comunes",
          fr: "Plan de l'aménagement intérieur du trimaran avec cabines et espaces communs",
          de: "Plan der Innenaufteilung des Trimarans mit Kabinen und Gemeinschaftsbereichen",
        },
        caption: {
          it: "Layout degli spazi",
          en: "Space layout",
          es: "Distribución de los espacios",
          fr: "Plan des espaces",
          de: "Raumaufteilung",
        },
      },
    ],
    idealFor: [
      {
        it: "Charter privati con skipper, spazi comodi e stabilità da multiscafo per chi desidera una giornata in catamarano alle Egadi reinterpretata in trimarano.",
        en: "Private skippered charters with comfortable spaces and multihull stability for guests looking for a catamaran-style Egadi day on a trimaran.",
      },
      {
        it: "Charter alle Egadi di più giorni, con cabine, cucina e zone relax pensate per dormire a bordo tra Favignana, Levanzo e Marettimo.",
        en: "Multi-day Egadi charters with cabins, galley and relaxation areas designed for overnight stays on board.",
      },
      {
        it: "Gruppi, famiglie e occasioni speciali che cercano privacy, comfort, skipper e una barca multiscafo stabile anche per chi non è esperto.",
        en: "Groups, families and special occasions looking for privacy, comfort and a stable boat even for non-experts.",
      },
    ],
    routes: [
      {
        it: "Nel charter la rotta è costruita con lo skipper tra Favignana, Levanzo e Marettimo, scegliendo baie riparate per bagno, snorkeling e soste in rada.",
        en: "On charter days the route is shaped with the skipper between Favignana, Levanzo and Marettimo, choosing sheltered bays for swimming, snorkelling and anchor stops.",
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
          it: "È un catamarano o un trimarano?",
          en: "Is it a catamaran or a trimaran?",
        },
        answer: {
          it: "È un trimarano, non un catamarano classico. Per chi cerca un catamarano alle Egadi o un tour in catamarano da Trapani, questa è la nostra soluzione multiscafo più vicina per comfort, spazi e stabilità, con il vantaggio di una struttura a tre scafi.",
          en: "It is a trimaran, not a classic catamaran. For guests looking for a catamaran in the Egadi Islands or a catamaran tour from Trapani, this is our closest multihull solution for comfort, space and stability, with the benefit of a three-hull layout.",
        },
      },
      {
        question: {
          it: "È adatto a chi cerca un tour in catamarano alle Egadi?",
          en: "Is it suitable for guests looking for a catamaran tour in the Egadi Islands?",
        },
        answer: {
          it: "Sì. Se il tuo obiettivo è vivere una giornata in catamarano alle Egadi con spazi ampi, stabilità, skipper e servizio curato, il trimarano risponde allo stesso bisogno con una configurazione a tre scafi. È ideale per charter con bagno, snorkeling e soste in rada tra Favignana, Levanzo e Marettimo.",
          en: "Yes. If you are looking for catamaran-style comfort, wide spaces, stability, skipper and curated service, the trimaran answers the same need with a three-hull configuration. It is ideal for charters with swimming, snorkelling and anchor stops between Favignana, Levanzo and Marettimo.",
        },
      },
      {
        question: {
          it: "Si può fare noleggio catamarano alle Egadi con skipper?",
          en: "Can it be booked as a skippered catamaran-style charter in the Egadi Islands?",
        },
        answer: {
          it: "La barca non viene proposta come catamarano classico, ma come trimarano con skipper. È la scelta Egadisailing per chi cerca noleggio catamarani alle Egadi con comfort, cabine, cucina e rotta flessibile, mantenendo una gestione professionale a bordo.",
          en: "The boat is not offered as a classic catamaran, but as a skippered trimaran. It is the Egadisailing choice for guests looking for multihull comfort, cabins, galley and a flexible route with professional management on board.",
        },
      },
      {
        question: {
          it: "È disponibile bareboat, senza skipper?",
          en: "Is bareboat rental available?",
        },
        answer: {
          it: "No. Non è un noleggio bareboat: il trimarano viene organizzato con skipper e crew, così la rotta tra le Isole Egadi resta sicura, flessibile e coerente con meteo, ancoraggi e tempi di navigazione.",
          en: "No. It is not a bareboat rental: the trimaran is organised with skipper and crew, so the route across the Egadi Islands remains safe, flexible and aligned with weather, anchorages and navigation timing.",
        },
      },
      {
        question: {
          it: "Il pranzo o la cambusa sono inclusi nel charter?",
          en: "Are lunch or provisioning included in the charter?",
        },
        answer: {
          it: "No, nel charter standard pasti e cambusa non sono inclusi. La barca ha cucina, tavolo e spazi comuni: eventuale cambusa, pranzo a bordo o servizi extra vengono concordati separatamente prima della partenza.",
          en: "No, food and provisioning are not included in the standard charter. The boat has a galley, table and shared spaces: provisioning, lunch on board or extra services are agreed separately before departure.",
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
          it: "Quante persone possono salire a bordo?",
          en: "How many guests can come on board?",
        },
        answer: {
          it: "La capienza dipende dalla formula scelta, dalla durata e dal programma. Prima della conferma verifichiamo numero ospiti, comfort a bordo e assetto migliore per la rotta.",
          en: "Capacity depends on the selected format, duration and programme. Before confirmation we check guest count, onboard comfort and the best setup for the route.",
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
          it: "Cosa comprende il charter in trimarano?",
          en: "What is included in the trimaran charter?",
        },
        answer: {
          it: "Il charter comprende trimarano con skipper, gestione della rotta, spazi a bordo e pianificazione in base a meteo e durata. Cambusa, pasti, porti extra e servizi aggiuntivi vengono definiti a parte in base al programma.",
          en: "The charter includes the trimaran with skipper, route management, onboard spaces and planning around weather and duration. Provisioning, meals, extra harbours and additional services are defined separately according to the programme.",
        },
      },
      {
        question: {
          it: "Il Trimarano esce sempre verso Marettimo?",
          en: "Does the Trimarano always sail to Marettimo?",
        },
        answer: {
          it: "No. Marettimo può essere valutata nei programmi charter di più giorni, quando tempi, meteo e programma permettono una navigazione più ampia. Nei programmi brevi la rotta resta più vicina a Favignana e Levanzo.",
          en: "No. Marettimo can be considered on multi-day charter programmes, when timing, weather and itinerary allow a wider navigation plan. Shorter programmes stay closer to Favignana and Levanzo.",
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
    listed: true,
    aliases: ["barca-egadisailing", "ciagal-bertinetti-34-offshore-open"],
    order: 20,
    title: {
      it: "Barca Egadi Sailing",
      en: "Barca Egadi Sailing",
    },
    shortTitle: {
      it: "Barca Egadi Sailing",
      en: "Barca Egadi Sailing",
    },
    eyebrow: {
      it: "4 ore esclusiva · 8 ore condivisa o privata",
      en: "4 hours private · 8 hours shared or private",
    },
    description: {
      it: "La Barca Egadi Sailing è una barca aperta, veloce e comoda per muoversi tra le cale delle Egadi. A bordo trovi sedute per il gruppo, spazio per prendere il sole, accesso al mare per bagno e snorkeling, skipper e una navigazione pensata per soste frequenti tra Favignana e Levanzo.",
      en: "Barca Egadi Sailing is an open, fast and comfortable boat for moving among coves in the Egadi Islands. On board you have seating for the group, space to enjoy the sun, sea access for swimming and snorkelling, a skipper and a route designed for frequent stops between Favignana and Levanzo.",
    },
    detail: {
      eyebrow: {
        it: "Barca open per tour Egadi da Trapani",
        en: "Open boat for Egadi tours from Trapani",
      },
      title: {
        it: "Barca Egadi Sailing: la barca agile per tour Egadi, Favignana e Levanzo",
        en: "Barca Egadi Sailing: the agile boat for Egadi, Favignana and Levanzo tours",
      },
      paragraphs: [
        {
          it: "La Barca Egadi Sailing è la barca Egadisailing dedicata ai tour in barca alle Egadi da Trapani per chi vuole vivere Favignana e Levanzo in modo semplice, dinamico e vicino al mare. È una barca open, quindi aperta: non devi immaginarla come uno yacht con cabine, ma come una barca comoda e veloce per spostarsi tra le cale, fermarsi spesso, fare bagno, snorkeling e godersi il mare senza complicazioni.",
          en: "Barca Egadi Sailing is the Egadisailing boat for Egadi boat tours from Trapani, designed for guests who want to experience Favignana and Levanzo in a simple, dynamic and sea-focused way. It is an open boat: not a yacht with cabins, but a comfortable and fast boat for moving between coves, stopping often, swimming, snorkelling and enjoying the sea without complications.",
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
      it: "Barca Egadi Sailing per tour Egadi da Trapani",
      en: "Barca Egadi Sailing for Egadi Tours from Trapani",
    },
    seoDescription: {
      it: "Barca Egadi Sailing per tour Egadi da Trapani: barca open con skipper, snorkeling, soste bagno, Favignana, Levanzo e tour privati o condivisi.",
      en: "Barca Egadi Sailing for Egadi tours from Trapani: open boat with skipper, snorkelling, swim stops, Favignana, Levanzo and private or shared tours.",
    },
    imageSrc: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
    heroVideoSrc: "/images/boats/cigala-bertinetti-34-offshore-open/hero-video.webm",
    imageAlt: {
      it: "Barca Egadi Sailing durante un tour alle Egadi",
      en: "Barca Egadi Sailing during an Egadi tour",
    },
    gallery: [
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
        alt: {
          it: "Gruppo a bordo della Barca Egadi Sailing alle Egadi",
          en: "Group on board Barca Egadi Sailing in the Egadi",
        },
        caption: { it: "Tour 8 ore", en: "8-hour tour" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-drone.webp",
        alt: {
          it: "Barca Egadi Sailing vista dall'alto durante la navigazione",
          en: "Barca Egadi Sailing seen from above while sailing",
        },
        caption: { it: "Vista dall'alto", en: "Aerial view" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-frontale.webp",
        alt: {
          it: "Vista frontale della Barca Egadi Sailing",
          en: "Front view of Barca Egadi Sailing",
        },
        caption: { it: "Vista frontale", en: "Front view" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-primo-piano.webp",
        alt: {
          it: "Dettaglio della Barca Egadi Sailing",
          en: "Detail of Barca Egadi Sailing",
        },
        caption: { it: "Dettaglio barca", en: "Boat detail" },
      },
      {
        src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
        alt: {
          it: "Momento a bordo della Barca Egadi Sailing alle Egadi",
          en: "Moment on board Barca Egadi Sailing in the Egadi",
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
          it: "Sì. Puoi scegliere i tour privati da 4 o 8 ore se vuoi la Barca Egadi Sailing riservata solo al tuo gruppo, con tempi e soste gestiti insieme allo skipper.",
          en: "Yes. You can choose private 4 or 8-hour tours if you want Barca Egadi Sailing reserved for your group, with timing and stops managed with the skipper.",
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
          it: "Che tipo di barca è la Barca Egadi Sailing?",
          en: "What kind of boat is Barca Egadi Sailing?",
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
          it: "Il tour condiviso è adatto se vuoi acquistare posti singoli e vivere una giornata completa con altri ospiti. La barca privata è migliore se vuoi privacy, tempi più flessibili e la Barca Egadi Sailing riservata solo al tuo gruppo.",
          en: "The shared tour works well if you want to buy individual seats and enjoy a full day with other guests. The private boat is better if you want privacy, more flexible timing and Barca Egadi Sailing reserved only for your group.",
        },
      },
      {
        question: {
          it: "La Barca Egadi Sailing ha cabine o spazi interni?",
          en: "Does Barca Egadi Sailing have cabins or indoor spaces?",
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
          it: "Cosa devo portare sulla Barca Egadi Sailing?",
          en: "What should I bring on Barca Egadi Sailing?",
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
  "fishing-rib": {
    id: "fishing-rib",
    slug: "gommone-pesca",
    listed: false,
    aliases: ["fishing-rib", "egadisailing-fishing-rib", "angel-rib"],
    order: 30,
    title: {
      it: "Gommone Pesca",
      en: "Fishing RIB",
      es: "Neumática de pesca",
      fr: "Semi-rigide de pêche",
      de: "Angel-RIB",
    },
    shortTitle: {
      it: "Gommone Pesca",
      en: "Fishing RIB",
      es: "Neumática pesca",
      fr: "Semi-rigide pêche",
      de: "Angel-RIB",
    },
    eyebrow: {
      it: "Pesca sportiva tecnica",
      en: "Technical sport fishing",
      es: "Pesca deportiva técnica",
      fr: "Pêche sportive technique",
      de: "Technisches Sportangeln",
    },
    description: {
      it: "Il Gommone Pesca è la barca dedicata alle uscite di pesca sportiva alle Egadi: piccolo gruppo, attrezzatura professionale, skipper tecnico e rotta scelta solo in zone e condizioni consentite.",
      en: "The Fishing RIB is the boat dedicated to sport fishing in the Egadi Islands: small group, professional gear, technical skipper and a route chosen only in permitted zones and conditions.",
      es: "La neumática de pesca está dedicada a salidas de pesca deportiva en las Egadi: grupo pequeño, equipo profesional, patrón técnico y ruta solo en zonas y condiciones permitidas.",
      fr: "Le semi-rigide de pêche est dédié aux sorties de pêche sportive aux Égades : petit groupe, matériel professionnel, skipper technique et route uniquement dans les zones et conditions autorisées.",
      de: "Das Angel-RIB ist für Sportangeltouren auf den Ägadischen Inseln gedacht: kleine Gruppe, professionelle Ausrüstung, technischer Skipper und Route nur in erlaubten Zonen und Bedingungen.",
    },
    detail: {
      eyebrow: {
        it: "Gommone per charter pesca Egadi",
        en: "RIB for Egadi fishing charters",
        es: "Neumática para charter de pesca en las Egadi",
        fr: "Semi-rigide pour charter de pêche aux Égades",
        de: "RIB für Angelcharter auf den Ägadischen Inseln",
      },
      title: {
        it: "Gommone Pesca: setup professionale per una giornata tecnica alle Egadi",
        en: "Fishing RIB: professional setup for a technical day in the Egadi",
        es: "Neumática de pesca: setup profesional para una jornada técnica en las Egadi",
        fr: "Semi-rigide de pêche : setup professionnel pour une journée technique aux Égades",
        de: "Angel-RIB: professionelles Setup für einen technischen Tag auf den Ägadischen Inseln",
      },
      paragraphs: [
        {
          it: "Il Gommone Pesca nasce per chi non cerca un semplice tour panoramico, ma una giornata dedicata alla pesca sportiva. La capienza è limitata a 4 persone per lasciare spazio di manovra, attrezzatura ordinata e attenzione reale da parte dello skipper.",
          en: "The Fishing RIB is for guests who are not looking for a simple scenic tour, but a day dedicated to sport fishing. Capacity is limited to 4 guests to keep manoeuvring space, organised gear and real skipper attention.",
          es: "La neumática de pesca es para quien no busca un simple tour panorámico, sino una jornada dedicada a la pesca deportiva. La capacidad se limita a 4 personas para mantener espacio de maniobra, equipo ordenado y atención real del patrón.",
          fr: "Le semi-rigide de pêche s'adresse à ceux qui ne cherchent pas une simple excursion panoramique, mais une journée dédiée à la pêche sportive. La capacité est limitée à 4 personnes pour garder de l'espace, du matériel ordonné et une vraie attention du skipper.",
          de: "Das Angel-RIB richtet sich an Gäste, die keine einfache Panoramatour suchen, sondern einen Tag für Sportangeln. Die Kapazität ist auf 4 Personen begrenzt, damit Bewegungsraum, geordnete Ausrüstung und echte Aufmerksamkeit des Skippers bleiben.",
        },
        {
          it: "Le tecniche vengono decise in giornata: bolentino, traina, drifting o catch and release, sempre secondo stagione, mare, specie presenti e regole dell'Area Marina Protetta e della normativa nazionale.",
          en: "Techniques are decided on the day: bottom fishing, trolling, drifting or catch and release, always according to season, sea state, target species and the Marine Protected Area plus national rules.",
          es: "Las técnicas se deciden el mismo día: pesca de fondo, curricán, drifting o catch and release, siempre según temporada, mar, especies y normativa del Área Marina Protegida y nacional.",
          fr: "Les techniques sont décidées le jour même : pêche de fond, traîne, drifting ou catch and release, toujours selon saison, mer, espèces et règles de l'Aire Marine Protégée et nationales.",
          de: "Die Techniken werden am Tag entschieden: Grundangeln, Schleppangeln, Drifting oder Catch and Release, immer je nach Saison, Meer, Fischarten sowie Regeln des Meeresschutzgebiets und nationalem Recht.",
        },
        {
          it: "Il pescato può essere rilasciato o trattenuto solo quando la legge lo consente. Non si promette la cattura: il valore dell'esperienza è nella guida tecnica, nella lettura del mare e nel rispetto del contesto Egadi.",
          en: "Catches can be released or kept only when the law allows it. No catch is promised: the value of the experience is in technical guidance, reading the sea and respecting the Egadi context.",
          es: "Las capturas pueden soltarse o conservarse solo cuando la ley lo permite. No se promete captura: el valor está en la guía técnica, la lectura del mar y el respeto del contexto de las Egadi.",
          fr: "Les prises peuvent être relâchées ou gardées uniquement lorsque la loi l'autorise. Aucune prise n'est promise : la valeur réside dans la guide technique, la lecture de la mer et le respect du contexte des Égades.",
          de: "Fänge können nur behalten oder freigelassen werden, wenn das Gesetz es erlaubt. Ein Fang wird nicht versprochen: Der Wert liegt in technischer Begleitung, dem Lesen des Meeres und Respekt für die Ägadischen Inseln.",
        },
      ],
    },
    seoTitle: {
      it: "Gommone Pesca per charter di pesca alle Egadi",
      en: "Fishing RIB for Egadi Fishing Charters",
      es: "Neumática de pesca para charter en las Islas Egadi",
      fr: "Semi-rigide de pêche pour charter aux îles Égades",
      de: "Angel-RIB für Angelcharter auf den Ägadischen Inseln",
    },
    seoDescription: {
      it: "Gommone Pesca Egadisailing per charter di pesca sportiva alle Isole Egadi da Trapani, fino a 4 persone, attrezzatura professionale e tecniche miste.",
      en: "Egadisailing Fishing RIB for sport fishing charters in the Egadi Islands from Trapani, up to 4 guests, professional gear and mixed techniques.",
      es: "Neumática de pesca Egadisailing para charter de pesca deportiva en las Islas Egadi desde Trapani, hasta 4 personas, equipo profesional y técnicas mixtas.",
      fr: "Semi-rigide de pêche Egadisailing pour charter de pêche sportive aux îles Égades depuis Trapani, jusqu'à 4 personnes, matériel professionnel et techniques mixtes.",
      de: "Egadisailing Angel-RIB für Sportangel-Charter auf den Ägadischen Inseln ab Trapani, bis 4 Personen, Profi-Ausrüstung und gemischte Techniken.",
    },
    imageSrc: "/images/boats/fishing-rib/fishing-rib-hero.webp",
    imageAlt: {
      it: "Gommone Pesca Egadisailing per charter di pesca alle Egadi",
      en: "Egadisailing Fishing RIB for Egadi fishing charters",
      es: "Neumática de pesca Egadisailing para charter en las Islas Egadi",
      fr: "Semi-rigide de pêche Egadisailing pour charter aux îles Égades",
      de: "Egadisailing Angel-RIB für Angelcharter auf den Ägadischen Inseln",
    },
    gallery: [
      {
        src: "/images/boats/fishing-rib/fishing-rib-hero.webp",
        alt: {
          it: "Gommone per pesca sportiva alle Isole Egadi",
          en: "RIB for sport fishing in the Egadi Islands",
          es: "Neumática para pesca deportiva en las Islas Egadi",
          fr: "Semi-rigide pour pêche sportive aux îles Égades",
          de: "RIB für Sportangeln auf den Ägadischen Inseln",
        },
        caption: {
          it: "Gommone Pesca",
          en: "Fishing RIB",
          es: "Neumática de pesca",
          fr: "Semi-rigide de pêche",
          de: "Angel-RIB",
        },
      },
      {
        src: "/images/boats/fishing-rib/fishing-rib-deck.webp",
        alt: {
          it: "Setup di coperta per charter di pesca",
          en: "Deck setup for fishing charter",
          es: "Setup de cubierta para charter de pesca",
          fr: "Setup de pont pour charter de pêche",
          de: "Deck-Setup für Angelcharter",
        },
        caption: {
          it: "Setup tecnico",
          en: "Technical setup",
          es: "Setup técnico",
          fr: "Setup technique",
          de: "Technisches Setup",
        },
      },
      {
        src: "/images/boats/fishing-rib/fishing-rib-navigation.webp",
        alt: {
          it: "Navigazione verso spot di pesca consentiti",
          en: "Navigation towards permitted fishing spots",
          es: "Navegación hacia zonas de pesca permitidas",
          fr: "Navigation vers les zones de pêche autorisées",
          de: "Fahrt zu erlaubten Angelspots",
        },
        caption: {
          it: "Rotta tecnica",
          en: "Technical route",
          es: "Ruta técnica",
          fr: "Route technique",
          de: "Technische Route",
        },
      },
    ],
    idealFor: [
      {
        it: "Appassionati di pesca sportiva che vogliono una giornata tecnica, non un tour balneare generico.",
        en: "Sport fishing enthusiasts who want a technical day, not a generic swim tour.",
        es: "Aficionados a la pesca deportiva que buscan una jornada técnica, no un tour de baño genérico.",
        fr: "Passionnés de pêche sportive qui veulent une journée technique, pas une simple sortie baignade.",
        de: "Sportangel-Enthusiasten, die einen technischen Tag suchen, keine allgemeine Badetour.",
      },
      {
        it: "Piccoli gruppi fino a 4 persone, con spazio per canne, attrezzatura e movimento a bordo.",
        en: "Small groups of up to 4 guests, with space for rods, gear and movement on board.",
        es: "Grupos pequeños de hasta 4 personas, con espacio para cañas, equipo y movimiento a bordo.",
        fr: "Petits groupes jusqu'à 4 personnes, avec espace pour cannes, matériel et mouvements à bord.",
        de: "Kleine Gruppen bis 4 Personen, mit Platz für Ruten, Ausrüstung und Bewegung an Bord.",
      },
      {
        it: "Uscite dove catch and release, trattenimento del pescato e tecniche vengono gestiti secondo legge e decisione dello skipper.",
        en: "Trips where catch and release, keeping fish and techniques are managed according to law and skipper decision.",
        es: "Salidas donde catch and release, conservación de capturas y técnicas se gestionan según ley y decisión del patrón.",
        fr: "Sorties où catch and release, conservation des prises et techniques sont gérés selon la loi et la décision du skipper.",
        de: "Ausfahrten, bei denen Catch and Release, Behalten von Fisch und Techniken nach Gesetz und Skipper-Entscheidung erfolgen.",
      },
    ],
    routes: [
      {
        it: "La rotta parte da Trapani e viene scelta dopo il briefing in base a vento, correnti, stagione e autorizzazioni AMP.",
        en: "The route starts from Trapani and is chosen after the briefing according to wind, currents, season and AMP authorisations.",
        es: "La ruta sale de Trapani y se elige tras el briefing según viento, corrientes, temporada y autorizaciones AMP.",
        fr: "La route part de Trapani et se choisit après le briefing selon vent, courants, saison et autorisations AMP.",
        de: "Die Route startet in Trapani und wird nach dem Briefing je nach Wind, Strömung, Saison und AMP-Genehmigungen gewählt.",
      },
      {
        it: "Le zone di pesca non sono comunicate come promessa fissa: si lavora solo in aree consentite e con condizioni sicure.",
        en: "Fishing areas are not promised as a fixed route: the day works only in permitted areas and safe conditions.",
        es: "Las zonas de pesca no se prometen como ruta fija: se trabaja solo en áreas permitidas y condiciones seguras.",
        fr: "Les zones de pêche ne sont pas promises comme route fixe : la journée se déroule uniquement dans les zones autorisées et sûres.",
        de: "Angelbereiche werden nicht als feste Route versprochen: Gefischt wird nur in erlaubten Bereichen und sicheren Bedingungen.",
      },
      {
        it: "La giornata può alternare bolentino, traina, drifting e catch and release secondo lettura del mare e specie presenti.",
        en: "The day can alternate bottom fishing, trolling, drifting and catch and release according to sea reading and target species.",
        es: "La jornada puede alternar pesca de fondo, curricán, drifting y catch and release según lectura del mar y especies.",
        fr: "La journée peut alterner pêche de fond, traîne, drifting et catch and release selon la lecture de la mer et les espèces.",
        de: "Der Tag kann Grundangeln, Schleppangeln, Drifting und Catch and Release je nach Meer und Fischarten kombinieren.",
      },
    ],
    serviceIds: ["fishing-full-day"],
    faqs: [
      {
        question: {
          it: "La cattura è garantita?",
          en: "Is a catch guaranteed?",
          es: "¿La captura está garantizada?",
          fr: "La prise est-elle garantie ?",
          de: "Ist ein Fang garantiert?",
        },
        answer: {
          it: "No. La pesca dipende da mare, stagione e natura. L'esperienza garantisce guida tecnica, attrezzatura professionale e rispetto delle regole, non una cattura.",
          en: "No. Fishing depends on sea, season and nature. The experience guarantees technical guidance, professional gear and rule compliance, not a catch.",
          es: "No. La pesca depende del mar, la temporada y la naturaleza. La experiencia garantiza guía técnica, equipo profesional y cumplimiento normativo, no una captura.",
          fr: "Non. La pêche dépend de la mer, de la saison et de la nature. L'expérience garantit guide technique, matériel professionnel et respect des règles, pas une prise.",
          de: "Nein. Angeln hängt von Meer, Saison und Natur ab. Das Erlebnis garantiert technische Begleitung, Profi-Ausrüstung und Regelkonformität, keinen Fang.",
        },
      },
      {
        question: {
          it: "Il pescato si può tenere?",
          en: "Can we keep the catch?",
          es: "¿Se puede conservar la captura?",
          fr: "Peut-on garder les prises ?",
          de: "Darf man den Fang behalten?",
        },
        answer: {
          it: "Sì solo quando legge, taglie, quote, specie e autorizzazioni lo permettono. In alternativa si pratica catch and release.",
          en: "Yes, only when law, sizes, quotas, species and authorisations allow it. Otherwise catch and release is practised.",
          es: "Sí, solo cuando ley, tallas, cupos, especies y autorizaciones lo permiten. En caso contrario se practica catch and release.",
          fr: "Oui, uniquement lorsque loi, tailles, quotas, espèces et autorisations le permettent. Sinon, on pratique le catch and release.",
          de: "Ja, nur wenn Gesetz, Mindestmaße, Quoten, Arten und Genehmigungen es erlauben. Andernfalls wird Catch and Release praktiziert.",
        },
      },
      {
        question: {
          it: "Quante persone possono salire?",
          en: "How many people can join?",
          es: "¿Cuántas personas pueden subir?",
          fr: "Combien de personnes peuvent participer ?",
          de: "Wie viele Personen können teilnehmen?",
        },
        answer: {
          it: "Il pacchetto è privato fino a 4 persone, per mantenere spazio e sicurezza durante le sessioni di pesca.",
          en: "The package is private for up to 4 guests, keeping space and safety during fishing sessions.",
          es: "El paquete es privado hasta 4 personas, para mantener espacio y seguridad durante las sesiones.",
          fr: "Le forfait est privé jusqu'à 4 personnes, afin de garder espace et sécurité pendant les sessions.",
          de: "Das Paket ist privat für bis zu 4 Gäste, damit Platz und Sicherheit während der Angelsessions bleiben.",
        },
      },
    ],
    specs: [
      { icon: "users", value: "4", label: { it: "Persone", en: "Guests", es: "Personas", fr: "Personnes", de: "Gäste" } },
      { icon: "engine", value: "8h", label: { it: "Uscita", en: "Trip", es: "Salida", fr: "Sortie", de: "Ausfahrt" } },
      { icon: "relax", value: "Pro", label: { it: "Attrezzatura", en: "Gear", es: "Equipo", fr: "Matériel", de: "Ausrüstung" } },
    ],
  },
} as const satisfies Record<string, BoatCatalogEntry>;

export function getBoatCatalogEntry(boatId: string): BoatCatalogEntry | null {
  return boatId in BOAT_CATALOG ? BOAT_CATALOG[boatId as keyof typeof BOAT_CATALOG] : null;
}

const SPANISH_BOAT_OVERRIDES: Partial<Record<string, Partial<ResolvedBoatContent>>> = {
  trimarano: {
    title: "Catamarán y trimarán en las Egadi",
    shortTitle: "Catamarán / Trimarán",
    eyebrow: "Confort y charter",
    description:
      "¿Buscas un catamarán en las Egadi? Nuestra propuesta premium es un trimarán multicasco con espacios amplios, camarotes, cocina, estabilidad y confort de catamarán para días privados con patrón y charters de varios días.",
    detail: {
      eyebrow: "Trimarán para tours por las Egadi",
      title: "¿Catamarán en las Egadi? El trimarán con patrón desde Trapani",
      paragraphs: [
        "Esta embarcación está pensada para quienes buscan una experiencia en barco por las Islas Egadi más cómoda, cuidada y privada que un tour rápido clásico. Muchos huéspedes llegan buscando un catamarán en las Egadi, un tour en catamarán desde Trapani o un charter en catamarán con patrón: técnicamente es un trimarán, con tres cascos, gran estabilidad y espacios muy habitables.",
        "A bordo no todo es navegación: hay espacio para relajarse, tomar el sol, cambiarse y vivir el día con un ritmo lento. En el charter, la ruta se organiza con el patrón entre Favignana, Levanzo y Marettimo, eligiendo bahías protegidas para baño, snorkel y fondeos cómodos.",
        "En palabras sencillas, es la alternativa premium al alquiler de catamarán en las Egadi: patrón, tripulación, confort real y una forma más elegante de vivir el mar. No hace falta conocer las calas ni tener experiencia en vela: ruta, horarios y paradas se ajustan con la tripulación según meteorología, mar y objetivo de la jornada.",
      ],
    },
    seoTitle: "Catamarán Egadi desde Trapani: trimarán con patrón",
    seoDescription:
      "Catamarán en las Egadi desde Trapani: trimarán multicasco con confort de catamarán, charter con patrón, camarotes, Favignana, Levanzo y Marettimo.",
    imageAlt: "Catamarán en las Egadi en trimarán con confort multicasco",
    idealFor: [
      "Charter privado con patrón y confort de catamarán",
      "Charter privado de varios días",
      "Grupos que buscan espacio, privacidad y ritmo lento",
      "Fondeos tranquilos y paradas en calas protegidas",
    ],
    routes: [
      "Favignana, Levanzo y Marettimo para charter con patrón",
      "Favignana, Levanzo y Marettimo para charters de varios días",
      "Rutas adaptadas a mar, viento y confort a bordo",
    ],
    faqs: [
      {
        question: "¿Es un catamarán o un trimarán?",
        answer:
          "Es un trimarán, no un catamarán clásico. Para quien busca un catamarán en las Egadi o un tour en catamarán desde Trapani, es nuestra solución multicasco más cercana por confort, espacios y estabilidad, con la ventaja de una estructura de tres cascos.",
      },
      {
        question: "¿Es adecuado para quien busca un tour en catamarán por las Egadi?",
        answer:
          "Sí. Si buscas espacios amplios, estabilidad, patrón y servicio cuidado, el trimarán responde a la misma necesidad con una configuración de tres cascos. Es ideal para charter con baño, snorkel y fondeos entre Favignana, Levanzo y Marettimo.",
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
    title: "Barca Egadi Sailing",
    shortTitle: "Barca Egadi Sailing",
    eyebrow: "Ágil, rápida y abierta",
    description:
      "La Barca Egadi Sailing es el barco ágil para excursiones privadas de 4 horas alrededor de Favignana y salidas de 8 horas compartidas o privadas entre Favignana y Levanzo.",
    detail: {
      eyebrow: "Barco abierto para las Islas Egadi",
      title: "Barca Egadi Sailing: el barco ágil para calas, baños y rutas flexibles",
      paragraphs: [
        "La Barca Egadi Sailing es ideal para quienes quieren moverse con rapidez entre calas, hacer paradas de baño y vivir una experiencia más directa con el mar.",
        "Funciona muy bien para tours privados de 4 horas por la mañana o por la tarde alrededor de Favignana, y para jornadas de 8 horas cuando quieres más tiempo para Favignana, Levanzo y las zonas protegidas del día.",
        "Es un barco abierto y deportivo: perfecto para grupos que buscan agua clara, snorkel y una ruta flexible con patrón.",
      ],
    },
    seoTitle: "Barca Egadi Sailing para excursiones en barco por las Islas Egadi",
    seoDescription:
      "Barca Egadi Sailing desde Trapani para tours privados de 4 horas alrededor de Favignana y excursiones de 8 horas compartidas o privadas por Favignana y Levanzo.",
    imageAlt: "Barca Egadi Sailing navegando por las Islas Egadi",
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
        question: "¿La Barca Egadi Sailing sirve para un tour compartido?",
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
    title: "Catamaran et trimaran aux Égades",
    shortTitle: "Catamaran / Trimaran",
    eyebrow: "Confort et charter",
    description:
      "Vous cherchez un catamaran aux Égades ? Notre proposition premium est un trimaran multicoque avec grands espaces, cabines, cuisine, stabilité et confort de catamaran pour journées privées avec skipper et charters de plusieurs jours.",
    detail: {
      eyebrow: "Trimaran pour excursions aux Égades",
      title: "Catamaran aux Égades ? Le trimaran avec skipper depuis Trapani",
      paragraphs: [
        "Ce bateau est pensé pour ceux qui cherchent une expérience en bateau aux îles Égades plus confortable, soignée et privée qu'un tour rapide classique. Beaucoup d'hôtes recherchent un catamaran aux Égades, un tour en catamaran depuis Trapani ou un charter en catamaran avec skipper : techniquement, c'est un trimaran, avec trois coques, une grande stabilité et des espaces très habitables.",
        "À bord, le temps ne se limite pas à la navigation : il y a de l'espace pour se détendre, prendre le soleil, se changer et vivre la journée à un rythme lent. En charter, la route est construite avec le skipper entre Favignana, Levanzo et Marettimo, en choisissant des baies abritées pour baignade, snorkeling et mouillages confortables.",
        "En termes simples, c'est l'alternative premium à la location de catamaran aux Égades : skipper, équipage, confort réel et une manière plus élégante de vivre la mer. Il n'est pas nécessaire de connaître les criques ni d'avoir de l'expérience en voile : route, horaires et arrêts sont ajustés avec l'équipage selon la météo, la mer et l'objectif de la journée.",
      ],
    },
    seoTitle: "Catamaran Égades depuis Trapani : trimaran avec skipper",
    seoDescription:
      "Catamaran aux Égades depuis Trapani : trimaran multicoque avec confort de catamaran, charter avec skipper, cabines, Favignana, Levanzo et Marettimo.",
    imageAlt: "Catamaran aux Égades en trimaran au confort multicoque",
    idealFor: [
      "Charter privé avec skipper et confort de catamaran",
      "Charter privé de plusieurs jours",
      "Groupes qui cherchent espace, intimité et rythme lent",
      "Mouillages calmes et arrêts dans des criques protégées",
    ],
    routes: [
      "Favignana, Levanzo et Marettimo pour charter avec skipper",
      "Favignana, Levanzo et Marettimo pour les charters de plusieurs jours",
      "Routes adaptées à la mer, au vent et au confort à bord",
    ],
    faqs: [
      {
        question: "Est-ce un catamaran ou un trimaran ?",
        answer:
          "C'est un trimaran, pas un catamaran classique. Pour ceux qui cherchent un catamaran aux Égades ou un tour en catamaran depuis Trapani, c'est notre solution multicoque la plus proche pour le confort, l'espace et la stabilité, avec l'avantage d'une structure à trois coques.",
      },
      {
        question: "Convient-il à ceux qui cherchent un tour en catamaran aux Égades ?",
        answer:
          "Oui. Si vous cherchez de grands espaces, de la stabilité, un skipper et un service soigné, le trimaran répond au même besoin avec une configuration à trois coques. Il est idéal pour charter avec baignade, snorkeling et mouillages entre Favignana, Levanzo et Marettimo.",
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
    title: "Barca Egadi Sailing",
    shortTitle: "Barca Egadi Sailing",
    eyebrow: "Agile, rapide et ouvert",
    description:
      "La Barca Egadi Sailing est le bateau agile pour excursions privées de 4 heures autour de Favignana et sorties de 8 heures partagées ou privées entre Favignana et Levanzo.",
    detail: {
      eyebrow: "Bateau ouvert pour les îles Égades",
      title: "Barca Egadi Sailing : le bateau agile pour criques, baignades et routes flexibles",
      paragraphs: [
        "La Barca Egadi Sailing est idéale pour ceux qui veulent se déplacer rapidement entre les criques, faire des arrêts baignade et vivre une expérience plus directe avec la mer.",
        "Il fonctionne très bien pour les tours privés de 4 heures le matin ou l'après-midi autour de Favignana, et pour les journées de 8 heures lorsque vous voulez plus de temps pour Favignana, Levanzo et les zones protégées du jour.",
        "C'est un bateau ouvert et sportif : parfait pour les groupes qui cherchent eau claire, snorkeling et route flexible avec skipper.",
      ],
    },
    seoTitle: "Barca Egadi Sailing pour excursions en bateau aux îles Égades",
    seoDescription:
      "Barca Egadi Sailing depuis Trapani pour tours privés de 4 heures autour de Favignana et excursions de 8 heures partagées ou privées à Favignana et Levanzo.",
    imageAlt: "Barca Egadi Sailing naviguant aux îles Égades",
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
        question: "La Barca Egadi Sailing convient-elle à un tour partagé ?",
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

const GERMAN_BOAT_OVERRIDES: Partial<Record<string, Partial<ResolvedBoatContent>>> = {
  trimarano: {
    title: "Katamaran und Trimaran auf den Egadi",
    shortTitle: "Katamaran / Trimaran",
    eyebrow: "Komfort und Charter",
    description:
      "Sie suchen einen Katamaran auf den Egadi? Unsere Premium-Lösung ist ein Multihull-Trimaran mit viel Platz, Kabinen, Bordküche, Stabilität und Katamaran-Komfort für private Tage mit Skipper und mehrtägige Charter.",
    detail: {
      eyebrow: "Trimaran für Touren zu den Ägadischen Inseln",
      title: "Katamaran auf den Egadi? Der Trimaran mit Skipper ab Trapani",
      paragraphs: [
        "Dieses Boot ist für Gäste gedacht, die ein komfortableres, gepflegteres und privateres Bootserlebnis auf den Egadi suchen als eine klassische schnelle Tour. Viele Gäste suchen nach einem Katamaran auf den Egadi, einer Katamaran-Tour ab Trapani oder einem Katamaran-Charter mit Skipper: technisch ist es ein Trimaran mit drei Rümpfen, hoher Stabilität und sehr gut nutzbaren Bereichen.",
        "An Bord geht es nicht nur um Navigation: Es gibt Platz zum Entspannen, Sonnenbaden und Umziehen, damit der Tag in ruhigem Tempo verlaufen kann. Beim Charter wird die Route mit dem Skipper zwischen Favignana, Levanzo und Marettimo geplant, mit geschützten Buchten zum Baden, Schnorcheln und Ankern.",
        "Einfach gesagt: Es ist die Premium-Alternative zur Katamaran-Miete auf den Egadi, mit Skipper, Crew, echtem Komfort und einer eleganteren Art, das Meer zu erleben. Sie müssen die Buchten nicht kennen und keine Segelerfahrung haben: Route, Zeiten und Stopps werden mit der Crew nach Wetter, Meer und Tagesziel angepasst.",
      ],
    },
    seoTitle: "Katamaran Egadi ab Trapani: Trimaran mit Skipper",
    seoDescription:
      "Katamaran auf den Egadi ab Trapani: Multihull-Trimaran mit Katamaran-Komfort, Charter mit Skipper, Kabinen, Favignana, Levanzo und Marettimo.",
    imageAlt: "Katamaran auf den Egadi als Trimaran mit Multihull-Komfort",
    idealFor: [
      "Privater Charter mit Skipper und Katamaran-Komfort",
      "Privater mehrtägiger Charter",
      "Gruppen, die Platz, Privatsphäre und ruhigen Rhythmus suchen",
      "Ruhige Ankerplätze und Stopps in geschützten Buchten",
    ],
    routes: [
      "Favignana, Levanzo und Marettimo für Charter mit Skipper",
      "Favignana, Levanzo und Marettimo für mehrtägige Charter",
      "Routen angepasst an Meer, Wind und Komfort an Bord",
    ],
    faqs: [
      {
        question: "Ist es ein Katamaran oder ein Trimaran?",
        answer:
          "Es ist ein Trimaran, kein klassischer Katamaran. Für Gäste, die einen Katamaran auf den Egadi oder eine Katamaran-Tour ab Trapani suchen, ist es unsere nächstliegende Multihull-Lösung für Komfort, Platz und Stabilität, mit dem Vorteil einer Struktur mit drei Rümpfen.",
      },
      {
        question: "Eignet er sich für Gäste, die eine Katamaran-Tour auf den Egadi suchen?",
        answer:
          "Ja. Wenn Sie viel Platz, Stabilität, Skipper und gepflegten Service suchen, erfüllt der Trimaran denselben Wunsch mit einer Drei-Rumpf-Konfiguration. Er eignet sich ideal für Charter mit Baden, Schnorcheln und Ankern zwischen Favignana, Levanzo und Marettimo.",
      },
      {
        question: "Kann man an Bord übernachten?",
        answer:
          "Ja, in den mehrtägigen Charter-Programmen, immer abhängig von Wetterbedingungen und Routenplanung.",
      },
    ],
    specs: [
      { icon: "cabins", value: "4", label: "Kabinen" },
      { icon: "beds", value: "8", label: "Schlafplätze" },
      { icon: "kitchen", value: "1", label: "Bordküche" },
      { icon: "bath", value: "3", label: "Bäder" },
    ],
  },
  boat: {
    title: "Barca Egadi Sailing",
    shortTitle: "Barca Egadi Sailing",
    eyebrow: "Agil, schnell und offen",
    description:
      "Die Barca Egadi Sailing ist das agile Boot für private 4-Stunden-Touren rund um Favignana und geteilte oder private 8-Stunden-Ausfahrten zwischen Favignana und Levanzo.",
    detail: {
      eyebrow: "Offenes Boot für die Ägadischen Inseln",
      title: "Barca Egadi Sailing: das agile Boot für Buchten, Badestopps und flexible Routen",
      paragraphs: [
        "Die Barca Egadi Sailing ist ideal, wenn Sie sich schnell zwischen Buchten bewegen, Badestopps einlegen und das Meer direkter erleben möchten.",
        "Sie eignet sich sehr gut für private 4-Stunden-Touren am Vormittag oder Nachmittag rund um Favignana sowie für 8-Stunden-Tage, wenn Sie mehr Zeit für Favignana, Levanzo und die geschützten Bereiche des Tages wünschen.",
        "Es ist ein offenes, sportliches Boot: perfekt für Gruppen, die klares Wasser, Schnorcheln und eine flexible Route mit Skipper suchen.",
      ],
    },
    seoTitle: "Barca Egadi Sailing für Bootstouren zu den Ägadischen Inseln",
    seoDescription:
      "Barca Egadi Sailing ab Trapani für private 4-Stunden-Touren und geteilte oder private 8-Stunden-Bootstouren nach Favignana und Levanzo.",
    imageAlt: "Barca Egadi Sailing auf den Ägadischen Inseln",
    idealFor: [
      "Private 4-Stunden-Touren am Vormittag oder Nachmittag",
      "Geteilte 8-Stunden-Tour mit Einzelplätzen",
      "Gruppen, die Baden, Schnorcheln und flexible Route wünschen",
      "Gäste, die ein offenes und dynamisches Boot bevorzugen",
    ],
    routes: [
      "Favignana und Levanzo als Ganztagestour",
      "Geschützte Buchten für private Halbtage",
      "Route angepasst an Wind, Meer und Besucheraufkommen",
    ],
    faqs: [
      {
        question: "Ist die 4-Stunden-Tour geteilt?",
        answer:
          "Nein. Die 4-Stunden-Formel wird als private Erfahrung am Vormittag oder Nachmittag angeboten.",
      },
      {
        question: "Eignet sich die Barca Egadi Sailing für eine geteilte Tour?",
        answer:
          "Ja, die geteilte Tour ist die 8-Stunden-Variante mit Einzelplätzen und Abfahrt ab Trapani.",
      },
      {
        question: "Was sollte ich mitbringen?",
        answer:
          "Badebekleidung, Handtuch, Sonnencreme, Hut, Sonnenbrille und eine weiche Tasche. Auf einem offenen Boot reist man am besten leicht.",
      },
    ],
    specs: [
      { icon: "users", value: "12", label: "Plätze" },
      { icon: "engine", value: "800", label: "PS" },
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
        : locale === "de"
          ? GERMAN_BOAT_OVERRIDES[content.id]
        : undefined;
  return override ? { ...content, ...override } : content;
}

export function getPublicBoatIds(): string[] {
  return Object.values(BOAT_CATALOG)
    .filter((entry) => entry.listed !== false)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.id);
}

export function getPublicBoatSlugs(): string[] {
  return Object.values(BOAT_CATALOG)
    .filter((entry) => entry.listed !== false)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.slug);
}

export function hasPublicBoatDetailPage(boatId: string): boolean {
  const entry = getBoatCatalogEntry(boatId);
  return Boolean(entry && entry.listed !== false && BOAT_DETAIL_PAGE_IDS.has(entry.id));
}

export function getPublicBoatDetailSlugs(): string[] {
  return Object.values(BOAT_CATALOG)
    .filter((entry) => entry.listed !== false && BOAT_DETAIL_PAGE_IDS.has(entry.id))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.slug);
}

export function isPublicBoatId(boatId: string): boolean {
  const entry = getBoatCatalogEntry(boatId);
  return Boolean(entry && entry.listed !== false);
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
