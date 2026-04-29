import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { ExperiencesList } from "./experiences-list";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { compareExperienceOrder, isExperienceListed } from "@/data/catalog/experiences";
import { getDisplayPriceMap } from "@/lib/pricing/display";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/experiences",
    locale,
  });
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const services = await db.service.findMany({
    where: { active: true },
    include: {
      boat: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const displayPrices = await getDisplayPriceMap(services.map((s) => s.id));

  const serialized = services
    .filter((s) => isExperienceListed(s.id))
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      durationType: s.durationType,
      durationHours: s.durationHours,
      capacityMax: s.capacityMax,
      boatName: s.boat?.name || null,
      priceLabel: displayPrices.get(s.id)?.label ?? null,
      pricingUnit: s.pricingUnit,
    }))
    .sort((a, b) => compareExperienceOrder(a.id, b.id));

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      {/* Hero */}
      <section className="pt-36 pb-20 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
              Esperienze in Barca alle Egadi
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto">
              Scegli la tua avventura. Ogni esperienza include skipper, comfort e il mare più bello del Mediterraneo.
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* Experiences */}
      <ExperiencesList services={serialized} locale={locale} />
    </div>
  );
}
