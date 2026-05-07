import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { ExperiencesList } from "./experiences-list";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getExperiencePackageContents,
  getExperiencePackageServiceIds,
} from "@/data/catalog/experiences";
import { env } from "@/lib/env";
import { getDisplayPriceMap, type DisplayPrice } from "@/lib/pricing/display";

function lowestPriceLabel(
  serviceIds: string[],
  displayPrices: Map<string, DisplayPrice>,
): string | null {
  let lowest: DisplayPrice | null = null;
  for (const serviceId of serviceIds) {
    const price = displayPrices.get(serviceId);
    if (!price) continue;
    if (!price.amount) {
      lowest ??= price;
      continue;
    }
    if (!lowest?.amount || price.amount.lessThan(lowest.amount)) {
      lowest = price;
    }
  }
  return lowest?.label ?? null;
}

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
    image: "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp",
  });
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });

  const services = await db.service.findMany({
    where: { active: true, id: { in: getExperiencePackageServiceIds() } },
    select: { id: true },
  });
  const displayPrices = await getDisplayPriceMap(services.map((s) => s.id), 2026, locale);
  const activeServiceIds = new Set(services.map((service) => service.id));
  const packages = getExperiencePackageContents(locale)
    .map((item) => {
      const serviceIds = item.serviceIds.filter((serviceId) => activeServiceIds.has(serviceId));
      if (serviceIds.length === 0) return null;
      return {
        ...item,
        serviceIds,
        priceLabel: lowestPriceLabel(serviceIds, displayPrices),
        variants: item.variants.filter((variant) => activeServiceIds.has(variant.serviceId)),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const pageUrl = `${env.APP_URL.replace(/\/$/, "")}/${locale}/experiences`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "en" ? "Egadi boat tour packages" : "Pacchetti tour in barca alle Egadi",
    itemListElement: packages.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${pageUrl}#${item.key}`,
      name: item.seoTitle,
      description: item.seoDescription,
    })),
  };

  return (
    <div
      className="egadi-water-reflection relative min-h-screen overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      <div className="relative z-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {/* Hero */}
        <section className="pt-36 pb-20 px-4 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto text-center">
            <ScrollSection animation="fade-up">
              <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
                {t("title")}
              </h1>
              <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto">
                {t("subtitle")}
              </p>
            </ScrollSection>
          </div>
        </section>

        {/* Experiences */}
        <ExperiencesList packages={packages} locale={locale} />
      </div>
    </div>
  );
}
