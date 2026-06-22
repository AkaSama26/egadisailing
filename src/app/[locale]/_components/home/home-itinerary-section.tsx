"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { localizedPath } from "@/lib/i18n/paths";
import { localizedExperiencePath } from "@/lib/i18n/public-experience-paths";

interface HomeItinerarySectionProps {
  locale: string;
}

interface ItineraryPoint {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

function itineraryCopy(locale: string) {
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isEn = locale === "en";

  const points: ItineraryPoint[] = [
    {
      eyebrow: isEs ? "Salida" : isFr ? "Départ" : isDe ? "Abfahrt" : isEn ? "Departure" : "Partenza",
      title: isEs
        ? "Salida del Porto di Trapani"
        : isFr
        ? "Départ du Porto di Trapani"
        : isDe
        ? "Abfahrt vom Porto di Trapani"
        : isEn
        ? "Departure from Trapani harbour"
        : "Partenza dal Porto di Trapani",
      text: isEs
        ? "El tour en barco a Favignana y Levanzo sale desde Via dei Gladioli 15, con check-in claro, skipper local y ruta elegida según mar y viento."
        : isFr
        ? "Le tour en bateau vers Favignana et Levanzo part de Via dei Gladioli 15, avec check-in clair, skipper local et route choisie selon mer et vent."
        : isDe
        ? "Die Bootstour nach Favignana und Levanzo startet in der Via dei Gladioli 15, mit klarem Check-in, lokalem Skipper und Route nach Meer und Wind."
        : isEn
        ? "The boat tour to Favignana and Levanzo departs from Via dei Gladioli 15, with clear check-in, a local skipper and a route shaped by sea and wind."
        : "Il tour in barca a Favignana e Levanzo parte da Via dei Gladioli 15, con check-in chiaro, skipper locale e rotta scelta secondo mare e vento.",
      href: localizedExperiencePath(locale, "boat-shared-full-day"),
      cta: isEs ? "Ver tour 8 horas" : isFr ? "Voir le tour 8 heures" : isDe ? "8-Stunden-Tour ansehen" : isEn ? "View 8-hour tour" : "Vedi tour 8 ore",
    },
    {
      eyebrow: isEs ? "Calas icono" : isFr ? "Criques iconiques" : isDe ? "Ikonische Buchten" : isEn ? "Iconic coves" : "Cale iconiche",
      title: isEs
        ? "Cala Rossa, Cala Azzurra y Bue Marino"
        : isFr
        ? "Cala Rossa, Cala Azzurra et Bue Marino"
        : isDe
        ? "Cala Rossa, Cala Azzurra und Bue Marino"
        : isEn
        ? "Cala Rossa, Cala Azzurra and Bue Marino"
        : "Cala Rossa, Cala Azzurra e Bue Marino",
      text: isEs
        ? "Las paradas más buscadas de Favignana desde el mar: agua turquesa, roca de toba, cuevas, fondos claros y tiempo para nadar cuando las condiciones lo permiten."
        : isFr
        ? "Les arrêts les plus recherchés de Favignana depuis la mer : eau turquoise, roche de tuf, grottes, fonds clairs et temps pour se baigner lorsque les conditions le permettent."
        : isDe
        ? "Die meistgesuchten Stopps von Favignana vom Meer aus: türkisfarbenes Wasser, Tuffstein, Höhlen, klare Meeresgründe und Badezeit, wenn die Bedingungen passen."
        : isEn
        ? "Favignana's most searched sea stops: turquoise water, tuff rock, caves, clear seabeds and time to swim when the conditions allow."
        : "Le tappe più cercate di Favignana dal mare: acqua turchese, roccia di tufo, grotte, fondali chiari e tempo per il bagno quando le condizioni lo permettono.",
      href: localizedExperiencePath(locale, "boat-exclusive-full-day"),
      cta: isEs ? "Ver tour privado" : isFr ? "Voir tour privé" : isDe ? "Private Tour ansehen" : isEn ? "View private tour" : "Vedi tour privato",
    },
    {
      eyebrow: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
      title: isEs
        ? "Baños, snorkeling y almuerzo/chef a bordo"
        : isFr
        ? "Baignades, snorkeling et déjeuner/chef à bord"
        : isDe
        ? "Badestopps, Schnorcheln und Mittagessen/Chef an Bord"
        : isEn
        ? "Swim stops, snorkelling and lunch/chef on board"
        : "Soste bagno, snorkeling e pranzo/chef a bordo",
      text: isEs
        ? "La experiencia no es solo una ruta: máscaras, paradas de baño, aperitivo, almuerzo a bordo y, en la fórmula premium, chef en trimarán con confort de catamarán."
        : isFr
        ? "L'expérience n'est pas seulement une route : masques, baignades, apéritif, déjeuner à bord et, en formule premium, chef en trimaran avec confort de catamaran."
        : isDe
        ? "Das Erlebnis ist nicht nur eine Route: Masken, Badestopps, Aperitif, Mittagessen an Bord und im Premium-Format ein Chef im Trimaran mit Katamaran-Komfort."
        : isEn
        ? "The experience is not only a route: masks, swim stops, aperitivo, lunch on board and, in the premium format, a chef on a trimaran with catamaran-style comfort."
        : "L'esperienza non è solo una rotta: maschere, soste bagno, aperitivo, pranzo a bordo e, nella formula premium, chef in trimarano con comfort da catamarano.",
      href: localizedExperiencePath(locale, "exclusive-experience"),
      cta: isEs ? "Ver experiencia chef" : isFr ? "Voir expérience chef" : isDe ? "Chef-Erlebnis ansehen" : isEn ? "View chef experience" : "Vedi esperienza chef",
    },
    {
      eyebrow: isEs ? "Fórmulas" : isFr ? "Formules" : isDe ? "Formate" : isEn ? "Formats" : "Formule",
      title: isEs
        ? "Tour compartido, tour privado o charter Egadi"
        : isFr
        ? "Tour partagé, tour privé ou charter aux Égades"
        : isDe
        ? "Geteilte Tour, private Tour oder Egadi-Charter"
        : isEn
        ? "Shared tour, private tour or Egadi charter"
        : "Tour condiviso, tour privato o charter Egadi",
      text: isEs
        ? "Elige una excursión compartida de día completo, un tour privado de 4 u 8 horas o un charter en trimarán para vivir Favignana, Levanzo y Marettimo con más tiempo."
        : isFr
        ? "Choisissez une excursion partagée d'une journée, un tour privé de 4 ou 8 heures ou un charter en trimaran pour vivre Favignana, Levanzo et Marettimo avec plus de temps."
        : isDe
        ? "Wählen Sie einen geteilten Tagesausflug, eine private 4- oder 8-Stunden-Tour oder einen Trimaran-Charter, um Favignana, Levanzo und Marettimo mit mehr Zeit zu erleben."
        : isEn
        ? "Choose a full-day shared excursion, a private 4 or 8-hour tour or a trimaran charter to experience Favignana, Levanzo and Marettimo with more time."
        : "Scegli un'escursione condivisa giornaliera, un tour privato da 4 o 8 ore o un charter in trimarano per vivere Favignana, Levanzo e Marettimo con più tempo.",
      href: localizedExperiencePath(locale, "cabin-charter"),
      cta: isEs ? "Ver charter Egadi" : isFr ? "Voir charter Égades" : isDe ? "Egadi-Charter ansehen" : isEn ? "View Egadi charter" : "Vedi charter Egadi",
    },
  ];

  return {
    eyebrow: isEs ? "Itinerario Egadi" : isFr ? "Itinéraire Égades" : isDe ? "Egadi Route" : isEn ? "Egadi itinerary" : "Itinerario Egadi",
    title: isEs
      ? "Paseo en barco desde Trapani a Favignana y Levanzo: ruta, calas y fórmulas"
      : isFr
      ? "Tour en bateau Favignana et Levanzo depuis Trapani : route, criques et formules"
      : isDe
      ? "Bootstour ab Trapani nach Favignana und Levanzo: Route, Buchten und Formate"
      : isEn
      ? "Favignana and Levanzo boat tour from Trapani: route, coves and formats"
      : "Tour in barca Favignana e Levanzo da Trapani: itinerario, cale e formule",
    intro: isEs
      ? "Una guía rápida para elegir tu paseo en barco desde Trapani a las Islas Egadi: Favignana y Levanzo, Cala Rossa, Cala Azzurra, Bue Marino, paradas de baño, snorkel, almuerzo a bordo y opciones entre tour compartido, tour privado o charter."
      : isFr
      ? "Un guide rapide pour choisir votre tour en bateau aux îles Égades : départ du Porto di Trapani, Favignana et Levanzo, Cala Rossa, Cala Azzurra, Bue Marino, baignades, snorkeling, déjeuner à bord et choix entre tour partagé, tour privé ou charter."
      : isDe
      ? "Eine schnelle Orientierung für Ihre Bootstour ab Trapani zu den Ägadischen Inseln: Favignana und Levanzo, Cala Rossa, Cala Azzurra, Bue Marino, Badestopps, Schnorcheln, Mittagessen an Bord und Wahl zwischen geteilter Tour, privater Tour oder Charter."
      : isEn
      ? "A quick guide to choosing your Egadi Islands boat tour: departure from Trapani harbour, Favignana and Levanzo, Cala Rossa, Cala Azzurra, Bue Marino, swim stops, snorkelling, lunch on board and the choice between shared tour, private tour or charter."
      : "Una guida rapida per scegliere il tour in barca alle Isole Egadi: partenza dal Porto di Trapani, Favignana e Levanzo, Cala Rossa, Cala Azzurra, Bue Marino, soste bagno, snorkeling, pranzo a bordo e scelta tra tour condiviso, tour privato o charter.",
    imageAlt: isEs
      ? "Trimarán en Favignana durante un tour en barco Favignana y Levanzo desde Trapani"
      : isFr
      ? "Trimaran à Favignana pendant un tour en bateau Favignana et Levanzo depuis Trapani"
      : isDe
      ? "Trimaran vor Favignana während einer Bootstour Favignana und Levanzo ab Trapani"
      : isEn
      ? "Trimaran in Favignana during a Favignana and Levanzo boat tour from Trapani"
      : "Trimarano a Favignana durante un tour in barca Favignana e Levanzo da Trapani",
    overviewHref: localizedPath(locale, "/experiences"),
    overviewCta: isEs
      ? "Comparar todos los paseos en barco desde Trapani"
      : isFr
      ? "Comparer tous les tours en bateau aux Égades"
      : isDe
      ? "Alle Bootstouren ab Trapani vergleichen"
      : isEn
      ? "Compare all Egadi Islands boat tours"
      : "Confronta tutti i tour in barca alle Egadi",
    points,
  };
}

function ItineraryPointCard({ point }: { point: ItineraryPoint }) {
  return (
    <article className="border-l border-white/14 py-1 pl-5 transition hover:border-[var(--color-gold)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
        {point.eyebrow}
      </p>
      <h3 className="mt-2 font-heading text-2xl font-semibold leading-tight text-white md:text-3xl">
        {point.title}
      </h3>
      <p className="mt-3 text-sm font-medium leading-6 text-white/74 md:text-base">
        {point.text}
      </p>
      <Link
        href={point.href}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition-all hover:gap-3 hover:text-[var(--color-gold)]"
      >
        {point.cta}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function HomeItinerarySection({ locale }: HomeItinerarySectionProps) {
  const copy = itineraryCopy(locale);

  return (
    <section
      id="itinerario-tour-egadi"
      aria-labelledby="home-itinerary-title"
      className="egadi-water-reflection relative overflow-hidden px-4 py-28 text-white md:px-8 lg:px-12 lg:py-32"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 42%, #071934 100%)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[96rem]">
        <ScrollSection animation="fade-up">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                {copy.eyebrow}
              </p>
              <h2
                id="home-itinerary-title"
                className="mt-4 max-w-5xl font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl lg:text-6xl"
              >
                {copy.title}
              </h2>
            </div>
            <div className="max-w-3xl lg:justify-self-end">
              <p className="text-base font-medium leading-8 text-white/76 md:text-lg">
                {copy.intro}
              </p>
              <Link
                href={copy.overviewHref}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white transition-all hover:gap-3 hover:text-[var(--color-gold)]"
              >
                {copy.overviewCta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </ScrollSection>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)] lg:items-stretch xl:gap-14">
          <ScrollSection animation="fade-left" className="h-full">
            <div className="relative min-h-[31rem] overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] shadow-[0_32px_90px_rgba(0,0,0,0.26)] sm:min-h-[43rem] lg:h-full">
              <Image
                src="/images/home/trimarano-favignana.webp"
                alt={copy.imageAlt}
                fill
                sizes="(max-width: 1024px) 92vw, 56vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/86 via-[#071934]/18 to-transparent" />
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-right" className="h-full">
            <div className="grid h-full gap-7">
              {copy.points.map((point) => (
                <ItineraryPointCard key={point.title} point={point} />
              ))}
            </div>
          </ScrollSection>
        </div>
      </div>
    </section>
  );
}
