"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ScrollSection } from "@/components/scroll-section";
import { IslandsItinerary } from "@/components/islands-itinerary";
import { BookingSearch } from "@/components/booking-search";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  Clock,
  UserCheck,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SerializedService {
  id: string;
  name: string;
  type: string;
  boatId: string;
  boatName: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  pricingUnit: string;
  minPrice: string | null;
}

interface LandingSectionsProps {
  services: SerializedService[];
}

interface FeaturedPolaroid {
  caption: string;
  color: string;
  src?: string;
}

interface FeaturedPackage {
  key: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  detailLabel: string;
  priceLabel?: string;
  href: string;
  ctaLabel: string;
  polaroids: FeaturedPolaroid[];
}

function getLowestPrice(services: SerializedService[], serviceIds: string[]) {
  return services
    .filter((service) => serviceIds.includes(service.id) && service.minPrice)
    .map((service) => ({
      amount: Number(service.minPrice),
      label: service.minPrice!,
    }))
    .filter((price) => Number.isFinite(price.amount))
    .sort((a, b) => a.amount - b.amount)[0]?.label;
}

function getMaxCapacity(services: SerializedService[], serviceIds: string[]) {
  return Math.max(
    0,
    ...services
      .filter((service) => serviceIds.includes(service.id))
      .map((service) => service.capacityMax),
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal Title — gold line sweeps left to right revealing text      */
/* ------------------------------------------------------------------ */

function RevealTitle({ text }: { text: string }) {
  return (
    <div className="relative inline-block">
      <motion.h2
        className="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white relative"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {text}
      </motion.h2>
      {/* SVG underline decoration — animated wave */}
      <motion.svg
        viewBox="0 0 400 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[60%] mx-auto mt-4"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
      >
        <motion.path
          d="M0 10 Q50 2 100 10 T200 10 T300 10 T400 10"
          stroke="url(#revealGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
        />
        <motion.path
          d="M20 14 Q70 6 120 14 T220 14 T320 14 T380 14"
          stroke="url(#revealGold2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.7, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="revealGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="revealGold2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="30%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

/* Polaroid scattered positions */
const polaroidLayouts = [
  { x: 2, y: 0, rotate: -8 },
  { x: 40, y: 5, rotate: 6 },
  { x: 15, y: 52, rotate: -4 },
];

/* ------------------------------------------------------------------ */
/*  Experience Row — alternating layout, polaroid appear on scroll    */
/* ------------------------------------------------------------------ */

function ExperienceRow({
  experience,
  index,
}: {
  experience: FeaturedPackage;
  index: number;
}) {
  const isEven = index % 2 === 0;
  const polaroids = experience.polaroids.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center min-h-[450px]">
      {/* Content column */}
      <ScrollSection
        animation={isEven ? "fade-left" : "fade-right"}
        className={`space-y-6 ${isEven ? "lg:order-1" : "lg:order-2"}`}
      >
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          {experience.title}
        </h2>

        <p className="text-white/70 text-lg leading-relaxed max-w-lg">
          {experience.subtitle}
        </p>

        <div className="flex items-center gap-6 text-white/60 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {experience.durationLabel}
          </span>
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {experience.detailLabel}
          </span>
        </div>

        {experience.priceLabel && (
          <p className="text-xl font-semibold text-[var(--color-gold)]">
            {experience.priceLabel}
          </p>
        )}

        <Link
          href={experience.href}
          aria-label={`${experience.ctaLabel}: ${experience.title}`}
          className="inline-flex items-center gap-2 text-white font-medium hover:gap-3 transition-all"
        >
          {experience.ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </ScrollSection>

      {/* Polaroid column */}
      <div
        className={`relative h-[450px] hidden lg:block ${isEven ? "lg:order-2" : "lg:order-1"}`}
      >
        {/* Polaroids */}
        {polaroids.map((p, i) => {
          const layout = polaroidLayouts[i];
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: "48%",
              }}
              initial={{ opacity: 0, scale: 0.3, rotate: 0, y: 60 }}
              whileInView={{
                opacity: 1,
                scale: 1,
                rotate: layout.rotate,
                y: 0,
              }}
              whileHover={{
                scale: 1.15,
                rotate: 0,
                zIndex: 50,
                transition: { duration: 0.3 },
              }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.15,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div className="bg-white p-[5%] pb-[18%] shadow-2xl hover:shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition-shadow duration-300">
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-sm" style={{ backgroundColor: p.color }}>
                  {p.src && (
                    <Image
                      src={p.src}
                      alt={p.caption}
                      fill
                      sizes="(min-width: 1024px) 24vw, 48vw"
                      className="object-cover"
                    />
                  )}
                </div>
                <p
                  className="mt-4 text-center text-lg text-gray-600 md:text-xl lg:text-2xl"
                  style={{ fontFamily: "var(--font-handwriting), cursive" }}
                >
                  {p.caption}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LandingSections({ services }: LandingSectionsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const priceFrom = (serviceIds: string[]) => {
    const price = getLowestPrice(services, serviceIds);
    return price ? `${t("common.priceFrom")} €${price}` : undefined;
  };
  const maxPax = (serviceIds: string[]) => getMaxCapacity(services, serviceIds);
  const featuredPackages: FeaturedPackage[] = [
    {
      key: "chef-a-bordo",
      title: "Chef a bordo",
      subtitle:
        "Il trimarano Egadisailing con chef, skipper e hostess per una giornata premium tra sapori locali, mare e soste in rada.",
      durationLabel: "8 ore",
      detailLabel: `Max ${maxPax(["exclusive-experience"])} pax`,
      priceLabel: priceFrom(["exclusive-experience"]),
      href: `/${locale}/experiences/exclusive-experience`,
      ctaLabel: "Scopri di più",
      polaroids: [
        {
          caption: "Chef a bordo",
          color: "#FFB6C1",
          src: "/images/experience-polaroids/chef-a-bordo-cucina.webp",
        },
        {
          caption: "Aperitivo al tramonto",
          color: "#FFDAB9",
          src: "/images/experience-polaroids/chef-a-bordo-rada.webp",
        },
        {
          caption: "Sapori locali",
          color: "#DDA0DD",
          src: "/images/experience-polaroids/chef-a-bordo-dettaglio-piatto.webp",
        },
      ],
    },
    {
      key: "charter",
      title: "Charter",
      subtitle:
        "Da 3 a 7 giornate sul trimarano, con itinerario concordato tra Favignana, Levanzo e Marettimo in base alle tue preferenze.",
      durationLabel: "3-7 giornate",
      detailLabel: "Itinerario su misura",
      priceLabel: priceFrom(["cabin-charter"]),
      href: `/${locale}/experiences/cabin-charter`,
      ctaLabel: "Scopri di più",
      polaroids: [
        {
          caption: "Trimarano Egadi",
          color: "#ADD8E6",
          src: "/images/experience-polaroids/charter-trimarano-egadi.webp",
        },
        {
          caption: "Vita a bordo",
          color: "#B2DFDB",
          src: "/images/experience-polaroids/charter-cabina-bordo.webp",
        },
        {
          caption: "Rada tranquilla",
          color: "#C5CAE9",
          src: "/images/experience-polaroids/charter-rada-tranquilla.webp",
        },
      ],
    },
    {
      key: "barca-4-ore",
      title: "Barca 4 ore",
      subtitle:
        "La formula agile per vivere le Egadi in mezza giornata, con bagno, relax e rotta scelta in base al mare.",
      durationLabel: "4 ore",
      detailLabel: "Condiviso o esclusivo",
      priceLabel: priceFrom([
        "boat-shared-morning",
        "boat-shared-afternoon",
        "boat-exclusive-morning",
        "boat-exclusive-afternoon",
      ]),
      href: `/${locale}/prenota?boat=boat&durationType=HALF_DAY_AFTERNOON`,
      ctaLabel: "Prenota",
      polaroids: [
        {
          caption: "Tour agile",
          color: "#BFDBFE",
          src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
        },
        {
          caption: "Tuffo veloce",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
        },
        {
          caption: "Cala Rossa",
          color: "#FDE68A",
          src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
        },
      ],
    },
    {
      key: "barca-8-ore",
      title: "Barca 8 ore",
      subtitle:
        "Una giornata completa tra baie, snorkeling e tempo lento a bordo, disponibile in formula condivisa o esclusiva.",
      durationLabel: "8 ore",
      detailLabel: "Condiviso o esclusivo",
      priceLabel: priceFrom(["boat-shared-full-day", "boat-exclusive-full-day"]),
      href: `/${locale}/prenota?boat=boat&durationType=FULL_DAY`,
      ctaLabel: "Prenota",
      polaroids: [
        {
          caption: "Giornata intera",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
        },
        {
          caption: "Snorkeling",
          color: "#BFDBFE",
          src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
        },
        {
          caption: "Tramonto",
          color: "#FED7AA",
          src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
        },
      ],
    },
  ].filter((item) => item.detailLabel !== "Max 0 pax");

  return (
    <div>
      {/* ============================================================ */}
      {/*  Section 1: Le Nostre Esperienze                             */}
      {/*  Background blends from hero video sea color to teal         */}
      {/* ============================================================ */}
      <section
        className="relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 60%, #071934 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-24">
              <RevealTitle text={t("landing.experiencesTitle")} />
            </div>
          </ScrollSection>

          <div className="space-y-32">
            {featuredPackages.map((experience, i) => (
              <ExperienceRow
                key={experience.key}
                experience={experience}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 2: Le Isole Egadi — Interactive Itinerary           */}
      {/* ============================================================ */}
      <IslandsItinerary />

      {/* ============================================================ */}
      {/*  Section 3: La scelta giusta per il tour in barca alle Egadi */}
      {/* ============================================================ */}
      <section
        className="relative overflow-hidden px-4 py-28 md:px-8 lg:px-12 lg:py-32"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 38%, #0c3d5e 72%, #071934 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <ScrollSection animation="fade-up">
            <div className="mx-auto mb-20 max-w-7xl text-center">
              <div className="relative inline-block max-w-6xl">
                <motion.h2
                  className="font-heading text-4xl font-bold leading-[1.04] text-white md:text-5xl lg:text-6xl xl:text-7xl"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  La scelta giusta per il tuo tour in barca alle Isole Egadi
                </motion.h2>
                <motion.svg
                  viewBox="0 0 400 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto mt-4 w-[52%]"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                >
                  <motion.path
                    d="M0 10 Q50 2 100 10 T200 10 T300 10 T400 10"
                    stroke="url(#tourTitleGold)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient id="tourTitleGold" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                      <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                      <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </div>
              <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                A bordo trovi rotte curate, sapori locali e una crew che conosce il mare delle Egadi:
                dall&apos;esperienza con chef sul trimarano ai tour in barca tra Favignana e Levanzo.
              </p>
            </div>
          </ScrollSection>

          <div className="grid items-stretch gap-10 lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="space-y-7">
              <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                Cooking experience
              </p>
              <div className="space-y-5">
                <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                  Chef a bordo durante il tuo tour alle Egadi
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                  Lo chef prepara a bordo piatti ispirati alla cucina siciliana e al mare di Trapani,
                  trasformando la sosta in rada in un momento conviviale, curato e profondamente locale.
                  Non e&apos; solo pranzo: e&apos; una parte viva dell&apos;esperienza Egadisailing.
                </p>
              </div>
              <Link
                href={`/${locale}/experiences/exclusive-experience`}
                className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
              >
                Scopri i menù <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[520px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                  <Image
                    src="/images/egadisailing-experience/01-cooking-experience-chef-a-bordo.webp"
                    alt="Chef a bordo durante un tour in barca alle Isole Egadi"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/45 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -right-8 -top-5 z-0 flex w-44 flex-col items-end gap-2 md:-right-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[1.06fr_0.94fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp"
                    alt="Isole Egadi viste dal mare durante un tour in barca"
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/35 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -bottom-5 -left-8 z-0 flex w-44 flex-col gap-2 md:-left-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="flex items-center">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  Prospettiva dal mare
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    Le Isole Egadi come non le hai mai viste
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    Scopri Favignana, Levanzo e Marettimo da una prospettiva diversa,
                    tra baie raggiungibili solo via mare, soste in rada e scorci che
                    cambiano con la luce del giorno.
                  </p>
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="flex items-center">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  Cala Rossa
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    Nuota nelle acque cristalline di Cala Rossa
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    Tuffati nelle sfumature turchesi di Cala Rossa, una delle baie
                    piu&apos; iconiche di Favignana, con tempo per nuotare, rilassarti
                    e vivere il mare delle Egadi da vicino.
                  </p>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp"
                    alt="Donna che nuota nelle acque cristalline di Cala Rossa a Favignana"
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/35 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -right-8 -top-5 z-0 flex w-44 flex-col items-end gap-2 md:-right-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/04-aperitivo-tramonto-isole-egadi.webp"
                    alt="Gruppo che fa aperitivo in barca al tramonto con le Isole Egadi sullo sfondo"
                    fill
                    sizes="(min-width: 1024px) 54vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/40 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -bottom-5 -left-8 z-0 flex w-44 flex-col gap-2 md:-left-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="flex items-center">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  Tramonto in rada
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    Aperitivo al tramonto alle Isole Egadi
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    Brinda in rada mentre il sole scende dietro le Isole Egadi,
                    con il gruppo a bordo, il mare intorno e quella luce dorata
                    che trasforma il rientro in uno dei momenti più belli della giornata.
                  </p>
                </div>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 4: Fatti convincere — Recensioni TripAdvisor        */}
      {/* ============================================================ */}
      <section
        className="py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-20">
              <RevealTitle text="Fatti Convincere" />
              <p className="text-white/50 text-lg mt-6">
                Da chi ci ha già provato
              </p>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marco R.",
                location: "Milano",
                stars: 5,
                text: "Un'esperienza indimenticabile! Lo chef ha preparato un pranzo straordinario con pesce freschissimo. Le acque delle Egadi sono un sogno. La crew è stata impeccabile.",
              },
              {
                name: "Giulia M.",
                location: "Roma",
                stars: 5,
                text: "La crew è stata fantastica, professionale e simpatica. Abbiamo visitato calette nascoste che non avremmo mai trovato da soli. Consigliatissimo a tutti!",
              },
              {
                name: "Alessandro P.",
                location: "Monaco",
                stars: 5,
                text: "Il cabin charter è stato il viaggio più bello della nostra vita. Svegliarsi ogni mattina in un'isola diversa, con il mare cristallino. Torneremo sicuramente.",
              },
            ].map((testimonial, i) => (
              <ScrollSection key={i} animation="fade-up" delay={i * 0.15}>
                <div className="p-8 rounded-2xl bg-white/[0.06] backdrop-blur border border-white/[0.08] h-full flex flex-col">
                  {/* TripAdvisor style header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#00aa6c] flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-white/40 text-xs">{testimonial.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.stars }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-[#00aa6c] text-[#00aa6c]"
                      />
                    ))}
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed flex-1 italic">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 5: CTA Finale con pennellata SVG + form pillola    */}
      {/* ============================================================ */}
      <section
        className="py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0c3d5e 50%, #071934 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <div className="relative inline-block mb-8">
              <h2 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white relative z-10">
                Lascia la Terra Ferma
              </h2>
              {/* SVG brush stroke under title */}
              <svg
                viewBox="0 0 400 30"
                className="absolute -bottom-3 left-0 w-full h-auto z-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 20 C40 8, 80 25, 120 15 S200 8, 240 18 S320 10, 360 20 S390 12, 395 16"
                  stroke="url(#brushGold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M10 24 C50 14, 100 28, 150 18 S250 12, 300 22 S370 14, 395 20"
                  stroke="url(#brushGold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                <defs>
                  <linearGradient id="brushGold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                    <stop offset="15%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="85%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-white/60 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
              Prenota la tua esperienza nelle Isole Egadi. Scegli la data, sali a bordo.
            </p>
            <div className="flex justify-center">
              <BookingSearch services={services} />
            </div>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
