import type { Metadata } from "next";
import { CountryFlag } from "@/components/country-flag";
import { ScrollSection } from "@/components/scroll-section";
import { Mail, MapPin, Phone, Star } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { env } from "@/lib/env";
import { localizedPath } from "@/lib/i18n/paths";
import { jsonLd } from "@/lib/seo/structured-data";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { TrackedWhatsAppLink } from "@/components/analytics/tracked-whatsapp-link";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GEO,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
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

function getContactLocalSeoCopy(locale: string) {
  if (locale === "es") {
    return {
      heading: "Punto de encuentro Egadisailing en Trapani",
      paragraphs: [
        "Egadisailing opera desde Trapani, en Via dei Gladioli 15, cerca del Puerto de Trapani y de los embarques hacia las Islas Egadi. Desde aquí organizamos excursiones en barco a Favignana y Levanzo, tours privados, charter en trimarán, experiencias con chef a bordo y pesca deportiva.",
        "Antes de la salida confirmamos por WhatsApp o email el muelle, la hora de encuentro, el nombre del barco y cualquier indicación útil sobre aparcamiento, equipaje, meteo y ruta prevista. Para grupos, familias o charter de varios días recomendamos escribir con antelación para elegir la fórmula correcta.",
      ],
      facts: ["Via dei Gladioli 15, 91100 Trapani", "Salida cerca del Puerto de Trapani", "Asistencia en italiano e inglés"],
    };
  }
  if (locale === "fr") {
    return {
      heading: "Point de rendez-vous Egadisailing à Trapani",
      paragraphs: [
        "Egadisailing opère depuis Trapani, Via dei Gladioli 15, près du port de Trapani et des départs vers les îles Égades. C'est le point de référence pour les excursions en bateau vers Favignana et Levanzo, les tours privés, le charter en trimaran, les expériences avec chef à bord et la pêche sportive.",
        "Avant le départ, nous confirmons par WhatsApp ou email le quai, l'heure de rendez-vous, le nom du bateau et les indications utiles sur stationnement, bagages, météo et itinéraire prévu. Pour groupes, familles ou charter sur plusieurs jours, mieux vaut nous contacter à l'avance.",
      ],
      facts: ["Via dei Gladioli 15, 91100 Trapani", "Départ près du port de Trapani", "Assistance en italien et anglais"],
    };
  }
  if (locale === "de") {
    return {
      heading: "Egadisailing Treffpunkt in Trapani",
      paragraphs: [
        "Egadisailing startet in Trapani, Via dei Gladioli 15, nahe dem Hafen von Trapani und den Verbindungen zu den Ägadischen Inseln. Von hier organisieren wir Bootstouren nach Favignana und Levanzo, private Touren, Trimaran-Charter, Erlebnisse mit Chef an Bord und Sportangeln.",
        "Vor der Abfahrt bestätigen wir per WhatsApp oder E-Mail den Steg, die Treffzeit, den Bootsnamen sowie Hinweise zu Parken, Gepäck, Wetter und geplanter Route. Für Gruppen, Familien oder mehrtägige Charter empfehlen wir eine frühzeitige Anfrage.",
      ],
      facts: ["Via dei Gladioli 15, 91100 Trapani", "Abfahrt nahe dem Hafen von Trapani", "Betreuung auf Italienisch und Englisch"],
    };
  }
  if (locale === "en") {
    return {
      heading: "Egadisailing meeting point in Trapani",
      paragraphs: [
        "Egadisailing operates from Trapani, at Via dei Gladioli 15, close to the Port of Trapani and the routes to the Egadi Islands. This is the reference point for boat tours to Favignana and Levanzo, private tours, trimaran charters, chef-on-board experiences and sport fishing.",
        "Before departure we confirm by WhatsApp or email the pier, meeting time, boat name and useful notes about parking, luggage, weather and the planned route. For groups, families or multi-day charters, contacting us early helps us recommend the right formula.",
      ],
      facts: ["Via dei Gladioli 15, 91100 Trapani, Italy", "Departure near the Port of Trapani", "Support in Italian and English"],
    };
  }
  return {
    heading: "Punto di incontro Egadisailing a Trapani",
    paragraphs: [
      "Egadisailing opera da Trapani, in Via dei Gladioli 15, vicino al Porto di Trapani e agli imbarchi verso le Isole Egadi. Da qui organizziamo tour in barca a Favignana e Levanzo, esperienze private, charter in trimarano, giornate con chef a bordo e charter pesca sportiva.",
      "Prima della partenza confermiamo via WhatsApp o email molo, orario di incontro, nome della barca e indicazioni utili su parcheggio, bagagli, meteo e rotta prevista. Per gruppi, famiglie o charter di più giorni è meglio scriverci in anticipo, così possiamo consigliare la formula più adatta.",
    ],
    facts: ["Via dei Gladioli 15, 91100 Trapani", "Partenza vicino al Porto di Trapani", "Assistenza in italiano e inglese"],
  };
}

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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return buildPageMetadata({
    title: isEs
      ? "Reservas y contactos para excursiones en barco a las Islas Egadi"
      : isFr
        ? "Réservations et contacts pour excursions en bateau aux îles Égades"
      : isDe
        ? "Buchungen und Kontakt für Bootstouren zu den Ägadischen Inseln"
      : locale === "en"
        ? "Egadi Boat Tour Bookings and Contacts"
        : "Prenotazioni e contatti per tour alle Egadi",
    description:
      isEs
        ? "Reserva o solicita información para tu excursión en barco a las Islas Egadi. Contacta con Egadisailing por WhatsApp, teléfono o email."
        : isFr
        ? "Réservez ou demandez des informations pour votre excursion en bateau aux îles Égades. Contactez Egadisailing par WhatsApp, téléphone ou email."
        : isDe
        ? "Buchen Sie oder fragen Sie Informationen für Ihre Bootstour zu den Ägadischen Inseln an. Kontaktieren Sie Egadisailing per WhatsApp, Telefon oder E-Mail."
        : locale === "en"
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
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const whatsappContacts = getOrderedWhatsAppContacts(locale);
  const localSeoCopy = getContactLocalSeoCopy(locale);
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${siteBase}${localizedPath(locale, "/contacts")}`;
  const localBusinessId = `${siteBase}/#localbusiness`;
  const contactJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Egadi Sailing", item: `${siteBase}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Contact", item: pageUrl },
        ],
      },
      {
        "@type": "ContactPage",
        name: localSeoCopy.heading,
        url: pageUrl,
        mainEntity: {
          "@type": ["LocalBusiness", "TravelAgency"],
          "@id": localBusinessId,
          name: "Egadi Sailing",
          legalName: PUBLIC_COMPANY_LEGAL.name,
          alternateName: "Egadisailing",
          url: siteBase,
          email: PUBLIC_CONTACT_EMAIL,
          telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
          address: PUBLIC_CONTACT_POSTAL_ADDRESS,
          geo: PUBLIC_CONTACT_GEO,
          openingHoursSpecification: PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
          areaServed: ["Trapani", "Isole Egadi", "Favignana", "Levanzo", "Marettimo"].map(
            (name) => ({ "@type": "Place", name }),
          ),
          priceRange: "€€-€€€",
          sameAs: PUBLIC_REVIEW_LINKS.tripadvisorProfiles,
          hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
        },
      },
    ],
  };
  const copy = {
    title: isEs
      ? "Reserva o solicita información para tu excursión en barco a las Islas Egadi"
      : isFr
        ? "Réservez ou demandez des informations pour votre excursion en bateau aux îles Égades"
        : isDe
          ? "Buchen Sie oder fragen Sie Informationen für Ihre Bootstour zu den Ägadischen Inseln an"
      : isEn
        ? "Book or request information for your boat trip in the Egadi Islands"
        : "Prenota o richiedi informazioni per la tua uscita in barca alle Egadi",
    subtitle: isEs
      ? "¿Tienes preguntas, quieres reservar o necesitas ayuda para elegir la experiencia adecuada? Estamos aquí."
      : isFr
        ? "Des questions, une réservation ou besoin d'aide pour choisir la bonne expérience ? Nous sommes là."
        : isDe
          ? "Haben Sie Fragen, möchten Sie buchen oder brauchen Sie Hilfe bei der Wahl des passenden Erlebnisses? Wir sind da."
      : isEn
        ? "Questions, bookings, or a little help choosing the right experience? We are here."
        : "Hai domande, vuoi prenotare o semplicemente saperne di più? Siamo qui.",
    locationLabel: isEs ? "Dónde estamos" : isFr ? "Où nous sommes" : isDe ? "Wo wir sind" : isEn ? "Where we are" : "Dove siamo",
    address: getContactLocationLabel(locale),
    phoneLabel: isEs ? "Teléfono y WhatsApp" : isFr ? "Téléphone et WhatsApp" : isDe ? "Telefon und WhatsApp" : isEn ? "Phone and WhatsApp" : "Telefono e WhatsApp",
    writeTitle: isEs ? "Escríbenos" : isFr ? "Écrivez-nous" : isDe ? "Schreiben Sie uns" : isEn ? "Write to us" : "Scrivici",
    writeSubtitle: isEs ? "Respondemos en 24 horas" : isFr ? "Nous répondons sous 24 heures" : isDe ? "Wir antworten innerhalb von 24 Stunden" : isEn ? "We reply within 24 hours" : "Ti rispondiamo entro 24 ore",
  };
  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(contactJsonLd) }}
      />
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
                      <TrackedWhatsAppLink
                        key={contact.key}
                        href={getWhatsAppUrl(contact, locale)}
                        target="_blank"
                        rel="noopener noreferrer"
                        locale={locale}
                        contactKey={contact.key}
                        source="contact_page"
                        className="flex items-center justify-center gap-3 w-full py-4 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-base transition-colors shadow-lg"
                      >
                        <WhatsAppIcon className="h-5 w-5" />
                        <CountryFlag code={contact.flagCode} className="h-4 w-6" />
                        <span>{getWhatsAppLabel(contact, locale)}</span>
                      </TrackedWhatsAppLink>
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
                    loading="eager"
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

      <section className="px-4 pb-28 md:px-8 lg:px-12">
        <ScrollSection animation="fade-up">
          <div className="mx-auto max-w-7xl border-y border-white/10 py-10 text-white">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
              <div>
                <h2 className="font-heading text-3xl font-bold md:text-4xl">{localSeoCopy.heading}</h2>
                <div className="mt-5 space-y-4 text-base leading-7 text-white/68">
                  {localSeoCopy.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <dl className="grid gap-4 text-sm text-white/72">
                {localSeoCopy.facts.map((fact) => (
                  <div key={fact} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">Egadisailing</dt>
                    <dd className="mt-2 font-medium text-white">{fact}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </ScrollSection>
      </section>
    </div>
  );
}
