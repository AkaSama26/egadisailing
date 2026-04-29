import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  Ship,
  Check,
  ArrowLeft,
  CalendarDays,
} from "lucide-react";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import { getExperienceContent } from "@/data/catalog/experiences";
import { getBoatContent } from "@/data/catalog/boats";
import {
  getCharterDurationDisplayPrices,
  getDisplayPrice,
  getSeasonalDisplayPrices,
} from "@/lib/pricing/display";
import { formatEur } from "@/lib/pricing/cents";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = await db.service.findUnique({ where: { id: slug } });
  if (!service) return { title: "Not Found" };
  const content = getExperienceContent(slug, locale);
  if (!content) return { title: "Not Found" };
  return {
    title: `${content.seoTitle} — Egadisailing`,
    description: content.seoDescription,
  };
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations();

  const service = await db.service.findUnique({ where: { id: slug } });

  if (!service || !service.active) notFound();
  const content = getExperienceContent(service.id, locale);
  if (!content) notFound();
  const boatContent = getBoatContent(service.boatId, locale);
  const [seasonalPrices, charterPrices, displayPrice] = await Promise.all([
    getSeasonalDisplayPrices(service.id),
    service.type === "CABIN_CHARTER"
      ? getCharterDurationDisplayPrices(service.id)
      : Promise.resolve([]),
    getDisplayPrice(service.id),
  ]);

  const durationText = getServiceDurationLabel(service);
  const priceUnit =
    service.type === "CABIN_CHARTER" || service.pricingUnit === "PER_PACKAGE"
      ? getPriceUnitLabel(service.pricingUnit, service.type)
      : t("experience.perPerson");

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Header */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-4xl mx-auto">
          <ScrollSection animation="fade-up">
            <Link
              href={`/${locale}/experiences`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("experience.allExperiences")}
            </Link>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {content.title}
            </h1>

            <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-3xl">
              {content.detailDescription}
            </p>

            <div className="flex flex-wrap gap-3">
              {boatContent && (
                <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                  <Ship className="h-4 w-4" />
                  {t("experience.boat")}: {boatContent.title}
                </Badge>
              )}
              <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                <Clock className="h-4 w-4" />
                {t("experience.duration")}: {durationText}
              </Badge>
              <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                <Users className="h-4 w-4" />
                {t("experience.capacity")}: {service.capacityMax}
              </Badge>
            </div>
            <Button
              size="lg"
              className="mt-8 bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              render={<Link href={`/${locale}/prenota?service=${service.id}`} />}
            >
              <CalendarDays className="h-5 w-5" />
              {t("experience.bookNow")}
            </Button>
          </ScrollSection>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-16 space-y-20">
        {/* Itinerario */}
        <ScrollSection animation="fade-up">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-10">
            {t("experience.itinerary")}
          </h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[39px] top-2 bottom-2 w-0.5 bg-[var(--color-turquoise)]/30" />

            <div className="space-y-8">
              {content.itinerary.map((item) => (
                <div key={`${item.time}-${item.text}`} className="flex gap-6 items-start">
                  <div className="shrink-0 w-20 text-right">
                    <span className="font-heading text-lg font-bold text-[var(--color-ocean)]">
                      {item.time}
                    </span>
                  </div>
                  <div className="shrink-0 mt-1.5">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-turquoise)] ring-4 ring-[var(--color-turquoise)]/20" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed pt-0.5">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ScrollSection>

        <Separator />

        {/* Cosa Include */}
        <ScrollSection animation="fade-up">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
            {t("experience.includes")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.includes.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-[var(--color-turquoise)]" />
                </div>
                <span className="text-[var(--color-ocean)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </ScrollSection>

        <Separator />

        {/* Cosa Portare */}
        <ScrollSection animation="fade-up">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
            {t("experience.bring")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.bringItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center">
                  <span className="text-[var(--color-gold)] text-sm font-bold">!</span>
                </div>
                <span className="text-[var(--color-ocean)]">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </ScrollSection>

        <Separator />

        {/* Prezzi e Stagionalita */}
        {(service.type === "CABIN_CHARTER" ? charterPrices.length > 0 : seasonalPrices.length > 0) && (
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
              {t("experience.pricing")}
            </h2>
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--color-ocean)] text-white">
                    <th className="text-left p-4 font-heading">
                      {service.type === "CABIN_CHARTER" ? "Durata" : t("experience.periodLabel")}
                    </th>
                    <th className="text-left p-4 font-heading">
                      {service.type === "CABIN_CHARTER" ? "Tipo" : t("experience.periodDates")}
                    </th>
                    <th className="text-right p-4 font-heading">
                      {t("experience.periodPrice")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {service.type === "CABIN_CHARTER"
                    ? charterPrices.map((price, i) => (
                        <tr
                          key={price.durationDays}
                          className={i % 2 === 0 ? "bg-white" : "bg-[var(--color-sand)]/10"}
                        >
                          <td className="p-4 font-medium text-[var(--color-ocean)]">
                            {price.durationDays} giornate
                          </td>
                          <td className="p-4 text-muted-foreground">Pacchetto charter</td>
                          <td className="p-4 text-right font-semibold text-[var(--color-gold)]">
                            {formatEur(price.amount)}{" "}
                            <span className="text-muted-foreground font-normal text-sm">
                              {priceUnit}
                            </span>
                          </td>
                        </tr>
                      ))
                    : seasonalPrices.map((period, i) => (
                        <tr
                          key={period.seasonKey}
                          className={i % 2 === 0 ? "bg-white" : "bg-[var(--color-sand)]/10"}
                        >
                          <td className="p-4 font-medium text-[var(--color-ocean)]">
                            {period.seasonLabel}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-4 w-4" />
                              {period.startDate.toLocaleDateString(locale, {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              —{" "}
                              {period.endDate.toLocaleDateString(locale, {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </td>
                          <td className="p-4 text-right font-semibold text-[var(--color-gold)]">
                            {period.amount ? formatEur(period.amount) : "Su richiesta"}{" "}
                            <span className="text-muted-foreground font-normal text-sm">
                              {priceUnit}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </ScrollSection>
        )}

        <Separator />

        {/* CTA */}
        <ScrollSection animation="fade-up">
          <div className="text-center py-8 px-6 rounded-2xl bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
            <h2 className="font-heading text-3xl font-bold text-white mb-4">
              {t("experience.bookNow")}
            </h2>
            {displayPrice.amount && (
              <p className="text-white/80 mb-8">
                {t("experience.from")} {formatEur(displayPrice.amount)}{" "}
                {priceUnit}
              </p>
            )}
            <Button
              size="lg"
              className="bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              render={<Link href={`/${locale}/prenota?service=${service.id}`} />}
            >
              {t("experience.bookNow")}
            </Button>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
