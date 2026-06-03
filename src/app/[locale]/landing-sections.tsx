"use client";

import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { ScrollSection } from "@/components/scroll-section";
import {
  TestimonialsColumn,
  type TestimonialColumnItem,
} from "@/components/ui/testimonials-columns-1";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { PUBLIC_REVIEW_LINKS } from "@/lib/public-reviews";
import { localizedPath } from "@/lib/i18n/paths";
import { HomeExperiencesSection } from "./_components/home/home-experiences-section";
import {
  HomePackagesSection,
  type FeaturedPackage,
} from "./_components/home/home-packages-section";
import { HomeGourmetSection } from "./_components/home/home-gourmet-section";
import { HomeItinerarySection } from "./_components/home/home-itinerary-section";

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
    role: "Tripadvisor · storico · set 2025",
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

/* ------------------------------------------------------------------ */
/*  Reveal Title — gold line sweeps left to right revealing text      */
/* ------------------------------------------------------------------ */

function RevealTitle({ text, compact = false, id }: { text: string; compact?: boolean; id?: string }) {
  return (
    <div className="relative inline-block">
      <motion.h2
        id={id}
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
        aria-hidden="true"
        focusable="false"
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

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LandingSections({ services }: LandingSectionsProps) {
  const locale = useLocale();
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const maxPax = (serviceIds: string[]) => getMaxCapacity(services, serviceIds);
  const reviewColumns = getReviewColumns();
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
    ? "Elige tour compartido, tour privado, chef a bordo en trimarán o charter Egadi. Salida desde el Porto di Trapani y ruta flexible entre Favignana y Levanzo."
    : isFr
    ? "Choisissez tour partagé, tour privé, chef à bord en trimaran ou charter aux Égades. Départ du Porto di Trapani et route flexible entre Favignana et Levanzo."
    : isDe
    ? "Wählen Sie geteilte Tour, private Tour, Chef an Bord im Trimaran oder Egadi-Charter. Abfahrt vom Porto di Trapani und flexible Route zwischen Favignana und Levanzo."
    : isEn
    ? "Choose a shared tour, private tour, chef on board in a trimaran or Egadi charter. Departure from Trapani harbour and a flexible route between Favignana and Levanzo."
    : "Scegli tour condiviso, tour privato, chef a bordo in trimarano o charter Egadi. Partenza dal Porto di Trapani e rotta flessibile tra Favignana e Levanzo.";
  const finalCtaLabel = isEs
    ? "Reservar ahora"
    : isFr
    ? "Réserver maintenant"
    : isDe
    ? "Jetzt buchen"
    : isEn
    ? "Book now"
    : "Prenota ora";
  const finalCtaTrustItems = isEs
    ? ["Salida Porto di Trapani", "Skipper local", "Tour compartidos, privados y charter"]
    : isFr
    ? ["Départ Porto di Trapani", "Skipper local", "Tours partagés, privés et charter"]
    : isDe
    ? ["Abfahrt Porto di Trapani", "Lokaler Skipper", "Geteilte Touren, private Touren und Charter"]
    : isEn
    ? ["Trapani harbour departure", "Local skipper", "Shared tours, private tours and charter"]
    : ["Partenza Porto di Trapani", "Skipper locale", "Tour condivisi, privati e charter"];
  const reviewTitle = isEs
    ? "Reseñas de los tours en barco por las Islas Egadi"
    : isFr
    ? "Avis sur les tours en bateau aux îles Égades"
    : isDe
    ? "Bewertungen der Bootstouren zu den Ägadischen Inseln"
    : isEn
    ? "Reviews of Egadi Islands boat tours"
    : "Recensioni sui tour in barca alle Isole Egadi";
  const reviewSubtitle = isEs
    ? "Experiencias reales entre Favignana, Levanzo, snorkeling, chef a bordo, charter y días en trimarán con salida desde Trapani."
    : isFr
    ? "Expériences réelles entre Favignana, Levanzo, snorkeling, chef à bord, charter et journées en trimaran au départ de Trapani."
    : isDe
    ? "Echte Erfahrungen zwischen Favignana, Levanzo, Schnorcheln, Chef an Bord, Charter und Trimaran-Tagen ab Trapani."
    : isEn
    ? "Real guest experiences between Favignana, Levanzo, snorkelling, chef on board, charter and trimaran days from Trapani."
    : "Esperienze reali tra Favignana, Levanzo, snorkeling, chef a bordo, charter e giornate in trimarano con partenza da Trapani.";
  const reviewTrustItems = isEs
    ? ["Google y Tripadvisor", "Tour Favignana y Levanzo", "Experiencias privadas y gourmet"]
    : isFr
    ? ["Google et Tripadvisor", "Tour Favignana et Levanzo", "Expériences privées et gourmet"]
    : isDe
    ? ["Google und Tripadvisor", "Tour Favignana und Levanzo", "Private und Gourmet-Erlebnisse"]
    : isEn
    ? ["Google and Tripadvisor", "Favignana and Levanzo tours", "Private and gourmet experiences"]
    : ["Google e Tripadvisor", "Tour Favignana e Levanzo", "Esperienze private e gourmet"];
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
          caption: isEs ? "Ingredientes del día" : isFr ? "Ingrédients du jour" : isDe ? "Zutaten des Tages" : isEn ? "Daily ingredients" : "Ingredienti del giorno",
          color: "#FFB6C1",
          src: "/images/boats/neel-47/trimarano-ingredienti-alto.webp",
        },
        {
          caption: isEs ? "Pesca fresca" : isFr ? "Poisson frais" : isDe ? "Frischer Fisch" : isEn ? "Fresh fish" : "Pesce fresco",
          color: "#FFDAB9",
          src: "/images/boats/neel-47/trimarano-ingredienti.webp",
        },
        {
          caption: isEs ? "Pranzo in trimarán" : isFr ? "Déjeuner en trimaran" : isDe ? "Mittagessen im Trimaran" : isEn ? "Trimaran lunch" : "Pranzo in trimarano",
          color: "#DDA0DD",
          src: "/images/boats/neel-47/trimarano-pasta-rete.webp",
        },
        {
          caption: isEs ? "Chef a bordo" : isFr ? "Chef à bord" : isDe ? "Chef an Bord" : isEn ? "Chef on board" : "Chef a bordo",
          color: "#FDE68A",
          src: "/images/boats/neel-47/trimarano-chef.webp",
        },
        {
          caption: isEs ? "San Pedro fresco" : isFr ? "Saint-pierre frais" : isDe ? "Frischer Petersfisch" : isEn ? "Fresh John Dory" : "San Pietro fresco",
          color: "#BAE6FD",
          src: "/images/boats/neel-47/trimarano-sanpietro.webp",
        },
        {
          caption: isEs ? "Salsa terminada" : isFr ? "Sauce prête" : isDe ? "Fertige Sauce" : isEn ? "Finished sauce" : "Sugo pronto",
          color: "#FDBA74",
          src: "/images/boats/neel-47/trimarano-sugo-finito.webp",
        },
        {
          caption: isEs ? "Levanzo en lujo" : isFr ? "Levanzo en luxe" : isDe ? "Levanzo im Luxus" : isEn ? "Levanzo in luxury" : "Levanzo nel lusso",
          color: "#C4B5FD",
          src: "/images/boats/neel-47/trimarano-wow-prendisole-levanzo.webp",
        },
        {
          caption: isEs ? "Relax en Levanzo" : isFr ? "Relax à Levanzo" : isDe ? "Relax vor Levanzo" : isEn ? "Relax in Levanzo" : "Relax a Levanzo",
          color: "#A7F3D0",
          src: "/images/boats/neel-47/trimarano-levanzo-relax.webp",
        },
        {
          caption: isEs ? "Relax visto desde dron" : isFr ? "Relax vu par drone" : isDe ? "Relax aus der Drohnenperspektive" : isEn ? "Relax seen by drone" : "Relax visto dal drone",
          color: "#93C5FD",
          src: "/images/home/trimarano-relax-drone.webp",
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
          caption: isEs ? "Puerto de Trapani" : isFr ? "Port de Trapani" : isDe ? "Hafen Trapani" : isEn ? "Trapani harbour" : "Porto di Trapani",
          color: "#ADD8E6",
          src: "/images/home/trimarano-porto.webp",
        },
        {
          caption: isEs ? "Trimarán Favignana" : isFr ? "Trimaran Favignana" : isDe ? "Trimaran Favignana" : isEn ? "Favignana trimaran" : "Trimarano Favignana",
          color: "#B2DFDB",
          src: "/images/home/trimarano-favignana.webp",
        },
        {
          caption: isEs ? "Levanzo en trimarán" : isFr ? "Levanzo en trimaran" : isDe ? "Levanzo im Trimaran" : isEn ? "Levanzo by trimaran" : "Levanzo in trimarano",
          color: "#C5CAE9",
          src: "/images/home/traimarano-levanzo.webp",
        },
        {
          caption: isEs ? "Vida en rada" : isFr ? "Vie au mouillage" : isDe ? "Leben in der Bucht" : isEn ? "Life at anchor" : "Vita in rada",
          color: "#FDE68A",
          src: "/images/home/ragazza-primopiano.webp",
        },
        {
          caption: isEs ? "Prendisol a bordo" : isFr ? "Bain de soleil à bord" : isDe ? "Sonnendeck an Bord" : isEn ? "Sundeck on board" : "Prendisole a bordo",
          color: "#FBCFE8",
          src: "/images/boats/neel-47/neel-47-.donna.webp",
        },
        {
          caption: isEs ? "Cabina del trimarán" : isFr ? "Cabine du trimaran" : isDe ? "Trimaran-Kabine" : isEn ? "Trimaran cabin" : "Cabina del trimarano",
          color: "#BFDBFE",
          src: "/images/boats/neel-47/neel-47-cabina.webp",
        },
        {
          caption: isEs ? "Cabina de invitados" : isFr ? "Cabine invités" : isDe ? "Gästekabine" : isEn ? "Guest cabin" : "Cabina ospiti",
          color: "#DDD6FE",
          src: "/images/boats/neel-47/neel-47-cabina2.webp",
        },
        {
          caption: isEs ? "Favignana desde el mar" : isFr ? "Favignana depuis la mer" : isDe ? "Favignana vom Meer" : isEn ? "Favignana from the sea" : "Favignana dal mare",
          color: "#A7F3D0",
          src: "/images/boats/neel-47/neel-47-favignana.webp",
        },
        {
          caption: isEs ? "Trimarán Egadi" : isFr ? "Trimaran Égades" : isDe ? "Egadi-Trimaran" : isEn ? "Egadi trimaran" : "Trimarano Egadi",
          color: "#FCA5A5",
          src: "/images/boats/neel-47/triamarano-logo.webp",
        },
        {
          caption: isEs ? "Interior del trimarán" : isFr ? "Intérieur du trimaran" : isDe ? "Innenbereich des Trimarans" : isEn ? "Trimaran interior" : "Interni del trimarano",
          color: "#FDBA74",
          src: "/images/boats/neel-47/trimarano-interno-tavolo.webp",
        },
        {
          caption: isEs ? "Embarque en Trapani" : isFr ? "Embarquement à Trapani" : isDe ? "Boarding in Trapani" : isEn ? "Boarding in Trapani" : "Imbarco a Trapani",
          color: "#93C5FD",
          src: "/images/boats/neel-47/trimarano-porto1.webp",
        },
        {
          caption: isEs ? "Prendisol premium" : isFr ? "Bain de soleil premium" : isDe ? "Premium-Sonnendeck" : isEn ? "Premium sundeck" : "Prendisole premium",
          color: "#C4B5FD",
          src: "/images/boats/neel-47/trimarano-prendisole-primopiano.webp",
        },
        {
          caption: isEs ? "Brindis en rada" : isFr ? "Toast au mouillage" : isDe ? "Anstoßen in der Bucht" : isEn ? "Toast at anchor" : "Brindisi in rada",
          color: "#F9A8D4",
          src: "/images/boats/neel-47/trimarano-rada-brindisi.webp",
        },
        {
          caption: isEs ? "Relax al sol" : isFr ? "Relax au soleil" : isDe ? "Relax in der Sonne" : isEn ? "Relax in the sun" : "Relax al sole",
          color: "#FDE68A",
          src: "/images/boats/neel-47/trimarano-relax-sole.webp",
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
	            ? "Favignana, eligiendo la cala más bonita que se pueda alcanzar con seguridad en 4 horas."
	            : isFr
	            ? "Favignana, en choisissant la plus belle crique accessible en sécurité en 4 heures."
	            : isDe
	            ? "Favignana, mit der schönsten Bucht, die in 4 Stunden sicher erreichbar ist."
	            : isEn
	            ? "Favignana, choosing the best cove that can be reached safely in 4 hours."
	            : "Favignana, scegliendo la cala migliore raggiungibile in sicurezza in 4 ore.",
	        },
      ],
      href: localizedPath(locale, "/experiences/boat-exclusive-afternoon"),
      ctaLabel: isEs ? "Ver detalles" : isFr ? "Voir les détails" : isDe ? "Details ansehen" : isEn ? "Learn more" : "Scopri di più",
      polaroids: [
        {
          caption: isEs ? "Tour privado" : isFr ? "Tour privé" : isDe ? "Private Tour" : isEn ? "Private tour" : "Tour privato",
          color: "#BFDBFE",
          src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
        },
        {
          caption: isEs ? "Barco exclusivo" : isFr ? "Bateau exclusif" : isDe ? "Exklusives Boot" : isEn ? "Exclusive boat" : "Barca esclusiva",
          color: "#FDE68A",
          src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp",
        },
        {
          caption: isEs ? "Giro Egadi 4 horas" : isFr ? "Tour Égades 4 heures" : isDe ? "Egadi-Tour 4 Stunden" : isEn ? "4-hour Egadi tour" : "Giro Egadi 4 ore",
          color: "#A7F3D0",
          src: "/images/experience-polaroids/barca-4-ore-tour-egadi.webp",
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
          caption: isEs ? "Salida desde Trapani" : isFr ? "Départ de Trapani" : isDe ? "Abfahrt ab Trapani" : isEn ? "Departure from Trapani" : "Partenza da Trapani",
          color: "#A7F3D0",
          src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-frontale.webp",
        },
        {
          caption: isEs ? "Favignana y Levanzo" : isFr ? "Favignana et Levanzo" : isDe ? "Favignana und Levanzo" : isEn ? "Favignana and Levanzo" : "Favignana e Levanzo",
          color: "#BFDBFE",
          src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-primo-piano.webp",
        },
        {
          caption: isEs ? "Baño en Cala Rossa" : isFr ? "Baignade à Cala Rossa" : isDe ? "Badestopp in Cala Rossa" : isEn ? "Swim at Cala Rossa" : "Bagno a Cala Rossa",
          color: "#BAE6FD",
          src: "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp",
        },
        {
          caption: isEs ? "Atardecer" : isFr ? "Coucher de soleil" : isDe ? "Sonnenuntergang" : isEn ? "Sunset" : "Tramonto",
          color: "#FED7AA",
          src: "/images/experience-polaroids/barca-8-ore-tramonto.webp",
        },
        {
          caption: "Cala Rossa",
          color: "#FDE68A",
          src: "/images/experience-polaroids/barca-4-ore-cala-rossa.webp",
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
  const sectionMedia = [
    {
      src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-primo-piano.webp",
      alt: isEs
        ? "Barca Egadi Sailing durante una excursión en barco por las Islas Egadi"
        : isFr
        ? "Barca Egadi Sailing pendant une excursion en bateau aux îles Égades"
        : isDe
        ? "Barca Egadi Sailing während einer Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "Barca Egadi Sailing during an Egadi Islands boat excursion"
        : "Barca Egadi Sailing durante un'escursione in barca alle Isole Egadi",
      caption: isEs
        ? "Barco privado a Favignana"
        : isFr
        ? "Bateau privé à Favignana"
        : isDe
        ? "Privatboot nach Favignana"
        : isEn
        ? "Private boat to Favignana"
        : "Barca privata a Favignana",
    },
    {
      src: "/images/boats/neel-47/trimarano-calice-primopiano-bere.webp",
      alt: isEs
        ? "Aperitivo a bordo durante un tour en trimarán por las Islas Egadi"
        : isFr
        ? "Apéritif à bord pendant un tour en trimaran aux îles Égades"
        : isDe
        ? "Aperitif an Bord während einer Trimaran-Tour zu den Ägadischen Inseln"
        : isEn
        ? "Aperitivo on board during an Egadi Islands trimaran tour"
        : "Aperitivo a bordo durante un tour in trimarano alle Isole Egadi",
      caption: isEs
        ? "Vino de Trapani servido a bordo"
        : isFr
        ? "Vin de Trapani servi à bord"
        : isDe
        ? "Trapani-Wein an Bord serviert"
        : isEn
        ? "Trapani wine served on board"
        : "Vino trapanese servito a bordo",
    },
    {
      src: "/images/home/trimarano-favignana.webp",
      alt: isEs
        ? "Trimarán Egadi Sailing frente a Favignana durante un tour en barco"
        : isFr
        ? "Trimaran Egadi Sailing devant Favignana pendant un tour en bateau"
        : isDe
        ? "Egadi Sailing Trimaran vor Favignana während einer Bootstour"
        : isEn
        ? "Egadi Sailing trimaran off Favignana during a boat tour"
        : "Trimarano Egadi Sailing davanti a Favignana durante un tour in barca",
      caption: isEs
        ? "Trimarán navegando hacia Favignana"
        : isFr
        ? "Trimaran en navigation vers Favignana"
        : isDe
        ? "Trimaran auf dem Weg nach Favignana"
        : isEn
        ? "Trimaran sailing to Favignana"
        : "Trimarano in navigazione verso Favignana",
    },
    {
      src: "/images/home/trimarano-relax.webp",
      alt: isEs
        ? "Relax en trimarán durante una excursión a Favignana y Levanzo"
        : isFr
        ? "Relax en trimaran pendant une excursion à Favignana et Levanzo"
        : isDe
        ? "Entspannung auf dem Trimaran während einer Tour nach Favignana und Levanzo"
        : isEn
        ? "Relaxing on the trimaran during a Favignana and Levanzo excursion"
        : "Relax in trimarano durante un'escursione a Favignana e Levanzo",
      caption: isEs
        ? "Relax en trimarán en Levanzo"
        : isFr
        ? "Relax en trimaran à Levanzo"
        : isDe
        ? "Relax im Trimaran vor Levanzo"
        : isEn
        ? "Relax on a trimaran in Levanzo"
        : "Relax in trimarano a Levanzo",
    },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ============================================================ */}
      {/*  Section 1: Le Nostre Esperienze                             */}
      {/*  Background blends from hero video sea color to teal         */}
      {/* ============================================================ */}
      <HomeExperiencesSection
        locale={locale}
        sectionMedia={sectionMedia}
      />

      <HomePackagesSection
        locale={locale}
        featuredPackages={featuredPackages}
      />

      {/* ============================================================ */}
      {/*  Section 3: Esperienza gourmet in trimarano                  */}
      {/* ============================================================ */}
      <HomeGourmetSection locale={locale} />

      {/* ============================================================ */}
      {/*  Section 4: Itinerario tour in barca alle Egadi              */}
      {/* ============================================================ */}
      <HomeItinerarySection locale={locale} />

      {/* ============================================================ */}
      {/*  Section 5: Fatti convincere — Recensioni Google             */}
      {/* ============================================================ */}
      <section
        aria-labelledby="home-reviews-title"
        className="relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0a2a4a 50%, #071934 100%)",
        }}
      >
        <div className="relative z-10 max-w-7xl mx-auto">
          <ScrollSection animation="fade-up">
            <div className="text-center mb-20">
              <RevealTitle id="home-reviews-title" text={reviewTitle} compact />
              <p className="text-white/70 text-lg mt-6">
                {reviewSubtitle}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {reviewTrustItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-white/72"
                  >
                    {item}
                  </span>
                ))}
              </div>
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
      {/*  Section 6: CTA Finale con pennellata SVG                   */}
      {/* ============================================================ */}
      <section
        aria-labelledby="home-final-cta-title"
        className="relative py-32 px-4 md:px-8 lg:px-12"
        style={{
          background: "linear-gradient(180deg, #071934 0%, #0c3d5e 50%, #071934 100%)",
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <ScrollSection animation="fade-up">
            <div className="relative inline-block mb-8">
              <h2
                id="home-final-cta-title"
                className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-white relative z-10"
              >
                {finalCtaTitle}
              </h2>
              {/* SVG brush stroke under title */}
              <svg
                aria-hidden="true"
                focusable="false"
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
            <p className="text-white/72 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
              {finalCtaSubtitle}
            </p>
            <div className="flex justify-center">
              <Link
                href={localizedPath(locale, "/prenota")}
                className="inline-flex min-h-14 items-center justify-center rounded-full bg-[var(--color-gold)] px-9 text-base font-bold text-[#071934] shadow-[0_22px_60px_rgba(245,158,11,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f2b84b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-gold)]"
              >
                {finalCtaLabel}
              </Link>
            </div>
            <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-3">
              {finalCtaTrustItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/74"
                >
                  <Check className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
          </ScrollSection>
        </div>
      </section>
    </div>
  );
}
