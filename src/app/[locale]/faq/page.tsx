import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollSection } from "@/components/scroll-section";
import { ChevronDown } from "lucide-react";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { jsonLd } from "@/lib/seo/structured-data";

const faqKeys = [1, 2, 3, 4, 5, 6];

function getFaqIntroCopy(locale: string) {
  if (locale === "es") {
    return {
      heading: "Antes de reservar un paseo en barco por las Egadi",
      paragraphs: [
        "Las excursiones de Egadisailing salen de Trapani y se adaptan a meteo, viento, seguridad y ritmo del grupo. En esta página aclaramos qué llevar, cómo funcionan cancelaciones y cambios de fecha, qué pasa con mal tiempo, niños, comida a bordo y punto de encuentro.",
        "Para elegir bien, compara duración, fórmula compartida o privada, inclusiones y tipo de barco. Favignana y Levanzo funcionan muy bien en una jornada completa; los paseos privados de 4 horas son más ágiles; charter y chef a bordo requieren más planificación.",
      ],
      points: ["Salida desde Trapani", "Rutas según meteo", "Soporte antes de embarcar"],
    };
  }
  if (locale === "fr") {
    return {
      heading: "Avant de réserver une excursion bateau aux Égades depuis Trapani",
      paragraphs: [
        "Les excursions Egadisailing partent de Trapani et sont adaptées à la météo, au vent, à la sécurité et au rythme du groupe. Cette page explique quoi apporter, comment fonctionnent annulations et changements de date, que se passe-t-il en cas de mauvaise météo, enfants, repas à bord et point de rendez-vous.",
        "Pour choisir la bonne formule, comparez durée, excursion partagée ou privée, inclusions et type de bateau. Favignana et Levanzo conviennent très bien à une journée complète; les excursions privées de 4 heures sont plus compactes; charter et chef à bord demandent plus d'organisation.",
      ],
      points: ["Départ de Trapani", "Routes selon météo", "Assistance avant embarquement"],
    };
  }
  if (locale === "de") {
    return {
      heading: "Vor der Buchung einer Bootstour zu den Ägadischen Inseln",
      paragraphs: [
        "Egadisailing-Touren starten in Trapani und werden nach Wetter, Wind, Sicherheit und Gruppentempo angepasst. Diese Seite erklärt, was Sie mitbringen sollten, wie Storno und Datumsänderungen funktionieren, was bei schlechtem Wetter passiert und was für Kinder, Essen an Bord und Treffpunkt gilt.",
        "Für die richtige Wahl vergleichen Sie Dauer, geteilte oder private Formel, Leistungen und Bootstyp. Favignana und Levanzo passen sehr gut zu einem ganzen Tag; 4-Stunden-Touren sind kompakter; Charter und Chef an Bord brauchen mehr Planung.",
      ],
      points: ["Abfahrt ab Trapani", "Routen nach Wetter", "Support vor dem Boarding"],
    };
  }
  if (locale === "en") {
    return {
      heading: "Before booking an Egadi Islands boat tour",
      paragraphs: [
        "Egadisailing tours depart from Trapani and are adapted to weather, wind, safety and group pace. This page explains what to bring, how cancellations and date changes work, what happens in bad weather, and what to know about children, lunch on board and the meeting point.",
        "To choose well, compare duration, shared or private format, inclusions and boat type. Favignana and Levanzo work best as a full-day route; 4-hour tours are more compact; charters and chef-on-board experiences need more planning.",
      ],
      points: ["Departure from Trapani", "Weather-aware routes", "Support before boarding"],
    };
  }
  return {
    heading: "Prima di prenotare un tour in barca alle Egadi",
    paragraphs: [
      "Le esperienze Egadisailing partono da Trapani e vengono adattate a meteo, vento, sicurezza e ritmo del gruppo. In questa pagina trovi risposte pratiche su cosa portare, cancellazioni, cambi data, maltempo, bambini, pranzo a bordo e punto di incontro.",
      "Per scegliere bene confronta durata, formula condivisa o privata, inclusioni e tipo di barca. Favignana e Levanzo funzionano al meglio in giornata intera; i tour da 4 ore sono più agili; charter e chef a bordo richiedono una pianificazione più mirata.",
    ],
    points: ["Partenza da Trapani", "Rotte secondo meteo", "Assistenza prima dell'imbarco"],
  };
}

const faqSeoDescriptions: Record<string, string> = {
  it: "Risposte chiare su tour in barca alle Egadi da Trapani: itinerari, meteo, prezzi, cosa portare, prenotazioni, cancellazioni e servizi a bordo.",
  en: "Clear answers about Egadi Islands boat tours from Trapani: routes, weather, prices, what to bring, bookings, cancellations and services on board.",
  es: "Respuestas claras sobre paseos y excursiones en barco a las Islas Egadi desde Trapani: rutas, clima, precios, qué llevar, reservas y servicios a bordo.",
  fr: "Réponses claires sur les excursions bateau aux îles Égades depuis Trapani : itinéraires, météo, prix, affaires à prévoir, réservations et services à bord.",
  de: "Klare Antworten zu Bootstouren zu den Ägadischen Inseln ab Trapani: Routen, Wetter, Preise, Packliste, Buchung, Storno und Bordservice.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return buildPageMetadata({
    title: t("title"),
    description: faqSeoDescriptions[locale] ?? faqSeoDescriptions.it,
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
  const introCopy = getFaqIntroCopy(locale);
  const faqItems = faqKeys.map((n) => ({
    question: t(`q${n}`),
    answer: t(`a${n}`),
  }));
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="bg-[#fefce8]/30 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }}
      />
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

      <section className="px-6 pt-16 md:px-12 lg:px-20">
        <div className="mx-auto max-w-4xl rounded-lg border border-sky-100 bg-white/80 p-6 shadow-sm md:p-8">
          <h2 className="font-heading text-3xl font-bold text-[var(--color-ocean)]">{introCopy.heading}</h2>
          <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
            {introCopy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {introCopy.points.map((point) => (
              <div key={point} className="rounded-md bg-sky-50 px-4 py-3 text-sm font-semibold text-[var(--color-ocean)]">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-16 px-6 md:px-12 lg:px-20">
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, i) => (
            <ScrollSection key={item.question} animation="fade-up" delay={i * 0.08}>
              <details className="group rounded-2xl bg-white/90 backdrop-blur shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer p-6 list-none [&::-webkit-details-marker]:hidden">
                  <h3 className="font-heading text-lg font-bold text-[var(--color-ocean)] pr-4">
                    {item.question}
                  </h3>
                  <ChevronDown className="h-5 w-5 shrink-0 text-[var(--color-turquoise)] transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
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
