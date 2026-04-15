"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ScrollSection } from "@/components/scroll-section";
import { ImageStack } from "@/components/image-stack";
import { Clock, Users, Ship, ArrowRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Service {
  id: string;
  name: string;
  type: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  boatName: string | null;
  description: Record<string, string>;
  minPrice: string | null;
}

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

const experienceImages: Record<string, { color: string; caption: string }[]> = {
  SOCIAL_BOATING: [
    { color: "#87CEEB", caption: "Cala Rossa" },
    { color: "#F5DEB3", caption: "Pranzo dello chef" },
    { color: "#90EE90", caption: "Tutti a bordo!" },
    { color: "#B2EBF2", caption: "Snorkeling" },
  ],
  EXCLUSIVE_EXPERIENCE: [
    { color: "#FFB6C1", caption: "Tavola luxury" },
    { color: "#FFDAB9", caption: "Tuffo privato" },
    { color: "#DDA0DD", caption: "Tramonto a bordo" },
    { color: "#E1BEE7", caption: "Solo per voi" },
  ],
  CABIN_CHARTER: [
    { color: "#ADD8E6", caption: "La tua cabina" },
    { color: "#B2DFDB", caption: "Alba su Marettimo" },
    { color: "#C5CAE9", caption: "Colazione in coperta" },
    { color: "#BBDEFB", caption: "Una settimana" },
  ],
  BOAT_SHARED: [
    { color: "#B2EBF2", caption: "Grotta marina" },
    { color: "#87CEEB", caption: "Snorkeling!" },
    { color: "#C8E6C9", caption: "Barca in cala" },
    { color: "#90EE90", caption: "Acque cristalline" },
  ],
  BOAT_EXCLUSIVE: [
    { color: "#E1BEE7", caption: "Caletta deserta" },
    { color: "#BBDEFB", caption: "Solo per voi" },
    { color: "#F8BBD0", caption: "Aperitivo a bordo" },
    { color: "#FFDAB9", caption: "La vostra rotta" },
  ],
};

const durationLabels: Record<string, string> = {
  FULL_DAY: "Giornata intera",
  HALF_DAY_MORNING: "Mezza giornata",
  WEEK: "Settimana",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ExperiencesList({
  services,
  locale,
}: {
  services: Service[];
  locale: string;
}) {
  return (
    <section className="pb-32 px-4 md:px-8 lg:px-12">
      <div className="max-w-7xl mx-auto space-y-32">
        {services.map((service, i) => {
          const isEven = i % 2 === 0;
          const content = experienceContent[service.type] || {
            title: service.name,
            subtitle: "",
          };
          const images = experienceImages[service.type] || experienceImages.SOCIAL_BOATING;

          return (
            <div
              key={service.id}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
            >
              {/* Text column */}
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

                <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {durationLabels[service.durationType]} — {service.durationHours}h
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Max {service.capacityMax} pax
                  </span>
                  {service.boatName && (
                    <span className="flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {service.boatName}
                    </span>
                  )}
                </div>

                {service.minPrice && (
                  <p className="text-2xl font-semibold text-[var(--color-gold)]">
                    A partire da €{service.minPrice} a persona
                  </p>
                )}

                <Link
                  href={`/${locale}/experiences/${service.id}`}
                  className="inline-flex items-center gap-2 text-white font-semibold text-lg hover:gap-3 transition-all"
                >
                  Scopri di più <ArrowRight className="h-5 w-5" />
                </Link>
              </ScrollSection>

              {/* Image stack column */}
              <ScrollSection
                animation={isEven ? "fade-right" : "fade-left"}
                className={`flex justify-center ${isEven ? "lg:order-2" : "lg:order-1"}`}
              >
                <ImageStack
                  images={images}
                  className="w-72 h-80 md:w-80 md:h-96 lg:w-96 lg:h-[28rem]"
                />
              </ScrollSection>
            </div>
          );
        })}
      </div>
    </section>
  );
}
