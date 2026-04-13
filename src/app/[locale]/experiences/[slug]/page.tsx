import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
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

const durationLabels: Record<string, string> = {
  FULL_DAY: "fullDay",
  HALF_DAY_MORNING: "halfDay",
  WEEK: "week",
};

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations();

  const service = await db.service.findUnique({
    where: { id: slug },
    include: {
      boat: true,
      pricingPeriods: { orderBy: { startDate: "asc" } },
    },
  });

  if (!service) notFound();

  const description =
    (service.description as any)[locale] ||
    (service.description as any).it ||
    "";
  const durationKey = durationLabels[service.durationType] || "fullDay";

  const itinerary = [
    { timeKey: "itin1Time", textKey: "itin1Text" },
    { timeKey: "itin2Time", textKey: "itin2Text" },
    { timeKey: "itin3Time", textKey: "itin3Text" },
    { timeKey: "itin4Time", textKey: "itin4Text" },
    { timeKey: "itin5Time", textKey: "itin5Text" },
    { timeKey: "itin6Time", textKey: "itin6Text" },
  ];

  const includes = ["include1", "include2", "include3", "include4", "include5"];
  const bringItems = ["bring1", "bring2", "bring3", "bring4", "bring5"];

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
              {service.name}
            </h1>

            <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-3xl">
              {description}
            </p>

            <div className="flex flex-wrap gap-3">
              {service.boat && (
                <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                  <Ship className="h-4 w-4" />
                  {t("experience.boat")}: {service.boat.name}
                </Badge>
              )}
              <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                <Clock className="h-4 w-4" />
                {t("experience.duration")}: {t(`common.${durationKey}`)} ({service.durationHours}h)
              </Badge>
              <Badge className="gap-1.5 bg-white/20 text-white border-white/30 text-sm py-1.5 px-3">
                <Users className="h-4 w-4" />
                {t("experience.capacity")}: {service.capacityMax}
              </Badge>
            </div>
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
              {itinerary.map((item, i) => (
                <div key={i} className="flex gap-6 items-start">
                  <div className="shrink-0 w-20 text-right">
                    <span className="font-heading text-lg font-bold text-[var(--color-ocean)]">
                      {t(`experience.${item.timeKey}`)}
                    </span>
                  </div>
                  <div className="shrink-0 mt-1.5">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-turquoise)] ring-4 ring-[var(--color-turquoise)]/20" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed pt-0.5">
                    {t(`experience.${item.textKey}`)}
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
            {includes.map((key) => (
              <div
                key={key}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-[var(--color-turquoise)]" />
                </div>
                <span className="text-[var(--color-ocean)]">
                  {t(`experience.${key}`)}
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
            {bringItems.map((key) => (
              <div
                key={key}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center">
                  <span className="text-[var(--color-gold)] text-sm font-bold">!</span>
                </div>
                <span className="text-[var(--color-ocean)]">
                  {t(`experience.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </ScrollSection>

        <Separator />

        {/* Prezzi e Stagionalita */}
        {service.pricingPeriods.length > 0 && (
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
              {t("experience.pricing")}
            </h2>
            <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--color-ocean)] text-white">
                    <th className="text-left p-4 font-heading">
                      {t("experience.periodLabel")}
                    </th>
                    <th className="text-left p-4 font-heading">
                      {t("experience.periodDates")}
                    </th>
                    <th className="text-right p-4 font-heading">
                      {t("experience.periodPrice")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {service.pricingPeriods.map((period, i) => (
                    <tr
                      key={period.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-[var(--color-sand)]/10"}
                    >
                      <td className="p-4 font-medium text-[var(--color-ocean)]">
                        {period.label}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(period.startDate).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          —{" "}
                          {new Date(period.endDate).toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </td>
                      <td className="p-4 text-right font-semibold text-[var(--color-gold)]">
                        &euro;{period.pricePerPerson.toString()}{" "}
                        <span className="text-muted-foreground font-normal text-sm">
                          {t("experience.perPerson")}
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
            {service.pricingPeriods[0] && (
              <p className="text-white/80 mb-8">
                {t("experience.from")} &euro;
                {service.pricingPeriods
                  .reduce(
                    (min, p) =>
                      Number(p.pricePerPerson) < min ? Number(p.pricePerPerson) : min,
                    Number(service.pricingPeriods[0].pricePerPerson)
                  )
                  .toString()}{" "}
                {t("experience.perPerson")}
              </p>
            )}
            <Link href={`/${locale}/contacts`}>
              <Button
                size="lg"
                className="bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {t("experience.bookNow")}
              </Button>
            </Link>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
