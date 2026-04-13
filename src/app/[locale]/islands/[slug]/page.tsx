import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, Compass } from "lucide-react";

const validSlugs = ["favignana", "levanzo", "marettimo"] as const;

const gradients: Record<string, string> = {
  favignana: "from-[#0ea5e9] to-[#0284c7]",
  levanzo: "from-[#06b6d4] to-[#0891b2]",
  marettimo: "from-[#14b8a6] to-[#0d9488]",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!validSlugs.includes(slug as any)) return { title: "Not Found" };
  const t = await getTranslations({ locale, namespace: "islands" });
  return {
    title: `${t(`${slug}.name`)} — Egadisailing`,
    description: t(`${slug}.description`),
  };
}

export default async function IslandDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  if (!validSlugs.includes(slug as any)) {
    notFound();
  }

  const t = await getTranslations("islands");

  const highlights = t(`${slug}.highlights`)
    .split(",")
    .map((h) => h.trim());

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Hero */}
      <section
        className={`pt-32 pb-20 px-6 md:px-12 lg:px-20 bg-gradient-to-br ${gradients[slug]}`}
      >
        <div className="max-w-4xl mx-auto">
          <ScrollSection animation="fade-up">
            <Link
              href={`/${locale}/islands`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("title")}
            </Link>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t(`${slug}.name`)}
            </h1>
          </ScrollSection>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-16 space-y-16">
        {/* Description */}
        <ScrollSection animation="fade-up">
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t(`${slug}.description`)}
          </p>
        </ScrollSection>

        {/* Highlights */}
        <ScrollSection animation="fade-up">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-8">
            Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((highlight, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-xl bg-white/80 shadow-sm"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-[var(--color-turquoise)]" />
                </div>
                <span className="font-medium text-[var(--color-ocean)]">
                  {highlight}
                </span>
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* Placeholder gallery */}
        <ScrollSection animation="fade-up">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className={`aspect-square rounded-xl bg-gradient-to-br ${gradients[slug]} opacity-${20 + n * 10} flex items-center justify-center`}
                style={{ opacity: 0.15 + n * 0.1 }}
              >
                <Compass className="h-8 w-8 text-white/40" />
              </div>
            ))}
          </div>
        </ScrollSection>

        {/* CTA */}
        <ScrollSection animation="fade-up">
          <div className="text-center py-10 px-6 rounded-2xl bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-4">
              {t("discoverExperiences")}
            </h2>
            <Link href={`/${locale}/experiences`}>
              <Button
                size="lg"
                className="bg-white text-[var(--color-ocean)] hover:bg-white/90 font-semibold text-lg px-10 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                {t("discoverExperiences")}
              </Button>
            </Link>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
