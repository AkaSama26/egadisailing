import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  ShipWheel,
  Sparkles,
  Waves,
} from "lucide-react";
import {
  favignanaGuideSourceLinks,
  favignanaGuides,
  getFavignanaGuideSlugForLocale,
  type FavignanaGuide,
  type FavignanaGuideCta,
  type FavignanaGuideSection,
} from "@/data/favignana-guides";
import { favignanaGuidesEn } from "@/data/favignana-guides-en";
import { favignanaGuidesEs } from "@/data/favignana-guides-es";
import { favignanaGuidesFr } from "@/data/favignana-guides-fr";
import { env } from "@/lib/env";
import { localizedPath } from "@/lib/i18n/paths";

export const dynamicParams = false;

const guideLocales = ["it", "en", "es", "fr"] as const;
type GuideLocale = (typeof guideLocales)[number];

const guidesByLocale = {
  it: favignanaGuides,
  en: favignanaGuidesEn,
  es: favignanaGuidesEs,
  fr: favignanaGuidesFr,
} satisfies Record<GuideLocale, FavignanaGuide[]>;

function isGuideLocale(locale: string): locale is GuideLocale {
  return locale === "it" || locale === "en" || locale === "es" || locale === "fr";
}

function getLocalizedGuide(locale: GuideLocale, slug: string): FavignanaGuide | undefined {
  return guidesByLocale[locale].find((guide) => guide.slug === slug);
}

const guideUi = {
  it: {
    backLabel: "Favignana",
    heroLabel: "Guida a Favignana",
    asideEyebrow: "In questa guida",
    asideAriaLabel: "Indice della guida",
    quickAnswer: "Risposta rapida",
    quickAnswerTitle: "In breve",
    itemEyebrow: "Da tenere a mente",
    chapterLabel: (index: number) => `Capitolo ${index + 1}`,
    compareEyebrow: "Confronta le esperienze",
    compareTitle: "Scegli il modo giusto per vivere Favignana dal mare",
    allExperiences: "Tutte le esperienze",
    routeNotePrefix: "Collegamento dalla guida",
    routeNote:
      "La rotta viene sempre confermata in base a meteo marino, sicurezza e indicazioni dello skipper.",
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Domande frequenti su ${title.toLowerCase()}`,
    relatedEyebrow: "Continua la guida",
    relatedTitle: "Altre pagine utili su Favignana",
    relatedLabel: "Leggi la guida",
    sourcesEyebrow: "Fonti ufficiali e aggiornamenti",
    sourcesText:
      "Orari, collegamenti, regole sui veicoli e servizi possono cambiare: per i dettagli operativi rimandiamo sempre alle fonti ufficiali.",
  },
  en: {
    backLabel: "Favignana",
    heroLabel: "Favignana guide",
    asideEyebrow: "In this guide",
    asideAriaLabel: "Guide contents",
    quickAnswer: "Quick answer",
    quickAnswerTitle: "In short",
    itemEyebrow: "Useful to know",
    chapterLabel: (index: number) => `Chapter ${index + 1}`,
    compareEyebrow: "Compare experiences",
    compareTitle: "Choose the right way to experience Favignana by sea",
    allExperiences: "All experiences",
    routeNotePrefix: "Guide context",
    routeNote:
      "The route is always confirmed according to marine weather, safety and the skipper's guidance.",
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Frequently asked questions about ${title.toLowerCase()}`,
    relatedEyebrow: "Keep exploring",
    relatedTitle: "More useful pages about Favignana",
    relatedLabel: "Read the guide",
    sourcesEyebrow: "Official sources and updates",
    sourcesText:
      "Timetables, connections, vehicle rules and services may change: for practical details, always refer to official sources.",
  },
  es: {
    backLabel: "Favignana",
    heroLabel: "Guía de Favignana",
    asideEyebrow: "En esta guía",
    asideAriaLabel: "Índice de la guía",
    quickAnswer: "Respuesta rápida",
    quickAnswerTitle: "En breve",
    itemEyebrow: "Para tener en cuenta",
    chapterLabel: (index: number) => `Capítulo ${index + 1}`,
    compareEyebrow: "Compara experiencias",
    compareTitle: "Elige la mejor forma de vivir Favignana desde el mar",
    allExperiences: "Todas las experiencias",
    routeNotePrefix: "Contexto de la guía",
    routeNote:
      "La ruta se confirma siempre según meteorología marina, seguridad e indicaciones del patrón.",
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Preguntas frecuentes sobre ${title.toLowerCase()}`,
    relatedEyebrow: "Sigue explorando",
    relatedTitle: "Más páginas útiles sobre Favignana",
    relatedLabel: "Leer la guía",
    sourcesEyebrow: "Fuentes oficiales y actualizaciones",
    sourcesText:
      "Horarios, conexiones, normas de vehículos y servicios pueden cambiar: para detalles operativos, consulta siempre las fuentes oficiales.",
  },
  fr: {
    backLabel: "Favignana",
    heroLabel: "Guide de Favignana",
    asideEyebrow: "Dans ce guide",
    asideAriaLabel: "Sommaire du guide",
    quickAnswer: "Réponse rapide",
    quickAnswerTitle: "En bref",
    itemEyebrow: "À retenir",
    chapterLabel: (index: number) => `Chapitre ${index + 1}`,
    compareEyebrow: "Comparer les expériences",
    compareTitle: "Choisissez la bonne façon de vivre Favignana depuis la mer",
    allExperiences: "Toutes les expériences",
    routeNotePrefix: "Contexte du guide",
    routeNote:
      "L'itinéraire est toujours confirmé selon la météo marine, la sécurité et les indications du skipper.",
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Questions fréquentes sur ${title.toLowerCase()}`,
    relatedEyebrow: "Continuer l'exploration",
    relatedTitle: "Autres pages utiles sur Favignana",
    relatedLabel: "Lire le guide",
    sourcesEyebrow: "Sources officielles et mises à jour",
    sourcesText:
      "Horaires, liaisons, règles de circulation et services peuvent changer : pour les détails pratiques, consultez toujours les sources officielles.",
  },
} satisfies Record<
  GuideLocale,
  {
    backLabel: string;
    heroLabel: string;
    asideEyebrow: string;
    asideAriaLabel: string;
    quickAnswer: string;
    quickAnswerTitle: string;
    itemEyebrow: string;
    chapterLabel: (index: number) => string;
    compareEyebrow: string;
    compareTitle: string;
    allExperiences: string;
    routeNotePrefix: string;
    routeNote: string;
    faqEyebrow: string;
    faqTitle: (title: string) => string;
    relatedEyebrow: string;
    relatedTitle: string;
    relatedLabel: string;
    sourcesEyebrow: string;
    sourcesText: string;
  }
>;

const compareExperiencesByLocale = {
  it: [
    {
      title: "Tour Egadi 4 ore privato",
      description: "Mezza giornata agile, barca riservata e rotta scelta con lo skipper.",
      href: "/experiences/boat-exclusive-afternoon",
      image: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      meta: "4 ore",
    },
    {
      title: "Tour Egadi 8 ore condiviso",
      description: "Giornata completa con posti singoli, snorkeling e soste bagno.",
      href: "/experiences/boat-shared-full-day",
      image: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      meta: "8 ore",
    },
    {
      title: "Tour Egadi 8 ore privato",
      description: "Barca in esclusiva per gruppi che vogliono privacy e ritmo su misura.",
      href: "/experiences/boat-exclusive-full-day",
      image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      meta: "Privato",
    },
    {
      title: "Esperienza gourmet in trimarano",
      description: "Neel 47 con chef, skipper, hostess e pranzo a base di prodotti locali.",
      href: "/experiences/exclusive-experience",
      image: "/images/boats/neel-47/neel-47-tavolo-a-bordo.webp",
      meta: "Premium",
    },
    {
      title: "Charter Egadi",
      description: "Da 3 a 7 giornate in trimarano tra Favignana, Levanzo e Marettimo.",
      href: "/experiences/charter",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      meta: "Più giorni",
    },
  ],
  en: [
    {
      title: "Private 4-hour Egadi boat tour",
      description: "A compact half day with a reserved boat and a route shaped with the skipper.",
      href: "/experiences/boat-exclusive-afternoon",
      image: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      meta: "4 hours",
    },
    {
      title: "Shared 8-hour Egadi boat tour",
      description: "A full day with individual seats, swim stops and snorkeling when conditions allow.",
      href: "/experiences/boat-shared-full-day",
      image: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      meta: "8 hours",
    },
    {
      title: "Private 8-hour Egadi boat tour",
      description: "A boat reserved for groups who want privacy, comfort and a more personal pace.",
      href: "/experiences/boat-exclusive-full-day",
      image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      meta: "Private",
    },
    {
      title: "Gourmet trimaran experience",
      description: "Neel 47 with skipper, hostess, private chef and a lunch based on local ingredients.",
      href: "/experiences/exclusive-experience",
      image: "/images/boats/neel-47/neel-47-tavolo-a-bordo.webp",
      meta: "Premium",
    },
    {
      title: "Egadi charter",
      description: "From 3 to 7 days on a trimaran between Favignana, Levanzo and Marettimo.",
      href: "/experiences/charter",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      meta: "Multi-day",
    },
  ],
  es: [
    {
      title: "Excursión privada Egadi 4 horas",
      description: "Medio día ágil, barco reservado y ruta acordada con el patrón.",
      href: "/experiences/boat-exclusive-afternoon",
      image: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      meta: "4 horas",
    },
    {
      title: "Excursión compartida Egadi 8 horas",
      description: "Día completo con plazas individuales, baños y snorkel si el mar lo permite.",
      href: "/experiences/boat-shared-full-day",
      image: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      meta: "8 horas",
    },
    {
      title: "Excursión privada Egadi 8 horas",
      description: "Barco en exclusiva para grupos que quieren privacidad y ritmo a medida.",
      href: "/experiences/boat-exclusive-full-day",
      image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      meta: "Privado",
    },
    {
      title: "Chef a bordo en trimarán",
      description: "Neel 47 con chef, patrón, azafata y comida con productos locales.",
      href: "/experiences/exclusive-experience",
      image: "/images/boats/neel-47/neel-47-tavolo-a-bordo.webp",
      meta: "Premium",
    },
    {
      title: "Charter Islas Egadi",
      description: "De 3 a 7 días en trimarán entre Favignana, Levanzo y Marettimo.",
      href: "/experiences/charter",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      meta: "Varios días",
    },
  ],
  fr: [
    {
      title: "Excursion privée Égades 4 heures",
      description: "Une demi-journée agile avec bateau réservé et itinéraire choisi avec le skipper.",
      href: "/experiences/boat-exclusive-afternoon",
      image: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
      meta: "4 heures",
    },
    {
      title: "Excursion partagée Égades 8 heures",
      description: "Une journée complète avec places individuelles, baignades et snorkeling si la mer le permet.",
      href: "/experiences/boat-shared-full-day",
      image: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
      meta: "8 heures",
    },
    {
      title: "Excursion privée Égades 8 heures",
      description: "Un bateau en exclusivité pour les groupes qui veulent intimité, confort et rythme sur mesure.",
      href: "/experiences/boat-exclusive-full-day",
      image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
      meta: "Privé",
    },
    {
      title: "Chef à Bord en trimaran",
      description: "Neel 47 avec skipper, hôtesse, chef privé et déjeuner à base de produits locaux.",
      href: "/experiences/exclusive-experience",
      image: "/images/boats/neel-47/neel-47-tavolo-a-bordo.webp",
      meta: "Premium",
    },
    {
      title: "Charter aux îles Égades",
      description: "De 3 à 7 jours en trimaran entre Favignana, Levanzo et Marettimo.",
      href: "/experiences/charter",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      meta: "Plusieurs jours",
    },
  ],
} satisfies Record<
  GuideLocale,
  Array<{
    title: string;
    description: string;
    href: string;
    image: string;
    meta: string;
  }>
>;

const ctaCopyByLocale = {
  it: {
    cigala: {
      eyebrow: "Tour in barca da Trapani",
      title: "Vuoi vedere queste cale senza organizzare bici, scooter e accessi rocciosi?",
      description:
        "Con Egadisailing la rotta viene scelta in base a vento, mare e comfort del gruppo. È il modo più semplice per vivere Favignana dal mare, con soste bagno e snorkeling quando le condizioni lo permettono.",
      href: "/experiences/boat-shared-full-day",
      label: "Scopri il tour 8 ore",
      secondaryHref: "/experiences/boat-exclusive-full-day",
      secondaryLabel: "Vedi la barca privata",
      image: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Cigala e Bertinetti 34 Offshore Open alle Isole Egadi",
      icon: Waves,
    },
    neel: {
      eyebrow: "Trimarano Neel 47",
      title: "Per una giornata più comoda, scegli il trimarano con chef a bordo",
      description:
        "Spazi ampi, skipper, hostess, cucina privata e pranzo a base di prodotti locali: una soluzione premium per vivere Favignana e Levanzo con un ritmo più lento e curato.",
      href: "/experiences/exclusive-experience",
      label: "Scopri l'esperienza gourmet",
      secondaryHref: "/experiences/charter",
      secondaryLabel: "Guarda il charter",
      image: "/images/boats/neel-47/neel-47-favignana.webp",
      imageAlt: "Trimarano Neel 47 in navigazione a Favignana",
      icon: Sparkles,
    },
  },
  en: {
    cigala: {
      eyebrow: "Boat tour from Trapani",
      title: "Want to see these coves without arranging bikes, scooters or rocky access?",
      description:
        "With Egadisailing, the route is chosen according to wind, sea and guest comfort. It is a simple way to experience Favignana by sea, with swim stops and snorkeling when conditions allow.",
      href: "/experiences/boat-shared-full-day",
      label: "View the 8-hour tour",
      secondaryHref: "/experiences/boat-exclusive-full-day",
      secondaryLabel: "See the private boat",
      image: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Cigala and Bertinetti 34 Offshore Open in the Egadi Islands",
      icon: Waves,
    },
    neel: {
      eyebrow: "Neel 47 trimaran",
      title: "For a more comfortable day, choose the trimaran with chef on board",
      description:
        "Wide spaces, skipper, hostess, private cooking and a lunch based on local ingredients: a premium way to experience Favignana and Levanzo at a slower, more comfortable pace.",
      href: "/experiences/exclusive-experience",
      label: "View the gourmet experience",
      secondaryHref: "/experiences/charter",
      secondaryLabel: "View the charter",
      image: "/images/boats/neel-47/neel-47-favignana.webp",
      imageAlt: "Neel 47 trimaran sailing near Favignana",
      icon: Sparkles,
    },
  },
  es: {
    cigala: {
      eyebrow: "Excursión en barco desde Trapani",
      title: "¿Quieres ver estas calas sin organizar bici, scooter ni accesos rocosos?",
      description:
        "Con Egadisailing, la ruta se elige según viento, mar y comodidad del grupo. Es una forma sencilla de vivir Favignana desde el mar, con baños y snorkel cuando las condiciones lo permiten.",
      href: "/experiences/boat-shared-full-day",
      label: "Ver la excursión de 8 horas",
      secondaryHref: "/experiences/boat-exclusive-full-day",
      secondaryLabel: "Ver el tour privado",
      image: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Cigala y Bertinetti 34 Offshore Open en las Islas Egadi",
      icon: Waves,
    },
    neel: {
      eyebrow: "Trimarán Neel 47",
      title: "Para un día más cómodo, elige el trimarán con chef a bordo",
      description:
        "Espacios amplios, patrón, azafata, cocina privada y comida con productos locales: una opción premium para vivir Favignana y Levanzo con un ritmo más lento y cuidado.",
      href: "/experiences/exclusive-experience",
      label: "Ver la experiencia gourmet",
      secondaryHref: "/experiences/charter",
      secondaryLabel: "Ver el charter",
      image: "/images/boats/neel-47/neel-47-favignana.webp",
      imageAlt: "Trimarán Neel 47 navegando cerca de Favignana",
      icon: Sparkles,
    },
  },
  fr: {
    cigala: {
      eyebrow: "Excursion en bateau depuis Trapani",
      title: "Envie de voir ces criques sans organiser vélos, scooters et accès rocheux ?",
      description:
        "Avec Egadisailing, l'itinéraire est choisi selon le vent, la mer et le confort du groupe. C'est une façon simple de vivre Favignana depuis la mer, avec baignades et snorkeling lorsque les conditions le permettent.",
      href: "/experiences/boat-shared-full-day",
      label: "Voir l'excursion de 8 heures",
      secondaryHref: "/experiences/boat-exclusive-full-day",
      secondaryLabel: "Voir le tour privé",
      image: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Cigala et Bertinetti 34 Offshore Open aux îles Égades",
      icon: Waves,
    },
    neel: {
      eyebrow: "Trimaran Neel 47",
      title: "Pour une journée plus confortable, choisissez le trimaran avec chef à bord",
      description:
        "Grands espaces, skipper, hôtesse, cuisine privée et déjeuner à base de produits locaux : une solution premium pour vivre Favignana et Levanzo à un rythme plus lent et soigné.",
      href: "/experiences/exclusive-experience",
      label: "Voir l'expérience gourmet",
      secondaryHref: "/experiences/charter",
      secondaryLabel: "Voir le charter",
      image: "/images/boats/neel-47/neel-47-favignana.webp",
      imageAlt: "Trimaran Neel 47 en navigation près de Favignana",
      icon: Sparkles,
    },
  },
} satisfies Record<
  GuideLocale,
  Record<
    Exclude<FavignanaGuideCta, "compare">,
    {
      eyebrow: string;
      title: string;
      description: string;
      href: string;
      label: string;
      secondaryHref: string;
      secondaryLabel: string;
      image: string;
      imageAlt: string;
      icon: typeof Waves;
    }
  >
>;

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function getGuideUrl(locale: GuideLocale, slug: string): string {
  return localizedPath(locale, `/islands/favignana/${slug}`);
}

function buildGuideJsonLd(guide: FavignanaGuide, locale: GuideLocale) {
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${base}${getGuideUrl(locale, guide.slug)}`;
  const inLanguage = locale === "en" ? "en-US" : locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : "it-IT";
  const islandsName =
    locale === "en"
      ? "Egadi Islands"
      : locale === "es"
        ? "Islas Egadi"
        : locale === "fr"
          ? "Îles Égades"
          : "Le Isole Egadi";
  const graph: unknown[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Egadisailing", item: `${base}/${locale}` },
        { "@type": "ListItem", position: 2, name: islandsName, item: `${base}${localizedPath(locale, "/islands")}` },
        { "@type": "ListItem", position: 3, name: "Favignana", item: `${base}${localizedPath(locale, "/islands/favignana")}` },
        { "@type": "ListItem", position: 4, name: guide.shortTitle, item: pageUrl },
      ],
    },
    {
      "@type": "Article",
      headline: guide.title,
      description: guide.metaDescription,
      image: absoluteUrl(guide.heroImage),
      inLanguage,
      keywords: [guide.primaryKeyword, ...guide.secondaryKeywords].join(", "),
      mainEntityOfPage: pageUrl,
      author: {
        "@type": "Organization",
        name: "Egadisailing",
      },
      publisher: {
        "@type": "Organization",
        name: "Egadisailing",
      },
      about: {
        "@type": "TouristDestination",
        name: "Favignana",
        containedInPlace: {
          "@type": "Place",
          name: islandsName,
        },
      },
    },
    {
      "@type": "ItemList",
      name: guide.itemListTitle,
      itemListElement: guide.itemList.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "TouristAttraction",
          name: item.name,
          description: item.description,
          containedInPlace: {
            "@type": "Place",
            name: "Favignana",
          },
        },
      })),
    },
  ];

  if (guide.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: guide.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function generateStaticParams() {
  return guideLocales.flatMap((locale) =>
    guidesByLocale[locale].map((guide) => ({
      locale,
      guideSlug: guide.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; guideSlug: string }>;
}): Promise<Metadata> {
  const { locale, guideSlug } = await params;
  if (!isGuideLocale(locale)) {
    return {
      title: "Page not found",
      robots: { index: false, follow: false },
    };
  }

  const guide = getLocalizedGuide(locale, guideSlug);

  if (!guide) {
    return {
      title:
        locale === "es"
          ? "Página no encontrada"
          : locale === "fr"
            ? "Page introuvable"
            : locale === "en"
              ? "Page not found"
              : "Pagina non trovata",
      robots: { index: false, follow: false },
    };
  }

  const base = env.APP_URL.replace(/\/$/, "");
  const canonical = `${base}${getGuideUrl(locale, guide.slug)}`;
  const italianSlug = getFavignanaGuideSlugForLocale(guide.slug, "it") ?? guide.slug;
  const englishSlug = getFavignanaGuideSlugForLocale(guide.slug, "en") ?? guide.slug;
  const spanishSlug = getFavignanaGuideSlugForLocale(guide.slug, "es") ?? guide.slug;
  const image = absoluteUrl(guide.heroImage);
  const ogLocale = locale === "en" ? "en_US" : locale === "es" ? "es_ES" : locale === "fr" ? "fr_FR" : "it_IT";
  const alternateOgLocales = ["it", "en", "es"]
    .filter((item) => item !== locale)
    .map((item) => (item === "en" ? "en_US" : item === "es" ? "es_ES" : "it_IT"));

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      languages: {
        it: `${base}${getGuideUrl("it", italianSlug)}`,
        en: `${base}${getGuideUrl("en", englishSlug)}`,
        es: `${base}${getGuideUrl("es", spanishSlug)}`,
        "x-default": `${base}${getGuideUrl("it", italianSlug)}`,
      },
    },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: canonical,
      siteName: "Egadisailing",
      locale: ogLocale,
      alternateLocale: alternateOgLocales,
      type: "article",
      images: [{ url: image, width: 1200, height: 630, alt: guide.heroAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.metaDescription,
      images: [image],
    },
  };
}

export default async function FavignanaGuidePage({
  params,
}: {
  params: Promise<{ locale: string; guideSlug: string }>;
}) {
  const { locale, guideSlug } = await params;
  if (!isGuideLocale(locale)) {
    notFound();
  }

  const guide = getLocalizedGuide(locale, guideSlug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = guide.relatedSlugs
    .map((slug) => getLocalizedGuide(locale, slug))
    .filter((item): item is FavignanaGuide => Boolean(item));
  const ui = guideUi[locale];

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f1e6] text-[#092337]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(buildGuideJsonLd(guide, locale)) }}
      />

      <Hero guide={guide} locale={locale} ui={ui} />

      <main>
        <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)] lg:items-start">
            <GuideAside guide={guide} ui={ui} />

            <div className="min-w-0 space-y-12">
              <QuickAnswer guide={guide} ui={ui} />
              <ItemList guide={guide} ui={ui} />

              {guide.sections.map((section, index) => (
                <GuideSectionBlock
                  key={section.id}
                  guide={guide}
                  section={section}
                  index={index}
                  locale={locale}
                  ui={ui}
                />
              ))}
            </div>
          </div>
        </section>

        <FaqSection guide={guide} ui={ui} />
        <RelatedSection
          currentSlug={guide.slug}
          locale={locale}
          relatedGuides={relatedGuides}
          ui={ui}
        />
        <SourcesSection ui={ui} />
      </main>
    </div>
  );
}

function Hero({
  guide,
  locale,
  ui,
}: {
  guide: FavignanaGuide;
  locale: GuideLocale;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section className="relative isolate min-h-[82svh] overflow-hidden bg-[#071934] px-4 pb-12 pt-28 text-white sm:px-6 lg:px-8">
      <Image
        src={guide.heroImage}
        alt={guide.heroAlt}
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,25,52,0.92)_0%,rgba(7,25,52,0.68)_52%,rgba(7,25,52,0.28)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-[linear-gradient(180deg,transparent_0%,#071934_100%)]"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-[calc(82svh-10rem)] max-w-7xl flex-col justify-center">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href={localizedPath(locale, "/islands/favignana")}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white/78 backdrop-blur transition hover:border-white/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {ui.backLabel}
          </Link>
          <span className="rounded-md border border-white/16 bg-white/10 px-3 py-2 text-white/70 backdrop-blur">
            {guide.eyebrow}
          </span>
        </div>

        <div className="max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
            {ui.heroLabel}
          </p>
          <h1 className="mt-5 max-w-5xl break-words font-heading text-[2.15rem] font-bold leading-[1.03] text-white min-[430px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            {guide.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/78 sm:text-lg">
            {guide.intro}
          </p>
        </div>

        <dl className="mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
          {guide.quickFacts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-white/16 bg-white/10 p-4 backdrop-blur"
            >
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-white/56">
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm font-bold text-white sm:text-base">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function GuideAside({
  guide,
  ui,
}: {
  guide: FavignanaGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <aside className="lg:sticky lg:top-28">
      <div className="rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_18px_54px_rgba(10,38,55,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f3e2bd] text-[#092337]">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
              {ui.asideEyebrow}
            </p>
            <h2 className="mt-2 font-heading text-2xl font-bold leading-tight text-[#092337]">
              {guide.shortTitle}
            </h2>
          </div>
        </div>

        <nav className="mt-6 space-y-2" aria-label={ui.asideAriaLabel}>
          <a
            href="#risposta-rapida"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#425f6f] transition hover:bg-[#f8f2e6] hover:text-[#092337]"
          >
            <Info className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
            {ui.quickAnswer}
          </a>
          <a
            href="#lista"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#425f6f] transition hover:bg-[#f8f2e6] hover:text-[#092337]"
          >
            <MapPin className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
            {guide.itemListTitle}
          </a>
          {guide.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#425f6f] transition hover:bg-[#f8f2e6] hover:text-[#092337]"
            >
              <Compass className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function QuickAnswer({
  guide,
  ui,
}: {
  guide: FavignanaGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section
      id="risposta-rapida"
      className="scroll-mt-28 rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_18px_54px_rgba(10,38,55,0.08)] sm:p-8"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
        <ShipWheel className="h-4 w-4" aria-hidden="true" />
        {ui.quickAnswer}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
        {ui.quickAnswerTitle}
      </h2>
      <p className="mt-4 text-base leading-7 text-[#425f6f] sm:text-lg">
        {guide.quickAnswer}
      </p>
    </section>
  );
}

function ItemList({
  guide,
  ui,
}: {
  guide: FavignanaGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section id="lista" className="scroll-mt-28">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
          {ui.itemEyebrow}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
          {guide.itemListTitle}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {guide.itemList.map((item, index) => (
          <article
            key={item.name}
            className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 shadow-[0_12px_36px_rgba(10,38,55,0.06)]"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#092337] font-heading text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="font-heading text-xl font-bold leading-tight text-[#092337]">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#425f6f]">
                  {item.description}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GuideSectionBlock({
  guide,
  section,
  index,
  locale,
  ui,
}: {
  guide: FavignanaGuide;
  section: FavignanaGuideSection;
  index: number;
  locale: GuideLocale;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section id={section.id} className="scroll-mt-28">
      <div className="border-t border-[#d9c79d] pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
          {section.eyebrow ?? ui.chapterLabel(index)}
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
          {section.title}
        </h2>

        <div className="mt-6 space-y-5 text-base leading-7 text-[#425f6f] sm:text-lg">
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {section.bullets ? <BulletList bullets={section.bullets} /> : null}
        {section.steps ? <StepList steps={section.steps} /> : null}
        {section.cards ? <SectionCards cards={section.cards} /> : null}

        {section.note ? (
          <div className="mt-7 rounded-lg border border-[#d9c79d] bg-white p-5">
            <p className="flex gap-3 text-sm leading-6 text-[#294657] sm:text-base">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#b58a27]" aria-hidden="true" />
              <span>{section.note}</span>
            </p>
          </div>
        ) : null}

        {section.cta ? (
          <GuideCta guide={guide} locale={locale} ui={ui} variant={section.cta} />
        ) : null}
      </div>
    </section>
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="mt-7 grid gap-3 sm:grid-cols-2">
      {bullets.map((bullet) => (
        <li
          key={bullet}
          className="flex gap-3 rounded-lg border border-[#d9c79d] bg-white p-4 text-sm font-semibold leading-6 text-[#294657]"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#b58a27]" aria-hidden="true" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

function StepList({
  steps,
}: {
  steps: Array<{ label: string; title: string; text: string }>;
}) {
  return (
    <div className="mt-7 grid gap-4 md:grid-cols-3">
      {steps.map((step) => (
        <article key={`${step.label}-${step.title}`} className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
            {step.label}
          </p>
          <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-[#092337]">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#425f6f]">{step.text}</p>
        </article>
      ))}
    </div>
  );
}

function SectionCards({
  cards,
}: {
  cards: Array<{ title: string; text: string; tag?: string; image?: string }>;
}) {
  return (
    <div className="mt-7 grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.title}
          className="overflow-hidden rounded-lg border border-[#d9c79d] bg-white shadow-[0_12px_36px_rgba(10,38,55,0.06)]"
        >
          {card.image ? (
            <div className="relative aspect-[4/3] bg-[#d8c8a6]">
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes="(max-width: 768px) 100vw, 20vw"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="p-5">
            {card.tag ? (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                {card.tag}
              </p>
            ) : null}
            <h3 className="mt-2 font-heading text-xl font-bold leading-tight text-[#092337]">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#425f6f]">{card.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function GuideCta({
  guide,
  locale,
  ui,
  variant,
}: {
  guide: FavignanaGuide;
  locale: GuideLocale;
  ui: (typeof guideUi)[GuideLocale];
  variant: FavignanaGuideCta;
}) {
  if (variant === "compare") {
    const compareExperiences = compareExperiencesByLocale[locale];

    return (
      <div className="mt-10 overflow-hidden rounded-lg bg-[#071934] p-6 text-white shadow-[0_20px_58px_rgba(7,25,52,0.18)] sm:p-7">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
              {ui.compareEyebrow}
            </p>
            <h3 className="mt-3 font-heading text-3xl font-bold leading-tight">
              {ui.compareTitle}
            </h3>
          </div>
          <Link
            href={localizedPath(locale, "/experiences")}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-[var(--color-gold)] px-5 text-sm font-bold text-[#071934] transition hover:bg-[#f0c35a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {ui.allExperiences}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {compareExperiences.map((experience) => (
            <Link
              key={experience.title}
              href={localizedPath(locale, experience.href)}
              className="group overflow-hidden rounded-lg border border-white/12 bg-white/[0.07] transition hover:border-[var(--color-gold)] hover:bg-white/[0.11]"
            >
              <div className="relative aspect-[4/3] bg-[#0d2a44]">
                <Image
                  src={experience.image}
                  alt={experience.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 16vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {experience.meta}
                </p>
                <h4 className="mt-2 font-heading text-lg font-bold leading-tight text-white">
                  {experience.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  {experience.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const cta = ctaCopyByLocale[locale][variant];
  const Icon = cta.icon;

  return (
    <div className="mt-10 overflow-hidden rounded-lg border border-[#d9c79d] bg-white shadow-[0_18px_54px_rgba(10,38,55,0.09)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="relative min-h-72 bg-[#092337] lg:min-h-full">
          <Image
            src={cta.image}
            alt={cta.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 36vw"
            className="object-cover"
          />
        </div>
        <div className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {cta.eyebrow}
          </p>
          <h3 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
            {cta.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-[#425f6f]">
            {cta.description}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={localizedPath(locale, cta.href)}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[#092337] px-5 text-sm font-bold text-white transition hover:bg-[#123b5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58a27]"
            >
              {cta.label}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={localizedPath(locale, cta.secondaryHref)}
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#d9c79d] bg-[#fbf7ee] px-5 text-sm font-bold text-[#092337] transition hover:border-[#b58a27] hover:bg-[#f2e5c9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b58a27]"
            >
              {cta.secondaryLabel}
            </Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-[#6b7d86]">
            {ui.routeNotePrefix}: {guide.shortTitle}. {ui.routeNote}
          </p>
        </div>
      </div>
    </div>
  );
}

function FaqSection({
  guide,
  ui,
}: {
  guide: FavignanaGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  if (guide.faqs.length === 0) return null;

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            {ui.faqEyebrow}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
            {ui.faqTitle(guide.shortTitle)}
          </h2>
        </div>
        <div className="mt-10 space-y-4">
          {guide.faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5 sm:p-6"
            >
              <h3 className="font-heading text-xl font-bold text-[#092337]">{faq.question}</h3>
              <p className="mt-3 text-sm leading-6 text-[#425f6f] sm:text-base">
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedSection({
  currentSlug,
  locale,
  relatedGuides,
  ui,
}: {
  currentSlug: string;
  locale: GuideLocale;
  relatedGuides: FavignanaGuide[];
  ui: (typeof guideUi)[GuideLocale];
}) {
  const fallbackGuides = guidesByLocale[locale]
    .filter((guide) => guide.slug !== currentSlug)
    .slice(0, 3);
  const guides = relatedGuides.length > 0 ? relatedGuides : fallbackGuides;

  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b58a27]">
            {ui.relatedEyebrow}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
            {ui.relatedTitle}
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={getGuideUrl(locale, guide.slug)}
              className="group rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_14px_42px_rgba(10,38,55,0.07)] transition hover:-translate-y-1 hover:border-[#b58a27] hover:shadow-[0_18px_54px_rgba(10,38,55,0.12)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
                Favignana
              </p>
              <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-[#092337]">
                {guide.shortTitle}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#425f6f]">{guide.metaDescription}</p>
              <span className="mt-5 inline-flex items-center text-sm font-bold text-[#092337]">
                {ui.relatedLabel}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SourcesSection({ ui }: { ui: (typeof guideUi)[GuideLocale] }) {
  return (
    <section className="bg-[#071934] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
            {ui.sourcesEyebrow}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
            {ui.sourcesText}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {favignanaGuideSourceLinks.map((source) => (
            <a
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/76 transition hover:border-[var(--color-gold)] hover:text-white"
            >
              {source.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
