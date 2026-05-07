import type { Metadata } from "next";
import { CountryFlag } from "@/components/country-flag";
import { ScrollSection } from "@/components/scroll-section";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_LOCATION,
  getContactLocationLabel,
  getEmailHref,
  getOrderedWhatsAppContacts,
  getPhoneHref,
  getWhatsAppLabel,
  getWhatsAppUrl,
} from "@/lib/public-contact";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";
import { ContactForm } from "./contact-form";
import { cn } from "@/lib/utils";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";

const reviewLinks = [
  { href: PUBLIC_REVIEW_LINKS.google, label: "Google Reviews" },
  { href: PUBLIC_REVIEW_LINKS.tripadvisor, label: "TripAdvisor" },
] as const;


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: locale === "en"
      ? "Egadi Boat Tour Bookings and Contacts"
      : "Prenotazioni e contatti per tour alle Egadi",
    description:
      locale === "en"
        ? "Book or request information for your boat trip in the Egadi Islands. Contact Egadisailing by WhatsApp, phone or email."
        : "Prenota o richiedi informazioni per la tua uscita in barca alle Egadi. Contatta Egadisailing via WhatsApp, telefono o email.",
    path: "/contacts",
    locale,
  });
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEn = locale === "en";
  const whatsappContacts = getOrderedWhatsAppContacts(locale);
  const copy = {
    title: isEn
      ? "Book or request information for your boat trip in the Egadi Islands"
      : "Prenota o richiedi informazioni per la tua uscita in barca alle Egadi",
    subtitle: isEn
      ? "Questions, bookings, or a little help choosing the right experience? We are here."
      : "Hai domande, vuoi prenotare o semplicemente saperne di più? Siamo qui.",
    locationLabel: isEn ? "Where we are" : "Dove siamo",
    address: getContactLocationLabel(locale),
    phoneLabel: isEn ? "Phone and WhatsApp" : "Telefono e WhatsApp",
    writeTitle: isEn ? "Write to us" : "Scrivici",
    writeSubtitle: isEn ? "We reply within 24 hours" : "Ti rispondiamo entro 24 ore",
  };
  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      {/* ── Hero ── */}
      <section className="pt-36 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
              {copy.title}
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-xl">
              {copy.subtitle}
            </p>
          </ScrollSection>
        </div>
      </section>

      {/* ── Two columns: info + form ── */}
      <section className="pb-32 px-4 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-stretch">

            {/* Left: contact info + social + map */}
            <div className="flex flex-col gap-10">
              {/* Contact details */}
              <ScrollSection animation="fade-left">
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{copy.locationLabel}</p>
                      <p className="text-white font-medium">{copy.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Email</p>
                      <a href={getEmailHref()} className="text-white font-medium hover:text-[var(--color-gold)] transition-colors">
                        {PUBLIC_CONTACT_EMAIL}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">{copy.phoneLabel}</p>
                      <div className="space-y-1">
                        {whatsappContacts.map((contact) => (
                          <a
                            key={contact.key}
                            href={getPhoneHref(contact)}
                            className="flex items-center gap-2 text-white font-medium hover:text-[var(--color-gold)] transition-colors"
                          >
                            <CountryFlag code={contact.flagCode} className="h-4 w-6" />
                            {getWhatsAppLabel(contact, locale)} · {contact.phoneDisplay}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollSection>

              {/* WhatsApp + Social */}
              <ScrollSection animation="fade-left" delay={0.1}>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {whatsappContacts.map((contact) => (
                      <a
                        key={contact.key}
                        href={getWhatsAppUrl(contact, locale)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-base transition-colors shadow-lg"
                      >
                        <WhatsAppIcon className="h-5 w-5" />
                        <CountryFlag code={contact.flagCode} className="h-4 w-6" />
                        <span>{getWhatsAppLabel(contact, locale)}</span>
                      </a>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    {reviewLinks.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-white/75 hover:text-white",
                          liquidGlassButton,
                        )}
                      >
                        <Star className="h-5 w-5 fill-[var(--color-gold)] text-[var(--color-gold)]" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </ScrollSection>

              {/* Map */}
              <ScrollSection animation="fade-left" delay={0.2} className="flex-1">
                <div className="rounded-xl overflow-hidden border border-white/[0.08] h-full min-h-[220px]">
                  <iframe
                    src={PUBLIC_CONTACT_LOCATION.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "100%" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={copy.address}
                    className="w-full h-full"
                  />
                </div>
              </ScrollSection>
            </div>

            {/* Right: contact form */}
            <ScrollSection animation="fade-right">
              <div className="p-8 md:p-10 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <h2 className="font-heading text-3xl font-bold text-white mb-2">
                  {copy.writeTitle}
                </h2>
                <p className="text-white/40 text-sm mb-8">
                  {copy.writeSubtitle}
                </p>

                <ContactForm turnstileSiteKey={getPublicTurnstileSiteKey()} locale={locale} />
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>
    </div>
  );
}
