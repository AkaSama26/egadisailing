import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, Ship } from "lucide-react";

const durationLabels: Record<string, string> = {
  FULL_DAY: "fullDay",
  HALF_DAY_MORNING: "halfDay",
  WEEK: "week",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  return {
    title: `${t("title")} — Egadisailing`,
    description: t("subtitle"),
  };
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const services = await db.service.findMany({
    where: { active: true },
    include: {
      boat: { select: { name: true } },
      pricingPeriods: { orderBy: { pricePerPerson: "asc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-7xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t("experiences.title")}
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {t("experiences.subtitle")}
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, i) => {
              const description =
                (service.description as any)[locale] ||
                (service.description as any).it ||
                "";
              const minPrice =
                service.pricingPeriods[0]?.pricePerPerson?.toString();
              const durationKey = durationLabels[service.durationType] || "fullDay";

              return (
                <ScrollSection key={service.id} animation="fade-up" delay={i * 0.1}>
                  <Link href={`/${locale}/experiences/${service.id}`}>
                    <Card className="group h-full transition-all hover:shadow-xl hover:-translate-y-1 border-none bg-white/90 backdrop-blur overflow-hidden">
                      {/* Gradient header */}
                      <div className="h-3 bg-gradient-to-r from-[var(--color-turquoise)] to-[var(--color-ocean)]" />
                      <CardContent className="p-8 space-y-4">
                        <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] group-hover:text-[var(--color-turquoise)] transition-colors">
                          {service.name}
                        </h2>

                        <p className="text-muted-foreground leading-relaxed">
                          {description}
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {service.boat && (
                            <Badge
                              variant="secondary"
                              className="gap-1.5 bg-[var(--color-sand)]/30 text-[var(--color-ocean)]"
                            >
                              <Ship className="h-3.5 w-3.5" />
                              {service.boat.name}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="gap-1.5 bg-[var(--color-sand)]/30 text-[var(--color-ocean)]"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            {t(`common.${durationKey}`)} — {service.durationHours}h
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="gap-1.5 bg-[var(--color-sand)]/30 text-[var(--color-ocean)]"
                          >
                            <Users className="h-3.5 w-3.5" />
                            max {service.capacityMax}
                          </Badge>
                        </div>

                        {minPrice && (
                          <p className="text-lg font-semibold text-[var(--color-gold)] pt-2">
                            {t("common.priceFrom")} &euro;{minPrice}{" "}
                            {t("common.perPerson")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollSection>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
