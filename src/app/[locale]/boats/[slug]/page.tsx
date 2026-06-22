import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  Anchor,
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  DoorOpen,
  Gauge,
  HelpCircle,
  Ship,
  Sofa,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { ExperienceImageCarousel } from "@/components/experience-image-carousel";
import { ScrollSection } from "@/components/scroll-section";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
} from "@/lib/public-contact";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";
import {
  getBoatContent,
  getBoatsPageContent,
  resolveBoatIdFromSlug,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";
import { getExperienceContent, getExperiencePublicSlug } from "@/data/catalog/experiences";

const DETAILED_BOAT_ID = "trimarano";
const DETAILED_BOAT_SLUG = "catamarano-egadi-trimarano-da-trapani";

const SPEC_ICONS: Record<BoatSpecIcon, LucideIcon> = {
  cabins: DoorOpen,
  beds: BedDouble,
  kitchen: UtensilsCrossed,
  bath: Bath,
  relax: Sofa,
  users: Users,
  engine: Gauge,
};

function copy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
    allBoats: isEs ? "Todos los barcos" : isFr ? "Tous les bateaux" : isDe ? "Alle Boote" : isEn ? "All boats" : "Tutte le barche",
    directLabel: isEs ? "Catamarán / trimarán" : isFr ? "Catamaran / trimaran" : isDe ? "Katamaran / Trimaran" : isEn ? "Catamaran / trimaran" : "Catamarano / trimarano",
    multihullLabel: isEs ? "Confort multicasco" : isFr ? "Confort multicoque" : isDe ? "Mehrrumpf-Komfort" : isEn ? "Multihull comfort" : "Comfort multiscafo",
    skipperLabel: isEs ? "Con patrón" : isFr ? "Avec skipper" : isDe ? "Mit Skipper" : isEn ? "With skipper" : "Con skipper",
    charterLabel: isEs ? "Charter con patrón" : isFr ? "Charter avec skipper" : isDe ? "Charter mit Skipper" : isEn ? "Skippered charter" : "Charter con skipper",
    introEyebrow: isEs ? "El multicasco" : isFr ? "Le multicoque" : isDe ? "Der Mehrrumpf" : isEn ? "The multihull" : "Il multiscafo",
    introTitle: isEs
      ? "Para quien busca catamarán en las Egadi, con la estabilidad de un trimarán"
      : isFr
        ? "Pour ceux qui cherchent un catamaran aux Égades, avec la stabilité d'un trimaran"
        : isDe
          ? "Für alle, die Katamaran-Komfort auf den Ägadischen Inseln suchen"
          : isEn
            ? "For guests looking for catamaran comfort in the Egadi Islands"
            : "Per chi cerca un catamarano alle Egadi, con la stabilità di un trimarano",
    introText: isEs
      ? "No es un catamarán clásico: es un trimarán de tres cascos. Lo importante para el huésped es el resultado a bordo: espacio, estabilidad, zonas de sombra, cocina, cabinas y una forma lenta de vivir Favignana, Levanzo y Marettimo."
      : isFr
        ? "Ce n'est pas un catamaran classique : c'est un trimaran à trois coques. Ce qui compte à bord, c'est l'espace, la stabilité, les zones d'ombre, la cuisine, les cabines et une façon lente de vivre Favignana, Levanzo et Marettimo."
        : isDe
          ? "Das Boot ist kein klassischer Katamaran, sondern ein Trimaran mit drei Rümpfen. Entscheidend an Bord sind Raum, Stabilität, Schattenbereiche, Küche, Kabinen und eine langsamere Art, Favignana, Levanzo und Marettimo zu erleben."
          : isEn
            ? "This is not a classic catamaran: it is a three-hull trimaran. What matters on board is the result: space, stability, shaded areas, galley, cabins and a slower way to experience Favignana, Levanzo and Marettimo."
            : "Non è un catamarano classico: è un trimarano a tre scafi. Per l'ospite conta il risultato a bordo: spazio, stabilità, zone d'ombra, cucina, cabine e un modo più lento di vivere Favignana, Levanzo e Marettimo.",
    detailsEyebrow: isEs ? "Para quién" : isFr ? "Pour qui" : isDe ? "Für wen" : isEn ? "Best for" : "A chi è adatto",
    detailsTitleStart: isEs ? "Cuándo elegir" : isFr ? "Quand choisir" : isDe ? "Wann wählen" : isEn ? "When to choose" : "Quando scegliere",
    detailsTitleAccent: isEs ? "catamarán" : isFr ? "catamaran" : isDe ? "Katamaran-Komfort" : isEn ? "catamaran comfort" : "catamarano",
    includesEyebrow: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
    includesTitleStart: isEs ? "Qué" : isFr ? "Ce qu'il" : isDe ? "Was" : isEn ? "What it" : "Cosa",
    includesTitleAccent: isEs ? "ofrece" : isFr ? "offre" : isDe ? "bietet" : isEn ? "offers" : "offre",
    galleryTitle: isEs ? "Galería catamarán y trimarán" : isFr ? "Galerie catamaran et trimaran" : isDe ? "Katamaran- und Trimaran-Galerie" : isEn ? "Catamaran and trimaran gallery" : "Gallery catamarano e trimarano",
    programTitle: isEs ? "CATAMARAN EGADI" : isFr ? "CATAMARAN EGADES" : isDe ? "KATAMARAN EGADI" : isEn ? "CATAMARAN EGADI" : "CATAMARANO EGADI",
    specsEyebrow: isEs ? "Características" : isFr ? "Caractéristiques" : isDe ? "Daten" : isEn ? "Features" : "Caratteristiche",
    specsTitle: isEs ? "Espacios, cabinas y comodidad real" : isFr ? "Espaces, cabines et vrai confort" : isDe ? "Raum, Kabinen und echter Komfort" : isEn ? "Spaces, cabins and real comfort" : "Spazi, cabine e comfort reale",
    relatedEyebrow: isEs ? "Experiencias" : isFr ? "Expériences" : isDe ? "Erlebnisse" : isEn ? "Experiences" : "Esperienze",
    relatedTitle: isEs ? "Cómo vivir el trimarán en las Egadi" : isFr ? "Comment vivre le trimaran aux Égades" : isDe ? "Wie Sie den Trimaran auf den Egadi erleben" : isEn ? "Ways to experience the Egadi trimaran" : "Come vivere il trimarano alle Egadi",
    relatedText: isEs
      ? "Elige el charter en trimarán o compara las fórmulas disponibles antes de reservar."
      : isFr
        ? "Choisissez le charter en trimaran ou comparez les formules disponibles avant de réserver."
        : isDe
          ? "Wählen Sie den Trimaran-Charter oder vergleichen Sie die verfügbaren Formate vor der Buchung."
          : isEn
            ? "Choose the trimaran charter or compare the available formats before booking."
            : "Scegli il charter in trimarano o confronta le formule disponibili prima di prenotare.",
    viewExperience: isEs ? "Ver experiencia" : isFr ? "Voir l'expérience" : isDe ? "Erlebnis ansehen" : isEn ? "View experience" : "Vedi esperienza",
    faqEyebrow: isEs ? "Preguntas frecuentes" : isFr ? "Questions fréquentes" : isDe ? "Häufige Fragen" : isEn ? "FAQ" : "Domande frequenti",
    faqTitle: isEs ? "Catamarán, trimarán y charter: respuestas claras" : isFr ? "Catamaran, trimaran et charter : réponses claires" : isDe ? "Katamaran, Trimaran und Charter: klare Antworten" : isEn ? "Catamaran, trimaran and charter: clear answers" : "Catamarano, trimarano e charter: risposte chiare",
    ctaTitle: isEs ? "Sube a bordo del trimarán" : isFr ? "Montez à bord du trimaran" : isDe ? "An Bord des Trimarans" : isEn ? "Step aboard the trimaran" : "Sali a bordo del trimarano",
    ctaText: isEs
      ? "Compara el charter en trimarán y las fórmulas disponibles antes de elegir."
      : isFr
        ? "Comparez le charter en trimaran et les formules disponibles avant de choisir."
        : isDe
          ? "Vergleichen Sie Trimaran-Charter und verfügbare Formate, bevor Sie wählen."
          : isEn
            ? "Compare the trimaran charter and available formats before choosing the right option."
            : "Confronta il charter in trimarano e le formule disponibili prima di scegliere.",
    previousPhotos: isEs ? "Fotos anteriores" : isFr ? "Photos précédentes" : isDe ? "Vorherige Fotos" : isEn ? "Previous photos" : "Foto precedenti",
    nextPhotos: isEs ? "Fotos siguientes" : isFr ? "Photos suivantes" : isDe ? "Weitere Fotos" : isEn ? "Next photos" : "Foto successive",
  };
}

function getProgramParagraphs(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  if (isEs) {
    return [
      {
        lead: "Una alternativa premium al catamarán en las Egadi.",
        text: "El trimarán es la embarcación adecuada cuando no quieres solo moverte entre calas, sino vivir el tiempo a bordo con más espacio: sombra, camarotes, cubierta amplia y una sensación estable de multicasco.",
      },
      {
        lead: "Ruta entre Favignana, Levanzo y Marettimo.",
        text: "En el charter, el itinerario se construye con el patrón según viento, mar y duración: se pueden combinar bahías protegidas, baños, snorkel, fondeos tranquilos y navegación más amplia cuando las condiciones lo permiten.",
      },
      {
        lead: "San Vito Lo Capo bajo petición.",
        text: "Para programas de varios días, y solo si tiempos y meteorología son adecuados, se puede valorar una extensión hacia San Vito Lo Capo como parte de una ruta más amplia.",
      },
      {
        lead: "Con patrón, comidas aparte.",
        text: "El charter incluye la gestión profesional de navegación, fondeos y tiempos. Comida, cambusa y servicios extra se organizan por separado según la fórmula elegida.",
      },
    ];
  }

  if (isFr) {
    return [
      {
        lead: "Une alternative premium au catamaran aux Égades.",
        text: "Le trimaran est le bon bateau lorsque l'objectif n'est pas seulement de passer d'une crique à l'autre, mais de vivre le temps à bord avec plus d'espace : ombre, cabines, grand pont et sensation stable de multicoque.",
      },
      {
        lead: "Route entre Favignana, Levanzo et Marettimo.",
        text: "En charter, l'itinéraire est construit avec le skipper selon le vent, la mer et la durée : baies abritées, baignades, snorkeling, mouillages calmes et navigation plus large lorsque les conditions le permettent.",
      },
      {
        lead: "San Vito Lo Capo sur demande.",
        text: "Pour les programmes de plusieurs jours, et seulement si le temps disponible et la météo le permettent, une extension vers San Vito Lo Capo peut être évaluée dans une route plus complète.",
      },
      {
        lead: "Avec skipper, repas séparés.",
        text: "Le charter inclut la gestion professionnelle de la navigation, des mouillages et des horaires. Repas, avitaillement et services extra sont organisés séparément selon la formule choisie.",
      },
    ];
  }

  if (isDe) {
    return [
      {
        lead: "Eine Premium-Alternative zum Katamaran auf den Egadi.",
        text: "Der Trimaran ist das richtige Boot, wenn es nicht nur darum geht, von Bucht zu Bucht zu fahren, sondern die Zeit an Bord mit mehr Raum zu erleben: Schatten, Kabinen, breites Deck und ein stabiles Multihull-Gefühl.",
      },
      {
        lead: "Route zwischen Favignana, Levanzo und Marettimo.",
        text: "Beim Charter wird die Route mit dem Skipper nach Wind, Meer und Dauer geplant: geschützte Buchten, Baden, Schnorcheln, ruhige Ankerplätze und eine weitere Navigation, wenn die Bedingungen passen.",
      },
      {
        lead: "San Vito Lo Capo auf Anfrage.",
        text: "Bei mehrtägigen Programmen kann eine Erweiterung nach San Vito Lo Capo geprüft werden, wenn Zeitfenster und Wetter eine längere Route sinnvoll machen.",
      },
      {
        lead: "Mit Skipper, Verpflegung separat.",
        text: "Der Charter umfasst die professionelle Organisation von Navigation, Ankerplätzen und Timing. Verpflegung, Proviant und Extra-Services werden je nach gewählter Formel separat organisiert.",
      },
    ];
  }

  if (isEn) {
    return [
      {
        lead: "A premium alternative to a catamaran in the Egadi Islands.",
        text: "The trimaran is the right boat when the goal is not simply moving between coves, but having space to live the day on board: shade, cabins, wide deck areas and a stable multihull feeling.",
      },
      {
        lead: "Favignana, Levanzo and Marettimo for charter.",
        text: "On charter programmes, the itinerary is shaped with the skipper around wind, sea and duration: sheltered bays, swimming, snorkelling, quiet anchorages and wider navigation when conditions are right.",
      },
      {
        lead: "San Vito Lo Capo on request.",
        text: "For multi-day programmes, and only when timing and weather allow it, an extension towards San Vito Lo Capo can be considered as part of a wider route.",
      },
      {
        lead: "With skipper, meals arranged separately.",
        text: "The charter includes professional management of navigation, anchorages and timing. Food, provisioning and extra services are arranged separately according to the selected formula.",
      },
    ];
  }

  return [
    {
      lead: "Un'alternativa premium al catamarano alle Egadi.",
      text: "Il trimarano è la barca giusta quando non vuoi solo spostarti tra le cale, ma vivere davvero il tempo a bordo: ombra, cabine, ponte ampio e una sensazione di stabilità da multiscafo.",
    },
    {
      lead: "Favignana, Levanzo e Marettimo per il charter.",
      text: "Nel charter l'itinerario viene costruito con lo skipper in base a vento, mare e durata: baie riparate, bagni, snorkeling, rade tranquille e navigazione più ampia quando le condizioni lo permettono.",
    },
    {
      lead: "San Vito Lo Capo su richiesta.",
      text: "Nei programmi di più giorni, e solo quando tempi e meteo lo rendono sensato, si può valutare un'estensione verso San Vito Lo Capo dentro una rotta più ampia.",
    },
    {
      lead: "Con skipper, pasti a parte.",
      text: "Il charter include la gestione professionale di navigazione, ancoraggi e tempi. Pasti, cambusa e servizi extra vengono organizzati separatamente in base alla formula scelta.",
    },
  ];
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

const BOAT_DETAIL_SCHEMA_TOPICS = {
  it: {
    about: [
      "Noleggio catamarano Egadi",
      "Catamarano Egadi con skipper",
      "Trimarano da Trapani",
      "Charter Egadi in trimarano",
      "Favignana, Levanzo e Marettimo in multiscafo",
    ],
    keywords: [
      "noleggio catamarano egadi",
      "catamarano egadi",
      "catamarano trapani",
      "egadi catamarano",
      "charter egadi",
      "trimarano egadi",
    ],
  },
  en: {
    about: [
      "Egadi catamaran-style trimaran",
      "Egadi boats with skipper",
      "Aegadian Islands yacht charter",
      "Trapani trimaran charter",
      "Favignana, Levanzo and Marettimo by multihull",
    ],
    keywords: [
      "egadi catamaran",
      "egadi boats",
      "yacht charter aegadian islands",
      "trapani trimaran charter",
      "egadi multihull charter",
    ],
  },
  es: {
    about: [
      "Catamaran en las Islas Egadi",
      "Trimaran desde Trapani con patron",
      "Charter Islas Egadi en trimaran",
      "Favignana, Levanzo y Marettimo en multicasco",
    ],
    keywords: [
      "catamaran egadi",
      "trimaran trapani",
      "charter islas egadi",
      "barco con patron egadi",
    ],
  },
  fr: {
    about: [
      "Catamaran aux iles Egades",
      "Trimaran depuis Trapani avec skipper",
      "Charter aux iles Egades en trimaran",
      "Favignana, Levanzo et Marettimo en multicoque",
    ],
    keywords: [
      "catamaran egades",
      "trimaran trapani",
      "charter iles egades",
      "bateau avec skipper egades",
    ],
  },
  de: {
    about: [
      "Katamaran-Komfort auf den Egadi",
      "Trimaran ab Trapani mit Skipper",
      "Charter zu den Egadi im Trimaran",
      "Favignana, Levanzo und Marettimo im Mehrrumpfboot",
    ],
    keywords: [
      "katamaran egadi",
      "trimaran trapani",
      "charter egadi",
      "boot mit skipper egadi",
    ],
  },
} as const;

function boatDetailSchemaTopics(locale: string) {
  return BOAT_DETAIL_SCHEMA_TOPICS[locale as keyof typeof BOAT_DETAIL_SCHEMA_TOPICS] ?? BOAT_DETAIL_SCHEMA_TOPICS.it;
}

function BoatSpecs({ boat }: { boat: ResolvedBoatContent }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-y border-white/15 py-7 sm:grid-cols-3 lg:grid-cols-5">
      {boat.specs.map((spec) => {
        const Icon = SPEC_ICONS[spec.icon];
        return (
          <div key={spec.label} className="min-w-0">
            <Icon className="h-5 w-5 text-[var(--color-gold)]" />
            <p className="mt-3 text-3xl font-black leading-none text-white">{spec.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/58">
              {spec.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale, slug: DETAILED_BOAT_SLUG }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const boatId = resolveBoatIdFromSlug(slug);
  const boat = boatId === DETAILED_BOAT_ID ? getBoatContent(boatId, locale) : null;
  if (!boat) return { title: "Not Found" };

  return buildPageMetadata({
    title: boat.seoTitle,
    description: boat.seoDescription,
    path: `/boats/${boat.slug}`,
    locale,
    image: boat.imageSrc ?? boat.gallery[0]?.src,
  });
}

export default async function BoatDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const boatId = resolveBoatIdFromSlug(slug);
  const maybeBoat = getBoatContent(boatId, locale);

  if (boatId !== DETAILED_BOAT_ID) {
    if (maybeBoat) permanentRedirect(localizedStaticPath(locale, "/boats"));
    notFound();
  }

  const boat = maybeBoat;
  if (!boat) notFound();
  if (slug !== boat.slug) permanentRedirect(localizedPath(locale, `/boats/${boat.slug}`));

  const t = copy(locale);
  const programParagraphs = getProgramParagraphs(locale);
  const relatedExperiences = boat.serviceIds
    .map((id) => getExperienceContent(id, locale))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = localizedAbsoluteUrl(base, locale, `/boats/${boat.slug}`);
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
  const schemaTopics = boatDetailSchemaTopics(locale);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        inLanguage,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadi Sailing", item: localizedAbsoluteUrl(base, locale, "/") },
          { "@type": "ListItem", position: 2, name: getBoatsPageContent(locale).seoTitle, item: localizedAbsoluteUrl(base, locale, "/boats") },
          { "@type": "ListItem", position: 3, name: boat.seoTitle, item: pageUrl },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        inLanguage,
        name: boat.seoTitle,
        description: boat.seoDescription,
        mainEntity: { "@id": `${pageUrl}#boat` },
        about: [
          { "@id": `${pageUrl}#boat` },
          ...schemaTopics.about.map((name) => ({ "@type": "Thing", name })),
        ],
        keywords: schemaTopics.keywords.join(", "),
      },
      {
        "@type": ["Product", "Vehicle"],
        "@id": `${pageUrl}#boat`,
        inLanguage,
        mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
        name: boat.seoTitle,
        description: `${boat.seoDescription} ${boat.detail.paragraphs.join(" ")}`,
        image: boat.gallery.map((item) => absoluteUrl(item.src)),
        category: "Trimaran yacht charter",
        additionalType: ["Trimaran", "Multihull", "Catamaran-style comfort"],
        areaServed: [
          { "@type": "Place", name: "Trapani" },
          { "@type": "Place", name: "Isole Egadi" },
          { "@type": "Place", name: "Favignana" },
          { "@type": "Place", name: "Levanzo" },
          { "@type": "Place", name: "Marettimo" },
        ],
        brand: { "@type": "Brand", name: "Egadi Sailing" },
        provider: {
          "@type": "Organization",
          name: "Egadi Sailing",
          legalName: PUBLIC_COMPANY_LEGAL.name,
          alternateName: "Egadisailing",
          url: base,
          email: PUBLIC_CONTACT_EMAIL,
          telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
          taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
          address: PUBLIC_CONTACT_POSTAL_ADDRESS,
        },
        ...(boat.externalUrl ? { sameAs: boat.externalUrl } : {}),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage,
        mainEntityOfPage: pageUrl,
        mainEntity: boat.faqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#related-experiences`,
        name: t.relatedTitle,
        itemListElement: relatedExperiences.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: localizedAbsoluteUrl(base, locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`),
          name: item.title,
          description: item.seoDescription,
        })),
      },
    ],
  };
  const heroImage = boat.imageSrc ?? boat.gallery[0]?.src ?? "/images/boats/neel-47/neel-47-hero.webp";
  const programTitleWords = t.programTitle.split(" ");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#071934] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <main className="bg-[linear-gradient(180deg,#071934_0%,#0a2a4a_38%,#0c3d5e_56%,#0a2a4a_78%,#071934_100%)] pb-24">
        <section className="px-4 pb-0 pt-24 md:px-8 lg:px-12 lg:pt-28">
          <div className="mx-auto max-w-6xl">
            <Link
              href={localizedStaticPath(locale, "/boats")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-[var(--color-gold)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.allBoats}
            </Link>

            <div className="mt-6 text-center">
              <ScrollSection animation="fade-up">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--color-gold)]">
                  {boat.detail.eyebrow}
                </p>
                <h1 className="mx-auto mt-4 max-w-5xl font-heading text-5xl font-bold leading-[1.08] text-white [text-shadow:0_2px_0_rgba(217,119,6,0.45),0_12px_24px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-7xl">
                  {boat.detail.title}
                </h1>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-white/85">
                  <span className="inline-flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[var(--color-gold)]" />
                    {t.directLabel}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Anchor className="h-4 w-4 text-[var(--color-gold)]" />
                    {t.multihullLabel}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--color-gold)]" />
                    {t.skipperLabel}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[var(--color-gold)]" />
                    {t.charterLabel}
                  </span>
                </div>

                <figure className="relative mt-10 overflow-hidden rounded-t-[1.75rem] bg-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
                  <div className="relative aspect-[16/10] sm:aspect-[16/8.7]">
                    <Image
                      src={heroImage}
                      alt={boat.imageAlt}
                      fill
                      priority
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
                  {t.introEyebrow}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
                  {t.introTitle}
                </h2>
                <div className="mx-auto mt-4 h-1 w-16 bg-[var(--color-gold)]" />
                <p className="mt-5 text-base leading-8 text-white/75 sm:text-lg sm:leading-9">
                  {t.introText}
                </p>
              </div>

              <div className="mx-auto mt-9 max-w-4xl space-y-5 text-base leading-8 text-white/78 sm:text-lg sm:leading-9">
                {boat.detail.paragraphs.map((paragraph) => (
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
                    {t.detailsEyebrow}
                  </p>
                  <h2 className="mt-5 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
                    {t.detailsTitleStart}{" "}
                    <em className="font-normal italic">{t.detailsTitleAccent}</em>
                  </h2>
                  <div className="mt-8 h-px w-full bg-white/75" />
                  <ul className="mt-7 space-y-4">
                    {boat.idealFor.map((item) => (
                      <li key={item} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 text-base leading-7 text-white">
                        <Check className="mt-1 h-4 w-4 text-[var(--color-gold)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                    {t.includesEyebrow}
                  </p>
                  <h2 className="mt-5 font-heading text-4xl font-bold leading-tight text-white sm:text-5xl">
                    {t.includesTitleStart}{" "}
                    <em className="font-normal italic">{t.includesTitleAccent}</em>
                  </h2>
                  <div className="mt-8 h-px w-full bg-white/75" />
                  <ul className="mt-7 space-y-4">
                    {boat.routes.map((item) => (
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
          title={t.galleryTitle}
          items={boat.gallery}
          previousLabel={t.previousPhotos}
          nextLabel={t.nextPhotos}
        />

        <section id="program" className="scroll-mt-28 px-4 py-16 md:px-8 lg:px-12">
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
                {programParagraphs.map((paragraph) => (
                  <p key={paragraph.lead}>
                    <strong>{paragraph.lead}</strong>{" "}
                    <span className="text-white/90">{paragraph.text}</span>
                  </p>
                ))}
              </div>
            </ScrollSection>
          </div>
        </section>

        <section id="features" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <ScrollSection animation="fade-up">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                {t.specsEyebrow}
              </p>
              <h2 className="mt-3 max-w-3xl font-heading text-3xl font-bold text-white sm:text-4xl">
                {t.specsTitle}
              </h2>
              <div className="mt-8">
                <BoatSpecs boat={boat} />
              </div>
            </ScrollSection>
          </div>
        </section>

        {relatedExperiences.length > 0 && (
          <section id="experiences" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
            <div className="mx-auto max-w-6xl">
              <ScrollSection animation="fade-up">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                    {t.relatedEyebrow}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                    {t.relatedTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                    {t.relatedText}
                  </p>
                </div>

                <div className="mt-9 grid gap-8 md:grid-cols-2">
                  {relatedExperiences.map((item) => {
                    const relatedImage = item.media.find((media) => media.src) ?? item.media[0];
                    return (
                      <Link
                        key={item.serviceId}
                        href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`)}
                        className="group block border-t border-white/15 pt-5 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-4 focus:ring-offset-[#071934]"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-white/10">
                          {relatedImage?.src && (
                            <Image
                              src={relatedImage.src}
                              alt={relatedImage.alt}
                              fill
                              sizes="(max-width: 768px) 100vw, 50vw"
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
                            {t.viewExperience}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollSection>
            </div>
          </section>
        )}

        <section id="faq" className="scroll-mt-28 px-4 py-14 md:px-8 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <ScrollSection animation="fade-up">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {t.faqEyebrow}
                </p>
                <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
                  {t.faqTitle}
                </h2>
              </div>

              <div className="mx-auto mt-8 max-w-4xl divide-y divide-white/15 border-y border-white/15 sm:mt-10">
                {boat.faqs.map((faq, index) => (
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

        <ScrollSection animation="fade-up">
          <section className="px-4 py-14 md:px-8 lg:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <HelpCircle className="mx-auto h-8 w-8 text-[var(--color-gold)]" />
              <h2 className="mt-4 font-heading text-3xl font-bold text-white">
                {t.ctaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-white/70">
                {t.ctaText}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {relatedExperiences.map((item) => (
                  <Link
                    key={item.serviceId}
                    href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`)}
                    className="inline-flex items-center justify-center bg-[var(--color-gold)] px-8 py-3 text-sm font-bold text-[#071934] transition hover:bg-[#f2b84b]"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </ScrollSection>
      </main>
    </div>
  );
}
