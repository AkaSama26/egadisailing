import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { MapPin, Mail, Phone } from "lucide-react";
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
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";
import { ContactForm } from "./contact-form";
import { cn } from "@/lib/utils";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z"/>
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return buildPageMetadata({
    title: locale === "en" ? "Book or request information" : "Prenota o richiedi informazioni",
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
      : "Hai domande, vuoi prenotare o semplicemente saperne di piu'? Siamo qui.",
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
                            className="block text-white font-medium hover:text-[var(--color-gold)] transition-colors"
                          >
                            <span aria-hidden="true">{contact.flag}</span>{" "}
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
                        <span aria-hidden="true">{contact.flag}</span>
                        <span>{getWhatsAppLabel(contact, locale)}</span>
                      </a>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-white/75 hover:text-white",
                        liquidGlassButton,
                      )}
                    >
                      <IconInstagram className="h-5 w-5" />
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-white/75 hover:text-white",
                        liquidGlassButton,
                      )}
                    >
                      <IconFacebook className="h-5 w-5" />
                      <span className="text-sm font-medium">Facebook</span>
                    </a>
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

                <ContactForm turnstileSiteKey={getPublicTurnstileSiteKey()} />
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>
    </div>
  );
}
