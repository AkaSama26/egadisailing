import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Mail, Phone, MessageCircle } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contacts" });
  return {
    title: `${t("title")} — Egadisailing`,
    description: t("subtitle"),
  };
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("contacts");

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

      <div className="max-w-5xl mx-auto px-6 md:px-12 lg:px-20 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <ScrollSection animation="fade-left">
              <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] mb-6">
                {t("findUs")}
              </h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-[var(--color-turquoise)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-ocean)]">
                      {t("address")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-[var(--color-turquoise)]" />
                  </div>
                  <div>
                    <a
                      href={`mailto:${t("email")}`}
                      className="font-medium text-[var(--color-ocean)] hover:text-[var(--color-turquoise)] transition-colors"
                    >
                      {t("email")}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--color-turquoise)]/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-[var(--color-turquoise)]" />
                  </div>
                  <div>
                    <a
                      href={`tel:${t("phone")}`}
                      className="font-medium text-[var(--color-ocean)] hover:text-[var(--color-turquoise)] transition-colors"
                    >
                      {t("phone")}
                    </a>
                  </div>
                </div>
              </div>
            </ScrollSection>

            {/* WhatsApp */}
            <ScrollSection animation="fade-left" delay={0.1}>
              <a
                href="https://wa.me/PLACEHOLDER"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-lg py-6 rounded-full shadow-lg gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  {t("whatsapp")}
                </Button>
              </a>
            </ScrollSection>

            {/* Map placeholder */}
            <ScrollSection animation="fade-left" delay={0.2}>
              <div className="rounded-2xl overflow-hidden shadow-sm">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3171.8!2d12.5!3d38.017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sPorto+di+Trapani!5e0!3m2!1sit!2sit!4v1"
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Porto di Trapani"
                  className="w-full"
                />
              </div>
            </ScrollSection>
          </div>

          {/* Contact Form */}
          <ScrollSection animation="fade-right">
            <Card className="border-none bg-white/90 backdrop-blur shadow-lg">
              <CardContent className="p-8">
                <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] mb-6">
                  {t("writeUs")}
                </h2>

                <form className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-[var(--color-ocean)]"
                    >
                      {t("formName")}
                    </Label>
                    <Input
                      id="name"
                      placeholder={t("formName")}
                      className="bg-white border-[var(--color-sand)]/50 focus:border-[var(--color-turquoise)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-[var(--color-ocean)]"
                    >
                      {t("formEmail")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("formEmail")}
                      className="bg-white border-[var(--color-sand)]/50 focus:border-[var(--color-turquoise)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-[var(--color-ocean)]"
                    >
                      {t("formMessage")}
                    </Label>
                    <textarea
                      id="message"
                      rows={5}
                      placeholder={t("formMessage")}
                      className="flex w-full rounded-md border border-[var(--color-sand)]/50 bg-white px-3 py-2 text-sm focus:border-[var(--color-turquoise)] focus:outline-none focus:ring-1 focus:ring-[var(--color-turquoise)] resize-none"
                    />
                  </div>

                  <Button
                    type="button"
                    size="lg"
                    className="w-full bg-[var(--color-ocean)] hover:bg-[var(--color-ocean)]/90 text-white font-semibold py-6 rounded-full"
                  >
                    {t("formSend")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </ScrollSection>
        </div>
      </div>
    </div>
  );
}
