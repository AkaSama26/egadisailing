import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  DoorOpen,
  Gauge,
  Ship,
  Sofa,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import { SvgPhotoFrame } from "@/components/svg-photo-frame";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getBoatContent,
  getBoatsPageContent,
  getPublicBoatIds,
  getPublicBoatServiceTitle,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";
import { getExperiencePublicSlug } from "@/data/catalog/experiences";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

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
  boatId: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getBoatsPageContent(locale);
  return buildPageMetadata({
    title: copy.seoTitle,
    description: copy.seoDescription,
    path: "/boats",
    locale,
    image: "/videos/hero-poster.webp",
  });
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function servicesForBoat(boat: ResolvedBoatContent, services: ActiveService[]): ActiveService[] {
  const activeIds = new Set(services.map((service) => service.id));
  return boat.serviceIds
    .filter((serviceId) => activeIds.has(serviceId))
    .map((serviceId) => ({ id: serviceId, boatId: boat.id }));
}

function BoatSpecs({ boat }: { boat: ResolvedBoatContent }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {boat.specs.map((spec) => {
        const Icon = SPEC_ICONS[spec.icon];
        return (
          <div key={`${boat.id}-${spec.label}`} className="rounded-lg bg-white/80 p-4 shadow-sm">
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

function BoatHubSection({
  boat,
  services,
  locale,
  detailLabel,
  experiencesLabel,
  reverse,
}: {
  boat: ResolvedBoatContent;
  services: ActiveService[];
  locale: string;
  detailLabel: string;
  experiencesLabel: string;
  reverse: boolean;
}) {
  const image = boat.imageSrc ?? boat.gallery[0]?.src ?? "/images/trimarano.webp";
  const discoverClassName =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-ocean)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-ocean)]/90";

  return (
    <section className="px-4 py-14 sm:py-18 md:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <ScrollSection animation={reverse ? "fade-right" : "fade-left"} className={reverse ? "lg:order-2" : undefined}>
          <SvgPhotoFrame className="w-full" frameClassName="bg-white/95">
            <Image
              src={image}
              alt={boat.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </SvgPhotoFrame>
        </ScrollSection>

        <ScrollSection animation={reverse ? "fade-left" : "fade-right"} className={reverse ? "lg:order-1" : undefined}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              {boat.eyebrow}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-[var(--color-ocean)] sm:text-4xl md:text-5xl">
              {boat.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {boat.description}
            </p>

            <div className="mt-6">
              <BoatSpecs boat={boat} />
            </div>

            <div className="mt-6 grid gap-2">
              {boat.idealFor.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-turquoise)]/15">
                    <Check className="h-3.5 w-3.5 text-[var(--color-turquoise)]" />
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {boat.externalUrl && (
                <a
                  href={boat.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={discoverClassName}
                >
                  {detailLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              )}
              <Link
                href={localizedStaticPath(locale, "/experiences")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-[var(--color-ocean)] transition hover:bg-white"
              >
                {experiencesLabel}
              </Link>
            </div>

            {services.length > 0 && (
              <div className="mt-8 grid gap-2">
                {services.slice(0, 4).map((service) => (
                  <Link
                    key={service.id}
                    href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(service.id, locale)}`)}
                    className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ocean)] shadow-sm transition hover:shadow-md"
                  >
                    {getPublicBoatServiceTitle(service.id, locale)}
                    <ArrowRight className="h-4 w-4 text-[var(--color-gold)]" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollSection>
      </div>
    </section>
  );
}

export default async function BoatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const copy = getBoatsPageContent(locale);
  const boats = getPublicBoatIds()
    .map((boatId) => getBoatContent(boatId, locale))
    .filter((boat): boat is ResolvedBoatContent => Boolean(boat));
  const services = await db.service.findMany({
    where: {
      active: true,
      id: { in: boats.flatMap((boat) => boat.serviceIds) },
    },
    select: { id: true, boatId: true },
  });
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const json = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.seoTitle,
    description: copy.seoDescription,
    itemListElement: boats.map((boat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: localizedAbsoluteUrl(siteBase, locale, `/boats/${boat.slug}`),
      name: boat.seoTitle,
      description: boat.seoDescription,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f2e8] text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />

      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#061a2d] px-4 py-24 text-white sm:py-28 md:px-8 lg:px-12">
        <Image
          src="/videos/hero-poster.webp"
          alt={
            locale === "es"
              ? "Barcos Egadisailing en las Islas Egadi"
              : locale === "fr"
                ? "Bateaux Egadisailing aux îles Égades"
                : locale === "en"
                  ? "Egadisailing boats in the Egadi Islands"
                  : "Barche Egadisailing alle Isole Egadi"
          }
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,26,45,0.96),rgba(6,26,45,0.8)_46%,rgba(6,26,45,0.36))]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#061a2d]/70 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <ScrollSection animation="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)] sm:text-sm">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-5xl font-heading text-[2.65rem] font-bold leading-[0.98] text-white sm:text-6xl md:text-7xl lg:text-8xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:mt-6 sm:text-lg sm:leading-8">
              {copy.subtitle}
            </p>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
              {boats.map((boat) => (
                <Link
                  key={boat.id}
                  href={localizedPath(locale, `/boats/${boat.slug}`)}
                  className={`group flex min-w-0 items-center justify-between gap-4 rounded-lg p-4 ${liquidGlassButton}`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
                      {boat.eyebrow}
                    </span>
                    <span className="mt-1 block font-heading text-xl font-bold text-white">{boat.shortTitle}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-white/60 transition group-hover:text-white" />
                </Link>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>

      <main>
        <section className="px-4 py-14 md:px-8 lg:px-12">
          <ScrollSection animation="fade-up" className="mx-auto max-w-4xl text-center">
            <Ship className="mx-auto h-8 w-8 text-[var(--color-gold)]" />
            <h2 className="mt-4 font-heading text-3xl font-bold text-[var(--color-ocean)] sm:text-4xl">
              {copy.comparisonTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {copy.comparisonText}
            </p>
          </ScrollSection>
        </section>

        {boats.map((boat, index) => (
          <BoatHubSection
            key={boat.id}
            boat={boat}
            services={servicesForBoat(boat, services)}
            locale={locale}
            detailLabel={copy.detailCtaLabel}
            experiencesLabel={copy.experiencesCtaLabel}
            reverse={index % 2 === 1}
          />
        ))}

        <section className="px-4 py-16 md:px-8 lg:px-12">
          <ScrollSection animation="fade-up">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-lg bg-[var(--color-ocean)] p-6 text-white shadow-xl md:p-10">
              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <h2 className="font-heading text-3xl font-bold">{copy.chooserTitle}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                    {copy.chooserText}
                  </p>
                </div>
                <Link
                  href={localizedStaticPath(locale, "/experiences")}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[var(--color-ocean)] transition hover:bg-white/90"
                >
                  {copy.experiencesCtaLabel}
                </Link>
              </div>
            </div>
          </ScrollSection>
        </section>
      </main>
    </div>
  );
}
