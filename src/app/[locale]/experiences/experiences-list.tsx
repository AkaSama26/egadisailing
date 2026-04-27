"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ScrollSection } from "@/components/scroll-section";
import { ImageStack } from "@/components/image-stack";
import { Clock, Users, Ship, ArrowRight } from "lucide-react";
import {
  getExperienceDisplay,
  getExperienceTitle,
  getPriceUnitLabel,
  getServiceDurationLabel,
} from "@/lib/services/display";

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
  pricingUnit?: string | null;
}

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
          const content = getExperienceDisplay(service);
          const images = content.media;
          const title = getExperienceTitle(service);

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
                  {title}
                </h2>

                <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                  {content.subtitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {getServiceDurationLabel(service)}
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
                    A partire da €{service.minPrice}{" "}
                    {getPriceUnitLabel(service.pricingUnit, service.type)}
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
