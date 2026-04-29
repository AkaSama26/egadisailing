import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bath,
  BedDouble,
  DoorOpen,
  Gauge,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { ScrollSection } from "@/components/scroll-section";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getBoatContent,
  getBoatsPageContent,
  getPublicBoatIds,
  getPublicBoatServiceTitle,
  type BoatSpecIcon,
  type ResolvedBoatContent,
} from "@/data/catalog/boats";

const SPEC_ICONS: Record<BoatSpecIcon, LucideIcon> = {
  cabins: DoorOpen,
  beds: BedDouble,
  kitchen: UtensilsCrossed,
  bath: Bath,
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
  });
}

function BoatVisual({
  boat,
  fallbackImageNote,
}: {
  boat: ResolvedBoatContent;
  fallbackImageNote: string;
}) {
  if (boat.imageSrc) {
    return (
      <Image
        src={boat.imageSrc}
        alt={boat.imageAlt}
        width={2752}
        height={1536}
        className="w-full h-auto drop-shadow-[0_20px_60px_rgba(14,165,233,0.2)]"
      />
    );
  }

  return (
    <div className="relative flex items-center justify-center h-[400px]">
      <div
        className="absolute w-[70%] aspect-square rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 60%)",
          filter: "blur(30px)",
        }}
      />
      <svg
        viewBox="0 0 400 200"
        fill="none"
        className="w-[80%] h-auto relative z-10 drop-shadow-[0_10px_40px_rgba(14,165,233,0.1)]"
        aria-label={boat.imageAlt}
        role="img"
      >
        <path
          d="M40 140 Q40 170 80 175 L320 175 Q360 170 360 140 L350 120 Q340 110 50 110 Z"
          fill="white"
          opacity="0.08"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.2"
        />
        <rect
          x="120"
          y="85"
          width="160"
          height="30"
          rx="8"
          fill="white"
          opacity="0.06"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.15"
        />
        <path
          d="M130 85 L150 65 L260 65 L270 85"
          fill="white"
          opacity="0.04"
          stroke="white"
          strokeWidth="1"
          strokeOpacity="0.12"
        />
        <line x1="80" y1="108" x2="320" y2="108" stroke="white" strokeWidth="0.8" strokeOpacity="0.15" />
        <path d="M360 145 Q380 145 400 150" stroke="white" strokeWidth="0.8" strokeOpacity="0.1" />
        <path d="M360 155 Q385 155 400 162" stroke="white" strokeWidth="0.6" strokeOpacity="0.08" />
      </svg>
      <p className="absolute bottom-4 right-4 text-white/20 text-xs tracking-wider uppercase">
        {fallbackImageNote}
      </p>
    </div>
  );
}

function BoatSection({
  boat,
  services,
  locale,
  availableExperiencesLabel,
  fallbackImageNote,
  reverse,
}: {
  boat: ResolvedBoatContent;
  services: ActiveService[];
  locale: string;
  availableExperiencesLabel: string;
  fallbackImageNote: string;
  reverse: boolean;
}) {
  return (
    <section className="py-32 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ScrollSection
            animation={reverse ? "fade-right" : "fade-left"}
            className={reverse ? "lg:order-2" : undefined}
          >
            <div className="relative flex justify-center">
              <BoatVisual boat={boat} fallbackImageNote={fallbackImageNote} />
              <div
                className="absolute inset-0 -z-10 scale-110"
                style={{
                  background: "radial-gradient(ellipse, rgba(14,165,233,0.12) 0%, transparent 60%)",
                  filter: "blur(40px)",
                }}
              />
            </div>
          </ScrollSection>

          <ScrollSection
            animation={reverse ? "fade-left" : "fade-right"}
            className={reverse ? "lg:order-1" : undefined}
          >
            <div className="space-y-6">
              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white">
                {boat.title}
              </h2>
              <p className="text-white/70 text-lg leading-relaxed">{boat.description}</p>

              <div className="flex flex-wrap gap-8 py-4">
                {boat.specs.map((spec) => {
                  const Icon = SPEC_ICONS[spec.icon];
                  return (
                    <div key={`${boat.id}-${spec.label}`} className="text-center">
                      <Icon className="h-7 w-7 text-[var(--color-gold)] mx-auto mb-2" />
                      <p className="text-white font-bold text-xl">{spec.value}</p>
                      <p className="text-white/40 text-xs uppercase tracking-wider">
                        {spec.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {services.length > 0 && (
                <div>
                  <h3 className="text-white/40 text-xs font-semibold uppercase tracking-[3px] mb-4">
                    {availableExperiencesLabel}
                  </h3>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <Link
                        key={service.id}
                        href={`/${locale}/experiences/${service.id}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors group"
                      >
                        <span className="text-white font-medium">
                          {getPublicBoatServiceTitle(service.id, locale)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-[var(--color-gold)] transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollSection>
        </div>
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
  const publicBoatIds = getPublicBoatIds();
  const boats = publicBoatIds
    .map((boatId) => getBoatContent(boatId, locale))
    .filter((boat): boat is ResolvedBoatContent => Boolean(boat));

  const activeServices = await db.service.findMany({
    where: { active: true, boatId: { in: publicBoatIds } },
    select: { id: true, boatId: true },
    orderBy: [{ boatId: "asc" }, { priority: "desc" }, { id: "asc" }],
  });

  const servicesByBoat = new Map<string, ActiveService[]>();
  for (const service of activeServices) {
    const current = servicesByBoat.get(service.boatId) ?? [];
    current.push(service);
    servicesByBoat.set(service.boatId, current);
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      <section className="pt-36 pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollSection animation="fade-left">
              <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white leading-tight">
                {copy.title}
              </h1>
              <p className="text-white/50 text-lg mt-6 max-w-lg">{copy.subtitle}</p>
            </ScrollSection>

            <ScrollSection animation="fade-right">
              <div className="relative flex items-center justify-center h-[400px] md:h-[500px]">
                <div
                  className="absolute w-[80%] aspect-square rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%)",
                    filter: "blur(40px)",
                  }}
                />
                <div className="relative w-full h-full rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center overflow-hidden">
                  <Image
                    src="/images/trimarano.webp"
                    alt={boats[0]?.imageAlt ?? "Egadisailing"}
                    width={2752}
                    height={1536}
                    className="w-[85%] h-auto object-contain drop-shadow-[0_15px_40px_rgba(14,165,233,0.15)]"
                    priority
                  />
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {boats.map((boat, index) => (
        <div key={boat.id}>
          {index > 0 && (
            <div className="max-w-7xl mx-auto px-4">
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          )}
          <BoatSection
            boat={boat}
            services={servicesByBoat.get(boat.id) ?? []}
            locale={locale}
            availableExperiencesLabel={copy.availableExperiencesLabel}
            fallbackImageNote={copy.fallbackImageNote}
            reverse={index % 2 === 1}
          />
        </div>
      ))}
    </div>
  );
}
