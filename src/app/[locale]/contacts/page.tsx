import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { MapPin, Mail, Phone, Send } from "lucide-react";

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

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contattaci — Egadisailing",
    description: "Scrivici per prenotare la tua esperienza alle Isole Egadi. Porto di Trapani, WhatsApp, email.",
  };
}

export default async function ContactsPage() {
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
              Parliamone
            </h1>
            <p className="text-white/50 text-lg md:text-xl max-w-xl">
              Hai domande, vuoi prenotare o semplicemente saperne di più? Siamo qui.
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
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Dove siamo</p>
                      <p className="text-white font-medium">Porto di Trapani, Trapani (TP), Italia</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Email</p>
                      <a href="mailto:info@egadisailing.com" className="text-white font-medium hover:text-[var(--color-gold)] transition-colors">
                        info@egadisailing.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-[var(--color-gold)]" />
                    </div>
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-wider mb-1">Telefono</p>
                      <a href="tel:+390000000000" className="text-white font-medium hover:text-[var(--color-gold)] transition-colors">
                        +39 000 000 0000
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollSection>

              {/* WhatsApp + Social */}
              <ScrollSection animation="fade-left" delay={0.1}>
                <div className="space-y-4">
                  <a
                    href="https://wa.me/PLACEHOLDER"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-lg transition-colors shadow-lg"
                  >
                    <IconWhatsApp className="h-5 w-5" />
                    Scrivici su WhatsApp
                  </a>

                  <div className="flex gap-3">
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
                    >
                      <IconInstagram className="h-5 w-5" />
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors"
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
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3171.8!2d12.5!3d38.017!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sPorto+di+Trapani!5e0!3m2!1sit!2sit!4v1"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "100%" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Porto di Trapani"
                    className="w-full h-full"
                  />
                </div>
              </ScrollSection>
            </div>

            {/* Right: contact form */}
            <ScrollSection animation="fade-right">
              <div className="p-8 md:p-10 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                <h2 className="font-heading text-3xl font-bold text-white mb-2">
                  Scrivici
                </h2>
                <p className="text-white/40 text-sm mb-8">
                  Ti rispondiamo entro 24 ore
                </p>

                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-white/50 text-sm">Nome</label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Il tuo nome"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-white/50 text-sm">Email</label>
                      <input
                        id="email"
                        type="email"
                        placeholder="La tua email"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-white/50 text-sm">Telefono (opzionale)</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="+39 ..."
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="subject" className="text-white/50 text-sm">Oggetto</label>
                    <select
                      id="subject"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/60 focus:border-[var(--color-gold)] focus:outline-none transition-colors"
                    >
                      <option value="">Seleziona...</option>
                      <option value="booking">Prenotazione</option>
                      <option value="info">Informazioni</option>
                      <option value="group">Gruppi / Eventi</option>
                      <option value="other">Altro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-white/50 text-sm">Messaggio</label>
                    <textarea
                      id="message"
                      rows={5}
                      placeholder="Raccontaci cosa cerchi..."
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-white/25 focus:border-[var(--color-gold)] focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-[var(--color-ocean)] font-semibold text-lg transition-colors shadow-lg"
                  >
                    <Send className="h-5 w-5" />
                    Invia Messaggio
                  </button>
                </form>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>
    </div>
  );
}
