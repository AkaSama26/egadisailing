import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

const islands = [
  {
    key: "favignana" as const,
    gradient: "from-[#0ea5e9] to-[#0284c7]",
    animation: "fade-left" as const,
  },
  {
    key: "levanzo" as const,
    gradient: "from-[#06b6d4] to-[#0891b2]",
    animation: "fade-up" as const,
  },
  {
    key: "marettimo" as const,
    gradient: "from-[#14b8a6] to-[#0d9488]",
    animation: "fade-right" as const,
  },
];

export default async function IslandsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("islands");

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#0ea5e9] via-[#0284c7] to-[#0369a1]">
        <div className="max-w-7xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t("title")}
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* Islands Grid */}
      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {islands.map((island, i) => {
              const highlights = t(`${island.key}.highlights`)
                .split(",")
                .map((h) => h.trim());

              return (
                <ScrollSection
                  key={island.key}
                  animation={island.animation}
                  delay={i * 0.15}
                >
                  <Link href={`/${locale}/islands/${island.key}`}>
                    <Card className="group h-full overflow-hidden border-none shadow-md hover:shadow-xl transition-all hover:-translate-y-1">
                      {/* Image placeholder */}
                      <div
                        className={`h-56 bg-gradient-to-br ${island.gradient} flex items-end p-6 relative`}
                      >
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
                        <h2 className="font-heading text-3xl font-bold text-white drop-shadow relative z-10">
                          {t(`${island.key}.name`)}
                        </h2>
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                          {t(`${island.key}.description`)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {highlights.map((highlight) => (
                            <Badge
                              key={highlight}
                              variant="secondary"
                              className="gap-1 bg-[var(--color-sand)]/30 text-[var(--color-ocean)] text-xs"
                            >
                              <MapPin className="h-3 w-3" />
                              {highlight}
                            </Badge>
                          ))}
                        </div>
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
