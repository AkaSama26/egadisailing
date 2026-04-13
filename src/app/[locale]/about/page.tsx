import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { Card, CardContent } from "@/components/ui/card";
import { Waves, Heart, Leaf, Users } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return {
    title: `${t("title")} — Egadisailing`,
    description: t("subtitle"),
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("about");

  const values = [
    {
      icon: <Waves className="h-10 w-10" />,
      titleKey: "value1Title" as const,
      descKey: "value1Desc" as const,
    },
    {
      icon: <Heart className="h-10 w-10" />,
      titleKey: "value2Title" as const,
      descKey: "value2Desc" as const,
    },
    {
      icon: <Leaf className="h-10 w-10" />,
      titleKey: "value3Title" as const,
      descKey: "value3Desc" as const,
    },
  ];

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-4xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-white/80 text-lg">{t("subtitle")}</p>
          </ScrollSection>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-16 space-y-20">
        {/* Story */}
        <ScrollSection animation="fade-up">
          <div className="space-y-6">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t("heroText")}
            </p>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {t("storyText")}
            </p>
          </div>
        </ScrollSection>

        {/* Values */}
        <section>
          <ScrollSection animation="fade-up">
            <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-10 text-center">
              {t("valuesTitle")}
            </h2>
          </ScrollSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((value, i) => (
              <ScrollSection key={value.titleKey} animation="fade-up" delay={i * 0.15}>
                <Card className="h-full border-none bg-white/80 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center text-[var(--color-turquoise)]">
                      {value.icon}
                    </div>
                    <h3 className="font-heading text-xl font-bold text-[var(--color-ocean)]">
                      {t(value.titleKey)}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t(value.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </ScrollSection>
            ))}
          </div>
        </section>

        {/* Crew */}
        <ScrollSection animation="fade-up">
          <div className="text-center py-12 px-8 rounded-2xl bg-white/80 shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-[var(--color-ocean)]/10 flex items-center justify-center text-[var(--color-ocean)] mb-6">
              <Users className="h-10 w-10" />
            </div>
            <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)] mb-4">
              {t("crewTitle")}
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              {t("crewText")}
            </p>
          </div>
        </ScrollSection>
      </div>
    </div>
  );
}
