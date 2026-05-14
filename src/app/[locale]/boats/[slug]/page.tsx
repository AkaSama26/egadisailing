import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Check,
  DoorOpen,
  Gauge,
  HelpCircle,
  Map,
  Sofa,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { ExperienceBoatGallery } from "@/components/experience-boat-gallery";
import { ScrollSection } from "@/components/scroll-section";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";
import {
  getBoatContent,
  getBoatsPageContent,
  getPublicBoatSlugs,
  isPublicBoatId,
  resolveBoatIdFromSlug,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";

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
    specs: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
    usageEyebrow: isEs ? "Uso ideal" : isFr ? "Usage idéal" : isDe ? "Ideale Nutzung" : isEn ? "Best use" : "Utilizzo",
    usageTitle: isEs ? "Cuándo elegir este barco" : isFr ? "Quand choisir ce bateau" : isDe ? "Wann Sie dieses Boot wählen sollten" : isEn ? "When to choose this boat" : "Quando scegliere questa barca",
    routesEyebrow: isEs ? "Rutas" : isFr ? "Routes" : isDe ? "Routen" : isEn ? "Routes" : "Rotte",
    routesTitle: isEs ? "Cómo se mueve por las Egadi" : isFr ? "Comment il navigue aux Égades" : isDe ? "Wie es zwischen den Ägadischen Inseln navigiert" : isEn ? "How it moves through the Egadi" : "Come si muove tra le Egadi",
    gallery: isEs ? "Galería del barco" : isFr ? "Galerie du bateau" : isDe ? "Bootsgalerie" : isEn ? "Boat gallery" : "Gallery della barca",
    faqEyebrow: isEn ? "FAQ" : "FAQ",
    faqTitle: isEs ? "Preguntas sobre este barco" : isFr ? "Questions sur ce bateau" : isDe ? "Fragen zu diesem Boot" : isEn ? "Questions about this boat" : "Domande su questa barca",
    routeIntro: isEs
      ? "La ruta no es una lista rígida: se adapta a la duración de la experiencia, al estado del mar y a las calas más cómodas del día."
      : isFr
      ? "La route n'est jamais une liste rigide : elle s'adapte à la durée de l'expérience, à l'état de la mer et aux criques les plus confortables du jour."
      : isDe
      ? "Die Route ist keine starre Liste: Sie richtet sich nach der Dauer des Erlebnisses, den Seebedingungen und den angenehmsten Buchten des Tages."
      : isEn
      ? "The route is never treated as a rigid checklist: it is shaped around the experience length, sea conditions and the most comfortable coves of the day."
      : "La rotta non viene trattata come una lista rigida: viene costruita in base alla durata dell'esperienza, al mare e alle cale più comode della giornata.",
    useIntro: isEs
      ? "Una forma rápida de entender si este es el barco adecuado antes de elegir la experiencia."
      : isFr
      ? "Une façon rapide de comprendre si ce bateau est le bon choix avant de sélectionner l'expérience."
      : isDe
      ? "Eine schnelle Orientierung, ob dieses Boot zu Ihnen passt, bevor Sie das Erlebnis auswählen."
      : isEn
      ? "A quick way to understand whether this boat is the right fit before choosing the experience."
      : "Un modo rapido per capire se questa è la barca giusta prima di scegliere l'esperienza.",
    faqIntro: isEs
      ? "Respuestas claras para quienes eligen el barco sin necesitar conocimientos técnicos de náutica."
      : isFr
      ? "Des réponses claires pour choisir le bateau sans connaissances nautiques techniques."
      : isDe
      ? "Klare Antworten für Gäste, die ein Boot wählen möchten, ohne nautische Fachdetails kennen zu müssen."
      : isEn
      ? "Clear answers for guests who are choosing the boat without needing technical nautical knowledge."
      : "Risposte chiare per chi sta scegliendo la barca senza dover conoscere dettagli nautici tecnici.",
  };
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function BoatSpecs({ boat }: { boat: ResolvedBoatContent }) {
  return (
    <ul className="mt-5 grid gap-4 border-y border-slate-200 py-6 sm:grid-cols-2">
      {boat.specs.map((spec) => {
        const Icon = SPEC_ICONS[spec.icon];
        return (
          <li key={spec.label} className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f2e8] text-[var(--color-gold)]">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-2xl font-bold leading-none text-[var(--color-ocean)]">
                {spec.value}
              </span>
              <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {spec.label}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getPublicBoatSlugs().map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const boatId = resolveBoatIdFromSlug(slug);
  const boat = isPublicBoatId(boatId) ? getBoatContent(boatId, locale) : null;
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
  const boat = isPublicBoatId(boatId) ? getBoatContent(boatId, locale) : null;
  if (!boat) notFound();
  if (slug !== boat.slug) permanentRedirect(localizedPath(locale, `/boats/${boat.slug}`));

  const t = copy(locale);
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = localizedAbsoluteUrl(base, locale, `/boats/${boat.slug}`);
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadisailing", item: localizedAbsoluteUrl(base, locale, "/") },
          { "@type": "ListItem", position: 2, name: getBoatsPageContent(locale).seoTitle, item: localizedAbsoluteUrl(base, locale, "/boats") },
          { "@type": "ListItem", position: 3, name: boat.title, item: pageUrl },
        ],
      },
      {
        "@type": ["Product", "Vehicle"],
        "@id": `${pageUrl}#boat`,
        inLanguage: locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : locale === "en" ? "en-US" : "it-IT",
        name: boat.seoTitle,
        description: `${boat.seoDescription} ${boat.detail.paragraphs.join(" ")}`,
        image: boat.gallery.map((item) => absoluteUrl(item.src)),
        brand: { "@type": "Brand", name: "Egadisailing" },
        provider: {
          "@type": "Organization",
          name: PUBLIC_COMPANY_LEGAL.name,
          alternateName: "Egadi Sailing",
          url: base,
          email: PUBLIC_CONTACT_EMAIL,
          taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Via Calipso 42",
            postalCode: "91100",
            addressLocality: "Trapani",
            addressRegion: "Sicilia",
            addressCountry: "IT",
          },
        },
        ...(boat.externalUrl ? { sameAs: boat.externalUrl } : {}),
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
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
    ],
  };
  const heroImage = boat.imageSrc ?? boat.gallery[0]?.src ?? "/images/trimarano.webp";
  const heroVideoType = boat.heroVideoSrc?.endsWith(".webm") ? "video/webm" : "video/mp4";

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f2e8] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />

      <section className="relative isolate overflow-hidden bg-[#061a2d] px-4 pb-20 pt-28 text-white md:px-8 lg:px-12">
        {boat.heroVideoSrc ? (
          <video
            aria-hidden="true"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={heroImage}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          >
            <source src={boat.heroVideoSrc} type={heroVideoType} />
          </video>
        ) : (
          <Image
            src={heroImage}
            alt={boat.imageAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,26,45,0.96),rgba(6,26,45,0.78)_48%,rgba(6,26,45,0.38))]" />
        <div className="relative z-10 mx-auto max-w-7xl">
          <ScrollSection animation="fade-up">
            <Link
              href={localizedStaticPath(locale, "/boats")}
              className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.allBoats}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
              {boat.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold leading-tight sm:text-5xl md:text-7xl">
              {boat.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
              {boat.description}
            </p>
          </ScrollSection>
        </div>
      </section>

      <main className="px-4 py-14 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-14">
          <ScrollSection animation="fade-up">
            <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8 lg:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                {boat.detail.eyebrow}
              </p>
              <h2 className="mt-3 max-w-4xl font-heading text-3xl font-bold leading-tight text-[var(--color-ocean)] md:text-4xl">
                {boat.detail.title}
              </h2>
              <div className="mt-6 grid gap-5 text-base leading-8 text-slate-700 lg:grid-cols-3">
                {boat.detail.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          </ScrollSection>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(22rem,0.92fr)] lg:items-start">
            <ScrollSection animation="fade-up" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <ExperienceBoatGallery
                title={t.gallery}
                eyebrow={boat.eyebrow}
                description={boat.description}
                items={boat.gallery}
              />
            </ScrollSection>

            <div className="space-y-6">
              <ScrollSection animation="fade-up">
                <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                    {t.specs}
                  </p>
                  <BoatSpecs boat={boat} />
                </section>
              </ScrollSection>

              <ScrollSection animation="fade-up" delay={0.04}>
                <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                    {t.usageEyebrow}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)]">
                    {t.usageTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t.useIntro}</p>
                  <ul className="mt-6 divide-y divide-slate-200">
                    {boat.idealFor.map((item) => (
                      <li key={item} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-turquoise)]" />
                        <p className="text-sm leading-6 text-slate-700">{item}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </ScrollSection>

              <ScrollSection animation="fade-up" delay={0.08}>
                <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                    {t.routesEyebrow}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)]">
                    {t.routesTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{t.routeIntro}</p>
                  <ol className="mt-6 divide-y divide-slate-200">
                    {boat.routes.map((item, index) => (
                      <li key={item} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f7f2e8] text-xs font-bold text-[var(--color-gold)]">
                          {index + 1}
                        </span>
                        <div className="flex gap-3">
                          <Map className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold)]" />
                          <p className="text-sm leading-6 text-slate-700">{item}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </ScrollSection>
            </div>
          </div>

          <ScrollSection animation="fade-up">
            <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                {t.faqEyebrow}
              </p>
              <div className="mt-3 max-w-3xl">
                <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                  {t.faqTitle}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t.faqIntro}</p>
              </div>
              <div className="mt-8 grid gap-x-8 gap-y-0 lg:grid-cols-2">
                {boat.faqs.map((item) => (
                  <article key={item.question} className="flex gap-4 border-t border-slate-200 py-5">
                    <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-[var(--color-gold)]" />
                    <div>
                      <h3 className="font-semibold text-[var(--color-ocean)]">{item.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </ScrollSection>
        </div>
      </main>
    </div>
  );
}
