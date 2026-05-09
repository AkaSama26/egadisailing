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
  type LucideIcon,
} from "lucide-react";
import {
  getMarettimoGuideSlugForLocale,
  marettimoGuideSourceLinks,
  marettimoGuides,
  type MarettimoGuide,
  type MarettimoGuideCta,
  type MarettimoGuideSection,
} from "@/data/marettimo-guides";
import { marettimoGuidesEn } from "@/data/marettimo-guides-en";
import { marettimoGuidesEs } from "@/data/marettimo-guides-es";
import { marettimoGuidesFr } from "@/data/marettimo-guides-fr";
import { marettimoGuidesDe } from "@/data/marettimo-guides-de";
import { env } from "@/lib/env";
import { localizedPath } from "@/lib/i18n/paths";

export const dynamicParams = false;

const guideLocales = ["it", "en", "es", "fr", "de"] as const;
type GuideLocale = (typeof guideLocales)[number];

const guidesByLocale = {
  it: marettimoGuides,
  en: marettimoGuidesEn,
  es: marettimoGuidesEs,
  fr: marettimoGuidesFr,
  de: marettimoGuidesDe,
} satisfies Record<GuideLocale, MarettimoGuide[]>;

function isGuideLocale(locale: string): locale is GuideLocale {
  return locale === "it" || locale === "en" || locale === "es" || locale === "fr" || locale === "de";
}

function getLocalizedGuide(locale: GuideLocale, slug: string): MarettimoGuide | undefined {
  return guidesByLocale[locale].find((guide) => guide.slug === slug);
}

const guideUi = {
  it: {
    backLabel: "Marettimo",
    heroLabel: "Guida a Marettimo",
    asideEyebrow: "In questa guida",
    asideAriaLabel: "Indice della guida",
    quickAnswer: "Risposta rapida",
    quickAnswerTitle: "In breve",
    itemEyebrow: "Da tenere a mente",
    chapterLabel: (index: number) => `Capitolo ${index + 1}`,
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Domande frequenti su ${title.toLowerCase()}`,
    relatedEyebrow: "Continua la guida",
    relatedTitle: "Altre pagine utili su Marettimo",
    relatedLabel: "Leggi la guida",
    sourcesEyebrow: "Fonti ufficiali e aggiornamenti",
    sourcesTitle: "Verifica sempre orari, visite e regole aggiornate",
    sourcesText:
      "Collegamenti, accessi, regole dell'Area Marina Protetta e aperture dei siti possono cambiare. Per i dettagli operativi rimandiamo sempre alle fonti ufficiali.",
  },
  en: {
    backLabel: "Marettimo",
    heroLabel: "Marettimo guide",
    asideEyebrow: "In this guide",
    asideAriaLabel: "Guide contents",
    quickAnswer: "Quick answer",
    quickAnswerTitle: "In short",
    itemEyebrow: "Useful to know",
    chapterLabel: (index: number) => `Chapter ${index + 1}`,
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Frequently asked questions about ${title.toLowerCase()}`,
    relatedEyebrow: "Keep exploring",
    relatedTitle: "More useful pages about Marettimo",
    relatedLabel: "Read the guide",
    sourcesEyebrow: "Official sources and updates",
    sourcesTitle: "Always check current timetables, visits and rules",
    sourcesText:
      "Sea connections, access, Marine Protected Area rules and site openings can change. For operational details, always refer to official sources.",
  },
  es: {
    backLabel: "Marettimo",
    heroLabel: "Guía de Marettimo",
    asideEyebrow: "En esta guía",
    asideAriaLabel: "Índice de la guía",
    quickAnswer: "Respuesta rápida",
    quickAnswerTitle: "En breve",
    itemEyebrow: "Para tener en cuenta",
    chapterLabel: (index: number) => `Capítulo ${index + 1}`,
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Preguntas frecuentes sobre ${title.toLowerCase()}`,
    relatedEyebrow: "Sigue explorando",
    relatedTitle: "Más páginas útiles sobre Marettimo",
    relatedLabel: "Leer la guía",
    sourcesEyebrow: "Fuentes oficiales y actualizaciones",
    sourcesTitle: "Comprueba siempre horarios, visitas y normas actualizadas",
    sourcesText:
      "Conexiones marítimas, accesos, normas del Área Marina Protegida y aperturas de sitios pueden cambiar. Para detalles operativos, consulta siempre fuentes oficiales.",
  },
  fr: {
    backLabel: "Marettimo",
    heroLabel: "Guide de Marettimo",
    asideEyebrow: "Dans ce guide",
    asideAriaLabel: "Sommaire du guide",
    quickAnswer: "Réponse rapide",
    quickAnswerTitle: "En bref",
    itemEyebrow: "À retenir",
    chapterLabel: (index: number) => `Chapitre ${index + 1}`,
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Questions fréquentes sur ${title.toLowerCase()}`,
    relatedEyebrow: "Continuer l'exploration",
    relatedTitle: "Autres pages utiles sur Marettimo",
    relatedLabel: "Lire le guide",
    sourcesEyebrow: "Sources officielles et mises à jour",
    sourcesTitle: "Vérifiez toujours les horaires, visites et règles à jour",
    sourcesText:
      "Liaisons maritimes, accès, règles de l'Aire Marine Protégée et ouvertures de sites peuvent changer. Pour les détails pratiques, consultez toujours les sources officielles.",
  },
  de: {
    backLabel: "Marettimo",
    heroLabel: "Marettimo-Guide",
    asideEyebrow: "In diesem Guide",
    asideAriaLabel: "Inhaltsverzeichnis des Guides",
    quickAnswer: "Kurzantwort",
    quickAnswerTitle: "Kurz gesagt",
    itemEyebrow: "Gut zu wissen",
    chapterLabel: (index: number) => `Kapitel ${index + 1}`,
    faqEyebrow: "FAQ",
    faqTitle: (title: string) => `Häufige Fragen zu ${title.toLowerCase()}`,
    relatedEyebrow: "Weiter entdecken",
    relatedTitle: "Weitere nützliche Seiten zu Marettimo",
    relatedLabel: "Guide lesen",
    sourcesEyebrow: "Offizielle Quellen und Updates",
    sourcesTitle: "Prüfen Sie immer aktuelle Fahrpläne, Besuche und Regeln",
    sourcesText:
      "Seeverbindungen, Zugänge, Regeln des Meeresschutzgebiets und Öffnungszeiten können sich ändern. Für praktische Details prüfen Sie immer die offiziellen Quellen.",
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
    faqEyebrow: string;
    faqTitle: (title: string) => string;
    relatedEyebrow: string;
    relatedTitle: string;
    relatedLabel: string;
    sourcesEyebrow: string;
    sourcesTitle: string;
    sourcesText: string;
  }
>;

const sourceLinksByLocale = {
  it: marettimoGuideSourceLinks,
  en: [
    {
      label: "West of Sicily - Marettimo",
      href: "https://www.westofsicily.com/it/localita/marettimo",
    },
    {
      label: "West of Sicily - Marettimo sea caves",
      href: "https://www.westofsicily.com/it/mare-natura/le-grotte-di-marettimo",
    },
    {
      label: "Municipality of Favignana - Punta Troia Castle",
      href: "https://www.comune.favignana.tp.it/it/vivere/castello-di-punta-troia",
    },
    {
      label: "Egadi Islands Marine Protected Area",
      href: "https://www.ampisoleegadi.it/",
    },
    {
      label: "Visit Sicily - Wreck of the Cannons",
      href: "https://www.visitsicily.info/en/itinerario/marettimo-wreck-of-the-cannons/",
    },
    {
      label: "Liberty Lines",
      href: "https://www.libertylines.it/",
    },
    {
      label: "Caronte & Tourist / Siremar",
      href: "https://www.carontetourist.it/en",
    },
  ],
  es: [
    {
      label: "West of Sicily - Marettimo",
      href: "https://www.westofsicily.com/it/localita/marettimo",
    },
    {
      label: "West of Sicily - cuevas de Marettimo",
      href: "https://www.westofsicily.com/it/mare-natura/le-grotte-di-marettimo",
    },
    {
      label: "Comune di Favignana - Castillo de Punta Troia",
      href: "https://www.comune.favignana.tp.it/it/vivere/castello-di-punta-troia",
    },
    {
      label: "Área Marina Protegida Islas Egadi",
      href: "https://www.ampisoleegadi.it/",
    },
    {
      label: "Visit Sicily - Wreck of the Cannons",
      href: "https://www.visitsicily.info/en/itinerario/marettimo-wreck-of-the-cannons/",
    },
    {
      label: "Liberty Lines",
      href: "https://www.libertylines.it/",
    },
    {
      label: "Caronte & Tourist / Siremar",
      href: "https://www.carontetourist.it/en",
    },
  ],
  fr: [
    {
      label: "West of Sicily - Marettimo",
      href: "https://www.westofsicily.com/it/localita/marettimo",
    },
    {
      label: "West of Sicily - grottes de Marettimo",
      href: "https://www.westofsicily.com/it/mare-natura/le-grotte-di-marettimo",
    },
    {
      label: "Comune di Favignana - château de Punta Troia",
      href: "https://www.comune.favignana.tp.it/it/vivere/castello-di-punta-troia",
    },
    {
      label: "Aire Marine Protégée des îles Égades",
      href: "https://www.ampisoleegadi.it/",
    },
    {
      label: "Visit Sicily - Wreck of the Cannons",
      href: "https://www.visitsicily.info/en/itinerario/marettimo-wreck-of-the-cannons/",
    },
    {
      label: "Liberty Lines",
      href: "https://www.libertylines.it/",
    },
    {
      label: "Caronte & Tourist / Siremar",
      href: "https://www.carontetourist.it/en",
    },
  ],
  de: [
    {
      label: "West of Sicily - Marettimo",
      href: "https://www.westofsicily.com/it/localita/marettimo",
    },
    {
      label: "West of Sicily - Meeresgrotten von Marettimo",
      href: "https://www.westofsicily.com/it/mare-natura/le-grotte-di-marettimo",
    },
    {
      label: "Gemeinde Favignana - Castello di Punta Troia",
      href: "https://www.comune.favignana.tp.it/it/vivere/castello-di-punta-troia",
    },
    {
      label: "Meeresschutzgebiet Ägadische Inseln",
      href: "https://www.ampisoleegadi.it/",
    },
    {
      label: "Visit Sicily - Wreck of the Cannons",
      href: "https://www.visitsicily.info/en/itinerario/marettimo-wreck-of-the-cannons/",
    },
    {
      label: "Liberty Lines",
      href: "https://www.libertylines.it/",
    },
    {
      label: "Caronte & Tourist / Siremar",
      href: "https://www.carontetourist.it/en",
    },
  ],
} satisfies Record<GuideLocale, typeof marettimoGuideSourceLinks>;

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function getGuideUrl(locale: GuideLocale, slug: string): string {
  return localizedPath(locale, `/islands/marettimo/${slug}`);
}

function buildGuideJsonLd(guide: MarettimoGuide, locale: GuideLocale) {
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${base}${getGuideUrl(locale, guide.slug)}`;
  const inLanguage =
    locale === "en"
      ? "en-US"
      : locale === "es"
        ? "es-ES"
        : locale === "fr"
          ? "fr-FR"
          : locale === "de"
            ? "de-DE"
            : "it-IT";
  const islandsName =
    locale === "en"
      ? "Egadi Islands"
      : locale === "es"
        ? "Islas Egadi"
        : locale === "fr"
          ? "Îles Égades"
          : locale === "de"
            ? "Ägadische Inseln"
            : "Isole Egadi";
  const islandsBreadcrumb =
    locale === "en"
      ? "Egadi Islands"
      : locale === "es"
        ? "Islas Egadi"
        : locale === "fr"
          ? "Îles Égades"
          : locale === "de"
            ? "Ägadische Inseln"
            : "Le Isole Egadi";
  const graph: unknown[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Egadisailing", item: `${base}/${locale}` },
        {
          "@type": "ListItem",
          position: 2,
          name: islandsBreadcrumb,
          item: `${base}${localizedPath(locale, "/islands")}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Marettimo",
          item: `${base}${localizedPath(locale, "/islands/marettimo")}`,
        },
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
        name: "Marettimo",
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
            name: "Marettimo",
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
            : locale === "de"
              ? "Seite nicht gefunden"
              : locale === "en"
                ? "Page not found"
                : "Pagina non trovata",
      robots: { index: false, follow: false },
    };
  }

  const base = env.APP_URL.replace(/\/$/, "");
  const canonical = `${base}${getGuideUrl(locale, guide.slug)}`;
  const italianSlug = getMarettimoGuideSlugForLocale(guide.slug, "it") ?? guide.slug;
  const englishSlug = getMarettimoGuideSlugForLocale(guide.slug, "en") ?? guide.slug;
  const spanishSlug = getMarettimoGuideSlugForLocale(guide.slug, "es") ?? guide.slug;
  const frenchSlug = getMarettimoGuideSlugForLocale(guide.slug, "fr") ?? guide.slug;
  const germanSlug = getMarettimoGuideSlugForLocale(guide.slug, "de") ?? guide.slug;
  const image = absoluteUrl(guide.heroImage);
  const ogLocale =
    locale === "en"
      ? "en_US"
      : locale === "es"
        ? "es_ES"
        : locale === "fr"
          ? "fr_FR"
          : locale === "de"
            ? "de_DE"
            : "it_IT";
  const alternateOgLocales = ["it", "en", "es", "fr", "de"]
    .filter((item) => item !== locale)
    .map((item) =>
      item === "en"
        ? "en_US"
        : item === "es"
          ? "es_ES"
          : item === "fr"
            ? "fr_FR"
            : item === "de"
              ? "de_DE"
              : "it_IT",
    );

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
        fr: `${base}${getGuideUrl("fr", frenchSlug)}`,
        de: `${base}${getGuideUrl("de", germanSlug)}`,
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

export default async function MarettimoGuidePage({
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
    .filter((item): item is MarettimoGuide => Boolean(item));
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
        <SourcesSection locale={locale} ui={ui} />
      </main>
    </div>
  );
}

function Hero({
  guide,
  locale,
  ui,
}: {
  guide: MarettimoGuide;
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
        className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,25,52,0.94)_0%,rgba(7,25,52,0.68)_54%,rgba(7,25,52,0.24)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-[linear-gradient(180deg,transparent_0%,#071934_100%)]"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-[calc(82svh-10rem)] min-w-0 max-w-7xl flex-col justify-center">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm font-semibold">
          <Link
            href={localizedPath(locale, "/islands/marettimo")}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white/78 backdrop-blur transition hover:border-white/40 hover:bg-white/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            {ui.backLabel}
          </Link>
          <span className="rounded-md border border-white/16 bg-white/10 px-3 py-2 text-white/70 backdrop-blur">
            {guide.eyebrow}
          </span>
        </div>

        <div className="w-full min-w-0 max-w-[22rem] sm:max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-gold)]">
            {ui.heroLabel}
          </p>
          <h1 className="mt-5 max-w-full break-words font-heading text-3xl font-bold leading-[1.08] text-white [overflow-wrap:anywhere] min-[430px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
            {guide.title}
          </h1>
          <p className="mt-6 max-w-[22rem] break-words text-base leading-7 text-white/78 sm:max-w-3xl sm:text-lg">
            {guide.intro}
          </p>
        </div>

        <dl className="mt-10 grid w-full min-w-0 max-w-[22rem] gap-3 sm:max-w-5xl sm:grid-cols-2 lg:grid-cols-4">
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
  guide: MarettimoGuide;
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
          <AsideLink href="#risposta-rapida" icon={Info} label={ui.quickAnswer} />
          <AsideLink href="#lista" icon={MapPin} label={guide.itemListTitle} />
          {guide.sections.map((section) => (
            <AsideLink
              key={section.id}
              href={`#${section.id}`}
              icon={Compass}
              label={section.title}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function AsideLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#425f6f] transition hover:bg-[#f8f2e6] hover:text-[#092337]"
    >
      <Icon className="h-4 w-4 text-[#b58a27]" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

function QuickAnswer({
  guide,
  ui,
}: {
  guide: MarettimoGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section
      id="risposta-rapida"
      className="rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_14px_42px_rgba(10,38,55,0.07)] sm:p-8"
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
        <Info className="h-4 w-4" aria-hidden="true" />
        {ui.quickAnswer}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
        {ui.quickAnswerTitle}
      </h2>
      <p className="mt-5 text-base leading-7 text-[#425f6f] sm:text-lg">
        {guide.quickAnswer}
      </p>
    </section>
  );
}

function ItemList({
  guide,
  ui,
}: {
  guide: MarettimoGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section id="lista" className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
        {ui.itemEyebrow}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337]">
        {guide.itemListTitle}
      </h2>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {guide.itemList.map((item) => (
          <article
            key={item.name}
            className="rounded-lg border border-[#e3d1a8] bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[#b58a27]" aria-hidden="true" />
              <div>
                <h3 className="font-heading text-xl font-bold text-[#092337]">{item.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#425f6f]">{item.description}</p>
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
  guide: MarettimoGuide;
  section: MarettimoGuideSection;
  index: number;
  locale: GuideLocale;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section
      id={section.id}
      className="scroll-mt-28 rounded-lg border border-[#d9c79d] bg-white p-6 shadow-[0_14px_42px_rgba(10,38,55,0.07)] sm:p-8"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
        {section.eyebrow ?? ui.chapterLabel(index)}
      </p>
      <h2 className="mt-3 font-heading text-3xl font-bold leading-tight text-[#092337] sm:text-4xl">
        {section.title}
      </h2>
      <div className="mt-5 space-y-4 text-base leading-7 text-[#425f6f] sm:text-lg">
        {section.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {section.bullets ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {section.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2 rounded-md bg-[#f8f2e6] p-3 text-sm font-semibold text-[#294657]"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#b58a27]" aria-hidden="true" />
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}

      {section.steps ? <Steps steps={section.steps} /> : null}
      {section.cards ? <SectionCards cards={section.cards} /> : null}

      {section.note ? (
        <div className="mt-6 rounded-md border border-[#d9c79d] bg-[#fffaf0] p-4 text-sm leading-6 text-[#425f6f]">
          {section.note}
        </div>
      ) : null}

      {section.cta ? (
        <GuideCta
          type={section.cta}
          guideTitle={guide.shortTitle}
          locale={locale}
        />
      ) : null}
    </section>
  );
}

function Steps({ steps }: { steps: NonNullable<MarettimoGuideSection["steps"]> }) {
  return (
    <div className="mt-7 grid gap-4 md:grid-cols-3">
      {steps.map((step) => (
        <article key={step.label} className="rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b58a27]">
            {step.label}
          </p>
          <h3 className="mt-3 font-heading text-xl font-bold text-[#092337]">{step.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#425f6f]">{step.text}</p>
        </article>
      ))}
    </div>
  );
}

function SectionCards({ cards }: { cards: NonNullable<MarettimoGuideSection["cards"]> }) {
  return (
    <div className="mt-7 grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.title}
          className="overflow-hidden rounded-lg border border-[#d9c79d] bg-[#fbf7ee]"
        >
          {card.image ? (
            <div className="relative aspect-[4/3]">
              <Image src={card.image} alt={card.title} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" />
            </div>
          ) : null}
          <div className="p-5">
            {card.tag ? (
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b58a27]">
                {card.tag}
              </p>
            ) : null}
            <h3 className="mt-2 font-heading text-xl font-bold text-[#092337]">{card.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#425f6f]">{card.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

const ctaCopyByLocale = {
  it: {
    charter: {
      eyebrow: "Charter Egadi",
      title: "Vuoi includere Marettimo senza comprimere tempi e rientri?",
      description:
        "Il charter in trimarano è la formula più naturale per valutare Marettimo con margine: rotta meteo-dipendente, notti in rada quando possibile e programma aggiornato con la crew.",
      href: "/experiences/charter",
      label: "Scopri il charter Egadi",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      imageAlt: "Trimarano durante un charter alle Isole Egadi",
      icon: Sparkles,
      routeNotePrefix: "Collegamento dalla guida",
    },
    private: {
      eyebrow: "Rotta privata da valutare",
      title: "Marettimo può essere valutata su rotta privata, ma solo con il mare giusto",
      description:
        "Una barca privata permette più flessibilità, ma la rotta verso Marettimo viene sempre confermata in base a vento, mare, durata e sicurezza.",
      href: "/experiences/boat-exclusive-full-day",
      label: "Vedi il tour privato",
      image:
        "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Barca privata Cigala e Bertinetti alle Isole Egadi",
      icon: Waves,
      routeNotePrefix: "Collegamento dalla guida",
    },
  },
  en: {
    charter: {
      eyebrow: "Egadi charter",
      title: "Want to include Marettimo without rushing timings and return routes?",
      description:
        "A trimaran charter is the most natural way to approach Marettimo with margin: weather-dependent route, nights at anchor when possible and an itinerary updated with the crew.",
      href: "/experiences/charter",
      label: "View the Egadi charter",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      imageAlt: "Trimaran during an Egadi Islands charter",
      icon: Sparkles,
      routeNotePrefix: "Guide context",
    },
    private: {
      eyebrow: "Private route to evaluate",
      title: "Marettimo can be considered on a private route, but only with the right sea",
      description:
        "A private boat gives more flexibility, but the route to Marettimo is always confirmed according to wind, sea state, duration and safety.",
      href: "/experiences/boat-exclusive-full-day",
      label: "View the private tour",
      image:
        "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Private Cigala and Bertinetti boat in the Egadi Islands",
      icon: Waves,
      routeNotePrefix: "Guide context",
    },
  },
  es: {
    charter: {
      eyebrow: "Charter Islas Egadi",
      title: "¿Quieres incluir Marettimo sin comprimir tiempos y regresos?",
      description:
        "El charter en trimarán es la forma más natural de acercarse a Marettimo con margen: ruta según meteorología, noches al fondeo cuando es posible y programa actualizado con la tripulación.",
      href: "/experiences/charter",
      label: "Ver el charter Egadi",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      imageAlt: "Trimarán durante un charter por las Islas Egadi",
      icon: Sparkles,
      routeNotePrefix: "Contexto de la guía",
    },
    private: {
      eyebrow: "Ruta privada a valorar",
      title: "Marettimo puede valorarse en ruta privada, pero solo con el mar adecuado",
      description:
        "Un barco privado ofrece más flexibilidad, pero la ruta hacia Marettimo se confirma siempre según viento, estado del mar, duración y seguridad.",
      href: "/experiences/boat-exclusive-full-day",
      label: "Ver el tour privado",
      image:
        "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Barco privado Cigala y Bertinetti en las Islas Egadi",
      icon: Waves,
      routeNotePrefix: "Contexto de la guía",
    },
  },
  fr: {
    charter: {
      eyebrow: "Charter aux îles Égades",
      title: "Vous voulez inclure Marettimo sans comprimer les temps et le retour ?",
      description:
        "Le charter en trimaran est la formule la plus naturelle pour approcher Marettimo avec de la marge : itinéraire selon la météo, nuits au mouillage lorsque c'est possible et programme ajusté avec l'équipage.",
      href: "/experiences/charter",
      label: "Voir le charter Égades",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      imageAlt: "Trimaran pendant un charter aux îles Égades",
      icon: Sparkles,
      routeNotePrefix: "Contexte du guide",
    },
    private: {
      eyebrow: "Itinéraire privé à évaluer",
      title: "Marettimo peut se prévoir en privé, mais seulement avec la bonne mer",
      description:
        "Un bateau privé offre plus de flexibilité, mais la route vers Marettimo est toujours confirmée selon le vent, l'état de la mer, la durée et la sécurité.",
      href: "/experiences/boat-exclusive-full-day",
      label: "Voir le tour privé",
      image:
        "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Bateau privé Cigala et Bertinetti aux îles Égades",
      icon: Waves,
      routeNotePrefix: "Contexte du guide",
    },
  },
  de: {
    charter: {
      eyebrow: "Charter Ägadische Inseln",
      title: "Möchten Sie Marettimo einplanen, ohne Zeiten und Rückfahrt zu pressen?",
      description:
        "Ein Trimaran-Charter ist die natürlichste Formel, um Marettimo mit Reserve anzugehen: wetterabhängige Route, Nächte vor Anker wenn möglich und ein Programm, das mit der Crew angepasst wird.",
      href: "/experiences/charter",
      label: "Charter ansehen",
      image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
      imageAlt: "Trimaran während eines Charters auf den Ägadischen Inseln",
      icon: Sparkles,
      routeNotePrefix: "Guide-Kontext",
    },
    private: {
      eyebrow: "Private Route nach Prüfung",
      title: "Marettimo ist privat möglich, aber nur bei passendem Meer",
      description:
        "Ein privates Boot bietet mehr Flexibilität, doch die Route nach Marettimo wird immer nach Wind, Seegang, Dauer und Sicherheit bestätigt.",
      href: "/experiences/boat-exclusive-full-day",
      label: "Private Tour ansehen",
      image:
        "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
      imageAlt: "Privates Boot Cigala & Bertinetti auf den Ägadischen Inseln",
      icon: Waves,
      routeNotePrefix: "Guide-Kontext",
    },
  },
} satisfies Record<
  GuideLocale,
  Record<
    Exclude<MarettimoGuideCta, "compare">,
    {
      eyebrow: string;
      title: string;
      description: string;
      href: string;
      label: string;
      image: string;
      imageAlt: string;
      icon: LucideIcon;
      routeNotePrefix: string;
    }
  >
>;

function GuideCta({
  type,
  guideTitle,
  locale,
}: {
  type: MarettimoGuideCta;
  guideTitle: string;
  locale: GuideLocale;
}) {
  if (type === "compare") {
    return <CompareCta guideTitle={guideTitle} locale={locale} />;
  }

  const cta = ctaCopyByLocale[locale][type];
  const Icon = cta.icon;

  return (
    <aside className="mt-8 overflow-hidden rounded-lg border border-[#d9c79d] bg-[#071934] text-white">
      <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative min-h-[220px]">
          <Image src={cta.image} alt={cta.imageAlt} fill sizes="(min-width: 768px) 35vw, 90vw" className="object-cover" />
        </div>
        <div className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-gold)]">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {cta.eyebrow}
          </p>
          <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-white">
            {cta.title}
          </h3>
          <p className="mt-4 text-sm leading-6 text-white/74 sm:text-base">{cta.description}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/46">
            {cta.routeNotePrefix}: {guideTitle}
          </p>
          <Link
            href={localizedPath(locale, cta.href)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--color-gold)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#c8952b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function CompareCta({ guideTitle, locale }: { guideTitle: string; locale: GuideLocale }) {
  const experiences =
    locale === "de"
      ? [
          {
            title: "Charter Ägadische Inseln",
            description:
              "Drei bis sieben Tage auf dem Trimaran, mit Marettimo als Teil einer flexiblen Route.",
            href: "/experiences/charter",
            image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
            meta: "Mehrere Tage",
          },
          {
            title: "Private Bootstour Ägadische Inseln 8 Stunden",
            description:
              "Ein reserviertes Boot und eine flexible Route, immer nach Seebedingungen bestätigt.",
            href: "/experiences/boat-exclusive-full-day",
            image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
            meta: "Privat",
          },
        ]
      : locale === "es"
      ? [
          {
            title: "Charter Islas Egadi",
            description:
              "De 3 a 7 días en trimarán, con Marettimo evaluada dentro de una ruta flexible.",
            href: "/experiences/charter",
            image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
            meta: "Varios días",
          },
          {
            title: "Excursión privada Egadi 8 horas",
            description:
              "Barco reservado y ruta flexible, siempre confirmada según condiciones del mar.",
            href: "/experiences/boat-exclusive-full-day",
            image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
            meta: "Privado",
          },
        ]
      : locale === "fr"
      ? [
          {
            title: "Charter aux îles Égades",
            description:
              "Trois à sept jours en trimaran, avec Marettimo intégrée dans un itinéraire flexible.",
            href: "/experiences/charter",
            image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
            meta: "Plusieurs jours",
          },
          {
            title: "Excursion privée Égades 8 heures",
            description:
              "Un bateau réservé et une route flexible, toujours confirmée selon les conditions de mer.",
            href: "/experiences/boat-exclusive-full-day",
            image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
            meta: "Privé",
          },
        ]
      : locale === "en"
      ? [
          {
            title: "Egadi charter",
            description:
              "Three to seven days on the trimaran, with Marettimo evaluated within the route.",
            href: "/experiences/charter",
            image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
            meta: "Multi-day",
          },
          {
            title: "Private 8-hour Egadi tour",
            description:
              "A reserved boat and flexible route, always confirmed according to sea conditions.",
            href: "/experiences/boat-exclusive-full-day",
            image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
            meta: "Private",
          },
        ]
      : [
          {
            title: "Charter Egadi",
            description: "Da 3 a 7 giornate sul trimarano, con Marettimo da valutare nella rotta.",
            href: "/experiences/charter",
            image: "/images/experience-polaroids/charter-trimarano-egadi.webp",
            meta: "Più giorni",
          },
          {
            title: "Tour Egadi 8 ore privato",
            description: "Barca riservata e rotta flessibile, confermata in base al mare.",
            href: "/experiences/boat-exclusive-full-day",
            image: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
            meta: "Privato",
          },
        ];

  return (
    <aside className="mt-8 rounded-lg border border-[#d9c79d] bg-[#fbf7ee] p-6 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b58a27]">
        <ShipWheel className="h-4 w-4" aria-hidden="true" />
        {locale === "es"
          ? "Compara experiencias"
          : locale === "fr"
            ? "Comparer les expériences"
            : locale === "de"
              ? "Erlebnisse vergleichen"
            : locale === "en"
              ? "Compare experiences"
              : "Confronta le esperienze"}
      </p>
      <h3 className="mt-3 font-heading text-2xl font-bold leading-tight text-[#092337]">
        {locale === "es"
          ? "Marettimo necesita el formato adecuado"
          : locale === "fr"
            ? "Marettimo demande le bon format"
            : locale === "de"
              ? "Marettimo braucht das passende Format"
              : locale === "en"
                ? "Marettimo needs the right format"
                : "Marettimo va scelta con il formato giusto"}
      </h3>
      <p className="mt-3 text-sm leading-6 text-[#425f6f]">
        {locale === "es"
          ? `Para ${guideTitle.toLowerCase()}, la elección más sólida es tener margen: charter si quieres incluirla de verdad, tour privado solo si condiciones y tiempos lo permiten.`
          : locale === "fr"
            ? `Pour ${guideTitle.toLowerCase()}, le choix le plus solide est de garder de la marge : charter si vous voulez vraiment l'inclure, tour privé seulement si les conditions et le timing le permettent.`
            : locale === "de"
              ? `Für ${guideTitle.toLowerCase()} ist Reserve die stärkste Wahl: Charter, wenn Sie Marettimo wirklich einplanen möchten, private Tour nur, wenn Bedingungen und Timing passen.`
              : locale === "en"
                ? `For ${guideTitle.toLowerCase()}, the strongest choice is margin: charter if you really want to include it, private tour only if conditions and timing allow.`
                : `Per ${guideTitle.toLowerCase()}, la soluzione più solida è avere margine: charter se vuoi includerla davvero, tour privato solo se condizioni e tempi lo permettono.`}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {experiences.map((experience) => (
          <Link
            key={experience.href}
            href={localizedPath(locale, experience.href)}
            className="group overflow-hidden rounded-lg border border-[#d9c79d] bg-white transition hover:-translate-y-1 hover:border-[#b58a27] hover:shadow-[0_14px_42px_rgba(10,38,55,0.1)]"
          >
            <div className="relative aspect-[16/10]">
              <Image src={experience.image} alt={experience.title} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" />
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b58a27]">
                {experience.meta}
              </p>
              <h4 className="mt-2 font-heading text-xl font-bold text-[#092337]">
                {experience.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[#425f6f]">{experience.description}</p>
              <span className="mt-4 inline-flex items-center text-sm font-bold text-[#092337]">
                {locale === "es"
                  ? "Ver experiencia"
                  : locale === "fr"
                    ? "Voir l'expérience"
                    : locale === "de"
                      ? "Erlebnis ansehen"
                    : locale === "en"
                      ? "View experience"
                      : "Guarda esperienza"}
                <ArrowRight
                  className="ml-2 h-4 w-4 transition group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

function FaqSection({
  guide,
  ui,
}: {
  guide: MarettimoGuide;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="max-w-3xl">
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
  relatedGuides: MarettimoGuide[];
  ui: (typeof guideUi)[GuideLocale];
}) {
  const fallbackGuides = marettimoGuides
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
                Marettimo
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

function SourcesSection({
  locale,
  ui,
}: {
  locale: GuideLocale;
  ui: (typeof guideUi)[GuideLocale];
}) {
  return (
    <section className="border-t border-[#d9c79d] bg-[#071934] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
            {ui.sourcesEyebrow}
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold leading-tight">
            {ui.sourcesTitle}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/70 sm:text-base">
            {ui.sourcesText}
          </p>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sourceLinksByLocale[locale].map((source) => (
            <Link
              key={source.href}
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-4 rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white/76 transition hover:border-white/24 hover:bg-white/14 hover:text-white"
            >
              <span>{source.label}</span>
              <ExternalLink className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
