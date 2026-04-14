"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ScrollSection } from "@/components/scroll-section";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Ship,
  Crown,
  Home,
  Users,
  Sparkles,
  ChefHat,
  Gem,
  Anchor,
  Waves,
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
  durationType: string;
  description: Record<string, string>;
  minPrice: string | null;
}

interface LandingSectionsProps {
  services: SerializedService[];
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

/* ------------------------------------------------------------------ */
/*  Experience content & polaroid data                                */
/* ------------------------------------------------------------------ */

const experienceContent: Record<string, { title: string; subtitle: string }> = {
  SOCIAL_BOATING: {
    title: "Social Boating",
    subtitle: "Sali a bordo con nuovi amici. Navigazione, tuffi in acque cristalline e pranzo di pesce fresco preparato dal nostro chef. Il modo più conviviale di scoprire le Egadi.",
  },
  EXCLUSIVE_EXPERIENCE: {
    title: "Exclusive Experience",
    subtitle: "Il trimarano tutto per te. Chef rinomato, menù raffinato, rotta personalizzata. Un'esperienza senza compromessi per chi cerca il meglio.",
  },
  CABIN_CHARTER: {
    title: "Cabin Charter",
    subtitle: "La tua casa è il mare. Una settimana a bordo navigando tra Favignana, Levanzo e Marettimo. Svegliati ogni mattina in un'isola diversa.",
  },
  BOAT_SHARED: {
    title: "Tour in Barca",
    subtitle: "Le Egadi in giornata. Tour per piccoli gruppi tra grotte marine, calette nascoste e acque cristalline. Disponibile anche in mezza giornata.",
  },
  BOAT_EXCLUSIVE: {
    title: "Barca Esclusiva",
    subtitle: "La barca tutta per voi. Scegliete la rotta, i tempi, le soste. Libertà totale con il vostro skipper privato.",
  },
};

/* Polaroid data */
const experiencePolaroids: Record<string, { caption: string; color: string }[]> = {
  SOCIAL_BOATING: [
    { caption: "Cala Rossa dall'alto", color: "#87CEEB" },
    { caption: "Pranzo dello chef", color: "#F5DEB3" },
    { caption: "Tutti a bordo!", color: "#90EE90" },
  ],
  EXCLUSIVE_EXPERIENCE: [
    { caption: "Tavola luxury", color: "#FFB6C1" },
    { caption: "Tuffo privato", color: "#FFDAB9" },
    { caption: "Tramonto a bordo", color: "#DDA0DD" },
  ],
  CABIN_CHARTER: [
    { caption: "La tua cabina", color: "#ADD8E6" },
    { caption: "Alba su Marettimo", color: "#B2DFDB" },
    { caption: "Colazione in coperta", color: "#C5CAE9" },
  ],
  BOAT_SHARED: [
    { caption: "Grotta marina", color: "#B2EBF2" },
    { caption: "Snorkeling!", color: "#87CEEB" },
    { caption: "Barca in cala", color: "#C8E6C9" },
  ],
  BOAT_EXCLUSIVE: [
    { caption: "Caletta deserta", color: "#E1BEE7" },
    { caption: "Solo per voi", color: "#BBDEFB" },
    { caption: "Aperitivo a bordo", color: "#F8BBD0" },
  ],
};

/* Polaroid scattered positions */
const polaroidLayouts = [
  { x: 2, y: 0, rotate: -8 },
  { x: 40, y: 5, rotate: 6 },
  { x: 15, y: 52, rotate: -4 },
];

const durationLabels: Record<string, string> = {
  FULL_DAY: "8 ore",
  HALF_DAY_MORNING: "4 ore",
  WEEK: "7 giorni",
};

/* ------------------------------------------------------------------ */
/*  Experience Row — alternating layout, polaroid appear on scroll    */
/* ------------------------------------------------------------------ */

/*
 * Gold flow connecting ONLY polaroid columns.
 * Measured positions (in a 1905×3291 section):
 *   Row 0 polaroids: RIGHT col, center ~(1277, 626)
 *   Row 1 polaroids: LEFT col,  center ~(629, 1204)
 *   Row 2 polaroids: RIGHT col, center ~(1277, 1782)
 *   Row 3 polaroids: LEFT col,  center ~(629, 2360)
 *   Row 4 polaroids: RIGHT col, center ~(1277, 2938)
 * Curves stay within polaroid columns, crossing the middle only to connect rows.
 */
function GoldFlowBackground() {
  // Normalized to percentage-based viewBox matching section proportions
  // Right center X ≈ 67%, Left center X ≈ 33%
  // Using viewBox 0 0 100 100 with preserveAspectRatio="none"
  const R = 67;
  const L = 33;

  /* Two intertwining paths that weave around each other */
  const pathA = `
    M ${R} 12
    C ${R+12} 15, ${R+6} 19, ${R-2} 22
    C ${R-15} 26, ${52} 29, ${L+8} 33
    C ${L-4} 37, ${L-10} 39, ${L+3} 41
    C ${L+15} 44, ${48} 47, ${R-8} 50
    C ${R+4} 53, ${R+10} 55, ${R-3} 57
    C ${R-15} 61, ${52} 63, ${L+8} 66
    C ${L-4} 69, ${L-10} 72, ${L+3} 74
    C ${L+15} 77, ${48} 80, ${R-8} 83
    C ${R+4} 86, ${R+10} 88, ${R} 91
  `;

  /* Second path — weaves in opposite phase, crossing path A */
  const pathB = `
    M ${R+5} 11
    C ${R-5} 14, ${R+10} 18, ${R+5} 21
    C ${R-8} 25, ${48} 27, ${L-3} 31
    C ${L+8} 35, ${L+12} 38, ${L-5} 42
    C ${L+5} 45, ${52} 48, ${R+5} 51
    C ${R-8} 54, ${R-5} 56, ${R+5} 58
    C ${R-8} 62, ${48} 64, ${L-3} 67
    C ${L+8} 70, ${L+12} 73, ${L-5} 76
    C ${L+5} 79, ${52} 81, ${R+5} 84
    C ${R-5} 87, ${R+8} 89, ${R+3} 92
  `;

  /* Third — finer, dashed, more decorative */
  const pathC = `
    M ${R-4} 13
    C ${R+8} 17, ${R-3} 20, ${R+2} 23
    C ${R-12} 27, ${50} 30, ${L+2} 34
    C ${L+10} 38, ${L-8} 40, ${L+5} 43
    C ${L-5} 46, ${50} 49, ${R+2} 52
    C ${R-6} 55, ${R+8} 57, ${R-4} 59
    C ${R-12} 63, ${50} 65, ${L+2} 68
    C ${L+10} 71, ${L-8} 74, ${L+5} 77
    C ${L-5} 80, ${50} 82, ${R+2} 85
    C ${R-4} 88, ${R+6} 90, ${R-2} 92
  `;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
      <svg
        viewBox="0 0 100 100"
        className="absolute top-0 left-0 w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Path A — main flow */}
        <path d={pathA} stroke="url(#gfMain)" strokeWidth="0.15" strokeLinecap="round">
          <animate attributeName="stroke-dasharray" from="0 200" to="200 0" dur="4s" fill="freeze" />
        </path>

        {/* Path B — intertwining, slightly delayed */}
        <path d={pathB} stroke="url(#gfSecond)" strokeWidth="0.12" strokeLinecap="round">
          <animate attributeName="stroke-dasharray" from="0 200" to="200 0" dur="4s" begin="0.6s" fill="freeze" />
        </path>

        {/* Path C — fine dashed accent */}
        <path d={pathC} stroke="url(#gfFine)" strokeWidth="0.08" strokeLinecap="round" strokeDasharray="0.4 0.8">
          <animate attributeName="stroke-dashoffset" from="10" to="0" dur="3s" begin="1s" fill="freeze" />
          <animate attributeName="opacity" from="0" to="1" dur="2s" begin="1s" fill="freeze" />
        </path>

        {/* Animated dot traveling along path A */}
        <circle r="0.25" fill="#f59e0b" opacity="0.6">
          <animateMotion dur="12s" repeatCount="indefinite" path={pathA} />
        </circle>

        {/* Second dot on path B — opposite direction feel */}
        <circle r="0.18" fill="#d97706" opacity="0.45">
          <animateMotion dur="15s" repeatCount="indefinite" path={pathB} />
        </circle>

        <defs>
          <linearGradient id="gfMain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="8%" stopColor="#d97706" stopOpacity="0.45" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="92%" stopColor="#d97706" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gfSecond" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="12%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.4" />
            <stop offset="88%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gfFine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="15%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="85%" stopColor="#d97706" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function ExperienceRow({
  service,
  index,
  locale,
  priceLabel,
}: {
  service: SerializedService;
  index: number;
  locale: string;
  priceLabel: string | undefined;
}) {
  const isEven = index % 2 === 0;
  const polaroids = experiencePolaroids[service.type] || experiencePolaroids.SOCIAL_BOATING;
  const content = experienceContent[service.type] || { title: service.name, subtitle: "" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center min-h-[450px]">
      {/* Content column */}
      <ScrollSection
        animation={isEven ? "fade-left" : "fade-right"}
        className={`space-y-6 ${isEven ? "lg:order-1" : "lg:order-2"}`}
      >
        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          {content.title}
        </h2>

        <p className="text-white/70 text-lg leading-relaxed max-w-lg">
          {content.subtitle}
        </p>

        <div className="flex items-center gap-6 text-white/60 text-sm">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {durationLabels[service.durationType] || service.durationType}
          </span>
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Max {service.type === "BOAT_SHARED" || service.type === "BOAT_EXCLUSIVE" ? "12" : "20"} pax
          </span>
        </div>

        {priceLabel && (
          <p className="text-xl font-semibold text-[var(--color-gold)]">
            {priceLabel}
          </p>
        )}

        <Link
          href={`/${locale}/experiences/${service.id}`}
          className="inline-flex items-center gap-2 text-white font-medium hover:gap-3 transition-all"
        >
          Scopri di più <ArrowRight className="h-4 w-4" />
        </Link>
      </ScrollSection>

      {/* Polaroid column with gold SVG decorations */}
      <div
        className={`relative h-[450px] hidden lg:block ${isEven ? "lg:order-2" : "lg:order-1"}`}
      >
        {/* Polaroids */}
        {polaroids.map((p, i) => {
          const layout = polaroidLayouts[i];
          return (
            <motion.div
              key={i}
              className="absolute cursor-pointer"
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
                <div
                  className="w-full aspect-[4/3] rounded-sm"
                  style={{ backgroundColor: p.color }}
                />
                <p
                  className="text-sm md:text-base lg:text-lg text-gray-600 mt-2 text-center"
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
            {services
              .filter((s) => s.durationType !== "HALF_DAY_MORNING")
              .map((service, i) => (
              <ExperienceRow
                key={service.id}
                service={service}
                index={i}
                locale={locale}
                priceLabel={
                  service.minPrice
                    ? `${t("common.priceFrom")} €${service.minPrice} ${t("common.perPerson")}`
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 2: Le Isole Egadi                                   */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20 bg-[#fefce8]/30">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-ocean)] mb-4">
                {t("islands.title")}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t("islands.subtitle")}
              </p>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(
              [
                {
                  key: "favignana",
                  animation: "fade-left" as const,
                  gradient: "from-[#0ea5e9] to-[#0284c7]",
                },
                {
                  key: "levanzo",
                  animation: "fade-up" as const,
                  gradient: "from-[#06b6d4] to-[#0891b2]",
                },
                {
                  key: "marettimo",
                  animation: "fade-right" as const,
                  gradient: "from-[#14b8a6] to-[#0d9488]",
                },
              ] as const
            ).map((island, i) => (
              <ScrollSection
                key={island.key}
                animation={island.animation}
                delay={i * 0.15}
              >
                <div className="group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                  <div
                    className={`h-48 bg-gradient-to-br ${island.gradient} flex items-end p-6`}
                  >
                    <h3 className="font-heading text-2xl font-bold text-white drop-shadow">
                      {t(`islands.${island.key}.name`)}
                    </h3>
                  </div>
                  <div className="p-6 bg-white">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(`islands.${island.key}.description`)}
                    </p>
                  </div>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 3: Perché Egadisailing                              */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-ocean)] mb-4">
                {t("landing.whyTitle")}
              </h2>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <ChefHat className="h-10 w-10" />,
                titleKey: "landing.whyChef",
                descKey: "landing.whyChefDesc",
                animation: "fade-left" as const,
              },
              {
                icon: <Gem className="h-10 w-10" />,
                titleKey: "landing.whyLuxury",
                descKey: "landing.whyLuxuryDesc",
                animation: "fade-right" as const,
              },
              {
                icon: <Anchor className="h-10 w-10" />,
                titleKey: "landing.whyCrew",
                descKey: "landing.whyCrewDesc",
                animation: "fade-left" as const,
              },
              {
                icon: <Waves className="h-10 w-10" />,
                titleKey: "landing.whyIslands",
                descKey: "landing.whyIslandsDesc",
                animation: "fade-right" as const,
              },
            ].map((item, i) => (
              <ScrollSection
                key={item.titleKey}
                animation={item.animation}
                delay={i * 0.1}
              >
                <div className="flex gap-5 p-6 rounded-xl bg-white/80 backdrop-blur shadow-sm">
                  <div className="shrink-0 text-[var(--color-turquoise)]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[var(--color-ocean)] mb-2">
                      {t(item.titleKey)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(item.descKey)}
                    </p>
                  </div>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 4: Cosa Dicono i Nostri Ospiti                      */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20 bg-white/60">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-ocean)] mb-4">
                {t("landing.testimonialsTitle")}
              </h2>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marco R.",
                stars: 5,
                text: "Un'esperienza indimenticabile! Lo chef ha preparato un pranzo straordinario con pesce freschissimo. Le acque delle Egadi sono un sogno.",
              },
              {
                name: "Giulia M.",
                stars: 5,
                text: "La crew è stata fantastica, professionale e simpatica. Abbiamo visitato calette nascoste che non avremmo mai trovato da soli. Consigliatissimo!",
              },
              {
                name: "Alessandro P.",
                stars: 5,
                text: "Il cabin charter è stato il viaggio più bello della nostra vita. Svegliarsi ogni mattina in un'isola diversa, con il mare cristallino. Torneremo sicuramente.",
              },
            ].map((testimonial, i) => (
              <ScrollSection key={i} animation="fade-up" delay={i * 0.15}>
                <div className="p-8 rounded-2xl bg-white shadow-sm h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.stars }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-5 w-5 fill-[var(--color-gold)] text-[var(--color-gold)]"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 italic">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <p className="mt-4 font-semibold text-[var(--color-ocean)]">
                    {testimonial.name}
                  </p>
                </div>
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 5: CTA Finale                                       */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("landing.ctaTitle")}
            </h2>
            <p className="text-white/80 text-lg mb-10">
              {t("landing.ctaSubtitle")}
            </p>
            <Link href={`/${locale}/experiences`}>
              <Button
                size="lg"
                className="bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {t("landing.ctaButton")}
              </Button>
            </Link>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
