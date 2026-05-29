"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { localizedPath } from "@/lib/i18n/paths";
import { HomePhotoStack, type HomePhotoStackImage } from "./home-photo-stack";

type SectionMediaItem = HomePhotoStackImage;

interface HomeExperiencesSectionProps {
  locale: string;
  sectionMedia: SectionMediaItem[];
}

const TOUR_EGADI_VIDEO_POSTER = "/videos/home-tour-egadi-poster.webp";
const TOUR_EGADI_VIDEO_SRC =
  process.env.NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL ?? "/videos/home-tour-egadi.webm?v=20260525";

function getVideoType(src: string) {
  const pathname = src.split("?")[0]?.toLowerCase() ?? "";
  return pathname.endsWith(".webm") ? "video/webm" : "video/mp4";
}

function LazyTourEgadiVideo({ label }: { label: string }) {
  const figureRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const connection = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canUseInlineVideo = window.matchMedia("(min-width: 768px)").matches;
    const effectiveType = connection.connection?.effectiveType ?? "";
    const slowConnection = effectiveType === "slow-2g" || effectiveType === "2g";

    if (
      !canUseInlineVideo ||
      prefersReducedMotion ||
      connection.connection?.saveData ||
      slowConnection
    ) {
      return;
    }

    const figure = figureRef.current;
    if (!figure) return;

    if (!("IntersectionObserver" in window)) {
      const timeout = globalThis.setTimeout(() => setShouldLoadVideo(true), 0);
      return () => globalThis.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoadVideo(true);
        observer.disconnect();
      },
      { rootMargin: "160px" },
    );

    observer.observe(figure);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    videoRef.current?.play().catch(() => {
      // Autoplay can be blocked by the browser; the poster remains as fallback.
    });
  }, [shouldLoadVideo]);

  return (
    <figure
      ref={figureRef}
      role="img"
      aria-label={label}
      className="relative aspect-[4/3] min-h-[320px] overflow-hidden rounded-lg border border-white/10 bg-[#071934] md:min-h-[420px]"
    >
      <Image
        src={TOUR_EGADI_VIDEO_POSTER}
        alt=""
        aria-hidden="true"
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        quality={80}
        className={`object-cover transition-opacity duration-500 ${videoReady ? "opacity-0" : "opacity-100"}`}
      />
      {shouldLoadVideo && (
        <video
          ref={videoRef}
          aria-hidden="true"
          muted
          loop
          playsInline
          preload="none"
          onLoadedData={() => setVideoReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={TOUR_EGADI_VIDEO_SRC} type={getVideoType(TOUR_EGADI_VIDEO_SRC)} />
        </video>
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,24,0.02)_0%,rgba(3,10,24,0.08)_62%,rgba(3,10,24,0.24)_100%)]" />
    </figure>
  );
}

function MobileCurvedSeparator() {
  return (
    <div className="mb-16 md:hidden" aria-hidden="true">
      <svg
        viewBox="0 0 400 34"
        className="mx-auto h-auto w-[78%] max-w-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <path
          d="M5 21 C42 9, 82 26, 123 16 S202 8, 244 19 S321 10, 363 21 S390 13, 396 17"
          stroke="url(#homeMobileCurveGold)"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.58"
        />
        <path
          d="M12 26 C53 16, 101 29, 151 19 S252 13, 303 23 S370 15, 396 21"
          stroke="url(#homeMobileCurveGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.34"
        />
        <defs>
          <linearGradient id="homeMobileCurveGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0" />
            <stop offset="15%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="85%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function HomeExperiencesSection({
  locale,
  sectionMedia,
}: HomeExperiencesSectionProps) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const photoStackLabels = {
    galleryTitle: isEs
      ? "Galería de las Islas Egadi"
      : isFr
      ? "Galerie des îles Égades"
      : isDe
      ? "Galerie der Ägadischen Inseln"
      : isEn
      ? "Egadi Islands gallery"
      : "Galleria Isole Egadi",
    galleryDescription: isEs
      ? "Fotos de las excursiones en barco por Favignana y Levanzo"
      : isFr
      ? "Photos des excursions en bateau à Favignana et Levanzo"
      : isDe
      ? "Fotos der Bootstouren nach Favignana und Levanzo"
      : isEn
      ? "Photos from boat tours around Favignana and Levanzo"
      : "Foto dei tour in barca tra Favignana e Levanzo",
    openImage: isEs
      ? "Abrir foto"
      : isFr
      ? "Ouvrir la photo"
      : isDe
      ? "Foto öffnen"
      : isEn
      ? "Open photo"
      : "Apri foto",
    close: isEs ? "Cerrar" : isFr ? "Fermer" : isDe ? "Schließen" : isEn ? "Close" : "Chiudi",
    previous: isEs
      ? "Foto anterior"
      : isFr
      ? "Photo précédente"
      : isDe
      ? "Vorheriges Foto"
      : isEn
      ? "Previous photo"
      : "Foto precedente",
    next: isEs
      ? "Foto siguiente"
      : isFr
      ? "Photo suivante"
      : isDe
      ? "Nächstes Foto"
      : isEn
      ? "Next photo"
      : "Foto successiva",
  };
  const topBlock = isEs
    ? {
        title: "Excursiones Egadi",
        text: "Sal con Egadi Sailing a descubrir las Islas Egadi: cada excursión en barco desde Trapani abre panoramas espectaculares, aguas cristalinas y pequeñas calas que se viven mejor desde el mar. Con patrones locales que conocen Favignana y Levanzo, disfrutarás de una experiencia auténtica entre naturaleza, cultura marinera, paradas para bañarte y snorkel. Nuestros tours en barco a Favignana y el paseo en trimarán por las Egadi están pensados para ver las calas más bonitas y descubrir Favignana y Levanzo en un día, con tour compartido, tour privado o charter a medida.",
      }
    : isFr
    ? {
        title: "Excursions Égades",
        text: "Partez avec Egadi Sailing à la découverte des îles Égades : chaque excursion en bateau depuis Trapani révèle des panoramas spectaculaires, des eaux cristallines et de petites criques à vivre depuis la mer. Avec des skippers locaux qui connaissent Favignana et Levanzo, vous profitez d'une expérience authentique entre nature, culture maritime, baignades et snorkeling. Nos tours en bateau à Favignana et la sortie en trimaran aux Égades sont pensés pour voir les plus belles criques et découvrir Favignana et Levanzo en une journée, en tour partagé, tour privé ou charter sur mesure.",
      }
    : isDe
    ? {
        title: "Egadi-Ausflüge",
        text: "Entdecken Sie mit Egadi Sailing die Ägadischen Inseln: Jede Bootstour ab Trapani eröffnet eindrucksvolle Ausblicke, kristallklares Wasser und kleine Buchten, die man am besten vom Meer aus erlebt. Mit lokalen Skippern, die Favignana und Levanzo kennen, genießen Sie eine authentische Erfahrung zwischen Natur, maritimer Kultur, Badestopps und Schnorcheln. Unsere Bootstouren nach Favignana und der Trimaran-Tour zu den Egadi sind darauf ausgelegt, die schönsten Buchten zu sehen und Favignana und Levanzo an einem Tag zu entdecken, als geteilte Tour, private Tour oder maßgeschneiderter Charter.",
      }
    : isEn
    ? {
        title: "Egadi excursions",
        text: "Set off with Egadi Sailing to discover the Egadi Islands: every boat excursion from Trapani opens up dramatic views, crystal-clear water and hidden coves best experienced from the sea. With local skippers who know Favignana and Levanzo, you enjoy an authentic experience shaped by nature, maritime culture, swim stops and snorkelling. Our Favignana boat tours and Egadi trimaran tour are designed to show you the island's most beautiful coves and discover Favignana and Levanzo in one day, with a shared tour, private tour or tailor-made charter.",
      }
    : {
        title: "Escursioni Egadi",
        text: "Parti con Egadi Sailing alla scoperta delle Isole Egadi: ogni escursione in barca da Trapani apre panorami mozzafiato, acque cristalline e calette da vivere dal mare. Con skipper locali che conoscono Favignana e Levanzo, vivi un'esperienza autentica tra natura, cultura marinara, soste bagno e snorkeling. I nostri giri in barca a Favignana e il giro in trimarano alle Egadi sono pensati per vedere le cale più belle dell'isola e scoprire Favignana e Levanzo in un giorno, con tour condiviso, tour privato o charter su misura.",
      };
  const bottomBlock = isEs
    ? {
        title: "Giro Islas Egadi",
        text: "Un giro por las Islas Egadi es una forma lenta y auténtica de vivir el mar: fondos marinos llenos de vida, aguas transparentes, atardeceres y paisajes que cambian entre Favignana y Levanzo. Con un giro en barco por las Islas Egadi descubres qué ver en Favignana y Levanzo, desde Cala Rossa, Cala Azzurra y Bue Marino hasta las paradas más adecuadas para el día. También organizamos excursiones personalizadas y tours Egadi a medida para parejas, familias y grupos.",
      }
    : isFr
    ? {
        title: "Tour des îles Égades",
        text: "Un tour des îles Égades est une façon lente et authentique de vivre la mer : fonds marins pleins de vie, eaux transparentes, couchers de soleil et paysages qui changent entre Favignana et Levanzo. Avec un tour en bateau aux îles Égades, vous découvrez que voir à Favignana et Levanzo, de Cala Rossa, Cala Azzurra et Bue Marino aux arrêts les plus adaptés à la journée. Nous organisons aussi des excursions personnalisées et des tours Égades sur mesure pour couples, familles et groupes.",
      }
    : isDe
    ? {
        title: "Rundfahrt Ägadische Inseln",
        text: "Eine Rundfahrt Ägadische Inseln ist eine ruhige und authentische Art, das Meer zu erleben: lebendige Meeresböden, klares Wasser, Sonnenuntergänge und Ausblicke zwischen Favignana und Levanzo. Mit einer Bootstour zu den Ägadischen Inseln entdecken Sie, was man in Favignana und Levanzo sehen kann, von Cala Rossa, Cala Azzurra und Bue Marino bis zu den Stopps, die am besten zum Tag passen. Wir organisieren auch individuelle Ausflüge und maßgeschneiderte Egadi-Touren für Paare, Familien und Gruppen.",
      }
    : isEn
    ? {
        title: "Egadi Islands cruise",
        text: "An Egadi Islands cruise is a slower, more authentic way to experience the sea: lively seabeds, clear water, sunsets and views that change between Favignana and Levanzo. With an Egadi Islands boat tour you discover what to see in Favignana and Levanzo, from Cala Rossa, Cala Azzurra and Bue Marino to the stops that best suit the day. We also organise personalised excursions and tailor-made Egadi tours for couples, families and groups.",
      }
    : {
        title: "Giro isole Egadi",
        text: "Un Giro isole Egadi è un modo lento e autentico di vivere il mare: fondali marini ricchi di vita, acque trasparenti, tramonti e panorami che cambiano tra Favignana e Levanzo. Con un giro in barca alle Isole Egadi scopri Cosa Vedere a Favignana e Levanzo, da Cala Rossa, Cala Azzurra e Bue Marino alle soste più adatte alla giornata. Organizziamo anche escursioni personalizzate e tour Egadi su misura per coppie, famiglie e gruppi.",
      };
  const premiumBlock = isEs
    ? {
        title: "Tour en barco Islas Egadi",
        text: "Egadi Sailing organiza tours en barco por las Islas Egadi desde Trapani, entre Favignana y Levanzo, con rutas elegidas según el mar. Además de las excursiones compartidas, los tours privados y los charters, puedes vivir una experiencia premium luxury en trimarán con almuerzo cocinado a bordo por un chef: una propuesta única y distintiva para navegar las Egadi con más espacio, comodidad, patrón local, snorkel y paradas para bañarte en Cala Rossa, Cala Azzurra y las calas más bonitas.",
        bullets: ["Salida desde el Puerto de Trapani", "Favignana y Levanzo en un día"],
        alt: "Favignana vista desde el mar durante un tour en barco por las Islas Egadi",
      }
    : isFr
    ? {
        title: "Tour en bateau îles Égades",
        text: "Egadi Sailing organise des tours en bateau aux îles Égades depuis Trapani, entre Favignana et Levanzo, avec des routes choisies selon la mer. En plus des excursions partagées, des tours privés et des charters, vous pouvez vivre une expérience premium luxury en trimaran avec déjeuner cuisiné à bord par un chef : une proposition unique et distinctive pour naviguer les Égades avec plus d'espace, de confort, un skipper local, du snorkeling et des baignades à Cala Rossa, Cala Azzurra et dans les plus belles criques.",
        bullets: ["Départ du port de Trapani", "Favignana et Levanzo dans la journée"],
        alt: "Favignana vue depuis la mer pendant un tour en bateau aux îles Égades",
      }
    : isDe
    ? {
        title: "Bootstour Ägadische Inseln",
        text: "Egadi Sailing organisiert Bootstouren zu den Ägadischen Inseln ab Trapani, zwischen Favignana und Levanzo, mit Routen je nach Meer. Neben geteilten Ausflügen, privaten Touren und Chartern erleben Sie eine Premium-Luxury-Erfahrung im Trimaran mit an Bord von einem Chef gekochtem Mittagessen: ein einzigartiges und unverwechselbares Angebot, um die Egadi mit mehr Raum, Komfort, lokalem Skipper, Schnorcheln und Badestopps an Cala Rossa, Cala Azzurra und den schönsten Buchten zu entdecken.",
        bullets: ["Abfahrt vom Hafen von Trapani", "Favignana und Levanzo an einem Tag"],
        alt: "Favignana vom Meer aus während einer Bootstour zu den Ägadischen Inseln",
      }
    : isEn
    ? {
        title: "Egadi Islands boat tour",
        text: "Egadi Sailing runs Egadi Islands boat tours from Trapani, between Favignana and Levanzo, with routes chosen around the sea. Alongside shared excursions, private tours and charters, you can enjoy a premium luxury trimaran experience with lunch cooked on board by a chef: a unique and distinctive way to sail the Egadi Islands with more space, comfort, a local skipper, snorkelling and swim stops at Cala Rossa, Cala Azzurra and the most beautiful coves.",
        bullets: ["Departure from Trapani harbour", "Favignana and Levanzo in one day"],
        alt: "Favignana from the sea during an Egadi Islands boat tour",
      }
    : {
        title: "Tour in barca Isole Egadi",
        text: "Egadi Sailing organizza tour in barca alle Isole Egadi da Trapani, tra Favignana e Levanzo, con itinerari scelti in base al mare. Oltre alle escursioni condivise, ai tour privati e ai charter, puoi vivere un'esperienza premium luxury in trimarano con pranzo cucinato a bordo da uno chef: una proposta unica e distintiva per navigare le Egadi con più spazio, comfort, skipper locale, snorkeling e soste bagno a Cala Rossa, Cala Azzurra e nelle cale più belle.",
        bullets: ["Partenza dal Porto di Trapani", "Favignana e Levanzo in giornata"],
        alt: "Favignana vista dal mare durante un tour in barca alle Isole Egadi",
      };
  const favignanaLevanzoBlock = isEs
    ? {
        title: "Tour Favignana y Levanzo",
        text: "Elige tu Tour Favignana y Levanzo con salida desde Trapani y vive 8 horas de mar en las Islas Egadi. La ruta se adapta a las condiciones, con Cala Rossa, Cala Azzurra, Bue Marino, paradas para bañarte y snorkel en algunas de las aguas más bonitas de Sicilia. Puedes reservar excursiones compartidas para una jornada más social o tours privados para una experiencia a medida, con acceso al Área Marina Protegida Egadi incluido y desembarque en la isla de Favignana durante el día.",
        bullets: ["Desembarque en la isla de Favignana", "Acceso al Área Marina Protegida"],
        cta: "Descubre el tour de 8 horas",
      }
    : isFr
    ? {
        title: "Tour Favignana et Levanzo",
        text: "Choisissez votre Tour Favignana et Levanzo au départ de Trapani et vivez 8 heures de mer dans les îles Égades. La route s'adapte aux conditions, avec Cala Rossa, Cala Azzurra, Bue Marino, baignades et snorkeling dans certaines des plus belles eaux de Sicile. Vous pouvez réserver des excursions partagées pour une journée plus conviviale ou des tours privés pour une expérience sur mesure, avec accès à l'Aire Marine Protégée des Égades inclus et débarquement sur l'île de Favignana pendant la journée.",
        bullets: ["Débarquement sur l'île de Favignana", "Accès à l'Aire Marine Protégée"],
        cta: "Découvrir le tour de 8 heures",
      }
    : isDe
    ? {
        title: "Tour Favignana und Levanzo",
        text: "Wählen Sie Ihre Tour Favignana und Levanzo ab Trapani und erleben Sie 8 Stunden Meer auf den Ägadischen Inseln. Die Route richtet sich nach den Bedingungen, mit Cala Rossa, Cala Azzurra, Bue Marino, Badestopps und Schnorcheln in einigen der schönsten Gewässer Siziliens. Sie können geteilte Ausflüge für einen geselligen Tag oder private Touren für ein maßgeschneidertes Erlebnis buchen, mit Zugang zum Meeresschutzgebiet Egadi inklusive und Landgang auf der Insel Favignana während des Tages.",
        bullets: ["Landgang auf der Insel Favignana", "Zugang zum Meeresschutzgebiet"],
        cta: "8-Stunden-Tour ansehen",
      }
    : isEn
    ? {
        title: "Favignana and Levanzo tour",
        text: "Choose your Favignana and Levanzo tour from Trapani and enjoy 8 hours at sea in the Egadi Islands. The route adapts to the conditions, with Cala Rossa, Cala Azzurra, Bue Marino, swim stops and snorkelling in some of Sicily's most beautiful waters. You can book shared excursions for a more social day or private tours for a tailor-made experience, with access to the Egadi Marine Protected Area included and landing on Favignana island during the day.",
        bullets: ["Landing on Favignana island", "Marine Protected Area access"],
        cta: "Explore the 8-hour tour",
      }
    : {
        title: "Tour Favignana e Levanzo",
        text: "Scegli il tuo Tour Favignana e Levanzo con partenza da Trapani e vivi 8 ore di mare nelle Isole Egadi. La rotta si adatta alle condizioni, con Cala Rossa, Cala Azzurra, Bue Marino, soste bagno e snorkeling in alcune delle acque più belle della Sicilia. Puoi prenotare escursioni condivise per una giornata più social oppure tour privati per un'esperienza su misura, con accesso all'Area Marina Protetta Egadi incluso e sbarco sull'isola di Favignana durante la giornata.",
        bullets: ["Sbarco sull'isola di Favignana", "Accesso all'Area Marina Protetta"],
        cta: "Scopri il tour di 8 ore",
      };
  const favignanaLevanzoImages = [
    {
      src: "/images/islands/favignana/poi/cala-azzurra.webp",
      alt: isEs
        ? "Cala Azzurra durante el Tour Favignana y Levanzo desde Trapani"
        : isFr
        ? "Cala Azzurra pendant le Tour Favignana et Levanzo depuis Trapani"
        : isDe
        ? "Cala Azzurra während der Tour Favignana und Levanzo ab Trapani"
        : isEn
        ? "Cala Azzurra during the Favignana and Levanzo tour from Trapani"
        : "Cala Azzurra durante il Tour Favignana e Levanzo da Trapani",
      caption: "Cala Azzurra",
    },
    {
      src: "/images/islands/favignana/poi/bue-marino.webp",
      alt: isEs
        ? "Bue Marino en Favignana durante una excursión en barco por las Egadi"
        : isFr
        ? "Bue Marino à Favignana pendant une excursion en bateau aux Égades"
        : isDe
        ? "Bue Marino auf Favignana während einer Bootstour zu den Egadi"
        : isEn
        ? "Bue Marino in Favignana during an Egadi Islands boat tour"
        : "Bue Marino a Favignana durante un'escursione in barca alle Egadi",
      caption: "Bue Marino",
    },
    {
      src: "/images/boats/neel-47/trimarano-wow-prendisole-levanzo.webp",
      alt: isEs
        ? "Prendisol del trimarán frente a Levanzo durante un tour Favignana y Levanzo"
        : isFr
        ? "Bain de soleil du trimaran face à Levanzo pendant un tour Favignana et Levanzo"
        : isDe
        ? "Sonnendeck des Trimarans vor Levanzo während einer Tour Favignana und Levanzo"
        : isEn
        ? "Trimaran sundeck off Levanzo during a Favignana and Levanzo tour"
        : "Prendisole del trimarano davanti a Levanzo durante un tour Favignana e Levanzo",
      caption: isEs
        ? "Visita Levanzo con lujo absoluto"
        : isFr
        ? "Visitez Levanzo dans le luxe absolu"
        : isDe
        ? "Levanzo in absolutem Luxus erleben"
        : isEn
        ? "Visit Levanzo in absolute luxury"
        : "Visita Levanzo nel lusso più assoluto",
    },
    {
      src: "/images/boats/neel-47/trimarano-ingredienti.webp",
      alt: isEs
        ? "Pescado fresco e ingredientes locales para el almuerzo a bordo del trimarán"
        : isFr
        ? "Poisson frais et ingrédients locaux pour le déjeuner à bord du trimaran"
        : isDe
        ? "Frischer Fisch und lokale Zutaten für das Mittagessen an Bord des Trimarans"
        : isEn
        ? "Fresh fish and local ingredients for lunch on board the trimaran"
        : "Pesce fresco e ingredienti locali per il pranzo a bordo del trimarano",
      caption: isEs
        ? "Pescado fresco servido en el almuerzo"
        : isFr
        ? "Poisson frais servi au déjeuner"
        : isDe
        ? "Frischer Fisch zum Mittagessen"
        : isEn
        ? "Fresh fish served for lunch"
        : "Pesce fresco servito a pranzo",
    },
  ];
  const mediaCards = sectionMedia.slice(0, 4);
  const giroEgadiImages = [
    {
      src: "/images/islands/favignana/poi/cala-rossa.webp",
      alt: isEs
        ? "Cala Rossa en Favignana durante una excursión en barco por las Egadi"
        : isFr
        ? "Cala Rossa à Favignana pendant une excursion en bateau aux Égades"
        : isDe
        ? "Cala Rossa auf Favignana während einer Bootstour zu den Ägadischen Inseln"
        : isEn
        ? "Cala Rossa in Favignana during an Egadi Islands boat tour"
        : "Cala Rossa a Favignana durante un tour in barca alle Egadi",
      caption: "Cala Rossa",
    },
    {
      src: "/images/boats/neel-47/trimarano-relax-rete.webp",
      alt: isEs
        ? "Relax en la red del trimarán durante un giro por las Islas Egadi"
        : isFr
        ? "Relax sur le filet du trimaran pendant un tour des îles Égades"
        : isDe
        ? "Entspannung im Netz des Trimarans während einer Rundfahrt zu den Ägadischen Inseln"
        : isEn
        ? "Relaxing on the trimaran net during an Egadi Islands cruise"
        : "Relax sulla rete del trimarano durante un giro alle Isole Egadi",
      caption: isEs
        ? "Relájate en el mar de las Egadi"
        : isFr
        ? "Détendez-vous dans la mer des Égades"
        : isDe
        ? "Entspannen im Meer der Egadi"
        : isEn
        ? "Relax in the Egadi sea"
        : "Rilassatevi nel mare delle Egadi",
    },
    {
      src: "/images/boats/neel-47/trimarano-pasta-saltata.webp",
      alt: isEs
        ? "Almuerzo cocinado a bordo del trimarán durante un tour por las Egadi"
        : isFr
        ? "Déjeuner cuisiné à bord du trimaran pendant un tour aux Égades"
        : isDe
        ? "Mittagessen an Bord des Trimarans während einer Egadi-Tour gekocht"
        : isEn
        ? "Lunch cooked on board the trimaran during an Egadi Islands tour"
        : "Pranzo cucinato a bordo del trimarano durante un tour alle Egadi",
      caption: isEs
        ? "Almuerzo cocinado a bordo del trimarán"
        : isFr
        ? "Déjeuner cuisiné à bord du trimaran"
        : isDe
        ? "Mittagessen an Bord des Trimarans"
        : isEn
        ? "Lunch cooked on board the trimaran"
        : "Pranzo cucinato a bordo del trimarano",
    },
    {
      src: "/images/home/trimarano-saline.webp",
      alt: isEs
        ? "Trimarán Egadi Sailing saliendo de Trapani para un giro por las Islas Egadi"
        : isFr
        ? "Trimaran Egadi Sailing au départ de Trapani pour un tour des îles Égades"
        : isDe
        ? "Egadi Sailing Trimaran bei der Abfahrt von Trapani zu den Ägadischen Inseln"
        : isEn
        ? "Egadi Sailing trimaran departing from Trapani for an Egadi Islands cruise"
        : "Trimarano Egadi Sailing in partenza da Trapani per un giro alle Isole Egadi",
      caption: isEs
        ? "Trimarán saliendo de Trapani"
        : isFr
        ? "Trimaran au départ de Trapani"
        : isDe
        ? "Trimaran ab Trapani"
        : isEn
        ? "Trimaran departing from Trapani"
        : "Trimarano in partenza da Trapani",
    },
  ];

  return (
    <section
      id="tour-in-barca-isole-egadi"
      aria-labelledby="home-experiences-title"
      className="egadi-water-reflection relative px-2 pb-16 pt-28 md:px-3 md:pb-20 lg:px-4 lg:pb-24 lg:pt-32"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #102a35 36%, #0d3444 70%, #071934 100%)",
      }}
    >
      <div className="relative z-10 mx-auto max-w-[100rem]">
        <div className="mb-10 grid items-center gap-8 md:mb-24 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-14">
          <LazyTourEgadiVideo label={premiumBlock.alt} />

          <div className="max-w-2xl lg:pl-4">
            <h2
              id="home-experiences-title"
              className="font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl lg:text-6xl"
            >
              {premiumBlock.title}
            </h2>
            <p className="mt-7 text-base font-medium leading-8 text-white/78 md:text-lg">
              {premiumBlock.text}
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {premiumBlock.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-3 text-sm font-medium text-white/82">
                  <Check className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <MobileCurvedSeparator />

        <div className="mb-28 grid items-center gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-14">
          <div className="flex flex-col justify-center py-7 lg:pr-4">
            <h3 className="font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl lg:text-6xl">
              {topBlock.title}
            </h3>
            <p className="mt-7 text-base font-medium leading-8 text-white/78 md:text-lg">
              {topBlock.text}
            </p>
            <Link
              href={localizedPath(locale, "/experiences/exclusive-experience")}
              className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-white transition-all hover:gap-3"
            >
              {isEs
                ? "Descubre la experiencia gourmet"
                : isFr
                ? "Découvrir l'expérience gourmet"
                : isDe
                ? "Gourmet-Erlebnis ansehen"
                : isEn
                ? "Explore the gourmet experience"
                : "Scopri l'esperienza gourmet"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative overflow-visible">
            <HomePhotoStack
              images={mediaCards}
              labels={photoStackLabels}
              variant="wide"
              enterFrom="right"
            />
          </div>
        </div>

        <div className="mb-28 grid items-center gap-10 lg:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)] lg:gap-14">
          <div className="relative order-2 overflow-visible lg:order-1">
            <HomePhotoStack
              images={giroEgadiImages}
              labels={photoStackLabels}
              variant="wide"
              enterFrom="left"
            />
          </div>

          <div className="order-1 flex flex-col justify-center py-6 lg:order-2 lg:pl-8">
            <h3 className="font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl">
              {bottomBlock.title}
            </h3>
            <p className="mt-7 text-base font-medium leading-8 text-white/76">
              {bottomBlock.text}
            </p>
            <Link
              href={localizedPath(locale, "/experiences/boat-shared-full-day")}
              className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-white transition-all hover:gap-3"
            >
              {isEs ? "Tour Favignana y Levanzo" : isFr ? "Tour Favignana et Levanzo" : isDe ? "Tour Favignana und Levanzo" : isEn ? "Favignana and Levanzo tour" : "Tour Favignana e Levanzo"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mb-16 grid items-center gap-10 md:mb-20 lg:mb-24 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:gap-14">
          <div className="flex flex-col justify-center py-7 lg:pr-4">
            <h3 className="font-heading text-4xl font-semibold leading-[1.02] text-white md:text-5xl">
              {favignanaLevanzoBlock.title}
            </h3>
            <p className="mt-7 text-base font-medium leading-8 text-white/76 md:text-lg">
              {favignanaLevanzoBlock.text}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              {favignanaLevanzoBlock.bullets.map((bullet) => (
                <span key={bullet} className="inline-flex items-center gap-3 text-sm font-semibold text-white/84">
                  <Check className="h-4 w-4 text-[var(--color-gold)]" aria-hidden="true" />
                  {bullet}
                </span>
              ))}
            </div>
            <Link
              href={localizedPath(locale, "/experiences/boat-shared-full-day")}
              className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-white transition-all hover:gap-3"
            >
              {favignanaLevanzoBlock.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative overflow-visible">
            <HomePhotoStack
              images={favignanaLevanzoImages}
              labels={photoStackLabels}
              variant="wide"
              enterFrom="right"
              className="lg:min-h-[38rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
