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
  Clock,
  UserCheck,
  ArrowRight,
  Compass,
  ExternalLink,
  Sparkles,
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
  eyebrow: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  detailLabel: string;
  chips: string[];
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

/* ------------------------------------------------------------------ */
/*  Reveal Title — gold line sweeps left to right revealing text      */
/* ------------------------------------------------------------------ */

function RevealTitle({ text }: { text: string }) {
  return (
    <div className="relative inline-block">
      <motion.h2
        className="font-heading text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold text-white relative"
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
        className="w-[60%] mx-auto mt-4"
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
}: {
  experience: FeaturedPackage;
  index: number;
}) {
  const isEven = index % 2 === 0;
  const polaroids = experience.polaroids.slice(0, 3);

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

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {experience.durationLabel}
          </span>
          <span className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            {experience.detailLabel}
          </span>
          {experience.chips.map((chip, chipIndex) => {
            const Icon = chipIndex % 2 === 0 ? Compass : Sparkles;
            return (
              <span key={chip} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {chip}
              </span>
            );
          })}
        </div>

        <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
          {experience.details.map((detail) => (
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
  const maxPax = (serviceIds: string[]) => getMaxCapacity(services, serviceIds);
  const reviewColumns = getReviewColumns();
  const featuredPackages: FeaturedPackage[] = [
    {
      key: "chef-a-bordo",
      eyebrow: isEs ? "Premium privado" : isFr ? "Premium privé" : isDe ? "Privates Premium-Erlebnis" : isEn ? "Private premium" : "Premium privato",
      title: isEs ? "Chef a bordo" : isFr ? "Chef à bord" : isDe ? "Chef an Bord" : isEn ? "Chef on board" : "Chef a bordo",
      subtitle:
        isEs
	          ? "El Neel 47 reservado para ti, con chef, patrón y azafata para un día cuidado entre sabores locales, mar y fondeos tranquilos."
          : isFr
          ? "Le Neel 47 réservé pour vous, avec chef, skipper et hôtesse pour une journée soignée entre saveurs locales, mer et mouillages tranquilles."
          : isDe
          ? "Der Neel 47 exklusiv für Sie, mit Chefkoch, Skipper und Hostess für einen gepflegten Tag zwischen lokalen Aromen, Meer und ruhigen Ankerplätzen."
          : isEn
          ? "The Trimarano reserved for you, with chef, skipper and hostess for a curated day of local flavours, sea and stops at anchor."
          : "Il Trimarano in esclusiva, con chef, skipper e hostess per una giornata curata tra sapori locali, mare e soste in rada.",
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
	      chips: isEs
          ? ["Comida al fondeo", "Chef y azafata"]
          : isFr
            ? ["Déjeuner au mouillage", "Chef et hôtesse"]
            : isDe
              ? ["Mittagessen vor Anker", "Chefkoch und Hostess"]
            : isEn
              ? ["Lunch at anchor", "Chef and hostess"]
              : ["Pranzo in rada", "Chef e hostess"],
      details: [
        {
          title: isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Per chi",
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
            ? "Neel 47 privado, tripulación dedicada, mesa preparada y ritmo gestionado con calma."
            : isFr
            ? "Neel 47 privé, équipage dédié, table dressée et rythme géré avec calme."
            : isDe
            ? "Privater Neel 47, engagierte Crew, gedeckter Tisch und ein bewusst ruhiger Tagesrhythmus."
            : isEn
            ? "Private Trimarano, dedicated crew, prepared table and a calmly managed schedule."
            : "Trimarano privato, crew dedicata, tavola preparata e tempi gestiti con calma.",
        },
        {
          title: isEs ? "Ruta" : isFr ? "Route" : isDe ? "Route" : isEn ? "Route" : "Rotta",
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
          caption: isEs ? "Neel 47 único" : isFr ? "Neel 47 unique" : isDe ? "Einzigartiger Neel 47" : isEn ? "Unique Trimarano" : "Trimarano unico",
          color: "#DDA0DD",
          src: "/images/boats/neel-47/neel-47-hero.webp",
        },
      ],
    },
    {
      key: "charter",
      eyebrow: isEs ? "Explora las Islas Egadi" : isFr ? "Explorez les îles Égades" : isDe ? "Die Ägadischen Inseln entdecken" : isEn ? "Explore the Egadi Islands" : "Esplora le Egadi",
      title: isEn ? "Charter" : "Charter",
      subtitle:
        isEs
          ? "De tres a siete días en trimarán, con una ruta acordada entre Favignana, Levanzo y Marettimo y noches vividas cerca del mar."
        : isFr
          ? "De trois à sept jours en trimaran, avec une route convenue entre Favignana, Levanzo et Marettimo et des nuits au plus près de la mer."
        : isDe
          ? "Drei bis sieben Tage auf dem Trimaran, mit gemeinsam geplanter Route zwischen Favignana, Levanzo und Marettimo und Nächten ganz nah am Meer."
        : isEn
          ? "Three to seven days on the trimaran, with a route agreed between Favignana, Levanzo and Marettimo and nights spent close to the sea."
          : "Da 3 a 7 giornate sul trimarano, con rotta concordata tra Favignana, Levanzo e Marettimo e notti vissute vicino al mare.",
      durationLabel: isEs ? "3-7 días" : isFr ? "3-7 jours" : isDe ? "3-7 Tage" : isEn ? "3-7 days" : "3-7 giornate",
      detailLabel: isEs ? "Itinerario a medida" : isFr ? "Itinéraire sur mesure" : isDe ? "Individuelle Route" : isEn ? "Tailored itinerary" : "Itinerario su misura",
      chips: isEs ? ["Noches a bordo", "Ruta flexible"] : isFr ? ["Nuits à bord", "Route flexible"] : isDe ? ["Nächte an Bord", "Flexible Route"] : isEn ? ["Nights on board", "Flexible route"] : ["Notti a bordo", "Rotta flessibile"],
      details: [
        {
          title: isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Per chi",
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
            ? "Camarotes, espacios compartidos, cocina y skipper: el trimarán se convierte en una casa en el mar."
            : isFr
            ? "Cabines, espaces partagés, cuisine et skipper : le trimaran devient une maison en mer."
            : isDe
            ? "Kabinen, Gemeinschaftsbereiche, Pantry und Skipper: Der Trimaran wird zu Ihrem Zuhause auf dem Meer."
            : isEn
            ? "Cabins, shared spaces, galley and skipper: the trimaran becomes a home at sea."
            : "Cabine, spazi comuni, cucina e skipper: il trimarano diventa una casa sul mare.",
        },
        {
          title: isEs ? "Ruta" : isFr ? "Route" : isDe ? "Route" : isEn ? "Route" : "Rotta",
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
      eyebrow: isEs ? "Media jornada" : isFr ? "Demi-journée" : isDe ? "Halbtagesausflug" : isEn ? "Half-day" : "Mezza giornata",
      title: isEs ? "Excursión privada de 4 horas" : isFr ? "Excursion privée de 4 heures" : isDe ? "Private Bootstour 4 Stunden" : isEn ? "4-hour boat tour" : "Barca 4 ore",
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
      durationLabel: isEs ? "4 horas" : isFr ? "4 heures" : isDe ? "4 Stunden" : isEn ? "4 hours" : "4 ore",
      detailLabel: isEs ? "Solo privado" : isFr ? "Privé uniquement" : isDe ? "Nur privat" : isEn ? "Private only" : "Solo esclusivo",
      chips: isEs ? ["Mañana o tarde", "Regreso claro"] : isFr ? ["Matin ou après-midi", "Retour clair"] : isDe ? ["Vormittag oder Nachmittag", "Klare Rückkehrzeit"] : isEn ? ["Morning or afternoon", "Clear return time"] : ["Mattina o pomeriggio", "Rientro preciso"],
      details: [
        {
          title: isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Per chi",
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
          title: isEs ? "Ruta" : isFr ? "Route" : isDe ? "Route" : isEn ? "Route" : "Rotta",
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
      eyebrow: isEs ? "Día completo" : isFr ? "Journée complète" : isDe ? "Ganzer Tag" : isEn ? "Full day" : "Giornata intera",
      title: isEs ? "Excursión en barco de 8 horas" : isFr ? "Excursion en bateau de 8 heures" : isDe ? "Bootstour 8 Stunden" : isEn ? "8-hour boat tour" : "Barca 8 ore",
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
      durationLabel: isEs ? "8 horas" : isFr ? "8 heures" : isDe ? "8 Stunden" : isEn ? "8 hours" : "8 ore",
      detailLabel: isEs ? "Compartido o privado" : isFr ? "Partagé ou privé" : isDe ? "Geteilt oder privat" : isEn ? "Shared or private" : "Condiviso o esclusivo",
      chips: isEs ? ["Snorkel", "Favignana y Levanzo"] : isFr ? ["Snorkeling", "Favignana et Levanzo"] : isDe ? ["Schnorcheln", "Favignana und Levanzo"] : isEn ? ["Snorkelling", "Favignana and Levanzo"] : ["Snorkeling", "Favignana e Levanzo"],
      details: [
        {
          title: isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Per chi",
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
          title: isEs ? "Ruta" : isFr ? "Route" : isDe ? "Route" : isEn ? "Route" : "Rotta",
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
      eyebrow: isEs ? "Pesca deportiva" : isFr ? "Pêche sportive" : isDe ? "Sportangeln" : isEn ? "Sport fishing" : "Pesca sportiva",
      title: isEs ? "Charter de pesca Egadi" : isFr ? "Charter de pêche Égades" : isDe ? "Angelcharter Ägadische Inseln" : isEn ? "Egadi fishing charter" : "Charter pesca Egadi",
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
      chips: isEs
        ? ["Equipo profesional", "Capturas reguladas"]
        : isFr
          ? ["Matériel professionnel", "Prises réglementées"]
          : isDe
            ? ["Profi-Ausrüstung", "Fang nach Regeln"]
            : isEn
              ? ["Professional gear", "Catch within limits"]
              : ["Attrezzatura pro", "Pescato nei limiti"],
      details: [
        {
          title: isEs ? "Ideal para" : isFr ? "Idéal pour" : isDe ? "Ideal für" : isEn ? "Best for" : "Per chi",
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
          title: isEs ? "Reglas" : isFr ? "Règles" : isDe ? "Regeln" : isEn ? "Rules" : "Regole",
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
            <div className="text-center mb-24">
              <RevealTitle text={t("landing.experiencesTitle")} />
            </div>
          </ScrollSection>

          <div className="space-y-32">
            {featuredPackages.map((experience, i) => (
              <ExperienceRow
                key={experience.key}
                experience={experience}
                index={i}
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
                    ? "La elección adecuada para tu excursión en barco a las Islas Egadi"
                    : isFr
                    ? "Le bon choix pour votre excursion en bateau aux îles Égades"
                    : isDe
                    ? "Die richtige Wahl für Ihre Bootstour zu den Ägadischen Inseln"
                    : isEn
                    ? "The right choice for your boat tour in the Egadi Islands"
                    : "La scelta giusta per il tuo tour in barca alle Isole Egadi"}
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
                  ? "A bordo encontrarás rutas cuidadas, sabores locales y una tripulación que conoce el mar de las Egadi: desde la experiencia con chef en el trimarán hasta excursiones en barco entre Favignana y Levanzo."
                  : isFr
                  ? "À bord, vous trouverez des routes soignées, des saveurs locales et un équipage qui connaît la mer des Égades : de l'expérience avec chef sur le trimaran aux excursions en bateau entre Favignana et Levanzo."
                  : isDe
                  ? "An Bord erwarten Sie sorgfältig geplante Routen, lokale Aromen und eine Crew, die das Meer der Ägadischen Inseln kennt: vom Gourmet-Erlebnis mit Chefkoch auf dem Trimaran bis zu Bootstouren zwischen Favignana und Levanzo."
                  : isEn
                  ? "On board, you will find curated routes, local flavours and a crew that knows the Egadi sea: from the chef experience on the trimaran to boat tours between Favignana and Levanzo."
                  : "A bordo trovi rotte curate, sapori locali e una crew che conosce il mare delle Egadi: dall'esperienza con chef sul trimarano ai tour in barca tra Favignana e Levanzo."}
              </p>
            </div>
          </ScrollSection>

          <div className="grid items-stretch gap-10 lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="space-y-7">
              <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  {isEs ? "Experiencia gastronómica" : isFr ? "Expérience gastronomique" : isDe ? "Gourmet-Erlebnis" : isEn ? "Cooking experience" : "Esperienza gastronomica"}
              </p>
              <div className="space-y-5">
                <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
                  {isEs
                    ? "Chef a bordo durante tu tour por las Egadi"
                    : isFr
                    ? "Chef à bord pendant votre tour aux Égades"
                    : isDe
                    ? "Chef an Bord während Ihrer Tour zu den Ägadischen Inseln"
                    : isEn
                    ? "Chef on board during your Egadi tour"
                    : "Chef a bordo durante il tuo tour alle Egadi"}
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                  {isEs
	                    ? "El chef prepara a bordo platos inspirados en la cocina siciliana y el mar de Trapani, convirtiendo la parada al fondeo en un momento convivial, cuidado y muy local. No es solo comida: es una parte viva de la experiencia Egadisailing."
                    : isFr
                    ? "Le chef prépare à bord des plats inspirés de la cuisine sicilienne et de la mer de Trapani, transformant l'arrêt au mouillage en un moment convivial, soigné et très local. Ce n'est pas seulement un déjeuner : c'est une partie vivante de l'expérience Egadisailing."
                    : isDe
                    ? "Der Chefkoch bereitet an Bord Gerichte zu, die von der sizilianischen Küche und dem Meer von Trapani inspiriert sind. So wird der Stopp vor Anker zu einem gepflegten, geselligen und sehr lokalen Moment. Es ist nicht nur Mittagessen: Es ist ein lebendiger Teil des Egadisailing-Erlebnisses."
                    : isEn
                    ? "The chef prepares dishes on board inspired by Sicilian cooking and the sea of Trapani, turning the stop at anchor into a convivial, curated and deeply local moment. It is not just lunch: it is a living part of the Egadisailing experience."
                    : "Lo chef prepara a bordo piatti ispirati alla cucina siciliana e al mare di Trapani, trasformando la sosta in rada in un momento conviviale, curato e profondamente locale. Non è solo pranzo: è una parte viva dell'esperienza Egadisailing."}
                </p>
              </div>
              <Link
                href={localizedPath(locale, "/experiences/exclusive-experience")}
                className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-gold)] transition-all hover:gap-3 md:text-lg"
              >
                {isEs ? "Descubre los menús" : isFr ? "Découvrir les menus" : isDe ? "Menüs entdecken" : isEn ? "Discover the menus" : "Scopri i menù"}{" "}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[520px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                  <Image
                    src="/images/egadisailing-experience/01-cooking-experience-chef-a-bordo.webp"
	                    alt={isEs ? "Chef a bordo durante una excursión en barco a las Islas Egadi" : isFr ? "Chef à bord pendant une excursion en bateau aux îles Égades" : isDe ? "Chef an Bord während einer Bootstour zu den Ägadischen Inseln" : isEn ? "Chef on board during a boat tour in the Egadi Islands" : "Chef a bordo durante un tour in barca alle Isole Egadi"}
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
	                    alt={isEs ? "Islas Egadi vistas desde el mar durante una excursión en barco" : isFr ? "Îles Égades vues depuis la mer pendant une excursion en bateau" : isDe ? "Ägadische Inseln vom Meer aus während einer Bootstour" : isEn ? "Egadi Islands seen from the sea during a boat tour" : "Isole Egadi viste dal mare durante un tour in barca"}
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
	                  {isEs ? "Perspectiva desde el mar" : isFr ? "Perspective depuis la mer" : isDe ? "Perspektive vom Meer" : isEn ? "Perspective from the sea" : "Prospettiva dal mare"}
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
	                    {isEs ? "Las Islas Egadi como nunca las has visto" : isFr ? "Les îles Égades comme vous ne les avez jamais vues" : isDe ? "Die Ägadischen Inseln, wie Sie sie noch nie gesehen haben" : isEn ? "The Egadi Islands as you have never seen them" : "Le Isole Egadi come non le hai mai viste"}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
	                    {isEs
                        ? "Descubre Favignana, Levanzo y Marettimo desde una perspectiva distinta, entre bahías accesibles solo por mar, paradas al fondeo y paisajes que cambian con la luz del día."
                        : isFr
                        ? "Découvrez Favignana, Levanzo et Marettimo depuis une perspective différente, entre baies accessibles seulement par la mer, mouillages et paysages qui changent avec la lumière du jour."
                        : isDe
                        ? "Entdecken Sie Favignana, Levanzo und Marettimo aus einer anderen Perspektive: mit Buchten, die nur vom Meer erreichbar sind, Stopps vor Anker und Landschaften, die sich mit dem Tageslicht verändern."
                        : isEn
	                      ? "Discover Favignana, Levanzo and Marettimo from a different perspective, among bays reachable only by sea, stops at anchor and views that change with the light of the day."
	                      : "Scopri Favignana, Levanzo e Marettimo da una prospettiva diversa, tra baie raggiungibili solo via mare, soste in rada e scorci che cambiano con la luce del giorno."}
                  </p>
                </div>
              </div>
            </ScrollSection>
          </div>

          <div className="mt-28 grid items-stretch gap-10 lg:min-h-[560px] lg:grid-cols-[0.94fr_1.06fr] lg:gap-16">
            <ScrollSection animation="fade-left" className="flex items-center">
              <div className="space-y-7">
                <p className="text-xs font-semibold uppercase tracking-[2.5px] text-[var(--color-gold)]">
                  Cala Rossa
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
	                    {isEs ? "Nada en las aguas cristalinas de Cala Rossa" : isFr ? "Nagez dans les eaux cristallines de Cala Rossa" : isDe ? "Schwimmen Sie im kristallklaren Wasser von Cala Rossa" : isEn ? "Swim in the crystal-clear waters of Cala Rossa" : "Nuota nelle acque cristalline di Cala Rossa"}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
	                    {isEs
                        ? "Sumérgete en los tonos turquesa de Cala Rossa, una de las bahías más icónicas de Favignana, con tiempo para nadar, relajarte y vivir de cerca el mar de las Egadi."
                        : isFr
                        ? "Plongez dans les nuances turquoise de Cala Rossa, l'une des baies les plus iconiques de Favignana, avec le temps de nager, de vous détendre et de vivre la mer des Égades de près."
                        : isDe
                        ? "Tauchen Sie in die Türkistöne von Cala Rossa ein, einer der ikonischsten Buchten Favignanas, mit Zeit zum Schwimmen, Entspannen und um das Meer der Ägadischen Inseln aus der Nähe zu erleben."
                        : isEn
	                      ? "Dive into the turquoise shades of Cala Rossa, one of Favignana's most iconic bays, with time to swim, relax and experience the Egadi sea up close."
	                      : "Tuffati nelle sfumature turchesi di Cala Rossa, una delle baie più iconiche di Favignana, con tempo per nuotare, rilassarti e vivere il mare delle Egadi da vicino."}
                  </p>
                </div>
              </div>
            </ScrollSection>

            <ScrollSection animation="fade-right" className="h-full">
              <div className="relative h-full">
                <div className="relative z-10 h-full min-h-[460px] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.04] shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                  <Image
                    src="/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp"
	                    alt={isEs ? "Mujer nadando en las aguas cristalinas de Cala Rossa en Favignana" : isFr ? "Femme nageant dans les eaux cristallines de Cala Rossa à Favignana" : isDe ? "Frau schwimmt im kristallklaren Wasser von Cala Rossa auf Favignana" : isEn ? "Woman swimming in the crystal-clear waters of Cala Rossa in Favignana" : "Donna che nuota nelle acque cristalline di Cala Rossa a Favignana"}
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
	                    alt={isEs ? "Grupo disfrutando de un aperitivo en barco al atardecer con las Islas Egadi al fondo" : isFr ? "Groupe profitant d'un apéritif en bateau au coucher du soleil avec les îles Égades en arrière-plan" : isDe ? "Gruppe beim Aperitif auf dem Boot bei Sonnenuntergang mit den Ägadischen Inseln im Hintergrund" : isEn ? "Group enjoying an aperitivo on a boat at sunset with the Egadi Islands in the background" : "Gruppo che fa aperitivo in barca al tramonto con le Isole Egadi sullo sfondo"}
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
		                  {isEs ? "Atardecer al fondeo" : isFr ? "Coucher de soleil au mouillage" : isDe ? "Sonnenuntergang vor Anker" : isEn ? "Sunset at anchor" : "Tramonto in rada"}
                </p>
                <div className="space-y-5">
                  <h2 className="font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
	                    {isEs ? "Aperitivo al atardecer en las Islas Egadi" : isFr ? "Apéritif au coucher du soleil aux îles Égades" : isDe ? "Aperitif bei Sonnenuntergang auf den Ägadischen Inseln" : isEn ? "Sunset aperitivo in the Egadi Islands" : "Aperitivo al tramonto alle Isole Egadi"}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
	                    {isEs
                        ? "Brinda fondeado mientras el sol cae detrás de las Islas Egadi, con tu grupo a bordo, el mar alrededor y esa luz dorada que convierte el regreso en uno de los momentos más bonitos del día."
                        : isFr
                        ? "Levez votre verre au mouillage pendant que le soleil descend derrière les îles Égades, avec votre groupe à bord, la mer autour et cette lumière dorée qui transforme le retour en l'un des plus beaux moments de la journée."
                        : isDe
                        ? "Stoßen Sie vor Anker an, während die Sonne hinter den Ägadischen Inseln sinkt, Ihre Gruppe an Bord ist, das Meer ringsum liegt und dieses goldene Licht die Rückfahrt zu einem der schönsten Momente des Tages macht."
                        : isEn
	                      ? "Raise a glass at anchor as the sun drops behind the Egadi Islands, with your group on board, the sea all around and that golden light that turns the return into one of the most beautiful moments of the day."
	                      : "Brinda in rada mentre il sole scende dietro le Isole Egadi, con il gruppo a bordo, il mare intorno e quella luce dorata che trasforma il rientro in uno dei momenti più belli della giornata."}
                  </p>
                </div>
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
	                {isEs ? "Deja la costa atrás" : isFr ? "Laissez la terre derrière vous" : isDe ? "Lassen Sie das Ufer hinter sich" : isEn ? "Leave the shore behind" : "Lascia la terra ferma"}
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
	              {isEs
                  ? "Reserva tu experiencia en las Islas Egadi. Elige la fecha y sube a bordo."
                  : isFr
                  ? "Réservez votre expérience aux îles Égades. Choisissez la date et montez à bord."
                  : isDe
                  ? "Buchen Sie Ihr Erlebnis auf den Ägadischen Inseln. Wählen Sie das Datum und kommen Sie an Bord."
                  : isEn
	                ? "Book your experience in the Egadi Islands. Choose your date, then come on board."
	                : "Prenota la tua esperienza nelle Isole Egadi. Scegli la data, sali a bordo."}
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
