export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ScrollSection } from "@/components/scroll-section";
import { ExperiencesList } from "./experiences-list";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ArrowRight } from "lucide-react";
import {
  getExperiencePackageContents,
  getExperiencePackageServiceIds,
} from "@/data/catalog/experiences";
import { env } from "@/lib/env";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedExperiencePath } from "@/lib/i18n/public-experience-paths";
import { getDisplayPriceMap, type DisplayPrice } from "@/lib/pricing/display";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_GEO,
  PUBLIC_CONTACT_LOCATION,
  PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
  PUBLIC_CONTACT_POSTAL_ADDRESS,
  PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
} from "@/lib/public-contact";

type ServiceSummary = {
  id: string;
  capacityMax: number;
};

type HubPackage = ReturnType<typeof getExperiencePackageContents>[number] & {
  priceLabel: string | null;
  priceAmount: string | null;
};

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(path: string): string {
  const base = env.APP_URL.replace(/\/+$/, "");
  return path.startsWith("http") ? path : base + (path.startsWith("/") ? path : `/${path}`);
}

function lowestDisplayPrice(
  serviceIds: string[],
  displayPrices: Map<string, DisplayPrice>,
): DisplayPrice | null {
  let lowest: DisplayPrice | null = null;
  for (const serviceId of serviceIds) {
    const price = displayPrices.get(serviceId);
    if (!price) continue;
    if (!price.amount) {
      lowest ??= price;
      continue;
    }
    if (!lowest?.amount || price.amount.lessThan(lowest.amount)) {
      lowest = price;
    }
  }
  return lowest;
}

function inLanguage(locale: string): string {
  if (locale === "de") return "de-DE";
  if (locale === "fr") return "fr-FR";
  if (locale === "es") return "es-ES";
  return locale === "en" ? "en-US" : "it-IT";
}

function experienceHubSeoCopy(locale: string, fallback: { title: string; description: string }) {
  if (locale === "en") {
    return {
      title: "Egadi Boat Tour Packages from Trapani | Egadi Sailing",
      description:
        "Compare Egadi boat tours from Trapani: Favignana and Levanzo boat trips, shared or private tours, snorkelling, trimaran charter and fishing.",
    };
  }

  if (locale === "es") {
    return {
      title: "Paseos en barco desde Trapani a las Islas Egadi | Egadi Sailing",
      description:
        "Compara paseos y excursiones en barco desde Trapani a las Islas Egadi: Favignana y Levanzo, tour compartido o privado, snorkel, trimarán y pesca.",
    };
  }

  if (locale === "it") {
    return {
      title: "Tour in barca Egadi da Trapani | Egadi Sailing",
      description:
        "Confronta tour in barca alle Egadi da Trapani: Favignana e Levanzo, escursioni condivise o private, trimarano, pranzo a bordo e pesca.",
    };
  }

  if (locale === "fr") {
    return {
      title: "Excursions bateau Égades depuis Trapani | Egadi Sailing",
      description:
        "Comparez les excursions bateau aux îles Égades depuis Trapani : Favignana, Levanzo, sorties privées ou partagées, trimaran, déjeuner à bord et pêche.",
    };
  }

  if (locale === "de") {
    return {
      title: "Bootstouren ab Trapani zu den Ägadischen Inseln | Egadi Sailing",
      description:
        "Vergleichen Sie Bootstouren ab Trapani zu den Ägadischen Inseln: Favignana, Levanzo, private oder geteilte Ausfahrten, Trimaran, Mittagessen an Bord und Angeln.",
    };
  }

  return fallback;
}

function experiencePageTopics(locale: string) {
  if (locale === "en") {
    return {
      about: [
        "Egadi Islands boat tours from Trapani",
        "Boat tour Egadi Islands",
        "Egadi boat tour",
        "Egadi Islands boat trip",
        "Favignana",
        "Levanzo",
        "Snorkelling",
        "Private boat tour",
        "Shared boat tour",
        "Charter",
      ],
      keywords: [
        "egadi islands boat tour",
        "boat tour egadi islands",
        "egadi boat tour",
        "egadi islands boat trip",
        "boat trips from trapani",
        "trapani boat trips",
        "favignana and levanzo boat tour",
        "boat tours from trapani",
      ],
    };
  }

  if (locale === "es") {
    return {
      about: [
        "Paseos en barco desde Trapani",
        "Paseo en barco Trapani",
        "Excursiones en barco Islas Egadi",
        "Excursión en barco Favignana y Levanzo",
        "Barco desde Trapani a Favignana",
        "Paseo en barco Islas Egadi",
        "Cala Rossa",
        "Levanzo",
        "Snorkel",
        "Tour privado en barco",
        "Tour compartido en barco",
        "Charter",
      ],
      keywords: [
        "paseo en barco trapani",
        "paseos en barco desde trapani",
        "excursiones en barco islas egadi",
        "excursion en barco favignana levanzo",
        "barco desde trapani a favignana",
        "favignana y levanzo en barco",
        "tour en barco trapani",
        "islas egadi en barco",
      ],
    };
  }

  if (locale === "de") {
    return {
      about: [
        "Bootstouren ab Trapani",
        "Bootstour Trapani",
        "Bootstouren zu den Ägadischen Inseln",
        "Favignana",
        "Levanzo",
        "Schnorcheln",
        "Private Bootstour",
        "Geteilte Ausfahrt",
        "Charter",
      ],
      keywords: [
        "bootstour trapani",
        "bootstouren ab trapani",
        "bootstouren ägadische inseln",
        "favignana und levanzo bootstour",
        "bootstour favignana trapani",
      ],
    };
  }

  if (locale === "fr") {
    return {
      about: [
        "Excursions bateau depuis Trapani",
        "Excursion bateau îles Égades",
        "Favignana",
        "Levanzo",
        "Snorkeling",
        "Excursion privée en bateau",
        "Excursion partagée en bateau",
        "Charter",
      ],
      keywords: [
        "excursion bateau égades",
        "excursions bateau depuis trapani",
        "excursion bateau favignana levanzo",
        "charter égades",
        "bateau privé trapani",
      ],
    };
  }

  return {
    about: [
      "Tour in barca alle Egadi da Trapani",
      "Escursioni in barca Isole Egadi",
      "Navigazione alle Egadi",
      "Favignana",
      "Levanzo",
      "Snorkeling",
      "Tour privato in barca",
      "Tour condiviso in barca",
      "Charter Egadi",
    ],
    keywords: [
      "tour in barca egadi",
      "egadi navigazione",
      "escursioni in barca egadi",
      "favignana e levanzo in barca",
      "charter egadi",
      "barca egadi trapani",
    ],
  };
}

function getHubQuickLinks(locale: string) {
  const sharedHref = localizedExperiencePath(locale, "boat-shared-full-day");
  const privateHref = localizedExperiencePath(locale, "boat-exclusive-full-day");
  const charterHref = localizedExperiencePath(locale, "cabin-charter");
  const fishingHref = localizedExperiencePath(locale, "fishing-full-day");

  if (locale === "en") {
    return {
      eyebrow: "Quick choice",
      title: "Choose the Egadi boat tour that matches your search",
      intro:
        "If you already know the format, go straight to the most relevant page: full-day boat trip, private tour, multi-day charter or fishing experience.",
      links: [
        {
          label: "Favignana and Levanzo boat tour from Trapani",
          description: "The complete full-day route with swim stops, snorkelling and shared or private options.",
          href: sharedHref,
        },
        {
          label: "Private Favignana and Levanzo boat tour",
          description: "Best for families, small groups and guests who want the boat reserved for them.",
          href: privateHref,
        },
        {
          label: "Egadi trimaran charter",
          description: "Multi-day private route between Favignana, Levanzo and Marettimo with skipper.",
          href: charterHref,
        },
        {
          label: "Egadi fishing charter",
          description: "Private fishing day from Trapani with professional equipment and permitted Egadi areas.",
          href: fishingHref,
        },
      ],
    };
  }

  if (locale === "es") {
    return {
      eyebrow: "Elección rápida",
      title: "Elige tu paseo en barco por las Islas Egadi desde Trapani",
      intro:
        "Si ya sabes qué formato quieres, entra directamente en la página más útil: paseo compartido de día completo, tour privado, charter de varios días o pesca.",
      links: [
        {
          label: "Paseo en barco compartido Favignana y Levanzo",
          description: "Excursión de día completo desde Trapani con baños, snorkel y ruta por Favignana y Levanzo.",
          href: sharedHref,
        },
        {
          label: "Paseo privado Favignana y Levanzo",
          description: "Barco reservado desde Trapani para familias, grupos pequeños y quien quiere más libertad de ruta.",
          href: privateHref,
        },
        {
          label: "Charter Egadi en trimarán",
          description: "Ruta privada de varios días entre Favignana, Levanzo y Marettimo con patrón.",
          href: charterHref,
        },
        {
          label: "Charter de pesca Islas Egadi",
          description: "Jornada privada de pesca desde Trapani con equipo profesional y zonas permitidas.",
          href: fishingHref,
        },
      ],
    };
  }

  if (locale === "fr") {
    return {
      eyebrow: "Choix rapide",
      title: "Choisir l'excursion Égades qui correspond à votre recherche",
      intro:
        "Si vous connaissez déjà la formule, allez directement à la page la plus pertinente : journée complète, excursion privée, charter ou pêche.",
      links: [
        {
          label: "Excursion bateau Favignana et Levanzo depuis Trapani",
          description: "La route complète d'une journée avec baignade, snorkeling et option partagée ou privée.",
          href: sharedHref,
        },
        {
          label: "Excursion privée Favignana et Levanzo",
          description: "Adapté aux familles, petits groupes et voyageurs qui veulent le bateau réservé.",
          href: privateHref,
        },
        {
          label: "Charter Égades en trimaran",
          description: "Route privée de plusieurs jours entre Favignana, Levanzo et Marettimo avec skipper.",
          href: charterHref,
        },
        {
          label: "Charter pêche Îles Égades",
          description: "Journée de pêche privée depuis Trapani avec matériel professionnel et zones autorisées.",
          href: fishingHref,
        },
      ],
    };
  }

  if (locale === "de") {
    return {
      eyebrow: "Schnelle Auswahl",
      title: "Die passende Ägadische-Inseln-Bootstour für Ihre Reisepläne finden",
      intro:
        "Wenn das Format schon klar ist, gehen Sie direkt zur passenden Seite: Ganztagsausfahrt, private Bootstour, mehrtägiger Charter oder Angeln.",
      links: [
        {
          label: "Favignana und Levanzo Bootstour ab Trapani",
          description: "Die vollständige Tagestour mit Badestopps, Schnorcheln und geteilter oder privater Option.",
          href: sharedHref,
        },
        {
          label: "Private Bootstour Favignana und Levanzo",
          description: "Passend für Familien, kleine Gruppen und Gäste, die ein reserviertes Boot wünschen.",
          href: privateHref,
        },
        {
          label: "Trimaran-Charter Ägadische Inseln",
          description: "Mehrtägige private Route zwischen Favignana, Levanzo und Marettimo mit Skipper.",
          href: charterHref,
        },
        {
          label: "Angelcharter Ägadische Inseln",
          description: "Privater Angeltag ab Trapani mit professioneller Ausrüstung und erlaubten Bereichen.",
          href: fishingHref,
        },
      ],
    };
  }

  return {
    eyebrow: "Scelta rapida",
    title: "Trova il tour Egadi più adatto alla tua ricerca",
    intro:
      "Se hai già chiaro il tipo di esperienza, entra direttamente nella pagina più pertinente: giornata completa, tour privato, charter o pesca.",
    links: [
      {
        label: "Escursione in barca Favignana e Levanzo da Trapani",
        description: "La rotta completa di 8 ore con soste bagno, snorkeling e opzione condivisa o privata.",
        href: sharedHref,
      },
      {
        label: "Tour privato Favignana e Levanzo",
        description: "La scelta più adatta per famiglie, piccoli gruppi e chi vuole la barca riservata.",
        href: privateHref,
      },
      {
        label: "Charter Egadi in trimarano",
        description: "Itinerario privato di più giorni tra Favignana, Levanzo e Marettimo con skipper.",
        href: charterHref,
      },
      {
        label: "Charter pesca Egadi",
        description: "Giornata privata di pesca da Trapani con attrezzatura professionale e aree consentite.",
        href: fishingHref,
      },
    ],
  };
}

function guestsLabel(value: number, locale: string): string {
  if (locale === "es") return `Hasta ${value} personas`;
  if (locale === "fr") return `Jusqu'à ${value} personnes`;
  if (locale === "de") return `Bis zu ${value} Personen`;
  return locale === "en" ? `Up to ${value} guests` : `Fino a ${value} persone`;
}

function packageCapacityLabel(
  serviceIds: string[],
  serviceById: Map<string, ServiceSummary>,
  locale: string,
): string {
  const capacities = serviceIds
    .map((serviceId) => serviceById.get(serviceId)?.capacityMax)
    .filter((value): value is number => typeof value === "number");
  if (capacities.length === 0) {
    if (locale === "es") return "Capacidad confirmada al reservar";
    if (locale === "fr") return "Capacité confirmée à la réservation";
    if (locale === "de") return "Kapazität bei Buchung bestätigt";
    return locale === "en" ? "Capacity confirmed when booking" : "Capienza confermata in prenotazione";
  }
  return guestsLabel(Math.max(...capacities), locale);
}

function packageSchemaDuration(packageKey: string): string {
  if (packageKey === "tour-barca-egadi-4-ore") return "PT4H";
  if (packageKey === "charter-egadi") return "P3D";
  return "PT8H";
}

function getHubCopy(locale: string) {
  if (locale === "es") {
    return {
      intro:
        "Compara paseos en barco desde Trapani a las Islas Egadi antes de elegir la fórmula adecuada: excursión compartida, tour privado, medio día de 4 horas, día completo a Favignana y Levanzo, charter en trimarán, almuerzo a bordo o pesca deportiva. Desde Via dei Gladioli 15, cerca del Puerto de Trapani, las rutas se planifican según Favignana, Levanzo y las mejores condiciones del mar. Las paradas posibles incluyen Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda y Cala Minnola. Cada paquete indica duración, precio, capacidad, incluidos, snorkel, patrón, combustible y política de cancelación o reembolso por mal tiempo.",
      labels: {
        duration: "Duración",
        price: "Precio",
        formula: "Fórmula",
        capacity: "Capacidad",
        route: "Ruta",
        includes: "Incluye",
        departure: "Salida",
        policy: "Meteo y cancelación",
      },
      departure: "Via dei Gladioli 15, Puerto de Trapani",
      policy: "Si Egadisailing cancela por mar no seguro: cambio de fecha gratuito o reembolso completo; cancelación cliente según términos.",
      faqTitle: "FAQ sobre paseos en barco a las Islas Egadi desde Trapani",
      faqs: [
        {
          question: "¿Mejor un paseo de 4 horas o una excursión de 8 horas?",
          answer: "La excursión de 8 horas es ideal para Favignana y Levanzo con más paradas de baño y snorkel. El paseo privado de 4 horas funciona si quieres una salida compacta con barco reservado y regreso preciso.",
        },
        {
          question: "¿Paseo compartido o tour privado?",
          answer: "El paseo compartido permite reservar plazas individuales y mantener el precio más accesible. El tour privado reserva el barco para tu grupo y deja más libertad en ritmo, pausas y privacidad.",
        },
        {
          question: "¿Desde dónde salen las experiencias?",
          answer: "La salida habitual es desde Trapani, con punto de encuentro en Via dei Gladioli 15, 91100 Trapani, cerca del Puerto de Trapani. La tripulación confirma los detalles operativos antes de salir.",
        },
        {
          question: "¿Qué incluye el precio?",
          answer: "Cada página indica los incluidos exactos. En general encontrarás skipper, carburante para la ruta prevista, agua o soft drink, snorkeling, asistencia a bordo e indicaciones sobre comida a bordo cuando prevista.",
        },
        {
          question: "¿Qué pasa con mal tiempo?",
          answer: "La ruta puede cambiar por seguridad. Si Egadisailing cancela porque el mar no permite realizar la experiencia de forma segura, puedes elegir cambio de fecha gratuito o reembolso completo.",
        },
        {
          question: "¿Qué paseo en barco desde Trapani elegir para Favignana y Levanzo?",
          answer: "Para Favignana y Levanzo desde Trapani, el paseo en barco más completo es la excursión de 8 horas. Elige el tour compartido para una jornada accesible, el tour privado para tu grupo o el trimarán si buscas más confort y servicio.",
        },
      ],
      facts: {
        "tour-barca-egadi-8-ore": {
          formula: "Tour compartido o privado",
          route: "Salida desde Trapani hacia Favignana y Levanzo, con Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda y Cala Minnola según meteo.",
          includes: "Skipper, combustible, snorkel, agua, paradas de baño y asistencia.",
        },
	        "tour-barca-egadi-4-ore": {
	          formula: "Tour privado de medio día",
	          route: "Salida desde Trapani hacia una cala protegida alrededor de Favignana, con ruta flexible según viento y mar.",
	          includes: "Barco privado, skipper, combustible, snorkel y paradas de baño.",
	        },
        "esperienza-gourmet-trimarano": {
          formula: "Trimarán privado con almuerzo a bordo",
          route: "Desde Trapani hacia Favignana y Levanzo, con almuerzo a bordo, paradas de baño y comodidad de catamarán.",
          includes: "Almuerzo a bordo cocinado por la tripulación, patrón, azafata, bebidas, combustible y snorkel.",
        },
        "charter-egadi": {
          formula: "Charter privado 3-7 días",
          route: "Charter desde Trapani hacia Favignana, Levanzo y Marettimo, con noches al fondeo y ruta meteorológica.",
          includes: "Trimarán con cabinas, patrón, cocina, planificación de ruta y snorkel.",
        },
        "charter-pesca-egadi": {
          formula: "Charter privado de pesca deportiva",
          route: "Salida desde Trapani hacia spots permitidos en AMP Egadi según temporada, mar y normativa.",
          includes: "Gommone de pesca, skipper, cañas profesionales, bolentino, curricán, drifting y catch and release.",
        },
      },
    };
  }

  if (locale === "fr") {
    return {
      intro:
        "Choisissez votre excursion en bateau aux îles Égades depuis Trapani en comparant durée, prix, capacité, formule et route. Depuis Via dei Gladioli 15, près du port de Trapani, vous pouvez réserver excursions partagées de 8 heures à Favignana et Levanzo, excursions privées de 4 heures, charter en trimaran, déjeuner à bord ou pêche sportive. Les étapes possibles incluent Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda et Cala Minnola, toujours selon météo, vent et sécurité. Chaque forfait indique inclus, snorkeling, skipper, carburant et politique d'annulation ou remboursement en cas de mauvaise météo.",
      labels: {
        duration: "Durée",
        price: "Prix",
        formula: "Formule",
        capacity: "Capacité",
        route: "Route",
        includes: "Inclus",
        departure: "Départ",
        policy: "Météo et annulation",
      },
      departure: "Via dei Gladioli 15, port de Trapani",
      policy: "Si Egadisailing annule pour mer non sûre : changement de date gratuit ou remboursement complet ; annulation client selon conditions.",
      faqTitle: "FAQ excursions en bateau aux Égades depuis Trapani",
      faqs: [
        {
          question: "Vaut-il mieux choisir 4 heures ou 8 heures ?",
          answer: "L'excursion de 8 heures est idéale pour Favignana et Levanzo avec plus d'arrêts baignade et snorkeling. L'excursion privée de 4 heures convient à une sortie compacte avec bateau réservé.",
        },
        {
          question: "Excursion partagée ou excursion privée ?",
          answer: "L'excursion partagée permet de réserver des places individuelles. L'excursion privée réserve le bateau à votre groupe et donne plus de liberté sur rythme, pauses et intimité.",
        },
        {
          question: "D'où partent les expériences ?",
          answer: "Le départ habituel se fait depuis Trapani, avec point de rencontre Via dei Gladioli 15, 91100 Trapani, près du port de Trapani. L'équipage confirme les détails avant le départ.",
        },
        {
          question: "Qu'est-ce qui est inclus dans le prix ?",
          answer: "Chaque page indique les inclus exacts. En général : skipper, carburant pour la route prévue, eau ou boissons fraîches, snorkeling, assistance à bord et déjeuner à bord quand prévu.",
        },
        {
          question: "Que se passe-t-il en cas de mauvaise météo ?",
          answer: "La route peut changer pour sécurité. Si Egadisailing annule parce que la mer ne permet pas l'expérience en sécurité, vous choisissez changement de date gratuit ou remboursement complet.",
        },
        {
          question: "Quelle excursion choisir pour Favignana et Levanzo ?",
          answer: "Pour Favignana et Levanzo depuis Trapani, la formule la plus complète est l'excursion de 8 heures. Pour événements, familles ou intimité, choisissez privé, déjeuner à bord ou charter.",
        },
      ],
      facts: {
        "tour-barca-egadi-8-ore": {
          formula: "Excursion partagée ou privée",
          route: "Départ de Trapani vers Favignana et Levanzo, avec Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda et Cala Minnola selon météo.",
          includes: "Skipper, carburant, snorkeling, eau, arrêts baignade et assistance.",
        },
        "tour-barca-egadi-4-ore": {
          formula: "Excursion privée demi-journée",
          route: "Départ de Trapani vers une crique abritée autour de Favignana, avec route flexible selon vent et mer.",
          includes: "Bateau privé, skipper, carburant, snorkeling et arrêts baignade.",
        },
        "esperienza-gourmet-trimarano": {
          formula: "Trimaran privé avec déjeuner à bord",
          route: "Depuis Trapani vers Favignana et Levanzo, avec déjeuner à bord, arrêts baignade et confort de catamaran.",
          includes: "Déjeuner à bord préparé par l'équipage, skipper, hôtesse, boissons, carburant et snorkeling.",
        },
        "charter-egadi": {
          formula: "Charter privé 3-7 jours",
          route: "Charter depuis Trapani vers Favignana, Levanzo et Marettimo, avec nuits au mouillage et route météo.",
          includes: "Trimaran avec cabines, skipper, cuisine, planification de route et snorkeling.",
        },
        "charter-pesca-egadi": {
          formula: "Charter privé de pêche sportive",
          route: "Départ de Trapani vers les spots autorisés dans l'AMP Égades selon saison, mer et réglementation.",
          includes: "Semi-rigide de pêche, skipper, cannes professionnelles, pêche de fond, traîne, drifting et catch and release.",
        },
      },
    };
  }

  if (locale === "de") {
    return {
      intro:
        "Vergleichen Sie Bootstouren ab Trapani zu den Ägadischen Inseln, bevor Sie die passende Formel wählen: geteilte Bootstour, private Ausfahrt, 4-Stunden-Halbtag, 8-stündige Bootstour nach Favignana und Levanzo, Trimaran-Charter, Mittagessen an Bord oder Sportangeln. Ab Via dei Gladioli 15, nahe dem Hafen Trapani, werden die Routen rund um Favignana, Levanzo und die besten Seebedingungen des Tages geplant. Mögliche Stopps sind Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda und Cala Minnola. Jedes Paket zeigt Dauer, Preis, Kapazität, Inklusivleistungen, Schnorcheln, Skipper, Treibstoff sowie Storno- oder Erstattungsregeln bei schlechtem Wetter.",
      labels: {
        duration: "Dauer",
        price: "Preis",
        formula: "Formel",
        capacity: "Kapazität",
        route: "Route",
        includes: "Enthalten",
        departure: "Abfahrt",
        policy: "Wetter und Storno",
      },
      departure: "Via dei Gladioli 15, Hafen Trapani",
      policy: "Wenn Egadisailing wegen unsicherer See storniert: kostenloser Terminwechsel oder volle Erstattung; Kundenstorno gemäß Bedingungen.",
      faqTitle: "FAQ zu Bootstouren ab Trapani",
      faqs: [
        {
          question: "Sind 4 Stunden oder 8 Stunden besser?",
          answer: "Die 8-stündige Bootstour ist ideal für Favignana und Levanzo mit mehr Badestopps und Schnorcheln. Die private 4-stündige Ausfahrt passt, wenn Sie ein kompaktes Zeitfenster mit reserviertem Boot wünschen.",
        },
        {
          question: "Geteilte oder private Ausfahrt?",
          answer: "Bei der geteilten Ausfahrt buchen Sie Einzelplätze. Bei der privaten Bootstour ist das Boot für Ihre Gruppe reserviert, mit mehr Freiheit bei Rhythmus, Pausen und Privatsphäre.",
        },
        {
          question: "Wo starten die Erlebnisse?",
          answer: "Die übliche Abfahrt ist in Trapani, Treffpunkt Via dei Gladioli 15, 91100 Trapani, nahe dem Hafen Trapani. Die Crew bestätigt operative Details vor der Abfahrt.",
        },
        {
          question: "Was ist im Preis enthalten?",
          answer: "Jede Detailseite nennt die genauen Leistungen. Meist enthalten: Skipper, Treibstoff für die geplante Route, Wasser oder Softdrinks, Schnorcheln, Betreuung an Bord und Mittagessen an Bord, wenn vorgesehen.",
        },
        {
          question: "Was passiert bei schlechtem Wetter?",
          answer: "Die Route kann aus Sicherheitsgründen geändert werden. Wenn Egadisailing wegen unsicherer See storniert, wählen Sie kostenlosen Terminwechsel oder volle Erstattung.",
        },
        {
          question: "Welche Bootstour ab Trapani passt für Favignana und Levanzo?",
          answer: "Für Favignana und Levanzo ab Trapani ist die 8-stündige Bootstour am vollständigsten. Wählen Sie die geteilte Ausfahrt für einen zugänglichen Tagesausflug, die private Bootstour für Ihre Gruppe oder den Trimaran für mehr Komfort und Service.",
        },
      ],
      facts: {
        "tour-barca-egadi-8-ore": {
          formula: "Geteilte oder private Ausfahrt",
          route: "Abfahrt ab Trapani nach Favignana und Levanzo, mit Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda und Cala Minnola je nach Wetter.",
          includes: "Skipper, Treibstoff, Schnorcheln, Wasser, Badestopps und Betreuung.",
        },
        "tour-barca-egadi-4-ore": {
          formula: "Private Halbtages-Bootstour",
          route: "Abfahrt ab Trapani zu einer geschützten Bucht rund um Favignana, flexibel nach Wind und Meer.",
          includes: "Privates Boot, Skipper, Treibstoff, Schnorcheln und Badestopps.",
        },
        "esperienza-gourmet-trimarano": {
          formula: "Privater Trimaran mit Mittagessen an Bord",
          route: "Von Trapani nach Favignana und Levanzo, mit Mittagessen an Bord, Badestopps und Katamaran-Komfort.",
          includes: "Mittagessen an Bord, Skipper, Hostess, Getränke, Treibstoff und Schnorcheln.",
        },
        "charter-egadi": {
          formula: "Privater Charter 3-7 Tage",
          route: "Charter ab Trapani nach Favignana, Levanzo und Marettimo, mit Nächten vor Anker und wetterabhängiger Route.",
          includes: "Trimaran mit Kabinen, Skipper, Bordküche, Routenplanung und Schnorcheln.",
        },
        "charter-pesca-egadi": {
          formula: "Privater Sportangel-Charter",
          route: "Abfahrt ab Trapani zu erlaubten Spots im AMP Egadi je nach Saison, Meer und Regeln.",
          includes: "Angel-RIB, Skipper, professionelle Ruten, Grundangeln, Schleppangeln, Drifting und Catch and Release.",
        },
      },
    };
  }

  if (locale === "en") {
    return {
      intro:
        "Compare Egadi Islands boat tours and boat trips from Trapani before choosing the right format: shared boat tour, private boat tour, 4-hour half day, 8-hour Favignana and Levanzo trip, trimaran charter, lunch on board or sport fishing. From Via dei Gladioli 15, near Trapani harbour, routes are planned around Favignana, Levanzo and the best sea conditions of the day. Possible stops include Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda and Cala Minnola. Each package shows duration, price, capacity, inclusions, snorkelling, skipper, fuel and the cancellation or refund policy for unsafe sea conditions.",
      labels: {
        duration: "Duration",
        price: "Price",
        formula: "Format",
        capacity: "Capacity",
        route: "Route",
        includes: "Includes",
        departure: "Departure",
        policy: "Weather and cancellation",
      },
      departure: "Via dei Gladioli 15, Trapani harbour",
      policy: "If Egadisailing cancels for unsafe sea conditions: free date change or full refund; customer cancellation follows the booking terms.",
      faqTitle: "FAQ about Egadi boat tours and trips from Trapani",
      faqs: [
        {
          question: "Should I choose 4 hours or 8 hours?",
          answer: "The 8-hour tour is best for Favignana and Levanzo with more swim stops and snorkelling. The private 4-hour tour works when you want a compact slot with a reserved boat and a precise return.",
        },
        {
          question: "Shared tour or private tour?",
          answer: "The shared tour lets you book individual seats and keep the price more accessible. The private tour reserves the boat for your group and gives more freedom with rhythm, pauses and privacy.",
        },
        {
          question: "Where do the experiences depart from?",
          answer: "The usual departure is from Trapani, with meeting point at Via dei Gladioli 15, 91100 Trapani, near Trapani harbour. The crew confirms operational details before departure.",
        },
        {
          question: "What is included in the price?",
          answer: "Each detail page lists the exact inclusions. In general you will find skipper, fuel for the planned route, water or soft drinks, snorkelling, assistance on board and lunch on board where included.",
        },
        {
          question: "What happens in bad weather?",
          answer: "The route can change for safety. If Egadisailing cancels because the sea is unsafe, you can choose a free date change or a full refund.",
        },
        {
          question: "Which Egadi Islands boat trip should I choose for Favignana and Levanzo?",
          answer: "For Favignana and Levanzo from Trapani, the most complete boat trip is the 8-hour format. Choose the shared tour for an accessible full day, the private tour for your group, or the trimaran experiences for more comfort and service.",
        },
      ],
      facts: {
        "tour-barca-egadi-8-ore": {
          formula: "Shared or private tour",
          route: "Departure from Trapani to Favignana and Levanzo, with Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda and Cala Minnola depending on weather.",
          includes: "Skipper, fuel, snorkelling, water, swim stops and assistance.",
        },
	        "tour-barca-egadi-4-ore": {
	          formula: "Private half-day boat tour",
	          route: "Departure from Trapani toward a sheltered cove around Favignana, flexible according to wind and sea.",
	          includes: "Private boat, skipper, fuel, snorkelling and swim stops.",
	        },
        "esperienza-gourmet-trimarano": {
          formula: "Private trimaran with lunch on board",
          route: "From Trapani to Favignana and Levanzo, with lunch on board, swim stops and catamaran-style comfort.",
          includes: "Lunch on board cooked by the crew, skipper, hostess, drinks, fuel and snorkelling.",
        },
        "charter-egadi": {
          formula: "Private 3-7 day charter",
          route: "Charter from Trapani to Favignana, Levanzo and Marettimo, with nights at anchor and weather-aware route.",
          includes: "Trimaran with cabins, skipper, galley, route planning and snorkelling.",
        },
        "charter-pesca-egadi": {
          formula: "Private sport fishing charter",
          route: "Departure from Trapani to authorised AMP Egadi spots according to season, sea state and rules.",
          includes: "Fishing RIB, skipper, professional rods, bottom fishing, trolling, drifting and catch and release.",
        },
      },
    };
  }

  return {
    intro:
      "Scegli il tuo tour in barca alle Isole Egadi da Trapani confrontando durata, prezzo, capienza, formula e rotta. Da Via dei Gladioli 15, vicino al Porto di Trapani, puoi prenotare escursioni condivise di 8 ore a Favignana e Levanzo, tour privati di 4 ore, charter in trimarano, pranzo a bordo o pesca sportiva. Le tappe possibili includono Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda e Cala Minnola, sempre in base a meteo, vento e sicurezza. Ogni pacchetto indica inclusi, snorkeling, skipper, carburante e policy di cancellazione o rimborso in caso di mare non sicuro.",
    labels: {
      duration: "Durata",
      price: "Prezzo",
      formula: "Formula",
      capacity: "Capienza",
      route: "Rotta",
      includes: "Include",
      departure: "Partenza",
      policy: "Meteo e cancellazione",
    },
    departure: "Via dei Gladioli 15, Porto di Trapani",
    policy: "Se Egadisailing cancella per mare non sicuro: cambio data gratuito o rimborso completo; cancellazione cliente secondo termini.",
    faqTitle: "FAQ tour in barca alle Egadi da Trapani",
    faqs: [
      {
        question: "Meglio scegliere 4 ore o 8 ore?",
        answer: "Il tour di 8 ore è ideale per Favignana e Levanzo con più soste bagno e snorkeling. Il tour privato di 4 ore funziona se vuoi una fascia compatta con barca riservata e rientro preciso.",
      },
      {
        question: "Tour condiviso o tour privato?",
        answer: "Il tour condiviso permette di prenotare posti singoli e tenere il prezzo più accessibile. Il tour privato riserva la barca al tuo gruppo e lascia più libertà su ritmo, soste e privacy.",
      },
      {
        question: "Da dove partono le esperienze?",
        answer: "La partenza abituale è da Trapani, con punto di incontro in Via dei Gladioli 15, 91100 Trapani, vicino al Porto di Trapani. La crew conferma i dettagli operativi prima dell'uscita.",
      },
      {
        question: "Cosa include il prezzo?",
        answer: "Ogni pagina dettaglio indica gli inclusi esatti. In generale trovi skipper, carburante per la rotta prevista, acqua o soft drink, snorkeling, assistenza a bordo e pranzo a bordo quando previsto.",
      },
      {
        question: "Cosa succede in caso di maltempo?",
        answer: "La rotta può cambiare per sicurezza. Se Egadisailing cancella perché il mare non permette di svolgere l'esperienza in sicurezza, puoi scegliere cambio data gratuito o rimborso completo.",
      },
      {
        question: "Quale tour scegliere per Favignana e Levanzo?",
        answer: "Per Favignana e Levanzo da Trapani la scelta più completa è l'escursione di 8 ore. Per eventi, famiglie o privacy scegli privato, pranzo a bordo o charter.",
      },
    ],
    facts: {
      "tour-barca-egadi-8-ore": {
        formula: "Tour condiviso o privato",
        route: "Partenza da Trapani verso Favignana e Levanzo, con Cala Rossa, Cala Azzurra, Bue Marino, Grotta degli Innamorati, Cala Fredda e Cala Minnola secondo meteo.",
        includes: "Skipper, carburante, snorkeling, acqua, soste bagno e assistenza.",
      },
	      "tour-barca-egadi-4-ore": {
	        formula: "Tour privato mezza giornata",
	        route: "Partenza da Trapani verso una cala riparata intorno a Favignana, con rotta flessibile secondo vento e mare.",
	        includes: "Barca privata, skipper, carburante, snorkeling e soste bagno.",
	      },
      "esperienza-gourmet-trimarano": {
        formula: "Trimarano privato con pranzo a bordo",
        route: "Da Trapani verso Favignana e Levanzo, con pranzo a bordo, soste bagno e comfort da catamarano.",
        includes: "Pranzo a bordo cucinato dalla crew, skipper, hostess, bevande, carburante e snorkeling.",
      },
      "charter-egadi": {
        formula: "Charter privato 3-7 giorni",
        route: "Charter da Trapani verso Favignana, Levanzo e Marettimo, con notti in rada e rotta meteo-dipendente.",
        includes: "Trimarano con cabine, skipper, cucina, pianificazione rotta e snorkeling.",
      },
      "charter-pesca-egadi": {
        formula: "Charter privato di pesca sportiva",
        route: "Partenza da Trapani verso spot consentiti in AMP Egadi secondo stagione, mare e normativa.",
        includes: "Gommone pesca, skipper, canne professionali, bolentino, traina, drifting e catch and release.",
      },
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  const seo = experienceHubSeoCopy(locale, {
    title: t("title"),
    description: t("subtitle"),
  });
  return buildPageMetadata({
    title: seo.title,
    description: seo.description,
    path: "/experiences",
    locale,
    image: "/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp",
  });
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "experiences" });
  const hubCopy = getHubCopy(locale);
  const quickLinks = getHubQuickLinks(locale);

  const services = await db.service.findMany({
    where: { active: true, id: { in: getExperiencePackageServiceIds() } },
    select: { id: true, capacityMax: true },
  });
  const displayPrices = await getDisplayPriceMap(services.map((s) => s.id), 2026, locale);
  const activeServiceIds = new Set(services.map((service) => service.id));
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const packages = getExperiencePackageContents(locale)
    .map((item) => {
      const serviceIds = item.serviceIds.filter((serviceId) => activeServiceIds.has(serviceId));
      if (serviceIds.length === 0) return null;
      const displayPrice = lowestDisplayPrice(serviceIds, displayPrices);
      return {
        ...item,
        serviceIds,
        priceLabel: displayPrice?.label ?? null,
        priceAmount: displayPrice?.amount?.toFixed(2) ?? null,
        variants: item.variants.filter((variant) => activeServiceIds.has(variant.serviceId)),
      };
    })
    .filter((item): item is HubPackage => item !== null);
  const experienceListPackages = packages.map((item) => {
    const facts = hubCopy.facts[item.key as keyof typeof hubCopy.facts];
    return {
      key: item.key,
      order: item.order,
      title: item.title,
      subtitle: item.subtitle,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      durationLabel: item.durationLabel,
      detailLabel: item.detailLabel,
      priceLabel: item.priceLabel,
      priceUnitLabel: item.priceUnitLabel,
      primaryHref: item.primaryHref,
      primaryCtaLabel: item.primaryCtaLabel,
      media: item.media,
      capacityLabel: packageCapacityLabel(item.serviceIds, serviceById, locale),
      facts,
      labels: {
        route: hubCopy.labels.route,
        includes: hubCopy.labels.includes,
      },
      variants: item.variants.map((variant) => ({
        label: variant.label,
        description: variant.description,
        href: variant.href,
      })),
    };
  });
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = `${env.APP_URL.replace(/\/$/, "")}${localizedPath(locale, "/experiences")}`;
  const meetingPointId = `${pageUrl}#meeting-point`;
  const organizationId = `${siteBase}#organization`;
  const itemListId = `${pageUrl}#experience-list`;
  const faqId = `${pageUrl}#faq`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "LocalBusiness", "TravelAgency"],
        "@id": organizationId,
        name: "Egadi Sailing",
        legalName: PUBLIC_COMPANY_LEGAL.name,
        alternateName: "Egadisailing",
        url: siteBase,
        email: PUBLIC_CONTACT_EMAIL,
        telephone: PUBLIC_CONTACT_PRIMARY_PHONE_TEXT,
        taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
        address: PUBLIC_CONTACT_POSTAL_ADDRESS,
        geo: PUBLIC_CONTACT_GEO,
        openingHoursSpecification: PUBLIC_CONTACT_OPENING_HOURS_SPECIFICATION,
        areaServed: [
          { "@type": "Place", name: "Trapani" },
          { "@type": "Place", name: "Isole Egadi" },
          { "@type": "Place", name: "Favignana" },
          { "@type": "Place", name: "Levanzo" },
          { "@type": "Place", name: "Marettimo" },
        ],
      },
      {
        "@type": "Place",
        "@id": meetingPointId,
        name:
          locale === "es"
            ? "Puerto de Trapani - punto de encuentro Egadisailing"
            : locale === "fr"
              ? "Port de Trapani - point de rencontre Egadisailing"
              : locale === "de"
                ? "Hafen Trapani - Egadisailing Treffpunkt"
                : locale === "en"
                  ? "Trapani harbour - Egadisailing meeting point"
                  : "Porto di Trapani - punto di incontro Egadisailing",
        address: PUBLIC_CONTACT_POSTAL_ADDRESS,
        geo: PUBLIC_CONTACT_GEO,
        hasMap: PUBLIC_CONTACT_LOCATION.mapEmbedUrl,
      },
      {
        "@type": "BreadcrumbList",
        inLanguage: inLanguage(locale),
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Egadi Sailing",
            item: localizedAbsoluteUrl(siteBase, locale, "/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: t("title"),
            item: pageUrl,
          },
        ],
      },
      {
        "@type": ["CollectionPage", "WebPage"],
        "@id": pageUrl,
        url: pageUrl,
        name: t("title"),
        description: t("subtitle"),
        inLanguage: inLanguage(locale),
        provider: { "@id": organizationId },
        mainEntity: { "@id": itemListId },
        hasPart: quickLinks.links.map((link) => ({
          "@type": "WebPage",
          name: link.label,
          description: link.description,
          url: `${siteBase}${link.href}`,
        })),
        ...experiencePageTopics(locale),
      },
      {
        "@type": "ItemList",
        "@id": itemListId,
        name:
          locale === "es"
            ? "Paseos y excursiones en barco por las Islas Egadi desde Trapani"
            : locale === "fr"
              ? "Forfaits d'excursions en bateau aux îles Égades"
              : locale === "de"
                ? "Bootstouren und Charter ab Trapani zu den Ägadischen Inseln"
                : locale === "en"
                  ? "Egadi boat tour packages"
                  : "Pacchetti tour in barca alle Egadi",
        inLanguage: inLanguage(locale),
        itemListElement: packages.map((item, index) => {
          const itemUrl = `${siteBase}/${locale}${item.primaryHref}`;
          const facts = hubCopy.facts[item.key as keyof typeof hubCopy.facts];
          const structuredImages = item.media
            .map((media) => media.src)
            .filter((src): src is string => Boolean(src))
            .slice(0, 3)
            .map((src) => absoluteUrl(src));
          return {
            "@type": "ListItem",
            position: index + 1,
            url: itemUrl,
            item: {
              "@type": "TouristTrip",
              name: item.seoTitle,
              description: `${item.seoDescription} ${facts?.route ?? ""}`,
              url: itemUrl,
              image:
                structuredImages.length > 0
                  ? structuredImages
                  : [absoluteUrl("/images/egadisailing-experience/03-nuoto-cala-rossa-acqua-cristallina.webp")],
              duration: packageSchemaDuration(item.key),
              provider: { "@id": organizationId },
              areaServed: [
                { "@type": "Place", name: "Trapani" },
                { "@type": "Place", name: "Isole Egadi" },
                { "@type": "Place", name: "Favignana" },
                { "@type": "Place", name: "Levanzo" },
              ],
              availableAtOrFrom: { "@id": meetingPointId },
              additionalProperty: [
                {
                  "@type": "PropertyValue",
                  name: hubCopy.labels.duration,
                  value: item.durationLabel,
                },
                {
                  "@type": "PropertyValue",
                  name: hubCopy.labels.departure,
                  value: hubCopy.departure,
                },
                {
                  "@type": "PropertyValue",
                  name: hubCopy.labels.policy,
                  value: hubCopy.policy,
                },
              ],
              offers: {
                "@type": "Offer",
                url: itemUrl,
                priceCurrency: "EUR",
                ...(item.priceAmount ? { price: item.priceAmount } : {}),
                availability: "https://schema.org/InStock",
                areaServed: [
                  { "@type": "Place", name: "Trapani" },
                  { "@type": "Place", name: "Isole Egadi" },
                ],
                availableAtOrFrom: { "@id": meetingPointId },
              },
            },
          };
        }),
      },
      {
        "@type": "FAQPage",
        "@id": faqId,
        inLanguage: inLanguage(locale),
        mainEntity: hubCopy.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <div
      className="egadi-water-reflection relative min-h-screen overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #071934 0%, #0a2a4a 30%, #0c3d5e 50%, #0a2a4a 80%, #071934 100%)",
      }}
    >
      <div className="relative z-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
        {/* Hero */}
        <section className="px-4 pb-12 pt-28 md:px-8 md:pb-14 md:pt-32 lg:px-12">
          <div className="max-w-7xl mx-auto text-center">
            <ScrollSection animation="none">
              <h1 className="mx-auto mb-6 max-w-[20rem] break-words font-heading text-3xl font-bold leading-tight text-white sm:max-w-5xl sm:text-4xl md:text-6xl lg:text-7xl">
                {t("title")}
              </h1>
              <p className="mx-auto max-w-[20rem] text-base leading-7 text-white/50 sm:max-w-3xl sm:text-lg md:text-xl">
                {t("subtitle")}
              </p>
              <div className="mx-auto mt-8 max-w-4xl border-t border-white/12 pt-6 text-left">
                <p className="text-sm font-medium leading-7 text-white/72 sm:text-base sm:leading-8">
                  {hubCopy.intro}
                </p>
                <p className="mt-4 text-sm font-medium leading-6 text-white/62 sm:text-base sm:leading-7">
                  <span className="font-semibold text-[var(--color-gold)]">
                    {hubCopy.labels.policy}:
                  </span>{" "}
                  {hubCopy.policy}
                </p>
              </div>
            </ScrollSection>
          </div>
        </section>

        <section className="px-4 pb-20 md:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <ScrollSection animation="fade-up">
              <div className="border-y border-white/12 py-8 sm:py-10">
                <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-gold)]">
                      {quickLinks.eyebrow}
                    </p>
                    <h2 className="mt-3 max-w-2xl font-heading text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                      {quickLinks.title}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
                      {quickLinks.intro}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {quickLinks.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group rounded-lg border border-white/12 bg-white/[0.04] p-5 transition hover:border-[var(--color-gold)]/70 hover:bg-white/[0.07]"
                      >
                        <span className="flex items-start justify-between gap-4 text-base font-semibold leading-6 text-white">
                          <span>{link.label}</span>
                          <ArrowRight
                            className="mt-1 h-4 w-4 shrink-0 text-[var(--color-gold)] transition group-hover:translate-x-1"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="mt-3 block text-sm leading-6 text-white/58">
                          {link.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollSection>
          </div>
        </section>

        {/* Experiences */}
        <ExperiencesList packages={experienceListPackages} locale={locale} />

        <section id="faq" className="px-4 pb-32 md:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl">
            <ScrollSection animation="fade-up">
              <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
                {hubCopy.faqTitle}
              </h2>
              <div className="mt-8 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/12 bg-white/[0.04]">
                {hubCopy.faqs.map((faq, index) => (
                  <details key={faq.question} className="group p-5 open:bg-white/[0.04] sm:p-6" open={index === 0}>
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left text-base font-semibold text-white">
                      <span>{faq.question}</span>
                      <span className="mt-1 text-xl leading-none text-[var(--color-gold)] transition group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-4 text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </ScrollSection>
          </div>
        </section>
      </div>
    </div>
  );
}
