"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { ScrollSection } from "@/components/scroll-section";
import { ServiceCard } from "@/components/service-card";
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
/*  Icon mapping by service type                                       */
/* ------------------------------------------------------------------ */

const serviceTypeIcons: Record<string, React.ReactNode> = {
  SOCIAL_BOATING: <Ship className="h-8 w-8" />,
  EXCLUSIVE_EXPERIENCE: <Crown className="h-8 w-8" />,
  CABIN_CHARTER: <Home className="h-8 w-8" />,
  BOAT_SHARED: <Users className="h-8 w-8" />,
  BOAT_EXCLUSIVE: <Sparkles className="h-8 w-8" />,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LandingSections({ services }: LandingSectionsProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="bg-[#fefce8]/30">
      {/* ============================================================ */}
      {/*  Section 1: Le Nostre Esperienze                             */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-16">
              <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--color-ocean)] mb-4">
                {t("landing.experiencesTitle")}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t("landing.experiencesSubtitle")}
              </p>
            </div>
          </ScrollSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <ScrollSection
                key={service.id}
                animation="fade-up"
                delay={i * 0.1}
              >
                <ServiceCard
                  title={service.name}
                  description={
                    service.description[locale] ?? service.description.it ?? ""
                  }
                  priceFrom={
                    service.minPrice
                      ? `${t("common.priceFrom")} €${service.minPrice} ${t("common.perPerson")}`
                      : undefined
                  }
                  href={`/${locale}/experiences/${service.id}`}
                  icon={serviceTypeIcons[service.type]}
                />
              </ScrollSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 2: Le Isole Egadi                                   */}
      {/* ============================================================ */}
      <section className="py-24 px-6 md:px-12 lg:px-20 bg-white/60">
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
