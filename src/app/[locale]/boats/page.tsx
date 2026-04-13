import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Ruler, Calendar, BedDouble, Anchor } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "boats" });
  return {
    title: `${t("title")} — Egadisailing`,
    description: t("subtitle"),
  };
}

export default async function BoatsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const boats = await db.boat.findMany({
    where: { active: true },
    include: {
      services: {
        where: { active: true },
        select: { id: true, name: true, type: true },
      },
    },
  });

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-7xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t("boats.title")}
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {t("boats.subtitle")}
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* Boats */}
      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto space-y-12">
          {boats.map((boat, i) => {
            const description = boat.description
              ? (boat.description as any)[locale] ||
                (boat.description as any).it ||
                ""
              : "";
            const amenities = boat.amenities
              ? (boat.amenities as any)[locale] ||
                (boat.amenities as any).it ||
                []
              : [];

            return (
              <ScrollSection
                key={boat.id}
                animation={i % 2 === 0 ? "fade-left" : "fade-right"}
              >
                <Card className="overflow-hidden border-none bg-white/90 backdrop-blur shadow-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Placeholder image */}
                    <div className="h-64 lg:h-auto bg-gradient-to-br from-[var(--color-turquoise)] via-[var(--color-ocean)] to-[#0369a1] flex items-center justify-center">
                      <Anchor className="h-24 w-24 text-white/30" />
                    </div>

                    <CardContent className="p-8 lg:p-10 space-y-6">
                      <div>
                        <Badge
                          variant="secondary"
                          className="mb-3 bg-[var(--color-sand)]/30 text-[var(--color-ocean)]"
                        >
                          {boat.type}
                        </Badge>
                        <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">
                          {boat.name}
                        </h2>
                      </div>

                      {description && (
                        <p className="text-muted-foreground leading-relaxed">
                          {description}
                        </p>
                      )}

                      {/* Specs */}
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-[var(--color-ocean)] uppercase tracking-wider mb-3">
                          {t("boats.specs")}
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {boat.length && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Ruler className="h-4 w-4 text-[var(--color-turquoise)]" />
                              {t("boats.length")}: {boat.length}
                              {t("boats.meters")}
                            </div>
                          )}
                          {boat.year && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4 text-[var(--color-turquoise)]" />
                              {t("boats.year")}: {boat.year}
                            </div>
                          )}
                          {boat.cabins && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <BedDouble className="h-4 w-4 text-[var(--color-turquoise)]" />
                              {t("boats.cabins")}: {boat.cabins}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amenities */}
                      {Array.isArray(amenities) && amenities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {amenities.map((amenity: string, j: number) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-[var(--color-ocean)] border-[var(--color-turquoise)]/30"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Services */}
                      {boat.services.length > 0 && (
                        <div>
                          <h3 className="font-heading text-sm font-semibold text-[var(--color-ocean)] uppercase tracking-wider mb-3">
                            {t("boats.availableServices")}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {boat.services.map((svc) => (
                              <Link
                                key={svc.id}
                                href={`/${locale}/experiences/${svc.id}`}
                              >
                                <Badge className="bg-[var(--color-turquoise)]/10 text-[var(--color-ocean)] hover:bg-[var(--color-turquoise)]/20 transition-colors cursor-pointer border-none">
                                  {svc.name}
                                </Badge>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              </ScrollSection>
            );
          })}
        </div>
      </section>
    </div>
  );
}
