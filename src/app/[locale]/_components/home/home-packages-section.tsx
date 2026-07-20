"use client";

import { ArrowRight, Check, Clock, MapPin, Ship, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ScrollSection } from "@/components/scroll-section";

export interface FeaturedPolaroid {
  caption: string;
  color: string;
  src?: string;
}

export interface FeaturedPackage {
  key: string;
  serviceIds: string[];
  eyebrow: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  durationLabel: string;
  detailLabel: string;
  capacityLabel: string;
  formulaLabel: string;
  scheduleLabel: string;
  details: Array<{
    title: string;
    text: string;
  }>;
  href: string;
  ctaLabel: string;
  polaroids: FeaturedPolaroid[];
}

interface HomePackagesSectionProps {
  locale: string;
  featuredPackages: FeaturedPackage[];
}

const packagePriority: Record<string, number> = {
  "pranzo-a-bordo": 10,
  "barca-8-ore": 20,
  "barca-4-ore": 30,
  "tour-gommone-egadi-8-ore": 40,
  "tour-gommone-egadi-4-ore": 50,
  charter: 60,
  "charter-pesca": 70,
};

function sectionCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
    eyebrow: isEs
      ? "Experiencias en las Egadi"
      : isFr
      ? "Expériences aux Égades"
      : isDe
      ? "Erlebnisse auf den Egadi"
      : isEn
      ? "Egadi experiences"
      : "Esperienze alle Egadi",
    title: isEs
      ? "Elige tu tour en barco por las Egadi desde Trapani"
      : isFr
      ? "Choisissez votre tour en bateau aux Égades depuis Trapani"
      : isDe
      ? "Wählen Sie Ihre Bootstour zu den Egadi ab Trapani"
      : isEn
      ? "Choose your Egadi Islands boat tour from Trapani"
      : "Scegli il tuo tour in barca alle Egadi da Trapani",
    intro: isEs
      ? "Compara excursiones compartidas o privadas en barco y neumática, experiencias premium en trimarán con almuerzo a bordo, charter de varios días y pesca deportiva. Precio, duración, fórmula y salida se muestran de inmediato para ayudarte a elegir sin perder el estilo del viaje."
      : isFr
      ? "Comparez excursions partagées ou privées en bateau et semi-rigide, expériences premium en trimaran avec déjeuner à bord, charters de plusieurs jours et pêche sportive. Prix, durée, formule et départ restent visibles pour choisir facilement sans perdre l'esprit du voyage."
      : isDe
      ? "Vergleichen Sie geteilte oder private Boots- und RIB-Touren, Premium-Erlebnisse im Trimaran mit Mittagessen an Bord, mehrtägige Charter und Sportangeln. Preis, Dauer, Format und Abfahrt bleiben sichtbar, damit die Auswahl einfach und hochwertig bleibt."
      : isEn
      ? "Compare shared or private boat and RIB tours, premium trimaran experiences with lunch on board, multi-day charters and sport fishing. Price, duration, format and departure stay visible, so choosing feels clear without losing the premium tone."
      : "Confronta tour condivisi o privati in barca e gommone, esperienze premium in trimarano con pranzo a bordo, charter di più giorni e pesca sportiva. Prezzo, durata, formula e partenza restano subito visibili, così scegliere è semplice senza perdere il tono premium del viaggio.",
    policyTitle: isEs
      ? "Meteorología, cancelación y reembolso"
      : isFr
      ? "Météo, annulation et remboursement"
      : isDe
      ? "Wetter, Storno und Erstattung"
      : isEn
      ? "Weather, cancellation and refund"
      : "Meteo, cancellazione e rimborso",
    policyText: isEs
      ? "Ruta y salida se confirman según mar y viento. Si Egadisailing cancela por condiciones no seguras, puedes elegir cambio de fecha gratuito o reembolso completo; la cancelación del cliente sigue las condiciones de reserva."
      : isFr
      ? "La route et le départ sont confirmés selon la mer et le vent. Si Egadisailing annule pour conditions non sûres, vous pouvez choisir un changement de date gratuit ou un remboursement complet ; l'annulation client suit les conditions de réservation."
      : isDe
      ? "Route und Abfahrt werden nach Meer und Wind bestätigt. Wenn Egadisailing wegen unsicherer Bedingungen storniert, wählen Sie kostenfreie Umbuchung oder vollständige Erstattung; Kundenstorno folgt den Buchungsbedingungen."
      : isEn
      ? "Route and departure are confirmed according to sea and wind. If Egadisailing cancels because conditions are unsafe, you can choose a free date change or full refund; customer cancellation follows the booking terms."
      : "Rotta e partenza vengono confermate in base a mare e vento. Se Egadisailing cancella per condizioni non sicure, puoi scegliere cambio data gratuito o rimborso completo; la cancellazione cliente segue i termini di prenotazione.",
    departureLabel: isEs ? "Salida" : isFr ? "Départ" : isDe ? "Abfahrt" : isEn ? "Departure" : "Partenza",
    departureValue: isEs
      ? "Via dei Gladioli 15, Puerto de Trapani"
      : isFr
      ? "Via dei Gladioli 15, port de Trapani"
      : isDe
      ? "Via dei Gladioli 15, Hafen Trapani"
      : isEn
      ? "Via dei Gladioli 15, Trapani harbour"
      : "Via dei Gladioli 15, Porto di Trapani",
    price: isEs ? "Precio" : isFr ? "Prix" : isDe ? "Preis" : isEn ? "Price" : "Prezzo",
    duration: isEs ? "Duración" : isFr ? "Durée" : isDe ? "Dauer" : isEn ? "Duration" : "Durata",
    capacity: isEs ? "Capacidad" : isFr ? "Capacité" : isDe ? "Kapazität" : isEn ? "Capacity" : "Max persone",
    formula: isEs ? "Fórmula" : isFr ? "Formule" : isDe ? "Format" : isEn ? "Format" : "Formula",
    included: isEs ? "Incluye" : isFr ? "Inclus" : isDe ? "Inklusive" : isEn ? "Included" : "Incluso",
    route: isEs ? "Ruta" : isFr ? "Route" : isDe ? "Route" : isEn ? "Route" : "Rotta",
    schedule: isEs ? "Horario" : isFr ? "Horaire" : isDe ? "Zeiten" : isEn ? "Schedule" : "Orari",
    heroBadge: isEs
      ? "Tour más buscado"
      : isFr
      ? "Tour le plus recherché"
      : isDe
      ? "Meistgesuchte Tour"
      : isEn
      ? "Most searched tour"
      : "Tour più cercato",
  };
}

function getPackageImages(experience: FeaturedPackage) {
  return experience.polaroids.filter(
    (image): image is FeaturedPolaroid & { src: string } => Boolean(image.src),
  );
}

function getIncludedItems(experience: FeaturedPackage) {
  return [
    experience.scheduleLabel,
    ...experience.details.map((detail) => detail.text),
  ].filter(Boolean).slice(0, 4);
}

function PackageImage({
  experience,
  className,
  priority = false,
}: {
  experience: FeaturedPackage;
  className: string;
  priority?: boolean;
}) {
  const images = getPackageImages(experience);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, priority ? 3200 : 3800);

    return () => window.clearInterval(intervalId);
  }, [images.length, priority]);

  if (images.length === 0) return null;

  const activeImageIndex = activeIndex % images.length;
  const visibleImageIndexes =
    images.length > 1
      ? [activeImageIndex, (activeImageIndex + 1) % images.length]
      : [activeImageIndex];

  return (
    <figure className={`relative overflow-hidden rounded-lg border border-white/10 ${className}`}>
      {visibleImageIndexes.map((imageIndex) => {
        const image = images[imageIndex];
        if (!image) return null;

        const isActive = imageIndex === activeImageIndex;

        return (
          <Image
            key={`${image.src}-${imageIndex}`}
            src={image.src}
            alt={isActive ? `${experience.title} - ${image.caption}` : ""}
            aria-hidden={isActive ? undefined : true}
            fill
            sizes={priority ? "(min-width: 1024px) 54vw, 96vw" : "(min-width: 1024px) 45vw, 96vw"}
            className={`object-cover transition-opacity duration-700 ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.02)_0%,rgba(3,10,24,0.16)_54%,rgba(3,10,24,0.58)_100%)]" />
    </figure>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border-t border-white/14 pt-2.5">
      <dt className="flex items-center gap-2 text-[0.64rem] font-semibold uppercase tracking-[0.13em] text-[var(--color-gold)]">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-[0.8rem] font-semibold leading-5 text-white/86">
        {value}
      </dd>
    </div>
  );
}

function HeroPackage({
  experience,
  locale,
}: {
  experience: FeaturedPackage;
  locale: string;
}) {
  const copy = sectionCopy(locale);
  const includedItems = getIncludedItems(experience);

  return (
    <ScrollSection animation="fade-up">
      <article className="group grid overflow-hidden rounded-lg border border-white/12 bg-white/[0.045] shadow-[0_30px_90px_rgba(0,0,0,0.18)] lg:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)]">
        <PackageImage
          experience={experience}
          priority
          className="aspect-[16/9] min-h-[260px] lg:aspect-auto lg:min-h-[450px]"
        />

        <div className="flex flex-col justify-center p-5 md:p-6 lg:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="rounded-full border border-[var(--color-gold)]/45 bg-[var(--color-gold)]/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {copy.heroBadge}
            </span>
            <span className="text-sm font-semibold text-white/70">
              {experience.eyebrow}
            </span>
          </div>

          <h3 className="font-heading text-3xl font-semibold leading-[1.03] text-white md:text-[2.35rem] lg:text-[2.85rem]">
            {experience.title}
          </h3>

          <p className="mt-3.5 text-[0.86rem] font-medium leading-6 text-white/78 md:text-[0.94rem]">
            {experience.subtitle}
          </p>

          <dl className="mt-5 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Fact icon={Ship} label={copy.price} value={experience.priceLabel} />
            <Fact icon={Clock} label={copy.duration} value={experience.durationLabel} />
            <Fact icon={Users} label={copy.capacity} value={experience.capacityLabel} />
            <Fact icon={MapPin} label={copy.departureLabel} value={copy.departureValue} />
          </dl>

          <div className="mt-5 grid gap-2">
            {includedItems.map((item) => (
              <p key={item} className="flex gap-2.5 text-[0.8rem] font-medium leading-5 text-white/76">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
                <span>{item}</span>
              </p>
            ))}
          </div>

          <Link
            href={experience.href}
            aria-label={`${experience.ctaLabel}: ${experience.title}`}
            className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-white transition-all hover:gap-3"
          >
            {experience.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </ScrollSection>
  );
}

function CompactPackage({
  experience,
  locale,
}: {
  experience: FeaturedPackage;
  locale: string;
}) {
  const copy = sectionCopy(locale);
  const includedItems = getIncludedItems(experience).slice(0, 3);

  return (
    <ScrollSection animation="fade-up" className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-white/12 bg-white/[0.04]">
        <PackageImage
          experience={experience}
          className="aspect-[16/10] min-h-[190px] md:min-h-[205px]"
        />

        <div className="flex flex-1 flex-col p-4 md:p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-[var(--color-gold)]">
            {experience.eyebrow}
          </p>

          <h3 className="mt-2.5 font-heading text-[1.55rem] font-semibold leading-[1.05] text-white md:text-[1.9rem]">
            {experience.title}
          </h3>

          <p className="mt-2.5 text-[0.8rem] font-medium leading-5 text-white/74">
            {experience.subtitle}
          </p>

          <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Fact icon={Ship} label={copy.price} value={experience.priceLabel} />
            <Fact icon={Clock} label={copy.duration} value={experience.durationLabel} />
            <Fact icon={Users} label={copy.capacity} value={experience.capacityLabel} />
            <Fact icon={MapPin} label={copy.departureLabel} value={copy.departureValue} />
          </dl>

          <div className="mt-4 space-y-2">
            {includedItems.map((item) => (
              <p key={item} className="flex gap-2.5 text-[0.78rem] font-medium leading-5 text-white/72">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--color-gold)]" aria-hidden="true" />
                <span>{item}</span>
              </p>
            ))}
          </div>

          <Link
            href={experience.href}
            aria-label={`${experience.ctaLabel}: ${experience.title}`}
            className="mt-auto inline-flex w-fit items-center gap-2 pt-5 text-[0.82rem] font-semibold text-white transition-all hover:gap-3"
          >
            {experience.ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </ScrollSection>
  );
}

export function HomePackagesSection({
  locale,
  featuredPackages,
}: HomePackagesSectionProps) {
  const copy = sectionCopy(locale);
  const packages = [...featuredPackages].sort(
    (a, b) =>
      (packagePriority[a.key] ?? Number.MAX_SAFE_INTEGER) -
      (packagePriority[b.key] ?? Number.MAX_SAFE_INTEGER),
  );
  const heroPackage = packages.find((experience) => experience.key === "pranzo-a-bordo") ?? packages[0];
  const secondaryPackages = packages.filter((experience) => experience.key !== heroPackage?.key);

  if (!heroPackage) return null;

  return (
    <section
      id="pacchetti-tour-egadi"
      aria-labelledby="home-packages-title"
      className="egadi-water-reflection relative px-2 pb-28 pt-16 md:px-3 md:pt-20 lg:px-4 lg:pb-32 lg:pt-24"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #102a35 36%, #0d3444 70%, #071934 100%)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[100rem]">
        <ScrollSection animation="fade-up">
          <div className="mb-14 grid gap-6 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-gold)]">
                {copy.eyebrow}
              </p>
              <h2
                id="home-packages-title"
                className="mt-4 max-w-4xl font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl lg:text-6xl"
              >
                {copy.title}
              </h2>
            </div>
            <p className="max-w-3xl text-base font-medium leading-8 text-white/76 md:text-lg">
              {copy.intro}
            </p>
          </div>
          <div className="mt-6 max-w-4xl border-l border-[var(--color-gold)]/55 pl-4 text-white/78">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-gold)]">
              {copy.policyTitle}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 md:text-base">
              {copy.policyText}
            </p>
          </div>
        </ScrollSection>

        <HeroPackage experience={heroPackage} locale={locale} />

        <div className="mt-5 grid gap-3.5 lg:grid-cols-2">
          {secondaryPackages.map((experience) => (
            <CompactPackage
              key={experience.key}
              experience={experience}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
