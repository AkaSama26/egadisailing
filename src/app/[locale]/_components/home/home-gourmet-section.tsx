"use client";

import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { localizedExperiencePath } from "@/lib/i18n/public-experience-paths";

interface HomeGourmetSectionProps {
  locale: string;
}

interface GourmetPillar {
  title: string;
  text: string;
}

function gourmetCopy(locale: string) {
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isEn = locale === "en";

  const pillars: GourmetPillar[] = [
    {
      title: isEs
        ? "Almuerzo a bordo y cocina local"
        : isFr
        ? "Déjeuner à bord et cuisine locale"
        : isDe
        ? "Mittagessen an Bord und lokale Küche"
        : isEn
        ? "Lunch on board and local cuisine"
        : "Pranzo a bordo e cucina locale",
      text: isEs
        ? "Platos preparados durante la jornada con sabores sicilianos, productos del territorio y una atención que transforma el tour en una experiencia privada."
        : isFr
        ? "Des plats préparés pendant la journée avec saveurs siciliennes, produits du territoire et une attention qui transforme le tour en expérience privée."
        : isDe
        ? "Gerichte, die während des Tages mit sizilianischen Aromen, lokalen Produkten und einer Aufmerksamkeit zubereitet werden, die die Tour zum privaten Erlebnis macht."
        : isEn
        ? "Dishes prepared during the day with Sicilian flavours, local ingredients and a level of care that turns the tour into a private experience."
        : "Piatti preparati durante la giornata con sapori siciliani, prodotti del territorio e una cura che trasforma il tour in un'esperienza privata.",
    },
    {
      title: isEs
        ? "Pescado fresco, aperitivo y vinos sicilianos"
        : isFr
        ? "Poisson frais, apéritif et vins siciliens"
        : isDe
        ? "Frischer Fisch, Aperitif und sizilianische Weine"
        : isEn
        ? "Fresh fish, aperitivo and Sicilian wines"
        : "Pesce fresco, aperitivo e vini siciliani",
      text: isEs
        ? "Pescado fresco comprado por la mañana, aperitivos en cubierta, vinos locales y platos cuidados para un almuerzo en rada entre Favignana y Levanzo."
        : isFr
        ? "Poisson frais acheté le matin, apéritifs sur le pont, vins locaux et plats soignés pour un déjeuner au mouillage entre Favignana et Levanzo."
        : isDe
        ? "Morgens gekaufter frischer Fisch, Aperitif an Deck, lokale Weine und sorgfältig zubereitete Gerichte für ein Mittagessen vor Anker zwischen Favignana und Levanzo."
        : isEn
        ? "Fresh fish bought in the morning, aperitifs on deck, local wines and refined dishes for lunch at anchor between Favignana and Levanzo."
        : "Pesce fresco acquistato la mattina, aperitivi in coperta, vini locali e piatti curati per un pranzo in rada tra Favignana e Levanzo.",
    },
    {
      title: isEs
        ? "Trimarán con confort de catamarán"
        : isFr
        ? "Trimaran avec confort de catamaran"
        : isDe
        ? "Trimaran mit Katamaran-Komfort"
        : isEn
        ? "Trimaran with catamaran-style comfort"
        : "Trimarano con comfort da catamarano",
      text: isEs
        ? "Espacios amplios, zonas de relax, sombra y privacidad: una fórmula premium para quien busca más que una excursión estándar por las Egadi."
        : isFr
        ? "Grands espaces, zones de détente, ombre et intimité : une formule premium pour ceux qui cherchent plus qu'une excursion standard aux Égades."
        : isDe
        ? "Große Flächen, Relaxbereiche, Schatten und Privatsphäre: ein Premium-Format für alle, die mehr als einen Standardausflug zu den Egadi suchen."
        : isEn
        ? "Wide spaces, relaxation areas, shade and privacy: a premium format for guests looking for more than a standard Egadi excursion."
        : "Spazi ampi, zone relax, ombra e privacy: una formula premium per chi cerca più di una semplice escursione standard alle Egadi.",
    },
  ];

  return {
    eyebrow: isEs
      ? "Experiencia gourmet Egadi"
      : isFr
      ? "Expérience gourmet Égades"
      : isDe
      ? "Gourmet-Erlebnis Egadi"
      : isEn
      ? "Egadi gourmet experience"
      : "Esperienza gourmet Egadi",
    title: isEs
      ? "No es un simple catamarán: es una experiencia gourmet en trimarán"
      : isFr
      ? "Pas un simple catamaran : une expérience gourmet en trimaran"
      : isDe
      ? "Nicht einfach ein Katamaran: ein Gourmet-Erlebnis im Trimaran"
      : isEn
      ? "Not just a catamaran: a gourmet experience on a trimaran"
      : "Non è un semplice catamarano: è un'esperienza gourmet in trimarano",
    intro: isEs
      ? "Con Egadi Sailing, el tour en barco por las Islas Egadi se vuelve una experiencia premium luxury: almuerzo a bordo cocinado por la tripulación, pausa en rada, pescado fresco comprado por la mañana, aperitivos, vinos sicilianos y una navegación lenta entre Favignana y Levanzo en trimarán con confort de catamarán."
      : isFr
      ? "Avec Egadi Sailing, le tour en bateau aux îles Égades devient une expérience premium luxury : déjeuner à bord, déjeuner au mouillage, poisson frais acheté le matin, apéritifs, vins siciliens et navigation lente entre Favignana et Levanzo en trimaran avec confort de catamaran."
      : isDe
      ? "Mit Egadi Sailing wird die Bootstour zu den Ägadischen Inseln zu einem Premium-Luxury-Erlebnis: Mittagessen an Bord, Mittagessen vor Anker, morgens gekaufter frischer Fisch, Aperitifs, sizilianische Weine und langsame Fahrt zwischen Favignana und Levanzo im Trimaran mit Katamaran-Komfort."
      : isEn
      ? "With Egadi Sailing, the Egadi Islands boat tour becomes a premium luxury experience: lunch on board, lunch at anchor, fresh fish bought in the morning, aperitifs, Sicilian wines and slow sailing between Favignana and Levanzo on a trimaran with catamaran-style comfort."
      : "Con Egadi Sailing, il tour in barca alle Isole Egadi diventa un'esperienza premium luxury: pranzo a bordo, pranzo in rada, pesce fresco acquistato la mattina, aperitivi, vini siciliani e navigazione lenta tra Favignana e Levanzo in trimarano con comfort da catamarano.",
    imageAlt: isEs
      ? "Vino trapanés servido a bordo del trimarán durante una experiencia gourmet por las Islas Egadi"
      : isFr
      ? "Vin de Trapani servi à bord du trimaran pendant une expérience gourmet aux îles Égades"
      : isDe
      ? "Trapanischer Wein an Bord des Trimarans während eines Gourmet-Erlebnisses auf den Egadi"
      : isEn
      ? "Trapani wine served on board the trimaran during an Egadi Islands gourmet experience"
      : "Vino trapanese servito a bordo del trimarano durante un'esperienza gourmet alle Isole Egadi",
    tableImageAlt: isEs
      ? "Ingredientes frescos y pescado local para el almuerzo gourmet a bordo del trimarán"
      : isFr
      ? "Ingrédients frais et poisson local pour le déjeuner gourmet à bord du trimaran"
      : isDe
      ? "Frische Zutaten und lokaler Fisch für das Gourmet-Mittagessen an Bord des Trimarans"
      : isEn
      ? "Fresh ingredients and local fish for a gourmet lunch on board the trimaran"
      : "Ingredienti freschi e pesce locale per il pranzo gourmet a bordo del trimarano",
    aperitivoImageAlt: isEs
      ? "Pasta preparada a bordo del trimarán durante el tour gourmet entre Favignana y Levanzo"
      : isFr
      ? "Pâtes préparées à bord du trimaran pendant le tour gourmet entre Favignana et Levanzo"
      : isDe
      ? "Pasta an Bord des Trimarans während der Gourmet-Tour zwischen Favignana und Levanzo"
      : isEn
      ? "Pasta prepared on board the trimaran during the gourmet tour between Favignana and Levanzo"
      : "Pasta cucinata a bordo del trimarano durante il tour gourmet tra Favignana e Levanzo",
    cta: isEs
      ? "Descubre la experiencia gourmet"
      : isFr
      ? "Découvrir l'expérience gourmet"
      : isDe
      ? "Gourmet-Erlebnis entdecken"
      : isEn
      ? "Explore the gourmet experience"
      : "Scopri l'esperienza gourmet",
    highlights: isEs
      ? ["Almuerzo a bordo", "Pescado fresco", "Vinos locales"]
      : isFr
      ? ["Déjeuner à bord", "Poisson frais", "Vins locaux"]
      : isDe
      ? ["Mittagessen an Bord", "Frischer Fisch", "Lokale Weine"]
      : isEn
      ? ["Lunch on board", "Fresh fish", "Local wines"]
      : ["Pranzo a bordo", "Pesce fresco", "Vini locali"],
    pillars,
  };
}

export function HomeGourmetSection({ locale }: HomeGourmetSectionProps) {
  const copy = gourmetCopy(locale);

  return (
    <section
      id="esperienza-gourmet-egadi"
      aria-labelledby="home-gourmet-title"
      className="egadi-water-reflection relative overflow-hidden px-4 py-28 text-white md:px-8 lg:px-12 lg:py-32"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0d2b3b 44%, #071934 100%)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[96rem]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center xl:gap-16">
          <ScrollSection animation="fade-left">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
              {copy.eyebrow}
            </p>
            <h2
              id="home-gourmet-title"
              className="mt-4 max-w-4xl font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl lg:text-6xl"
            >
              {copy.title}
            </h2>
            <p className="mt-7 max-w-3xl text-base font-medium leading-8 text-white/78 md:text-lg">
              {copy.intro}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {copy.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/82"
                >
                  <Check className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
                  {highlight}
                </span>
              ))}
            </div>

            <div className="mt-10 grid gap-6">
              {copy.pillars.map((pillar) => (
                <article key={pillar.title} className="border-l border-white/14 pl-5">
                  <h3 className="font-heading text-2xl font-semibold leading-tight text-white md:text-3xl">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/74 md:text-base">
                    {pillar.text}
                  </p>
                </article>
              ))}
            </div>

            <Link
              href={localizedExperiencePath(locale, "exclusive-experience")}
              className="mt-10 inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 hover:text-white"
            >
              {copy.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </ScrollSection>

          <ScrollSection animation="fade-right" className="h-full">
            <div className="grid min-h-[40rem] gap-5 sm:grid-cols-[1fr_0.72fr] lg:min-h-[48rem]">
              <figure className="relative min-h-[30rem] overflow-hidden rounded-lg border border-white/10 shadow-[0_32px_90px_rgba(0,0,0,0.28)] sm:min-h-0">
                <Image
                  src="/images/boats/neel-47/trimarano-calice-primopiano-bere.webp"
                  alt={copy.imageAlt}
                  fill
                  sizes="(max-width: 1024px) 92vw, 46vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/58 via-transparent to-transparent" />
              </figure>

              <div className="grid gap-5">
                <figure className="relative min-h-[18rem] overflow-hidden rounded-lg border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                  <Image
                    src="/images/boats/neel-47/trimarano-ingredienti.webp"
                    alt={copy.tableImageAlt}
                    fill
                    sizes="(max-width: 1024px) 92vw, 24vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/42 via-transparent to-transparent" />
                </figure>
                <figure className="relative min-h-[18rem] overflow-hidden rounded-lg border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
                  <Image
                    src="/images/boats/neel-47/trimarano-pasta-saltata.webp"
                    alt={copy.aperitivoImageAlt}
                    fill
                    sizes="(max-width: 1024px) 92vw, 24vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/42 via-transparent to-transparent" />
                </figure>
              </div>
            </div>
          </ScrollSection>
        </div>
      </div>
    </section>
  );
}
