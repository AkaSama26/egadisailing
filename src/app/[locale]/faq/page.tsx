import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { ChevronDown } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";

const faqKeys = [1, 2, 3, 4, 5, 6];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return buildPageMetadata({
    title: t("title"),
    description: t("subtitle"),
    path: "/faq",
    locale,
  });
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("faq");

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

      {/* FAQ Accordion */}
      <section className="py-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-3xl mx-auto space-y-4">
          {faqKeys.map((n, i) => (
            <ScrollSection key={n} animation="fade-up" delay={i * 0.08}>
              <details className="group rounded-2xl bg-white/90 backdrop-blur shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer p-6 list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-heading text-lg font-bold text-[var(--color-ocean)] pr-4">
                    {t(`q${n}`)}
                  </h3>
                  <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-turquoise)] transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {t(`a${n}`)}
                  </p>
                </div>
              </details>
            </ScrollSection>
          ))}
        </div>
      </section>
    </div>
  );
}
