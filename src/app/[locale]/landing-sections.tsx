"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ScrollSection } from "@/components/scroll-section";
import { IslandsItinerary } from "@/components/islands-itinerary";
import { BookingSearch } from "@/components/booking-search";
import {
  TestimonialsColumn,
  type TestimonialColumnItem,
} from "@/components/ui/testimonials-columns-1";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { localizedPath } from "@/lib/i18n/paths";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SerializedService {
  id: string;
  name: string;
  type: string;
  boatId: string;
  boatName: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  pricingUnit: string;
  priceAmount: string | null;
  priceLabel: string | null;
}

interface LandingSectionsProps {
  services: SerializedService[];
}

interface FeaturedPolaroid {
  caption: string;
  color: string;
  src?: string;
}

interface FeaturedPackage {
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

const featuredPackageOrder: Record<string, number> = {
  "chef-a-bordo": 10,
  charter: 20,
  "barca-8-ore": 30,
  "barca-4-ore": 40,
  "charter-pesca": 50,
};

const googleReviewsUrl = PUBLIC_REVIEW_LINKS.google;
const tripadvisorReviewsUrl = PUBLIC_REVIEW_LINKS.tripadvisor;

const googleReviews: TestimonialColumnItem[] = [
  {
    name: "Giulia Placenza",
    role: "Google · 7 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocIkAnMcIRZdDJKB_MtM3FdbXojP-y4fer33UaYWMs26G_BCcas=s120-c-rp-mo-br100",
    text: "Esperienza bellissima e super consigliata. Dal catamarano totalmente in esclusiva e col massimo dei comfort, allo staff sempre gentile e professionale. Qualsiasi tuo desiderio, viene realizzato. Aperitivo sul mare splendente di Favignana con i prodotti migliori e tipici del territorio, trattati e preparati con cura dallo skipper Alessandro, il tutto sempre accompagnato da qualsiasi bevanda tu preferisca. Lo stesso vale per il pranzo, servito non appena arrivati a Levanzo. Una buonissima pasta con sugo di olive, capperi e pesce spada, tutto fresco, preso la mattina stessa della gita. E per non far mancare nulla e far vivere l'esperienza al massimo, al ritorno sono state aperte tutte le tre vele del catamarano, spettacolo inestimabile! Esperienza super consigliata per vivere una giornata di relax alle bellissime isole Egadi, con il massimo dei comfort, con un tri catamarano e uno staff a bordo in esclusiva solo per te!",
  },
  {
    name: "Rebecca Vidale",
    role: "Google · 9 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocIrEsMDJfPtDHtag0CXghmrdp5NMgzulg6ku_5syqjn0fAC=s120-c-rp-mo-br100",
    text: "Giornata meravigliosa, accompagnate da skipper Nico, super gentile e simpatico! Abbiamo potuto visitare le cale più belle di Favignana e Levanzo",
  },
  {
    name: "Rocco Virgilio",
    role: "Google · 8 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocLMS_wwd7C_NP90NWpYcy922yoqjSpODgmdbIc72RxbK2QVyw=s120-c-rp-mo-br100",
    text: "Esperienza unica tra le bellezze delle Isole Egadi: non ci sono parole per descrivere la loro bellezza. Il comandante Nico ci ha fatto visitare le più belle cale di Favignana e Levanzo; consiglio di provare questa esperienza, la professionalità distingue Egadi Sailing.",
  },
  {
    name: "Federico Begnoni",
    role: "Google · 7 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a-/ALV-UjUe40lmoQWKnNI59_iPAHHu50BAMWX6L2rv75uN1Fy8MNwTYnM=s120-c-rp-mo-br100",
    text: "Tour privato giornaliero eseguito con Leo, abbiamo visitato Favignana e Levanzo con un ottimo pranzo e aperitivi annessi, consiglio vivamente di prenotare questo tour tramite loro!",
  },
  {
    name: "Vincenzo Orlacchio",
    role: "Google · 9 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocKjSgZBvJ52AENsPUVArA8l9l0gqJ-XwI2yOyMUWhmNG_zIOw=s120-c-rp-mo-ba3-br100",
    text: "Bellissima esperienza, grazie al nostro skipper Niko che ci ha condotto per l'isola di Favignana, facendoci vedere tutte le bellezze di questo splendido territorio.",
  },
  {
    name: "Marco Garuti",
    role: "Google · 8 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocL57nx3BJW99CNHxqhcGmOVaKnk-lXBZid_v32VlpQ3oFQncQ=s120-c-rp-mo-br100",
    text: "Esperienza completa con il tour di Favignana e Levanzo, il nostro skipper Leo ci ha mostrato delle calette molto belle e ci ha raccontato un po' di storia delle Isole, rendendoci partecipi di tutto. Esperienza completa di cibo e alcol, mare bellissimo, non è mancato nulla!",
  },
  {
    name: "Benito Di Girolamo",
    role: "Google · 8 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a-/ALV-UjWIYjXdHuxS7HSh-l-cSl96sGZ-B8VdaPH1Tjz6RAe3fw6syiEz=s120-c-rp-mo-br100",
    text: "Esperienza indimenticabile tra le acque delle Egadi, guidati da un equipaggio esperto e cordiale. Barca confortevole e ottima cucina locale a bordo. Un mix perfetto di relax e avventura, assolutamente consigliato!",
  },
  {
    name: "Anto",
    role: "Google · 9 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a/ACg8ocI44m48wSFDS11vPkpjkKcGBXI26rQ30Dc4n_GfDMDIskxEhQ=s120-c-rp-mo-br100",
    text: "Giornata indimenticabile tra le acque cristalline di Favignana e Levanzo: panorami mozzafiato, tuffi e animazione spettacolare e relax assoluto. Un ringraziamento speciale allo skipper Niko, professionale, simpatico e attento, che ha reso l'esperienza ancora più piacevole!",
  },
  {
    name: "Manuela Diana",
    role: "Google · 9 mesi fa",
    rating: 5,
    image:
      "https://lh3.googleusercontent.com/a-/ALV-UjVVZur27P6DRGXPrG2Tu6dnPwPNlzhDccz3Vq0ybhod_RaCoikz=s120-c-rp-mo-br100",
    text: "31 luglio 2025 giornata memorabile. Organizzata alla perfezione Nico e Leo skipper meravigliosi abbiamo visto posti bellissimi fatti bagni con tanto tempo a disposizione ma soprattutto tante risate e anche emozioni condivise pazzesche. Grazie davvero di tutto......Manuela e Luciano da Roma",
  },
];

const tripadvisorReviews: TestimonialColumnItem[] = [
  {
    name: "Veronica C",
    role: "Tripadvisor · set 2025",
    rating: 5,
    text: "Abbiamo passato una giornata semplicemente indimenticabile con Niko e Ale. A bordo di un trimarano moderno, spazioso e super confortevole.",
  },
  {
    name: "Marghe C",
    role: "Tripadvisor · mag 2026",
    rating: 5,
    text: "Tutto magnifico la barca meravigliosa lo skipper Niko professionale, gentilissimo e bravissimo. Bellissima giornata.",
  },
  {
    name: "Lory O",
    role: "Tripadvisor · mag 2026",
    rating: 5,
    text: "Esperienza semplicemente fantastica! L'escursione in barca è stata uno dei momenti più belli della mia vacanza.",
  },
  {
    name: "Maria C",
    role: "Tripadvisor · mag 2026",
    rating: 5,
    text: "Giornata indimenticabile da rifare complimenti a tutto lo staff consiglio a chiunque di trascorrere una giornata a bordo divertimento assicurato",
  },
  {
    name: "Vito G",
    role: "Tripadvisor · mag 2026",
    rating: 5,
    text: "Esperienza magica, accoglienza top, cibo fantastico, posti mitici. La crew è stupenda e professionale e l'imbarcazione assolutamente unica!",
  },
];

function getReviewColumns() {
  const mixedReviews = [
    googleReviews[0],
    tripadvisorReviews[0],
    googleReviews[1],
    tripadvisorReviews[1],
    googleReviews[2],
    tripadvisorReviews[2],
    googleReviews[3],
    tripadvisorReviews[3],
    googleReviews[4],
    tripadvisorReviews[4],
    ...googleReviews.slice(5),
  ].filter((review): review is TestimonialColumnItem => Boolean(review));

  return [
    mixedReviews.filter((_, index) => index % 3 === 0),
    mixedReviews.filter((_, index) => index % 3 === 1),
    mixedReviews.filter((_, index) => index % 3 === 2),
  ];
}

function getMaxCapacity(services: SerializedService[], serviceIds: string[]) {
  return Math.max(
    0,
    ...services
      .filter((service) => serviceIds.includes(service.id))
      .map((service) => service.capacityMax),
  );
}

function getPackagePriceLabel(
  services: SerializedService[],
  serviceIds: string[],
  locale: string,
) {
  const pricedServices = services
    .filter((service) => serviceIds.includes(service.id))
    .map((service) => ({
      amount: service.priceAmount ? Number.parseFloat(service.priceAmount) : Number.POSITIVE_INFINITY,
      label: service.priceLabel,
    }))
    .filter((service) => service.label);

  const bestPrice = pricedServices.sort((a, b) => a.amount - b.amount)[0]?.label;
  if (bestPrice) return bestPrice;
  if (locale === "fr") return "Prix sur demande";
  if (locale === "es") return "Precio bajo petición";
  if (locale === "de") return "Preis auf Anfrage";
  return locale === "en" ? "Price on request" : "Prezzo su richiesta";
}

function infoCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
    price: isEs ? "Precio" : isFr ? "Prix" : isDe ? "Preis" : isEn ? "Price" : "Prezzo",
    duration: isEs ? "Duración" : isFr ? "Durée" : isDe ? "Dauer" : isEn ? "Duration" : "Durata",
    departure: isEs ? "Salida" : isFr ? "Départ" : isDe ? "Abfahrt" : isEn ? "Departure" : "Partenza",
    capacity: isEs ? "Capacidad" : isFr ? "Capacité" : isDe ? "Kapazität" : isEn ? "Capacity" : "Max persone",
    formula: isEs ? "Fórmula" : isFr ? "Formule" : isDe ? "Format" : isEn ? "Format" : "Formula",
    includes: isEs ? "Qué incluye" : isFr ? "Ce qui est inclus" : isDe ? "Inklusive" : isEn ? "What's included" : "Cosa include",
    schedule: isEs ? "Horarios y salida" : isFr ? "Horaires et départ" : isDe ? "Zeiten und Abfahrt" : isEn ? "Times and departure" : "Orari e partenza",
    policy: isEs ? "Cancelación y mal tiempo" : isFr ? "Annulation et météo" : isDe ? "Stornierung und Wetter" : isEn ? "Cancellation and weather" : "Cancellazione e maltempo",
  };
}

/* ------------------------------------------------------------------ */
/*  Reveal Title — gold line sweeps left to right revealing text      */
/* ------------------------------------------------------------------ */

function RevealTitle({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className="relative inline-block">
      <motion.h2
        className={
          compact
            ? "relative font-heading text-3xl font-semibold leading-tight text-white/95 md:text-4xl lg:text-5xl xl:text-6xl"
            : "font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white relative"
        }
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {text}
      </motion.h2>
      {/* SVG underline decoration — animated wave */}
      <motion.svg
        viewBox="0 0 400 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={compact ? "mx-auto mt-3 w-[42%]" : "w-[60%] mx-auto mt-4"}
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
      >
        <motion.path
          d="M0 10 Q50 2 100 10 T200 10 T300 10 T400 10"
          stroke="url(#revealGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
        />
        <motion.path
          d="M20 14 Q70 6 120 14 T220 14 T320 14 T380 14"
          stroke="url(#revealGold2)"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.7, ease: "easeInOut" }}
        />
        <defs>
          <linearGradient id="revealGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="revealGold2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="30%" stopColor="#d97706" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
}

/* Polaroid scattered positions */
const polaroidLayouts = [
  { x: 2, y: 0, rotate: -8 },
  { x: 40, y: 5, rotate: 6 },
  { x: 15, y: 52, rotate: -4 },
];

const mobilePolaroidLayouts = [
  { x: 0, y: 24, rotate: -7, zIndex: 10 },
  { x: 27, y: 0, rotate: 5, zIndex: 20 },
  { x: 54, y: 30, rotate: -4, zIndex: 30 },
];

/* ------------------------------------------------------------------ */
/*  Experience Row — alternating layout, polaroid appear on scroll    */
/* ------------------------------------------------------------------ */

function ExperienceRow({
  experience,
  index,
  locale,
}: {
  experience: FeaturedPackage;
  index: number;
  locale: string;
}) {
  const isEven = index % 2 === 0;
  const polaroids = experience.polaroids.slice(0, 3);
  const copy = infoCopy(locale);
  const facts = [
    { label: copy.price, value: experience.priceLabel },
    { label: copy.duration, value: experience.durationLabel },
    { label: copy.formula, value: experience.formulaLabel },
    { label: copy.capacity, value: experience.capacityLabel },
  ];
  const commercialDetails = [
    {
      title: copy.schedule,
      text: experience.scheduleLabel,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center min-h-[450px]">
      {/* Content column */}
      <ScrollSection
        animation={isEven ? "fade-left" : "fade-right"}
        className={`space-y-6 ${isEven ? "lg:order-1" : "lg:order-2"}`}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
          {experience.eyebrow}
        </p>

        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
          {experience.title}
        </h2>

        <p className="text-white/70 text-lg leading-relaxed max-w-lg">
          {experience.subtitle}
        </p>

        <dl className="grid max-w-2xl gap-4 sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="border-l border-[var(--color-gold)]/60 pl-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                {fact.label}
              </dt>
              <dd className="mt-2 text-sm font-semibold leading-6 text-white/82">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          {[...commercialDetails, ...experience.details].map((detail) => (
            <div key={detail.title} className="border-l border-white/18 pl-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/85">
                {detail.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {detail.text}
              </p>
            </div>
          ))}
        </div>

        <Link
          href={experience.href}
          aria-label={`${experience.ctaLabel}: ${experience.title}`}
          className="inline-flex items-center gap-2 text-white font-medium hover:gap-3 transition-all"
        >
          {experience.ctaLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        <div className="relative mx-auto h-[19rem] w-full max-w-[24rem] overflow-hidden pt-2 sm:h-[23rem] lg:hidden">
          {polaroids.map((p, i) => {
            const layout = mobilePolaroidLayouts[i];

            return (
              <motion.div
                key={p.caption}
                className="absolute w-[43%] max-w-[12rem] sm:max-w-[15rem]"
                style={{
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  zIndex: layout.zIndex,
                }}
                initial={{ opacity: 0, scale: 0.85, rotate: 0, y: 32 }}
                whileInView={{
                  opacity: 1,
                  scale: 1,
                  rotate: layout.rotate,
                  y: 0,
                }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.55,
                  delay: i * 0.12,
                  ease: [0.34, 1.2, 0.64, 1],
                }}
              >
                <div className="bg-white p-[5%] pb-[18%] shadow-2xl">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm" style={{ backgroundColor: p.color }}>
                    {p.src && (
                      <Image
                        src={p.src}
                        alt={p.caption}
                        fill
                        sizes="45vw"
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <p
                    className="mt-3 text-center text-base text-gray-600 sm:text-lg"
                    style={{ fontFamily: "var(--font-handwriting), cursive" }}
                  >
                    {p.caption}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollSection>

      {/* Polaroid column */}
      <div
        className={`relative h-[450px] hidden lg:block ${isEven ? "lg:order-2" : "lg:order-1"}`}
      >
        {/* Polaroids */}
        {polaroids.map((p, i) => {
          const layout = polaroidLayouts[i];
          return (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${layout.x}%`,
                top: `${layout.y}%`,
                width: "48%",
              }}
              initial={{ opacity: 0, scale: 0.3, rotate: 0, y: 60 }}
              whileInView={{
                opacity: 1,
                scale: 1,
                rotate: layout.rotate,
                y: 0,
              }}
              whileHover={{
                scale: 1.15,
                rotate: 0,
                zIndex: 50,
                transition: { duration: 0.3 },
              }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.15,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <div className="bg-white p-[5%] pb-[18%] shadow-2xl hover:shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition-shadow duration-300">
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-sm" style={{ backgroundColor: p.color }}>
                  {p.src && (
                    <Image
                      src={p.src}
                      alt={p.caption}
                      fill
                      sizes="(min-width: 1024px) 24vw, 48vw"
                      unoptimized
                      className="object-cover"
                    />
                  )}
                </div>
                <p
                  className="mt-4 text-center text-lg text-gray-600 md:text-xl lg:text-2xl"
                  style={{ fontFamily: "var(--font-handwriting), cursive" }}
                >
                  {p.caption}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LandingSections({ services }: LandingSectionsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const sectionInfoCopy = infoCopy(locale);
  const maxPax = (serviceIds: string[]) => getMaxCapacity(services, serviceIds);
  const reviewColumns = getReviewColumns();
  const seoIntro = isEs
    ? "Nuestras excursiones en barco a las Islas Egadi salen de Trapani y llegan a Favignana y Levanzo con itinerarios ajustados al mar, al viento y al ritmo del grupo. Puedes elegir un tour compartido de 8 horas, un tour privado de 4 u 8 horas, la experiencia con chef a bordo en trimarán, una alternativa espaciosa al catamarán, o un charter de varios días. A bordo tienes patrón, paradas para bañarte, snorkel, calas como Cala Rossa y Cala Azzurra y el tiempo adecuado para vivir las islas sin prisa."
    : isFr
    ? "Nos excursions en bateau aux îles Égades partent de Trapani et rejoignent Favignana et Levanzo avec des itinéraires adaptés à la mer, au vent et au rythme du groupe. Vous pouvez choisir un tour partagé de 8 heures, un tour privé de 4 ou 8 heures, l'expérience avec chef à bord en trimaran, une alternative spacieuse au catamaran, ou un charter de plusieurs jours. À bord : skipper, baignades, snorkeling, criques comme Cala Rossa et Cala Azzurra, et le temps juste pour vivre les îles sans hâte."
    : isDe
    ? "Unsere Bootstouren zu den Ägadischen Inseln starten in Trapani und führen nach Favignana und Levanzo, mit Kursen je nach Meer, Wind und Tempo der Gruppe. Sie wählen eine geteilte 8-Stunden-Tour, eine private Bootstour von 4 oder 8 Stunden, das Erlebnis mit Chef an Bord im Trimaran, einer geräumigen Alternative zum Katamaran, oder einen mehrtägigen Charter. An Bord gibt es Skipper, Badestopps, Schnorcheln, Buchten wie Cala Rossa und Cala Azzurra und genug Zeit, die Inseln ohne Eile zu erleben."
    : isEn
    ? "Our Egadi Islands boat tours depart from Trapani and reach Favignana and Levanzo with routes shaped around sea conditions, wind and the pace of the group. You can choose a shared 8-hour tour, a private 4 or 8-hour boat tour, the chef-on-board trimaran experience, a spacious alternative to a catamaran, or a multi-day charter. On board you have a skipper, swim stops, snorkelling, bays such as Cala Rossa and Cala Azzurra, and enough time to enjoy the islands without rushing."
    : "Le nostre escursioni in barca alle Egadi partono da Trapani e raggiungono Favignana e Levanzo con itinerari pensati in base a mare, vento e ritmo del gruppo. Puoi scegliere un tour condiviso di 8 ore, una barca privata da 4 o 8 ore, l'esperienza con chef a bordo in trimarano, alternativa spaziosa al catamarano, o un charter di più giorni. A bordo trovi skipper, soste bagno, snorkeling, baie come Cala Rossa e Cala Azzurra e il tempo giusto per vivere le isole senza fretta.";
  const finalCtaTitle = isEs
    ? "Reserva tu excursión en barco a las Islas Egadi desde Trapani"
    : isFr
    ? "Réservez votre excursion en bateau aux îles Égades depuis Trapani"
    : isDe
    ? "Buchen Sie Ihre Bootstour zu den Ägadischen Inseln ab Trapani"
    : isEn
    ? "Book your Egadi Islands boat tour from Trapani"
    : "Prenota il tuo tour in barca alle Egadi da Trapani";
  const finalCtaSubtitle = isEs
    ? "Elige fecha, experiencia y fórmula: tour compartido, barco privado, chef a bordo o charter."
    : isFr
    ? "Choisissez la date, l'expérience et la formule : tour partagé, bateau privé, chef à bord ou charter."
    : isDe
    ? "Wählen Sie Datum, Erlebnis und Format: geteilte Tour, privates Boot, Chef an Bord oder Charter."
    : isEn
    ? "Choose your date, experience and format: shared tour, private boat, chef on board or charter."
    : "Scegli data, esperienza e formula: tour condiviso, barca privata, chef a bordo o charter.";
  const departureLabel = isEs
    ? "Via dei Gladioli 15, Puerto de Trapani"
    : isFr
    ? "Via dei Gladioli 15, port de Trapani"
    : isDe
    ? "Via dei Gladioli 15, Hafen von Trapani"
    : isEn
    ? "Via dei Gladioli 15, Trapani harbour"
    : "Via dei Gladioli 15, Porto di Trapani";
  const policyLabel = isEs
    ? "Mal tiempo: cambio de fecha o reembolso completo. Cancelación: 100% hasta 30 días, 50% de 29 a 15 días."
    : isFr
    ? "Mauvaise météo : changement de date ou remboursement complet. Annulation : 100 % jusqu'à 30 jours, 50 % de 29 à 15 jours."
    : isDe
    ? "Schlechtes Wetter: Umbuchung oder vollständige Erstattung. Storno: 100 % bis 30 Tage, 50 % von 29 bis 15 Tagen."
    : isEn
    ? "Bad weather: date change or full refund. Cancellation: 100% up to 30 days, 50% from 29 to 15 days."
    : "Maltempo: cambio data o rimborso completo. Cancellazione: 100% fino a 30 giorni, 50% da 29 a 15 giorni.";
  const idealForTitle = isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Ideale per";
  const routeTitle = isEs ? "Ruta / etapas principales" : isFr ? "Route / étapes principales" : isDe ? "Route / wichtigste Stopps" : isEn ? "Route / main stops" : "Rotta / tappe principali";
  const capacityLabelFor = (serviceIds: string[], noun: string) => {
    const capacity = maxPax(serviceIds);
    if (isEs) return `Máx. ${capacity} ${noun}`;
    if (isFr) return `Max ${capacity} ${noun}`;
    if (isDe) return `Max. ${capacity} ${noun}`;
    if (isEn) return `Up to ${capacity} ${noun}`;
    return `Max ${capacity} ${noun}`;
  };
  const priceLabelFor = (serviceIds: string[]) =>
    getPackagePriceLabel(services, serviceIds, locale);
  const featuredPackages: FeaturedPackage[] = [
    {
      key: "chef-a-bordo",
      serviceIds: ["exclusive-experience"],
      eyebrow: isEs ? "Premium privado" : isFr ? "Premium privé" : isDe ? "Privates Premium-Erlebnis" : isEn ? "Private premium" : "Premium privato",
      title: isEs
        ? "Chef a bordo en trimarán en las Islas Egadi"
        : isFr
        ? "Chef à bord en trimaran aux îles Égades"
        : isDe
        ? "Chef an Bord auf dem Trimaran zu den Ägadischen Inseln"
        : isEn
        ? "Chef on board in a trimaran in the Egadi Islands"
        : "Chef a bordo in trimarano alle Egadi",
      subtitle:
        isEs
	          ? "El trimarán reservado para ti, con confort de catamarán, chef, patrón y azafata para un día cuidado entre sabores locales, mar y fondeos tranquilos."
          : isFr
          ? "Le trimaran réservé pour vous, avec confort de catamaran, chef, skipper et hôtesse pour une journée soignée entre saveurs locales, mer et mouillages tranquilles."
          : isDe
          ? "Der Trimaran exklusiv für Sie, mit Katamaran-Komfort, Chefkoch, Skipper und Hostess für einen gepflegten Tag zwischen lokalen Aromen, Meer und ruhigen Ankerplätzen."
          : isEn
          ? "The trimaran reserved for you, with catamaran-style comfort, chef, skipper and hostess for a curated day of local flavours, sea and stops at anchor."
          : "Il trimarano in esclusiva, con comfort da catamarano, chef, skipper e hostess per una giornata curata tra sapori locali, mare e soste in rada.",
      priceLabel: priceLabelFor(["exclusive-experience"]),
      durationLabel: isEs ? "8 horas" : isFr ? "8 heures" : isDe ? "8 Stunden" : isEn ? "8 hours" : "8 ore",
      detailLabel: isEs
        ? `Hasta ${maxPax(["exclusive-experience"])} huéspedes`
        : isFr
        ? `Jusqu'à ${maxPax(["exclusive-experience"])} invités`
        : isDe
        ? `Bis zu ${maxPax(["exclusive-experience"])} Gäste`
        : isEn
        ? `Up to ${maxPax(["exclusive-experience"])} guests`
        : `Max ${maxPax(["exclusive-experience"])} pax`,
      capacityLabel: capacityLabelFor(["exclusive-experience"], isEs ? "huéspedes" : isFr ? "invités" : isDe ? "Gäste" : isEn ? "guests" : "persone"),
      formulaLabel: isEs ? "Tour privado premium" : isFr ? "Tour privé premium" : isDe ? "Private Premium-Tour" : isEn ? "Private premium tour" : "Tour privato premium",
      scheduleLabel: isEs
        ? "Formato de 8 horas con horario acordado con la tripulación."
        : isFr
        ? "Format de 8 heures avec horaire convenu avec l'équipage."
        : isDe
        ? "8-Stunden-Format mit der Crew abgestimmter Uhrzeit."
        : isEn
        ? "8-hour format with timing agreed with the crew."
        : "Formato 8 ore con orario concordato con la crew.",
      details: [
        {
          title: idealForTitle,
          text: isEs
            ? "Parejas, familias o grupos que quieren la experiencia más completa y sin preocupaciones."
            : isFr
            ? "Couples, familles ou groupes qui veulent l'expérience la plus complète et sans souci."
            : isDe
            ? "Paare, Familien oder Gruppen, die das vollständigste Erlebnis ohne organisatorische Sorgen suchen."
            : isEn
            ? "Couples, families or groups who want the most complete and effortless experience."
            : "Coppie, famiglie o gruppi che vogliono l'esperienza più completa e senza pensieri.",
        },
        {
          title: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
          text: isEs
            ? "Trimarán privado, confort de catamarán, tripulación dedicada, mesa preparada y ritmo gestionado con calma."
            : isFr
            ? "Trimaran privé, confort de catamaran, équipage dédié, table dressée et rythme géré avec calme."
            : isDe
            ? "Privater Trimaran, Katamaran-Komfort, engagierte Crew, gedeckter Tisch und ein bewusst ruhiger Tagesrhythmus."
            : isEn
            ? "Private trimaran, catamaran-style comfort, dedicated crew, prepared table and a calmly managed schedule."
            : "Trimarano privato, comfort da catamarano, crew dedicata, tavola preparata e tempi gestiti con calma.",
        },
        {
          title: routeTitle,
          text: isEs
            ? "Favignana y Levanzo, con bahías elegidas según mar, viento y luz del día."
            : isFr
            ? "Favignana et Levanzo, avec des baies choisies selon la mer, le vent et la lumière du jour."
            : isDe
            ? "Favignana und Levanzo, mit Buchten, die je nach Meer, Wind und Tageslicht ausgewählt werden."
            : isEn
            ? "Favignana and Levanzo, with bays chosen according to sea, wind and the light of the day."
            : "Favignana e Levanzo, con baie scelte in base a mare, vento e luce della giornata.",
        },
      ],
      href: localizedPath(locale, "/experiences/exclusive-experience"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Chef a bordo" : isFr ? "Chef à bord" : isDe ? "Chef an Bord" : isEn ? "Chef on board" : "Chef a bordo",
          color: "#FFB6C1",
          src: "/images/experience-polaroids/chef-a-bordo-cucina.webp",
        },
        {
          caption: isEs ? "Aperitivo al atardecer" : isFr ? "Apéritif au coucher du soleil" : isDe ? "Aperitif bei Sonnenuntergang" : isEn ? "Sunset aperitivo" : "Aperitivo al tramonto",
          color: "#FFDAB9",
          src: "/images/experience-polaroids/chef-a-bordo-rada.webp",
        },
        {
          caption: isEs ? "Trimarán Egadi" : isFr ? "Trimaran aux Égades" : isDe ? "Trimaran der Ägadischen Inseln" : isEn ? "Egadi trimaran" : "Trimarano Egadi",
          color: "#DDA0DD",
          src: "/images/boats/neel-47/neel-47-hero.webp",
        },
      ],
    },
    {
      key: "charter",
      serviceIds: ["cabin-charter"],
      eyebrow: isEs ? "Explora las Islas Egadi" : isFr ? "Explorez les îles Égades" : isDe ? "Die Ägadischen Inseln entdecken" : isEn ? "Explore the Egadi Islands" : "Esplora le Egadi",
      title: isEs
        ? "Charter Islas Egadi en trimarán"
        : isFr
        ? "Charter aux îles Égades en trimaran"
        : isDe
        ? "Charter Ägadische Inseln im Trimaran"
        : isEn
        ? "Egadi trimaran charter"
        : "Charter Egadi in trimarano",
      subtitle:
        isEs
          ? "De tres a siete días en trimarán, con confort de catamarán, una ruta acordada entre Favignana, Levanzo y Marettimo y noches vividas cerca del mar."
        : isFr
          ? "De trois à sept jours en trimaran, avec confort de catamaran, route convenue entre Favignana, Levanzo et Marettimo et nuits au plus près de la mer."
        : isDe
          ? "Drei bis sieben Tage auf dem Trimaran, mit Katamaran-Komfort, gemeinsam geplanter Route zwischen Favignana, Levanzo und Marettimo und Nächten ganz nah am Meer."
        : isEn
          ? "Three to seven days on the trimaran, with catamaran-style comfort, a route agreed between Favignana, Levanzo and Marettimo and nights spent close to the sea."
          : "Da 3 a 7 giornate sul trimarano, con comfort da catamarano, rotta concordata tra Favignana, Levanzo e Marettimo e notti vissute vicino al mare.",
      priceLabel: priceLabelFor(["cabin-charter"]),
      durationLabel: isEs ? "3-7 días" : isFr ? "3-7 jours" : isDe ? "3-7 Tage" : isEn ? "3-7 days" : "3-7 giornate",
      detailLabel: isEs ? "Itinerario a medida" : isFr ? "Itinéraire sur mesure" : isDe ? "Individuelle Route" : isEn ? "Tailored itinerary" : "Itinerario su misura",
      capacityLabel: capacityLabelFor(["cabin-charter"], isEs ? "huéspedes" : isFr ? "invités" : isDe ? "Gäste" : isEn ? "guests" : "persone"),
      formulaLabel: isEs ? "Charter privado 3-7 días" : isFr ? "Charter privé 3-7 jours" : isDe ? "Privater Charter 3-7 Tage" : isEn ? "Private 3-7 day charter" : "Charter privato 3-7 giorni",
      scheduleLabel: isEs
        ? "Embarque acordado, de 3 a 7 días con ruta adaptada al mar y al tiempo."
        : isFr
        ? "Embarquement convenu, de 3 à 7 jours avec route adaptée à la mer et à la météo."
        : isDe
        ? "Abgestimmtes Boarding, 3 bis 7 Tage mit Route nach Meer und Wetter."
        : isEn
        ? "Boarding agreed, 3 to 7 days with a route shaped by sea and weather."
        : "Imbarco concordato, da 3 a 7 giornate con rotta adattata a mare e meteo.",
      details: [
        {
          title: idealForTitle,
          text: isEs
            ? "Quien quiere dormir a bordo y vivir las Egadi sin volver cada tarde."
            : isFr
            ? "Celles et ceux qui veulent dormir à bord et vivre les Égades sans rentrer chaque soir."
            : isDe
            ? "Gäste, die an Bord schlafen und die Ägadischen Inseln erleben möchten, ohne jeden Abend zurückzukehren."
            : isEn
            ? "Guests who want to sleep on board and experience the Egadi Islands without returning every evening."
            : "Chi vuole dormire a bordo e vivere le Egadi senza il rientro obbligato della sera.",
        },
        {
          title: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
          text: isEs
            ? "Camarotes, espacios compartidos, cocina y confort de catamarán: el trimarán se convierte en una casa en el mar."
            : isFr
            ? "Cabines, espaces partagés, cuisine et confort de catamaran : le trimaran devient une maison en mer."
            : isDe
            ? "Kabinen, Gemeinschaftsbereiche, Pantry und Katamaran-Komfort: Der Trimaran wird zu Ihrem Zuhause auf dem Meer."
            : isEn
            ? "Cabins, shared spaces, galley and catamaran-style comfort: the trimaran becomes a home at sea."
            : "Cabine, spazi comuni, cucina e comfort da catamarano: il trimarano diventa una casa sul mare.",
        },
        {
          title: routeTitle,
          text: isEs
            ? "Favignana, Levanzo y Marettimo entran en el plan según duración y meteorología."
            : isFr
            ? "Favignana, Levanzo et Marettimo entrent dans le programme selon la durée et la météo."
            : isDe
            ? "Favignana, Levanzo und Marettimo werden je nach Dauer und Wetterlage in die Route aufgenommen."
            : isEn
            ? "Favignana, Levanzo and Marettimo become part of the plan according to duration and weather."
            : "Favignana, Levanzo e Marettimo entrano nel programma secondo durata e meteo.",
        },
      ],
      href: localizedPath(locale, "/experiences/charter"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Trimarán Egadi" : isFr ? "Trimaran aux Égades" : isDe ? "Trimaran der Ägadischen Inseln" : isEn ? "Egadi Trimarano" : "Trimarano Egadi",
          color: "#ADD8E6",
          src: "/images/experience-polaroids/charter-trimarano-egadi.webp",
        },
        {
          caption: isEs ? "Vida a bordo" : isFr ? "Vie à bord" : isDe ? "Leben an Bord" : isEn ? "Life on board" : "Vita a bordo",
          color: "#B2DFDB",
          src: "/images/experience-polaroids/charter-cabina-bordo.webp",
        },
        {
          caption: isEs ? "Fondeo tranquilo" : isFr ? "Mouillage tranquille" : isDe ? "Ruhiger Ankerplatz" : isEn ? "Quiet anchorage" : "Rada tranquilla",
          color: "#C5CAE9",
          src: "/images/experience-polaroids/charter-rada-tranquilla.webp",
        },
      ],
    },
    {
      key: "barca-4-ore",
      serviceIds: ["boat-exclusive-morning", "boat-exclusive-afternoon"],
      eyebrow: isEs ? "Media jornada" : isFr ? "Demi-journée" : isDe ? "Halbtagesausflug" : isEn ? "Half-day" : "Mezza giornata",
      title: isEs
        ? "Excursión en barco 4 horas a las Islas Egadi"
        : isFr
        ? "Excursion en bateau 4 heures aux îles Égades"
        : isDe
        ? "4-Stunden-Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "4-hour Egadi Islands boat tour"
        : "Escursione in barca 4 ore alle Egadi",
      subtitle:
        isEs
          ? "La fórmula privada y ágil para vivir las Egadi en media jornada, con baño, navegación panorámica y ruta elegida según el mar."
          : isFr
          ? "La formule privée et agile pour vivre les Égades en une demi-journée, avec baignade, navigation panoramique et route choisie selon la mer."
          : isDe
          ? "Die agile private Formel, um die Ägadischen Inseln in einem halben Tag zu erleben: Baden, Panoramafahrt und eine Route nach Seebedingungen."
          : isEn
          ? "The agile private formula for experiencing the Egadi Islands in half a day, with swimming, scenic cruising and a route chosen according to the sea."
          : "La formula agile in esclusiva per vivere le Egadi in mezza giornata, con bagno, navigazione panoramica e rotta scelta in base al mare.",
      priceLabel: priceLabelFor(["boat-exclusive-morning", "boat-exclusive-afternoon"]),
      durationLabel: isEs ? "4 horas" : isFr ? "4 heures" : isDe ? "4 Stunden" : isEn ? "4 hours" : "4 ore",
      detailLabel: isEs ? "Solo privado" : isFr ? "Privé uniquement" : isDe ? "Nur privat" : isEn ? "Private only" : "Solo esclusivo",
      capacityLabel: capacityLabelFor(["boat-exclusive-morning", "boat-exclusive-afternoon"], isEs ? "huéspedes" : isFr ? "invités" : isDe ? "Gäste" : isEn ? "guests" : "persone"),
      formulaLabel: isEs ? "Tour privado 4 horas" : isFr ? "Tour privé 4 heures" : isDe ? "Private 4-Stunden-Tour" : isEn ? "Private 4-hour tour" : "Tour privato 4 ore",
      scheduleLabel: isEs
        ? "Salida de mañana o tarde, 4 horas con regreso claro."
        : isFr
        ? "Départ matin ou après-midi, 4 heures avec retour clair."
        : isDe
        ? "Abfahrt morgens oder nachmittags, 4 Stunden mit klarer Rückkehrzeit."
        : isEn
        ? "Morning or afternoon departure, 4 hours with a clear return time."
        : "Mattina o pomeriggio, 4 ore con rientro preciso.",
      details: [
        {
          title: idealForTitle,
          text: isEs
            ? "Perfecta si tienes poco tiempo pero quieres mar, un baño y una ruta memorable."
            : isFr
            ? "Parfaite si vous avez peu de temps mais souhaitez la mer, une baignade et une route mémorable."
            : isDe
            ? "Perfekt, wenn Sie wenig Zeit haben, aber Meer, eine Badepause und eine schöne Route erleben möchten."
            : isEn
            ? "Perfect if you have limited time but still want the sea, a swim and a memorable route."
            : "Perfetta se hai poco tempo ma vuoi comunque mare, tuffo e una rotta bella da ricordare.",
        },
        {
          title: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
          text: isEs
            ? "Barco privado con skipper y paradas compactas en las aguas más resguardadas."
            : isFr
            ? "Bateau privé avec skipper et arrêts compacts dans les eaux les plus abritées."
            : isDe
            ? "Privates Boot mit Skipper und kurzen Stopps in den geschütztesten Gewässern des Tages."
            : isEn
            ? "Private boat with skipper and compact stops in the most sheltered waters."
            : "Barca privata con skipper e soste compatte nelle acque più riparate.",
        },
        {
          title: routeTitle,
          text: isEs
            ? "Favignana o Levanzo, eligiendo la cala más bonita que se pueda alcanzar con seguridad en 4 horas."
            : isFr
            ? "Favignana ou Levanzo, en choisissant la plus belle crique accessible en sécurité en 4 heures."
            : isDe
            ? "Favignana oder Levanzo, mit der schönsten Bucht, die in 4 Stunden sicher erreichbar ist."
            : isEn
            ? "Favignana or Levanzo, choosing the best cove that can be reached safely in 4 hours."
            : "Favignana o Levanzo, scegliendo la cala migliore raggiungibile in sicurezza in 4 ore.",
        },
      ],
      href: localizedPath(locale, "/experiences/boat-exclusive-afternoon"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Tour ágil" : isFr ? "Tour agile" : isDe ? "Agile Tour" : isEn ? "Agile tour" : "Tour agile",
          color: "#BFDBFE",
          src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
        },
        {
          caption: isEs ? "Baño rápido" : isFr ? "Baignade rapide" : isDe ? "Kurzer Badestopp" : isEn ? "Quick swim" : "Tuffo veloce",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/barca-4-ore-tuffo.webp",
        },
        {
          caption: "Cala Rossa",
          color: "#FDE68A",
          src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
        },
      ],
    },
    {
      key: "barca-8-ore",
      serviceIds: ["boat-shared-full-day", "boat-exclusive-full-day"],
      eyebrow: isEs ? "Día completo" : isFr ? "Journée complète" : isDe ? "Ganzer Tag" : isEn ? "Full day" : "Giornata intera",
      title: isEs
        ? "Tour en barco Favignana y Levanzo desde Trapani"
        : isFr
        ? "Tour en bateau Favignana et Levanzo depuis Trapani"
        : isDe
        ? "Bootstour Favignana und Levanzo ab Trapani"
        : isEn
        ? "Favignana and Levanzo boat tour from Trapani"
        : "Tour in barca Favignana e Levanzo da Trapani",
      subtitle:
        isEs
          ? "Un día completo entre bahías, snorkel y tiempo lento a bordo, disponible con plazas compartidas o barco privado."
          : isFr
          ? "Une journée complète entre baies, snorkeling et temps lent à bord, disponible en places partagées ou en bateau privé."
          : isDe
          ? "Ein ganzer Tag zwischen Buchten, Schnorcheln und ruhiger Zeit an Bord, buchbar als geteilte Plätze oder private Bootstour."
          : isEn
          ? "A full day among bays, snorkelling and slow time on board, available as shared seats or a private boat."
          : "Una giornata completa tra baie, snorkeling e tempo lento a bordo, disponibile con posti condivisi o barca in esclusiva.",
      priceLabel: priceLabelFor(["boat-shared-full-day", "boat-exclusive-full-day"]),
      durationLabel: isEs ? "8 horas" : isFr ? "8 heures" : isDe ? "8 Stunden" : isEn ? "8 hours" : "8 ore",
      detailLabel: isEs ? "Compartido o privado" : isFr ? "Partagé ou privé" : isDe ? "Geteilt oder privat" : isEn ? "Shared or private" : "Condiviso o esclusivo",
      capacityLabel: capacityLabelFor(["boat-shared-full-day", "boat-exclusive-full-day"], isEs ? "huéspedes" : isFr ? "invités" : isDe ? "Gäste" : isEn ? "guests" : "persone"),
      formulaLabel: isEs ? "Tour compartido o privado 8 horas" : isFr ? "Tour partagé ou privé 8 heures" : isDe ? "Geteilte oder private 8-Stunden-Tour" : isEn ? "Shared or private 8-hour tour" : "Tour condiviso o privato 8 ore",
      scheduleLabel: isEs
        ? "Check-in 09:30, salida 10:00 y regreso hacia las 18:00."
        : isFr
        ? "Check-in 09:30, départ 10:00 et retour vers 18:00."
        : isDe
        ? "Check-in 09:30, Abfahrt 10:00 und Rückkehr gegen 18:00."
        : isEn
        ? "Check-in 09:30, departure 10:00 and return around 18:00."
        : "Check-in 09:30, partenza 10:00 e rientro verso le 18:00.",
      details: [
        {
          title: idealForTitle,
          text: isEs
            ? "La mejor opción si quieres más tiempo en el agua, menos prisa y más flexibilidad entre calas."
            : isFr
            ? "Le meilleur choix si vous voulez plus de temps dans l'eau, moins de hâte et plus de flexibilité entre les criques."
            : isDe
            ? "Die beste Wahl, wenn Sie mehr Zeit im Wasser, weniger Eile und mehr Flexibilität zwischen den Buchten möchten."
            : isEn
            ? "The best choice if you want more time in the water, less rush and more flexibility between coves."
            : "La scelta migliore se vuoi più tempo in acqua, meno fretta e più flessibilità tra le cale.",
        },
        {
          title: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
          text: isEs
            ? "Formato compartido o privado, skipper incluido y paradas adaptadas al ritmo del grupo."
            : isFr
            ? "Format partagé ou privé, skipper inclus et arrêts adaptés au rythme du groupe."
            : isDe
            ? "Geteiltes oder privates Format, Skipper inklusive und Stopps im Rhythmus der Gruppe."
            : isEn
            ? "Shared or private format, skipper included and stops managed around the rhythm of the group."
            : "Formula condivisa o privata, skipper incluso e soste gestite secondo il ritmo del gruppo.",
        },
        {
          title: routeTitle,
          text: isEs
            ? "Un día entre Favignana y Levanzo, con parada en Favignana para comer, bañarse, hacer snorkel y volver sin prisas hacia Trapani."
            : isFr
            ? "Une journée entre Favignana et Levanzo, avec arrêt à Favignana pour déjeuner, se baigner, faire du snorkeling et rentrer tranquillement vers Trapani."
            : isDe
            ? "Ein Tag zwischen Favignana und Levanzo, mit Stopp auf Favignana zum Mittagessen, Baden, Schnorcheln und entspannter Rückfahrt nach Trapani."
            : isEn
            ? "A day between Favignana and Levanzo, with a Favignana stop for lunch, swimming, snorkelling and an easy return towards Trapani."
            : "Giornata tra Favignana e Levanzo, con scalo a Favignana per pranzo, bagno, snorkeling e rientro morbido verso Trapani.",
        },
      ],
      href: localizedPath(locale, "/experiences/boat-shared-full-day"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Día completo" : isFr ? "Journée complète" : isDe ? "Ganzer Tag" : isEn ? "Full day" : "Giornata intera",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/barca-8-ore-gruppo-bordo.webp",
        },
        {
          caption: isEs ? "Snorkel" : isFr ? "Snorkeling" : isDe ? "Schnorcheln" : isEn ? "Snorkelling" : "Snorkeling",
          color: "#BFDBFE",
          src: "/images/experience-polaroids/barca-8-ore-snorkeling.webp",
        },
        {
          caption: isEs ? "Atardecer" : isFr ? "Coucher de soleil" : isDe ? "Sonnenuntergang" : isEn ? "Sunset" : "Tramonto",
          color: "#FED7AA",
          src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
        },
      ],
    },
    {
      key: "charter-pesca",
      serviceIds: ["fishing-full-day"],
      eyebrow: isEs ? "Pesca deportiva" : isFr ? "Pêche sportive" : isDe ? "Sportangeln" : isEn ? "Sport fishing" : "Pesca sportiva",
      title: isEs ? "Charter de pesca Egadi en neumática" : isFr ? "Charter de pêche Égades en semi-rigide" : isDe ? "Angelcharter Ägadische Inseln im RIB" : isEn ? "Egadi fishing charter by RIB" : "Charter pesca Egadi in gommone",
      subtitle:
        isEs
          ? "Jornada privada de 8 horas en neumática de pesca, con cañas profesionales, técnicas mixtas y ruta definida por el patrón según mar, temporada y normativa."
          : isFr
          ? "Journée privée de 8 heures sur semi-rigide de pêche, avec cannes professionnelles, techniques mixtes et route définie par le skipper selon mer, saison et règles."
          : isDe
          ? "Privater 8-Stunden-Tag auf dem Angel-RIB, mit professionellen Ruten, gemischten Techniken und Route nach Meer, Saison und Regeln."
          : isEn
          ? "An 8-hour private day on the Fishing RIB, with professional rods, mixed techniques and a route set by the skipper according to sea, season and rules."
          : "Giornata privata di 8 ore su gommone da pesca, con canne professionali, tecniche miste e rotta decisa dallo skipper in base a mare, stagione e regole.",
      priceLabel: priceLabelFor(["fishing-full-day"]),
      durationLabel: isEs ? "8 horas" : isFr ? "8 heures" : isDe ? "8 Stunden" : isEn ? "8 hours" : "8 ore",
      detailLabel: isEs
        ? `Hasta ${maxPax(["fishing-full-day"])} pescadores`
        : isFr
        ? `Jusqu'à ${maxPax(["fishing-full-day"])} pêcheurs`
        : isDe
        ? `Bis zu ${maxPax(["fishing-full-day"])} Angler`
        : isEn
        ? `Up to ${maxPax(["fishing-full-day"])} anglers`
        : `Max ${maxPax(["fishing-full-day"])} pescatori`,
      capacityLabel: capacityLabelFor(["fishing-full-day"], isEs ? "pescadores" : isFr ? "pêcheurs" : isDe ? "Angler" : isEn ? "anglers" : "pescatori"),
      formulaLabel: isEs ? "Pesca deportiva privada" : isFr ? "Pêche sportive privée" : isDe ? "Private Sportangel-Tour" : isEn ? "Private sport fishing" : "Pesca sportiva privata",
      scheduleLabel: isEs
        ? "8 horas con horario, técnica y zona confirmados por el patrón según mar, temporada y normativa."
        : isFr
        ? "8 heures avec horaire, technique et zone confirmés par le skipper selon mer, saison et règles."
        : isDe
        ? "8 Stunden mit Uhrzeit, Technik und Gebiet nach Meer, Saison und Regeln vom Skipper bestätigt."
        : isEn
        ? "8 hours with time, technique and area confirmed by the skipper according to sea, season and rules."
        : "8 ore con orario, tecnica e zona confermati dallo skipper in base a mare, stagione e regole.",
      details: [
        {
          title: idealForTitle,
          text: isEs
            ? "Aficionados que quieren una salida técnica, privada y centrada en la pesca, no un tour panorámico clásico."
            : isFr
            ? "Passionnés qui veulent une sortie technique, privée et centrée sur la pêche, pas un simple tour panoramique."
            : isDe
            ? "Angelbegeisterte, die einen technischen privaten Ausflug suchen, nicht nur eine klassische Panoramatour."
            : isEn
            ? "Fishing enthusiasts who want a technical private outing, not a standard sightseeing boat tour."
            : "Appassionati che vogliono un'uscita tecnica, privata e centrata sulla pesca, non un classico tour panoramico.",
        },
        {
          title: isEs ? "A bordo" : isFr ? "À bord" : isDe ? "An Bord" : isEn ? "On board" : "A bordo",
          text: isEs
            ? "Neumática dedicada, patrón/guía, cañas, carretes, cebos, artificiales, combustible, agua, refrescos y snack."
            : isFr
            ? "Semi-rigide dédié, skipper/guide, cannes, moulinets, appâts, leurres, carburant, eau, boissons sans alcool et snack."
            : isDe
            ? "Dediziertes Angel-RIB, Skipper/Guide, Ruten, Rollen, Köder, Kunstköder, Treibstoff, Wasser, Softdrinks und Snack."
            : isEn
            ? "Dedicated Fishing RIB, skipper/guide, rods, reels, bait, lures, fuel, water, soft drinks and snacks."
            : "Gommone dedicato, skipper/guida, canne, mulinelli, esche, artificiali, carburante, acqua, soft drink e snack.",
        },
        {
          title: routeTitle,
          text: isEs
            ? "Capturas liberadas o conservadas solo dentro de límites legales, tallas, cupos, autorizaciones y decisión del patrón."
            : isFr
            ? "Prises relâchées ou gardées uniquement selon limites légales, tailles, quotas, autorisations et décision du skipper."
            : isDe
            ? "Fänge werden nur nach gesetzlichen Limits, Mindestmaßen, Quoten, Genehmigungen und Entscheidung des Skippers behalten oder freigelassen."
            : isEn
            ? "Catches are released or kept only within legal limits, sizes, quotas, authorisations and the skipper's decision."
            : "Pescato rilasciato o trattenuto solo entro limiti di legge, taglie, quote, autorizzazioni e decisione dello skipper.",
        },
      ],
      href: localizedPath(locale, "/experiences/charter-pesca-egadi"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Neumática de pesca" : isFr ? "Semi-rigide de pêche" : isDe ? "Angel-RIB" : isEn ? "Fishing RIB" : "Gommone pesca",
          color: "#BAE6FD",
          src: "/images/experience-polaroids/fishing-charter-gommone.webp",
        },
        {
          caption: isEs ? "Equipo técnico" : isFr ? "Setup technique" : isDe ? "Technisches Setup" : isEn ? "Technical setup" : "Setup tecnico",
          color: "#FDE68A",
          src: "/images/experience-polaroids/fishing-charter-setup.webp",
        },
        {
          caption: isEs ? "8 horas en el mar" : isFr ? "8 heures en mer" : isDe ? "8 Stunden auf See" : isEn ? "8 hours at sea" : "8 ore in mare",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/fishing-charter-navigation.webp",
        },
      ],
    },
  ]
    .filter((item) => !item.detailLabel.startsWith("Max 0") && !item.detailLabel.startsWith("Up to 0") && !item.detailLabel.startsWith("Hasta 0") && !item.detailLabel.startsWith("Jusqu'à 0") && !item.detailLabel.startsWith("Bis zu 0"))
    .sort(
      (a, b) =>
        (featuredPackageOrder[a.key] ?? Number.MAX_SAFE_INTEGER) -
        (featuredPackageOrder[b.key] ?? Number.MAX_SAFE_INTEGER),
    );

  return (
    <div className="overflow-x-clip">
      {/* ============================================================ */}
      {/*  Section 1: Le Nostre Esperienze                             */}
      {/*  Background blends from hero video sea color to teal         */}
      {/* ============================================================ */}
      <section
        className="egadi-water-reflection relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 60%, #071934 100%)",
        }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollSection animation="fade-up">
            <div className="mx-auto mb-24 max-w-5xl text-center">
              <RevealTitle text={t("landing.experiencesTitle")} compact />
              <p className="mx-auto mt-8 max-w-4xl text-base font-medium leading-8 text-white/75 md:text-lg">
                {seoIntro}
              </p>
              <div className="mx-auto mt-10 grid max-w-4xl gap-5 text-left md:grid-cols-2">
                <div className="border-l border-[var(--color-gold)]/60 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    {sectionInfoCopy.departure}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {departureLabel}
                  </p>
                </div>
                <div className="border-l border-[var(--color-gold)]/60 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                    {sectionInfoCopy.policy}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    {policyLabel}
                  </p>
                </div>
              </div>
            </div>
          </ScrollSection>

          <div className="space-y-32">
            {featuredPackages.map((experience, i) => (
              <ExperienceRow
                key={experience.key}
                experience={experience}
                index={i}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 2: Le Isole Egadi — Interactive Itinerary           */}
      {/* ============================================================ */}
      <IslandsItinerary />

      {/* ============================================================ */}
      {/*  Section 3: La scelta giusta per il tour in barca alle Egadi */}
      {/* ============================================================ */}
      <section
        className="egadi-water-reflection relative overflow-hidden px-4 py-28 md:px-8 lg:px-12 lg:py-32"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 38%, #0c3d5e 72%, #071934 100%)",
        }}
      >
        <div className="relative z-10 mx-auto max-w-7xl">
          <ScrollSection animation="fade-up">
            <div className="mx-auto mb-20 max-w-7xl text-center">
              <div className="relative inline-block max-w-6xl">
                <motion.h2
                  className="font-heading text-4xl font-bold leading-[1.04] text-white md:text-5xl lg:text-6xl xl:text-7xl"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  {isEs
                    ? "Itinerario en barco por las Egadi: Favignana y Levanzo desde Trapani"
                    : isFr
                    ? "Itinéraire en bateau aux Égades : Favignana et Levanzo depuis Trapani"
                    : isDe
                    ? "Bootstour-Route Egadi: Favignana und Levanzo ab Trapani"
                    : isEn
                    ? "Egadi boat tour itinerary: Favignana and Levanzo from Trapani"
                    : "Tour in barca alle Egadi: itinerario Favignana e Levanzo da Trapani"}
                </motion.h2>
                <motion.svg
                  viewBox="0 0 400 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto mt-4 w-[52%]"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                >
                  <motion.path
                    d="M0 10 Q50 2 100 10 T200 10 T300 10 T400 10"
                    stroke="url(#tourTitleGold)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient id="tourTitleGold" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                      <stop offset="20%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                      <stop offset="80%" stopColor="#f59e0b" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </div>
              <p className="mx-auto mt-8 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                {isEs
                  ? "La salida es desde el Porto di Trapani, Via dei Gladioli 15: itinerarios de 8 horas o 4 horas entre Favignana y Levanzo, con paradas de baño, snorkeling, skipper, aperitivo y rutas adaptadas al mar. Puedes elegir tour compartido, tour privado, chef a bordo en trimarán con confort de catamarán o charter de varios días."
                  : isFr
                  ? "Le départ se fait depuis le Porto di Trapani, Via dei Gladioli 15 : itinéraires de 8 heures ou 4 heures entre Favignana et Levanzo, avec baignades, snorkeling, skipper, apéritif et routes adaptées à la mer. Vous pouvez choisir un tour partagé, un tour privé, un chef à bord en trimaran avec confort de catamaran ou un charter de plusieurs jours."
                  : isDe
                  ? "Die Abfahrt erfolgt ab Porto di Trapani, Via dei Gladioli 15: 8-Stunden- oder 4-Stunden-Routen zwischen Favignana und Levanzo, mit Badestopps, Snorkeling, Skipper, Aperitif und Kursen je nach Meer. Sie wählen geteilte Bootstour, private Tour, Chef an Bord im Trimaran mit Katamaran-Komfort oder mehrtägigen Charter."
                  : isEn
                  ? "Departure is from the Porto di Trapani, Via dei Gladioli 15: 8-hour or 4-hour routes between Favignana and Levanzo, with swim stops, snorkeling, skipper, aperitivo and routes shaped by the sea. Choose a shared tour, private tour, chef on board in a trimaran with catamaran-style comfort or a multi-day charter."
                  : "La partenza è dal Porto di Trapani, Via dei Gladioli 15: itinerari da 8 ore o 4 ore tra Favignana e Levanzo, con soste bagno, snorkeling, skipper, aperitivo e rotte adattate al mare. Puoi scegliere tour condiviso, tour privato, chef a bordo in trimarano con comfort da catamarano o charter di più giorni."}
              </p>
            </div>
          </ScrollSection>

          <div className="grid items-stretch gap-10 lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="space-y-7">
              <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                {isEs ? "Ruta y horarios" : isFr ? "Route et horaires" : isDe ? "Route und Zeiten" : isEn ? "Route and timing" : "Rotta e orari"}
              </p>
              <div className="space-y-5">
                <h3 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                  {isEs
                    ? "Favignana y Levanzo desde Trapani: ruta y horarios"
                    : isFr
                    ? "Favignana et Levanzo depuis Trapani : route et horaires"
                    : isDe
                    ? "Favignana und Levanzo ab Trapani: Route und Zeiten"
                    : isEn
                    ? "Favignana and Levanzo from Trapani: route and timing"
                    : "Favignana e Levanzo da Trapani: rotta e orari"}
                </h3>
                <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                  {isEs
                    ? "El tour en barco de 8 horas sale del Porto di Trapani y une Favignana y Levanzo con una ruta flexible: check-in, navegación, paradas de baño y tiempo en Favignana. Cala Fredda, Cala Minnola y la Grotta degli Innamorati entran en el itinerario cuando mar y seguridad lo permiten."
                    : isFr
                    ? "Le tour en bateau de 8 heures part du Porto di Trapani et relie Favignana et Levanzo avec une route flexible : check-in, navigation, baignades et temps à Favignana. Cala Fredda, Cala Minnola et la Grotta degli Innamorati entrent dans l'itinéraire lorsque la mer et la sécurité le permettent."
                    : isDe
                    ? "Die 8-Stunden-Bootstour startet am Porto di Trapani und verbindet Favignana und Levanzo mit flexibler Route: Check-in, Fahrt, Badestopps und Zeit auf Favignana. Cala Fredda, Cala Minnola und die Grotta degli Innamorati werden eingeplant, wenn Meer und Sicherheit passen."
                    : isEn
                    ? "The 8-hour boat tour departs from the Porto di Trapani and links Favignana and Levanzo with a flexible route: check-in, navigation, swim stops and time in Favignana. Cala Fredda, Cala Minnola and the Grotta degli Innamorati become part of the itinerary when sea and safety allow."
                    : "Il tour in barca di 8 ore parte dal Porto di Trapani e collega Favignana e Levanzo con una rotta flessibile: check-in, navigazione, soste bagno e tempo a Favignana. Cala Fredda, Cala Minnola e Grotta degli Innamorati entrano nell'itinerario quando mare e sicurezza lo permettono."}
                </p>
              </div>
              <Link
                href={localizedPath(locale, "/experiences/boat-shared-full-day")}
                className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
              >
                {isEs ? "Ver el tour de 8 horas" : isFr ? "Voir le tour de 8 heures" : isDe ? "8-Stunden-Tour ansehen" : isEn ? "View the 8-hour tour" : "Vedi il tour 8 ore"}{" "}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[520px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                  <Image
                    src="/images/egadisailing-experience/01-cooking-experience-chef-a-bordo.webp"
                    alt={isEs ? "Chef y skipper a bordo durante un tour en barco Favignana y Levanzo desde Trapani" : isFr ? "Chef et skipper à bord pendant un tour en bateau Favignana et Levanzo depuis Trapani" : isDe ? "Chef und Skipper an Bord bei einer Bootstour Favignana und Levanzo ab Trapani" : isEn ? "Chef and skipper on board during a Favignana and Levanzo boat tour from Trapani" : "Chef e skipper a bordo durante un tour in barca Favignana e Levanzo da Trapani"}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/45 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -right-8 -top-5 z-0 flex w-44 flex-col items-end gap-2 md:-right-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[1.06fr_0.94fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="order-2 h-full lg:order-1">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp"
                    alt={isEs ? "Cala Rossa, Cala Azzurra y Bue Marino vistos desde el mar durante un tour en barco por Favignana" : isFr ? "Cala Rossa, Cala Azzurra et Bue Marino vus depuis la mer pendant un tour en bateau à Favignana" : isDe ? "Cala Rossa, Cala Azzurra und Bue Marino vom Meer aus bei einer Bootstour auf Favignana" : isEn ? "Cala Rossa, Cala Azzurra and Bue Marino seen from the sea during a Favignana boat tour" : "Cala Rossa, Cala Azzurra e Bue Marino visti dal mare durante un tour in barca a Favignana"}
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/35 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -bottom-5 -left-8 z-0 flex w-44 flex-col gap-2 md:-left-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="order-1 flex items-center lg:order-2">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  {isEs ? "Calas de Favignana" : isFr ? "Criques de Favignana" : isDe ? "Buchten von Favignana" : isEn ? "Favignana coves" : "Cale di Favignana"}
                </p>
                <div className="space-y-5">
                  <h3 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    {isEs ? "Cala Rossa, Cala Azzurra y Bue Marino" : isFr ? "Cala Rossa, Cala Azzurra et Bue Marino" : isDe ? "Cala Rossa, Cala Azzurra und Bue Marino" : isEn ? "Cala Rossa, Cala Azzurra and Bue Marino" : "Cala Rossa, Cala Azzurra e Bue Marino"}
                  </h3>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    {isEs
                        ? "Los mejores itinerarios pasan por las calas que definen Favignana: Cala Rossa para el agua turquesa, Cala Azzurra para el baño, Bue Marino para roca y cuevas. El skipper ajusta las paradas según viento, corrientes y afluencia, para vivir Favignana y Levanzo sin una ruta rígida."
                        : isFr
                        ? "Les meilleurs itinéraires passent par les criques qui définissent Favignana : Cala Rossa pour l'eau turquoise, Cala Azzurra pour la baignade, Bue Marino pour la roche et les grottes. Le skipper ajuste les arrêts selon le vent, les courants et l'affluence, pour vivre Favignana et Levanzo sans route rigide."
                        : isDe
                        ? "Die besten Routen führen zu den Buchten, die Favignana prägen: Cala Rossa für türkisfarbenes Wasser, Cala Azzurra zum Baden, Bue Marino für Felsen und Grotten. Der Skipper passt die Stopps an Wind, Strömung und Andrang an, damit Favignana und Levanzo ohne starre Route erlebbar bleiben."
                        : isEn
                        ? "The best itineraries pass through the coves that define Favignana: Cala Rossa for turquoise water, Cala Azzurra for swimming, Bue Marino for rock and caves. The skipper adjusts the stops according to wind, currents and crowding, so Favignana and Levanzo stay flexible rather than locked to a rigid route."
                        : "Gli itinerari migliori passano dalle cale che definiscono Favignana: Cala Rossa per l'acqua turchese, Cala Azzurra per il bagno, Bue Marino per roccia e grotte. Lo skipper adatta le soste a vento, correnti e affollamento, così Favignana e Levanzo restano un itinerario vivo e non una rotta rigida."}
                  </p>
                </div>
                <Link
                  href={localizedPath(locale, "/experiences/boat-exclusive-full-day")}
                  className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
                >
                  {isEs ? "Ver el tour privado" : isFr ? "Voir le tour privé" : isDe ? "Private Tour ansehen" : isEn ? "View the private tour" : "Vedi il tour privato"}{" "}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="flex items-center">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  {isEs ? "Baño y cocina a bordo" : isFr ? "Baignade et cuisine à bord" : isDe ? "Baden und Bordküche" : isEn ? "Swim stops and food on board" : "Bagno e cucina a bordo"}
                </p>
                <div className="space-y-5">
                  <h3 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    {isEs ? "Paradas de baño, snorkeling y almuerzo/chef a bordo" : isFr ? "Baignades, snorkeling et déjeuner/chef à bord" : isDe ? "Badestopps, Snorkeling und Mittagessen/Chef an Bord" : isEn ? "Swim stops, snorkeling and lunch/chef on board" : "Soste bagno, snorkeling e pranzo/chef a bordo"}
                  </h3>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    {isEs
                        ? "El tour no se vende solo por la ruta: cuenta lo que pasa a bordo. Máscaras para snorkeling, paradas para nadar, aperitivo, almuerzo a bordo y, en la experiencia premium, chef en trimarán con confort de catamarán hacen que la excursión sea más clara y más fácil de elegir."
                        : isFr
                        ? "Le tour ne se vend pas seulement par la route : il doit dire ce qui se passe à bord. Masques pour le snorkeling, baignades, apéritif, déjeuner à bord et, dans l'expérience premium, chef en trimaran avec confort de catamaran rendent l'excursion plus lisible et plus facile à choisir."
                        : isDe
                        ? "Die Tour überzeugt nicht nur durch die Route, sondern durch das, was an Bord passiert. Masken fürs Snorkeling, Badestopps, Aperitif, Mittagessen an Bord und im Premium-Erlebnis ein Chef im Trimaran mit Katamaran-Komfort machen das Angebot klarer und leichter wählbar."
                        : isEn
                        ? "The tour is not only about the route: it must explain what happens on board. Masks for snorkeling, swim stops, aperitivo, lunch on board and, in the premium experience, a chef on a trimaran with catamaran-style comfort make the excursion clearer and easier for guests to choose."
                        : "Il tour non si vende solo con la rotta: deve dire cosa succede a bordo. Maschere per snorkeling, soste bagno, aperitivo, pranzo a bordo e, nell'esperienza premium, chef in trimarano con comfort da catamarano rendono l'escursione più chiara e più facile da scegliere."}
                  </p>
                </div>
                <Link
                  href={localizedPath(locale, "/experiences/exclusive-experience")}
                  className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
                >
                  {isEs ? "Ver la experiencia con chef" : isFr ? "Voir l'expérience avec chef" : isDe ? "Chef-Erlebnis ansehen" : isEn ? "View the chef experience" : "Vedi l'esperienza con chef"}{" "}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp"
                    alt={isEs ? "Parada de baño y snorkeling en Cala Rossa durante una excursión en barco por Favignana y Levanzo" : isFr ? "Baignade et snorkeling à Cala Rossa pendant une excursion en bateau à Favignana et Levanzo" : isDe ? "Badestopp und Snorkeling in Cala Rossa bei einer Bootstour Favignana und Levanzo" : isEn ? "Swim stop and snorkeling in Cala Rossa during a Favignana and Levanzo boat excursion" : "Sosta bagno e snorkeling a Cala Rossa durante un'escursione in barca Favignana e Levanzo"}
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/35 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -right-8 -top-5 z-0 flex w-44 flex-col items-end gap-2 md:-right-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="order-2 h-full lg:order-1">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/04-aperitivo-tramonto-isole-egadi.webp"
                    alt={isEs ? "Aperitivo a bordo durante un tour compartido o privado en barco por las Islas Egadi" : isFr ? "Apéritif à bord pendant un tour partagé ou privé en bateau aux îles Égades" : isDe ? "Aperitif an Bord während einer geteilten oder privaten Bootstour zu den Ägadischen Inseln" : isEn ? "Aperitivo on board during a shared or private Egadi Islands boat tour" : "Aperitivo a bordo durante un tour condiviso o privato in barca alle Isole Egadi"}
                    fill
                    sizes="(min-width: 1024px) 54vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071934]/40 via-transparent to-transparent" />
                </div>
                <div
                  className="pointer-events-none absolute -bottom-5 -left-8 z-0 flex w-44 flex-col gap-2 md:-left-14 md:w-56"
                  aria-hidden="true"
                >
                  <span className="h-px w-full bg-[var(--color-gold)]/85" />
                  <span className="h-px w-[92%] bg-[var(--color-gold)]/75" />
                  <span className="h-px w-[84%] bg-[var(--color-gold)]/65" />
                  <span className="h-px w-[76%] bg-[var(--color-gold)]/55" />
                  <span className="h-px w-[68%] bg-[var(--color-gold)]/45" />
                  <span className="h-px w-[60%] bg-[var(--color-gold)]/35" />
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="order-1 flex items-center lg:order-2">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  {isEs ? "Elige la fórmula" : isFr ? "Choisir la formule" : isDe ? "Format wählen" : isEn ? "Choose your format" : "Scegli la formula"}
                </p>
                <div className="space-y-5">
                  <h3 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                    {isEs ? "Tour compartido, tour privado o charter por las Egadi" : isFr ? "Tour partagé, tour privé ou charter aux Égades" : isDe ? "Geteilte Tour, private Tour oder Charter zu den Egadi" : isEn ? "Shared tour, private tour or Egadi charter" : "Tour condiviso, tour privato o charter alle Egadi"}
                  </h3>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                    {isEs
                        ? "Si quieres una excursión de día completo, el tour compartido de 8 horas es la opción más directa; si viajas en grupo, el tour privado de 4 u 8 horas da más control. Para vivir Favignana, Levanzo y Marettimo con más margen, el charter en trimarán permite construir una ruta de varios días."
                        : isFr
                        ? "Si vous voulez une excursion d'une journée, le tour partagé de 8 heures est l'option la plus directe ; si vous voyagez en groupe, le tour privé de 4 ou 8 heures donne plus de contrôle. Pour vivre Favignana, Levanzo et Marettimo avec plus de marge, le charter en trimaran permet une route de plusieurs jours."
                        : isDe
                        ? "Wenn Sie einen Tagesausflug suchen, ist die geteilte 8-Stunden-Tour die direkteste Wahl; wenn Sie als Gruppe reisen, bietet die private 4- oder 8-Stunden-Tour mehr Kontrolle. Für Favignana, Levanzo und Marettimo mit mehr Spielraum eignet sich ein mehrtägiger Charter im Trimaran."
                        : isEn
                        ? "If you want a full-day excursion, the shared 8-hour tour is the most direct option; if you travel as a group, the private 4 or 8-hour tour gives more control. To experience Favignana, Levanzo and Marettimo with more margin, the trimaran charter lets you build a multi-day route."
                        : "Se vuoi un'escursione giornaliera, il tour condiviso di 8 ore è la risposta più diretta; se viaggi in gruppo, il tour privato da 4 o 8 ore dà più controllo. Per vivere Favignana, Levanzo e Marettimo con più margine, il charter in trimarano permette una rotta di più giorni."}
                  </p>
                </div>
                <Link
                  href={localizedPath(locale, "/experiences/charter")}
                  className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
                >
                  {isEs ? "Ver el charter Egadi" : isFr ? "Voir le charter Égades" : isDe ? "Egadi-Charter ansehen" : isEn ? "View the Egadi charter" : "Vedi il charter Egadi"}{" "}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </div>
            </ScrollSection>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 4: Fatti convincere — Recensioni Google             */}
      {/* ============================================================ */}
      <section
        className="relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
        }}
      >
        <div className="relative z-10 max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-20">
              <RevealTitle text={isEs ? "Déjate convencer" : isFr ? "Laissez-vous convaincre" : isDe ? "Lassen Sie sich überzeugen" : isEn ? "Let our guests convince you" : "Fatti convincere"} />
              <p className="text-white/50 text-lg mt-6">
                {isEs
                  ? "Reseñas verificadas de Google y Tripadvisor"
                  : isFr
                  ? "Avis vérifiés de Google et Tripadvisor"
                  : isDe
                  ? "Verifizierte Bewertungen von Google und Tripadvisor"
                  : isEn
                  ? "Verified reviews from Google and Tripadvisor"
                  : "Recensioni verificate da Google e Tripadvisor"}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
                <a
                  href={googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-gold)] transition hover:text-[#f2b84b]"
                >
	                  {isEs ? "Leer en Google" : isFr ? "Lire sur Google" : isDe ? "Auf Google lesen" : isEn ? "Read on Google" : "Leggi su Google"}{" "}
	                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href={tripadvisorReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-gold)] transition hover:text-[#f2b84b]"
                >
	                  {isEs ? "Leer en Tripadvisor" : isFr ? "Lire sur Tripadvisor" : isDe ? "Auf Tripadvisor lesen" : isEn ? "Read on Tripadvisor" : "Leggi su Tripadvisor"}{" "}
	                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </ScrollSection>

          <div className="mx-auto mt-10 flex max-h-[660px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]">
            <TestimonialsColumn testimonials={reviewColumns[0]} locale={locale} duration={22} />
            <TestimonialsColumn
              testimonials={reviewColumns[1]}
              locale={locale}
              className="hidden md:block"
              duration={26}
            />
            <TestimonialsColumn
              testimonials={reviewColumns[2]}
              locale={locale}
              className="hidden lg:block"
              duration={24}
            />
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  Section 5: CTA Finale con pennellata SVG + form pillola    */}
      {/* ============================================================ */}
      <section
        className="relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0c3d5e 50%, #071934 100%)",
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <div className="relative inline-block mb-8">
              <h2 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white relative z-10">
                {finalCtaTitle}
              </h2>
              {/* SVG brush stroke under title */}
              <svg
                viewBox="0 0 400 30"
                className="absolute -bottom-3 left-0 w-full h-auto z-0"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5 20 C40 8, 80 25, 120 15 S200 8, 240 18 S320 10, 360 20 S390 12, 395 16"
                  stroke="url(#brushGold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <path
                  d="M10 24 C50 14, 100 28, 150 18 S250 12, 300 22 S370 14, 395 20"
                  stroke="url(#brushGold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.35"
                />
                <defs>
                  <linearGradient id="brushGold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
                    <stop offset="15%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="85%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-white/60 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
              {finalCtaSubtitle}
            </p>
            <div className="flex justify-center">
              <BookingSearch services={services} />
            </div>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
