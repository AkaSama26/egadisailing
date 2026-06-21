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
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getBoatContent,
  getBoatsPageContent,
  getPublicBoatIds,
  getPublicBoatServiceTitle,
  hasPublicBoatDetailPage,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";
import { getExperiencePublicSlug } from "@/data/catalog/experiences";
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
    image: "/images/boats/neel-47/neel-47-hero.webp",
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

function hasBoatDetail(boat: ResolvedBoatContent): boolean {
  return hasPublicBoatDetailPage(boat.id);
}

function BoatSpecs({ boat }: { boat: ResolvedBoatContent }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {boat.specs.map((spec) => {
        const Icon = SPEC_ICONS[spec.icon];
        return (
          <div
            key={`${boat.id}-${spec.label}`}
            className="rounded-lg border border-white/10 bg-white/10 p-4 text-white shadow-[0_18px_42px_rgba(3,10,24,0.14)] backdrop-blur"
          >
            <Icon className="h-5 w-5 text-[var(--color-gold)]" />
            <p className="mt-3 text-2xl font-bold">{spec.value}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
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
  const image = boat.imageSrc ?? boat.gallery[0]?.src ?? "/images/home/traimarano-levanzo.webp";
  const discoverClassName =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-gold)] px-5 py-3 text-sm font-bold text-[#071934] transition hover:bg-[#ffd44f]";

  return (
    <section id={boat.slug} className="scroll-mt-24 px-4 py-14 sm:py-18 md:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <ScrollSection animation={reverse ? "fade-right" : "fade-left"} className={reverse ? "lg:order-2" : undefined}>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
            <Image
              src={image}
              alt={boat.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </ScrollSection>

        <ScrollSection animation={reverse ? "fade-left" : "fade-right"} className={reverse ? "lg:order-1" : undefined}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
              {boat.eyebrow}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              {boat.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/76 sm:text-lg sm:leading-8">
              {boat.description}
            </p>

            <div className="mt-6">
              <BoatSpecs boat={boat} />
            </div>

            <div className="mt-6 grid gap-2">
              {boat.idealFor.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-6 text-white/78">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                  </span>
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {hasBoatDetail(boat) && (
                <Link href={localizedPath(locale, `/boats/${boat.slug}`)} className={discoverClassName}>
                  {detailLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href={localizedStaticPath(locale, "/experiences")}
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                {experiencesLabel}
              </Link>
            </div>

            {services.length > 0 && (
              <div className="mt-8 border-y border-white/12 py-3">
                {services.slice(0, 4).map((service) => (
                  <Link
                    key={service.id}
                    href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(service.id, locale)}`)}
                    className="flex items-center justify-between gap-4 py-3 text-sm font-semibold text-white transition hover:text-[var(--color-gold)]"
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
    inLanguage: locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : locale === "en" ? "en-US" : "it-IT",
    name: copy.seoTitle,
    description: copy.seoDescription,
    itemListElement: boats.map((boat, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: hasBoatDetail(boat)
        ? localizedAbsoluteUrl(siteBase, locale, `/boats/${boat.slug}`)
        : `${localizedAbsoluteUrl(siteBase, locale, "/boats")}#${boat.slug}`,
      name: boat.seoTitle,
      description: boat.seoDescription,
    })),
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#071934_0%,#0a2a4a_34%,#0c3d5e_54%,#0a2a4a_78%,#071934_100%)] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />

      <section className="relative isolate px-4 pb-14 pt-32 md:px-8 lg:px-12">
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <ScrollSection animation="fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)] sm:text-sm">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 max-w-5xl font-heading text-[2.8rem] font-bold leading-[0.98] text-white sm:text-6xl md:text-7xl lg:text-8xl">
              {copy.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
              {copy.subtitle}
            </p>
            <div className="mt-9 grid max-w-4xl gap-3 sm:grid-cols-2">
              {boats.map((boat) => (
                <Link
                  key={boat.id}
                  href={hasBoatDetail(boat) ? localizedPath(locale, `/boats/${boat.slug}`) : `#${boat.slug}`}
                  className="group flex min-w-0 items-center justify-between gap-4 rounded-lg border border-white/14 bg-white/10 p-4 shadow-[0_20px_55px_rgba(3,10,24,0.18)] backdrop-blur transition hover:border-white/25 hover:bg-white/[0.14]"
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
        <section className="px-4 py-10 md:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl border-y border-white/12 py-10">
            <ScrollSection animation="fade-up" className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[var(--color-gold)]">
                <Ship className="h-6 w-6" />
              </span>
              <div>
                <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
                  {copy.comparisonTitle}
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-white/72">
                  {copy.comparisonText}
                </p>
              </div>
            </ScrollSection>
          </div>
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
            <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-white/15 bg-white/10 p-6 text-white shadow-[0_30px_80px_rgba(3,10,24,0.2)] backdrop-blur md:p-10">
              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <h2 className="font-heading text-3xl font-bold">{copy.chooserTitle}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
                    {copy.chooserText}
                  </p>
                </div>
                <Link
                  href={localizedStaticPath(locale, "/experiences")}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--color-gold)] px-5 py-3 text-sm font-bold text-[#071934] transition hover:bg-[#ffd44f]"
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
