import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
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
import { ScrollSection } from "@/components/scroll-section";
import { SvgPhotoFrame } from "@/components/svg-photo-frame";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import {
  getBoatContent,
  getBoatsPageContent,
  getPublicBoatSlugs,
  getPublicBoatServiceTitle,
  resolveBoatIdFromSlug,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";
import {
  getExperienceContent,
  getExperiencePublicSlug,
} from "@/data/catalog/experiences";

const SPEC_ICONS: Record<BoatSpecIcon, LucideIcon> = {
  cabins: DoorOpen,
  beds: BedDouble,
  kitchen: UtensilsCrossed,
  bath: Bath,
  relax: Sofa,
  users: Users,
  engine: Gauge,
};

interface ActiveService {
  id: string;
}

function copy(locale: string) {
  const isEn = locale === "en";
  return {
    allBoats: isEn ? "All boats" : "Tutte le barche",
    specs: isEn ? "Technical details" : "Dettagli tecnici",
    idealFor: isEn ? "Ideal for" : "Ideale per",
    routes: isEn ? "Routes and use" : "Rotte e utilizzo",
    experiences: isEn ? "Experiences with this boat" : "Esperienze con questa barca",
    gallery: isEn ? "Gallery" : "Gallery",
    faq: isEn ? "Questions about this boat" : "Domande su questa barca",
    book: isEn ? "View experience" : "Vedi esperienza",
    fromTrapani: isEn ? "Departure from Trapani" : "Partenza da Trapani",
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {boat.specs.map((spec) => {
        const Icon = SPEC_ICONS[spec.icon];
        return (
          <div key={spec.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Icon className="h-5 w-5 text-[var(--color-gold)]" />
            <p className="mt-3 text-2xl font-bold text-[var(--color-ocean)]">{spec.value}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {spec.label}
            </p>
          </div>
        );
      })}
    </div>
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
  const boat = getBoatContent(resolveBoatIdFromSlug(slug), locale);
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
  const boat = getBoatContent(resolveBoatIdFromSlug(slug), locale);
  if (!boat) notFound();
  if (slug !== boat.slug) redirect(`/${locale}/boats/${boat.slug}`);

  const t = copy(locale);
  const services: ActiveService[] = boat.serviceIds.map((id) => ({ id }));
  const base = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${base}/${locale}/boats/${boat.slug}`;
  const json = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadisailing", item: `${base}/${locale}` },
          { "@type": "ListItem", position: 2, name: getBoatsPageContent(locale).seoTitle, item: `${base}/${locale}/boats` },
          { "@type": "ListItem", position: 3, name: boat.title, item: pageUrl },
        ],
      },
      {
        "@type": ["Product", "Vehicle"],
        "@id": `${pageUrl}#boat`,
        name: boat.seoTitle,
        description: boat.seoDescription,
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

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f2e8] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />

      <section className="relative isolate overflow-hidden bg-[#061a2d] px-4 pb-20 pt-28 text-white md:px-8 lg:px-12">
        <Image
          src={heroImage}
          alt={boat.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,26,45,0.96),rgba(6,26,45,0.78)_48%,rgba(6,26,45,0.38))]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-end">
          <ScrollSection animation="fade-up">
            <Link
              href={`/${locale}/boats`}
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

          <ScrollSection animation="fade-left" delay={0.1}>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                {t.specs}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {boat.specs.map((spec) => {
                  const Icon = SPEC_ICONS[spec.icon];
                  return (
                    <div key={spec.label} className="rounded-lg bg-white/10 p-3">
                      <Icon className="h-4 w-4 text-[var(--color-gold)]" />
                      <p className="mt-2 text-xl font-bold">{spec.value}</p>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                        {spec.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollSection>
        </div>
      </section>

      <main className="px-4 py-14 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-14">
            <ScrollSection animation="fade-up">
              <section>
                <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                  {t.idealFor}
                </h2>
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {boat.idealFor.map((item) => (
                    <div key={item} className="rounded-lg bg-white p-5 shadow-sm">
                      <Check className="h-5 w-5 text-[var(--color-turquoise)]" />
                      <p className="mt-4 text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </ScrollSection>

            <ScrollSection animation="fade-up">
              <section>
                <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                  {t.routes}
                </h2>
                <div className="mt-6 grid gap-3">
                  {boat.routes.map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg bg-white p-4 shadow-sm">
                      <Map className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold)]" />
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </ScrollSection>

            <ScrollSection animation="fade-up">
              <section>
                <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                  {t.gallery}
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {boat.gallery.map((item) => (
                    <figure key={item.src} className="rounded-lg bg-white p-2 shadow-sm">
                      <SvgPhotoFrame frameClassName="p-2 shadow-none" imageClassName="aspect-[4/3]">
                        <Image
                          src={item.src}
                          alt={item.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                      </SvgPhotoFrame>
                      <figcaption className="px-4 py-3 text-sm font-semibold text-slate-600">
                        {item.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            </ScrollSection>

            <ScrollSection animation="fade-up">
              <section>
                <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                  {t.faq}
                </h2>
                <div className="mt-6 grid gap-3">
                  {boat.faqs.map((item) => (
                    <div key={item.question} className="rounded-lg bg-white p-5 shadow-sm">
                      <div className="flex gap-3">
                        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold)]" />
                        <div>
                          <h3 className="font-semibold text-[var(--color-ocean)]">{item.question}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </ScrollSection>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-white bg-white p-5 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                {t.experiences}
              </p>
              <BoatSpecs boat={boat} />
              <div className="mt-5 grid gap-3">
                {services.map((service) => {
                  const experience = getExperienceContent(service.id, locale);
                  return (
                    <Link
                      key={service.id}
                      href={`/${locale}/experiences/${getExperiencePublicSlug(service.id)}`}
                      className="group rounded-lg border border-slate-200 p-4 transition hover:border-[var(--color-gold)] hover:bg-[#f7f2e8]/65"
                    >
                      <span className="text-sm font-semibold text-[var(--color-ocean)]">
                        {getPublicBoatServiceTitle(service.id, locale)}
                      </span>
                      {experience?.subtitle && (
                        <span className="mt-2 block text-xs leading-5 text-slate-500">
                          {experience.subtitle}
                        </span>
                      )}
                      <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                        {t.book}
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
