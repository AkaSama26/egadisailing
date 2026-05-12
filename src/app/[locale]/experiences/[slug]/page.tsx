import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Anchor,
  ArrowLeft,
  Check,
  Clock,
  Compass,
  Luggage,
  Ship,
  Users,
} from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import {
  ExperienceBookingCard,
  ExperienceBookingDialogButton,
  SmoothAnchorLink,
} from "@/components/experience-detail-actions";
import { ExperiencePresenceNotice } from "@/components/experience-presence-badge";
import { ExperienceBoatGallery } from "@/components/experience-boat-gallery";
import {
  getExperienceContent,
  getListedExperienceIds,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { getBoatContent } from "@/data/catalog/boats";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { getExperienceItinerary } from "@/lib/experiences/itineraries";
import { getDisplayPrice } from "@/lib/pricing/display";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";
import { localizedAbsoluteUrl, localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

const FALLBACK_HERO_IMAGE =
  "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp";

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function isFishingService(service: { id?: string }) {
  return service.id === "fishing-full-day";
}

function getFishingDetailCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return {
    experienceLabel: isEs
      ? "Charter de pesca deportiva"
      : isFr
        ? "Charter de pêche sportive"
        : isDe
          ? "Sportangel-Charter"
          : isEn
            ? "Sport fishing charter"
            : "Charter di pesca sportiva",
    bookingTitle: isEs
      ? "Reserva el charter de pesca"
      : isFr
        ? "Réserver le charter de pêche"
        : isDe
          ? "Angelcharter buchen"
          : isEn
            ? "Book the fishing charter"
            : "Prenota il charter di pesca",
    bookingText: isEs
      ? "Elige la fecha y reserva la neumática privada hasta 4 personas, con precio por grupo."
      : isFr
        ? "Choisissez la date et réservez le semi-rigide privé jusqu'à 4 personnes, avec prix par groupe."
        : isDe
          ? "Wählen Sie das Datum und buchen Sie das private Angel-RIB bis 4 Personen, mit Preis pro Gruppe."
          : isEn
            ? "Choose the date and book the private Fishing RIB for up to 4 guests, priced per group."
            : "Scegli la data e prenota il Gommone Pesca privato fino a 4 persone, con prezzo per gruppo.",
    galleryTitle: isEs
      ? "Gommone y setup de pesca"
      : isFr
        ? "Semi-rigide et setup pêche"
        : isDe
          ? "Angel-RIB und Setup"
          : isEn
            ? "Fishing RIB and setup"
            : "Gommone e setup pesca",
    bookNow: isEs
      ? "Reservar ahora"
      : isFr
        ? "Réserver"
        : isDe
          ? "Jetzt buchen"
          : isEn
            ? "Book now"
            : "Prenota ora",
  };
}

function getFishingSeoExpansionCopy(
  locale: string,
  durationText: string,
  boatTitle?: string,
  capacityMax = 4,
) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const boat = boatTitle ?? (isEs ? "neumática de pesca" : isFr ? "semi-rigide de pêche" : isDe ? "Angel-RIB" : isEn ? "Fishing RIB" : "Gommone Pesca");
  return {
    practicalEyebrow: isEs ? "Antes de reservar" : isFr ? "Avant de réserver" : isDe ? "Vor der Buchung" : isEn ? "Before booking" : "Prima di prenotare",
    practicalTitle: isEs ? "Detalles técnicos" : isFr ? "Détails techniques" : isDe ? "Technische Details" : isEn ? "Technical details" : "Dettagli tecnici",
    practicalItems: [
      {
        icon: Anchor,
        title: isEs ? "Salida desde Trapani" : isFr ? "Départ de Trapani" : isDe ? "Abfahrt ab Trapani" : isEn ? "Departure from Trapani" : "Partenza da Trapani",
        text: isEs
          ? "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani."
          : isFr
            ? "Point de rencontre : Via dei Gladioli 15, 91100 Trapani."
            : isDe
              ? "Treffpunkt: Via dei Gladioli 15, 91100 Trapani."
              : isEn
                ? "Meeting point: Via dei Gladioli 15, 91100 Trapani."
                : "Punto di incontro: Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        icon: Clock,
        title: isEs ? "Duración" : isFr ? "Durée" : isDe ? "Dauer" : isEn ? "Duration" : "Durata",
        text: durationText,
      },
      {
        icon: Compass,
        title: isEs ? "Ruta y normativa" : isFr ? "Route et règles" : isDe ? "Route und Regeln" : isEn ? "Route and rules" : "Rotta e normativa",
        text: isEs
          ? "La ruta se decide según mar, temporada y autorizaciones AMP/MASAF; no se pesca en zonas prohibidas."
          : isFr
            ? "La route est décidée selon mer, saison et autorisations AMP/MASAF ; aucune pêche en zone interdite."
            : isDe
              ? "Die Route richtet sich nach Meer, Saison und AMP/MASAF-Genehmigungen; keine Fischerei in verbotenen Zonen."
              : isEn
                ? "The route is chosen according to sea state, season and AMP/MASAF authorisations; no fishing in forbidden zones."
                : "La rotta si decide in base a mare, stagione e autorizzazioni AMP/MASAF; niente pesca in zone vietate.",
      },
      {
        icon: Users,
        title: isEs ? "Formato y capacidad" : isFr ? "Format et capacité" : isDe ? "Format und Kapazität" : isEn ? "Format and capacity" : "Formula e capienza",
        text: isEs
          ? `${boat} privado hasta ${capacityMax} personas, con precio por grupo.`
          : isFr
            ? `${boat} privé jusqu'à ${capacityMax} personnes, avec prix par groupe.`
            : isDe
              ? `${boat} privat bis ${capacityMax} Gäste, Preis pro Gruppe.`
              : isEn
                ? `Private ${boat} for up to ${capacityMax} guests, priced per group.`
                : `${boat} privato fino a ${capacityMax} persone, con prezzo per gruppo.`,
      },
    ],
    whatYouSeeTitle: isEs ? "Qué harás a bordo" : isFr ? "Ce que vous ferez à bord" : isDe ? "Was Sie an Bord machen" : isEn ? "What you will do on board" : "Cosa farai a bordo",
    whatYouSeeIntro: isEs
      ? "Una jornada para aficionados, con técnica y cumplimiento normativo antes que promesas de captura."
      : isFr
        ? "Une journée pour passionnés, avec technique et conformité avant toute promesse de prise."
        : isDe
          ? "Ein Tag für Enthusiasten, mit Technik und Regelkonformität statt Fangversprechen."
          : isEn
            ? "A day for enthusiasts, with technique and compliance before catch promises."
            : "Una giornata per appassionati, con tecnica e compliance prima delle promesse di cattura.",
    whatYouSeeItems: [
      {
        title: isEs ? "Técnicas mixtas" : isFr ? "Techniques mixtes" : isDe ? "Gemischte Techniken" : isEn ? "Mixed techniques" : "Tecniche miste",
        text: isEs
          ? "Pesca de fondo, curricán, drifting o catch and release según condiciones y decisión del patrón."
          : isFr
            ? "Pêche de fond, traîne, drifting ou catch and release selon conditions et décision du skipper."
            : isDe
              ? "Grundangeln, Schleppangeln, Drifting oder Catch and Release je nach Bedingungen und Skipper-Entscheidung."
              : isEn
                ? "Bottom fishing, trolling, drifting or catch and release according to conditions and skipper decision."
                : "Bolentino, traina, drifting o catch and release secondo condizioni e decisione dello skipper.",
      },
      {
        title: isEs ? "Equipo profesional" : isFr ? "Matériel professionnel" : isDe ? "Profi-Ausrüstung" : isEn ? "Professional gear" : "Attrezzatura professionale",
        text: isEs
          ? "Cañas, carretes, cebos y señuelos están preparados para una salida técnica de grupo pequeño."
          : isFr
            ? "Cannes, moulinets, appâts et leurres sont préparés pour une sortie technique en petit groupe."
            : isDe
              ? "Ruten, Rollen, Köder und Kunstköder sind für eine technische Kleingruppen-Ausfahrt vorbereitet."
              : isEn
                ? "Rods, reels, bait and lures are prepared for a technical small-group outing."
                : "Canne, mulinelli, esche e artificiali sono preparati per un'uscita tecnica in piccolo gruppo.",
      },
      {
        title: isEs ? "Captura responsable" : isFr ? "Prise responsable" : isDe ? "Verantwortungsvoller Fang" : isEn ? "Responsible catch" : "Pescato responsabile",
        text: isEs
          ? "Las capturas pueden soltarse o conservarse solo dentro de ley, tallas, cupos y autorizaciones."
          : isFr
            ? "Les prises peuvent être relâchées ou gardées uniquement selon loi, tailles, quotas et autorisations."
            : isDe
              ? "Fänge dürfen nur nach Gesetz, Mindestmaßen, Quoten und Genehmigungen behalten oder freigelassen werden."
              : isEn
                ? "Catches can be released or kept only within law, sizes, quotas and authorisations."
                : "Il pescato può essere rilasciato o trattenuto solo entro legge, taglie, quote e autorizzazioni.",
      },
    ],
    faqTitle: isEs ? "Preguntas sobre el charter de pesca" : isFr ? "Questions sur le charter de pêche" : isDe ? "Fragen zum Angelcharter" : isEn ? "Fishing charter questions" : "Domande sul charter di pesca",
    faqs: [
      {
        question: isEs ? "¿La captura está garantizada?" : isFr ? "La prise est-elle garantie ?" : isDe ? "Ist ein Fang garantiert?" : isEn ? "Is a catch guaranteed?" : "La cattura è garantita?",
        answer: isEs
          ? "No. La pesca depende de mar, temporada y naturaleza. El servicio garantiza guía técnica, equipo y cumplimiento de reglas."
          : isFr
            ? "Non. La pêche dépend de la mer, de la saison et de la nature. Le service garantit guide technique, matériel et respect des règles."
            : isDe
              ? "Nein. Angeln hängt von Meer, Saison und Natur ab. Der Service garantiert technische Begleitung, Ausrüstung und Regelkonformität."
              : isEn
                ? "No. Fishing depends on sea, season and nature. The service guarantees technical guidance, gear and rule compliance."
                : "No. La pesca dipende da mare, stagione e natura. Il servizio garantisce guida tecnica, attrezzatura e rispetto delle regole.",
      },
      {
        question: isEs ? "¿Podemos conservar el pescado?" : isFr ? "Peut-on garder le poisson ?" : isDe ? "Dürfen wir Fisch behalten?" : isEn ? "Can we keep the fish?" : "Possiamo tenere il pescato?",
        answer: isEs
          ? "Sí, solo cuando ley, tallas, especies, cupos y autorizaciones lo permiten. En los demás casos se practica catch and release."
          : isFr
            ? "Oui, seulement lorsque loi, tailles, espèces, quotas et autorisations le permettent. Sinon, catch and release."
            : isDe
              ? "Ja, nur wenn Gesetz, Mindestmaße, Arten, Quoten und Genehmigungen es erlauben. Sonst Catch and Release."
              : isEn
                ? "Yes, only when law, sizes, species, quotas and authorisations allow it. Otherwise catch and release is used."
                : "Sì, solo quando legge, taglie, specie, quote e autorizzazioni lo permettono. Altrimenti si pratica catch and release.",
      },
      {
        question: isEs ? "¿Qué técnicas se usan?" : isFr ? "Quelles techniques sont utilisées ?" : isDe ? "Welche Techniken werden genutzt?" : isEn ? "Which techniques are used?" : "Quali tecniche si usano?",
        answer: isEs
          ? "Pesca de fondo, curricán, drifting y catch and release se eligen el mismo día según condiciones y decisión del patrón."
          : isFr
            ? "Pêche de fond, traîne, drifting et catch and release sont choisis le jour même selon les conditions et le skipper."
            : isDe
              ? "Grundangeln, Schleppangeln, Drifting und Catch and Release werden am Tag je nach Bedingungen und Skipper gewählt."
              : isEn
                ? "Bottom fishing, trolling, drifting and catch and release are chosen on the day according to conditions and skipper decision."
                : "Bolentino, traina, drifting e catch and release si scelgono in giornata secondo condizioni e decisione dello skipper.",
      },
    ],
  };
}

function getFishingEditorialCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return {
    eyebrow: isEs ? "Pesca deportiva Egadi" : isFr ? "Pêche sportive Égades" : isDe ? "Sportangeln Ägadische Inseln" : isEn ? "Egadi sport fishing" : "Pesca sportiva Egadi",
    title: isEs
      ? "Una jornada técnica para quien ama pescar de verdad"
      : isFr
        ? "Une journée technique pour ceux qui aiment vraiment pêcher"
        : isDe
          ? "Ein technischer Tag für echte Angelbegeisterte"
          : isEn
            ? "A technical day for people who really love fishing"
            : "Una giornata tecnica per chi ama davvero pescare",
    paragraphs: isEs
      ? [
          "El charter de pesca en las Islas Egadi está pensado para aficionados que quieren una salida privada, equipo profesional y una tripulación capaz de leer mar, temporada y normativa.",
          "La jornada combina pesca de fondo, curricán, drifting o catch and release según condiciones reales. No se prometen capturas: se promete una experiencia técnica, seria y respetuosa.",
          "El pescado puede soltarse o conservarse solo cuando la ley, las tallas, los cupos y las autorizaciones lo permiten. La decisión final operativa queda siempre al patrón.",
        ]
      : isFr
        ? [
            "Le charter de pêche aux îles Égades est conçu pour les passionnés qui veulent une sortie privée, du matériel professionnel et un équipage capable de lire la mer, la saison et la réglementation.",
            "La journée combine pêche de fond, traîne, drifting ou catch and release selon les conditions réelles. Aucune prise n'est promise : l'expérience est technique, sérieuse et respectueuse.",
            "Le poisson peut être relâché ou gardé uniquement lorsque loi, tailles, quotas et autorisations le permettent. La décision opérationnelle finale appartient toujours au skipper.",
          ]
        : isDe
          ? [
              "Der Angelcharter auf den Ägadischen Inseln ist für Enthusiasten gedacht, die eine private Ausfahrt, professionelle Ausrüstung und eine Crew suchen, die Meer, Saison und Regeln lesen kann.",
              "Der Tag kombiniert Grundangeln, Schleppangeln, Drifting oder Catch and Release je nach echten Bedingungen. Es wird kein Fang versprochen: Versprochen wird ein technisches und respektvolles Erlebnis.",
              "Fisch darf nur behalten oder freigelassen werden, wenn Gesetz, Mindestmaße, Quoten und Genehmigungen es erlauben. Die endgültige operative Entscheidung liegt immer beim Skipper.",
            ]
          : isEn
            ? [
                "The Egadi fishing charter is designed for enthusiasts who want a private outing, professional gear and a crew able to read the sea, the season and the rules.",
                "The day can combine bottom fishing, trolling, drifting or catch and release according to real conditions. No catch is promised: the promise is a technical, serious and respectful experience.",
                "Fish can be released or kept only when law, sizes, quotas and authorisations allow it. The final operational decision always belongs to the skipper.",
              ]
            : [
                "Il charter di pesca alle Isole Egadi è pensato per appassionati che vogliono un'uscita privata, attrezzatura professionale e una crew capace di leggere mare, stagione e normativa.",
                "La giornata può combinare bolentino, traina, drifting o catch and release secondo condizioni reali. Non si promette la cattura: si promette un'esperienza tecnica, seria e rispettosa.",
                "Il pesce può essere rilasciato o trattenuto solo quando legge, taglie, quote e autorizzazioni lo permettono. La decisione operativa finale resta sempre allo skipper.",
              ],
  };
}

function getDetailCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string },
) {
  if (isFishingService(service)) return getFishingDetailCopy(locale);

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isHalfDay = service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

  if (isDe) {
    const experienceLabel = isCharter
      ? "Privater Charter"
      : isPrivateBoat
        ? "Private Bootstour zu den Ägadischen Inseln"
        : isSharedBoat
          ? "Geteilte Bootstour zu den Ägadischen Inseln"
          : "Bootserlebnis auf den Ägadischen Inseln";
    const routeText = isCharter
      ? "Favignana, Levanzo und Marettimo werden nach Wind, Meer und gewünschtem Bordrhythmus geplant."
      : isFullDay
        ? "Acht Stunden geben Raum für Favignana und Levanzo, mit Buchten und Zeiten passend zu den Bedingungen."
        : isHalfDay
          ? "Vier Stunden konzentrieren sich auf die am besten geschützten Gewässer des Tages, mit klarer Rückkehr."
          : "Die Crew wählt die besten Buchten zum Baden, Schnorcheln und entspannten Navigieren.";
    const formulaText = isCharter
      ? "Privater Trimaran-Charter mit Skipper, Kabinen und Route, die Tag für Tag entsteht."
      : isPrivateBoat
        ? "Das Boot ist für Ihre Gruppe reserviert; Stopps und Rhythmus werden mit dem Skipper abgestimmt."
        : isSharedBoat
          ? "Sie buchen einzelne Plätze und teilen das Erlebnis mit anderen Gästen."
          : "Privater Premium-Tag auf dem Trimaran mit Chef, Skipper und Hostess.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nächte vor Anker", text: "Wachen Sie nahe geschützter Buchten auf und passen Sie jeden Tag ohne Eile an." },
          { title: "Favignana, Levanzo, Marettimo", text: "Die Inseln werden nach Wind, Meer und Charterdauer gewählt." },
          { title: "Leben an Bord", text: "Kabinen, Küche und Gemeinschaftsflächen machen den Trimaran zu einem schwimmenden Zuhause." },
        ]
      : isFullDay
        ? [
            { title: "Mehr Zeit im Wasser", text: "Acht Stunden geben mehr Spielraum für Buchten, Baden und Schnorcheln." },
            { title: "Favignana und Levanzo", text: "Die Crew kann zwischen beiden Inseln arbeiten, wenn das Meer es erlaubt." },
            { title: "Entspannte Rückfahrt", text: "Der letzte Abschnitt hält den Tag ruhig, mit wechselndem Licht Richtung Trapani." },
          ]
        : [
            { title: "Klarer Zeitplan", text: "Ein kompaktes Zeitfenster für Meer, Baden und eine präzise Rückkehr." },
            { title: "Geschützte Buchten", text: "Der Skipper wählt die sichersten und klarsten Gewässer, die in einem halben Tag erreichbar sind." },
            { title: "Panoramafahrt", text: "Genug Zeit, um die Ägadischen Inseln auch bei einer kurzen Ausfahrt vom Meer aus zu spüren." },
          ];
    const faqs = [
      {
        question: "Wo startet die Bootstour?",
        answer:
          "Die Abfahrt erfolgt ab Trapani. Der übliche Treffpunkt ist Via dei Gladioli 15, 91100 Trapani, sofern die Crew nichts anderes mitteilt.",
      },
      {
        question: "Ist die Route fest?",
        answer:
          "Nein. Der Skipper wählt die sicherste und angenehmste Route nach Wind, Meer, Auslastung und verfügbarer Zeit.",
      },
      {
        question: "Ist das Erlebnis geteilt oder privat?",
        answer: `${formulaText} Das genaue Format sehen Sie im Titel und im Buchungsbereich, bevor Sie ein Datum wählen.`,
      },
      {
        question: "Was sollte ich an Bord mitbringen?",
        answer:
          "Badekleidung, Handtuch, Sonnenschutz, Sonnenbrille, Hut und eine weiche Tasche, die sich leicht verstauen lässt.",
      },
      {
        question: "Was passiert, wenn das Meer nicht geeignet ist?",
        answer:
          "Die Crew prüft die Bedingungen vor der Abfahrt und stellt Sicherheit immer an erste Stelle. Falls nötig, wird die Route angepasst oder es werden verfügbare operative Optionen vorgeschlagen.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "Das Erlebnis",
      overviewEyebrow: "Warum es passt",
      bookingTitle: "Dieses Erlebnis planen",
      bookingText: "Wählen Sie das Datum und fahren Sie mit aktuellen Preisen und Verfügbarkeiten zur Buchung fort.",
      galleryTitle: "Ein Eindruck an Bord",
      usefulInfo: "Nützliche Informationen",
      routeTitle: isCharter ? "Route Tag für Tag" : isFullDay ? "Ganztagesroute" : isHalfDay ? "Kompakte Route" : "Route nach Seebedingungen",
      routeText,
      onboardTitle: isCharter ? "Leben an Bord" : isPrivateBoat ? "Reserviertes Boot" : isSharedBoat ? "Geteilte Plätze" : "Crew und Komfort",
      onboardText: isCharter
        ? "Kabinen, Gemeinschaftsflächen und Küche machen den Trimaran zu einem kleinen Zuhause auf dem Meer."
        : isPrivateBoat
          ? "Das Boot ist Ihrer Gruppe gewidmet, daher werden Stopps und Rhythmus mit dem Skipper gestaltet."
          : isSharedBoat
            ? "Sie buchen Ihre Plätze und teilen die Route mit anderen Gästen, einfach und zugänglich."
            : "Skipper und Bordservice halten den Tag von der Abfahrt bis zur Rückkehr flüssig.",
      rhythmTitle: isCharter ? "Langsame Tage" : isFullDay ? "Zeit zum Bleiben" : isHalfDay ? "Essentieller halber Tag" : "Leichter Rhythmus",
      rhythmText: isCharter
        ? "Schlafen Sie nahe geschützter Buchten, wachen Sie am Wasser auf und passen Sie das Programm ohne Eile an."
        : isFullDay
          ? "Ein längeres Zeitfenster bedeutet mehr Zeit im Wasser, mehr Flexibilität und weniger Druck zwischen den Stopps."
          : isHalfDay
            ? "Ein kurzes, fokussiertes Erlebnis für Gäste, die Meer, Baden und klare Zeiten wünschen."
            : "Badestopps, Zeit vor Anker und eine klare Rückkehr halten das Erlebnis ausgewogen.",
      priceHeader: isCharter ? "Paketpreis" : "Preis",
      charterType: "Charterpaket",
      daysLabel: (days: number) => `${days} Tage`,
      bookNow: "Jetzt buchen",
      practicalEyebrow: "Vor der Buchung",
      practicalTitle: "Praktische Details",
      practicalItems: [
        { icon: Anchor, title: "Abfahrt ab Trapani", text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Dauer",
          text: isCharter
            ? "3 bis 7 Tage, vor der Abfahrt geplant."
            : isFullDay
              ? "8 Stunden."
              : isHalfDay
                ? "4 Stunden."
                : "Dauer wie in der Erlebnisbeschreibung angegeben.",
        },
        { icon: Compass, title: "Route", text: routeText },
        { icon: Users, title: "Format und Kapazität", text: formulaText },
      ],
      whatYouSeeTitle: "Was Sie an Bord erleben",
      whatYouSeeIntro: "Mehr Kontext, damit Sie vor der Buchung das passende Erlebnis wählen.",
      whatYouSeeItems,
      faqTitle: "Fragen zu diesem Erlebnis",
      faqs,
    };
  }

  if (isFr) {
    const experienceLabel = isCharter
      ? "Charter privé"
      : isPrivateBoat
        ? "Excursion privée aux Égades"
        : isSharedBoat
          ? "Excursion partagée aux Égades"
          : "Expérience en bateau aux Égades";
    const routeText = isCharter
      ? "Favignana, Levanzo et Marettimo sont planifiées selon le vent, la mer et le rythme souhaité à bord."
      : isFullDay
        ? "Huit heures permettent de naviguer entre Favignana et Levanzo, en adaptant criques et horaires aux conditions."
        : isHalfDay
          ? "Quatre heures concentrées sur les eaux les plus protégées du jour, avec un retour clair et sans précipitation."
          : "L'équipage choisit les meilleures baies pour se baigner, faire du snorkeling et naviguer tranquillement.";
    const formulaText = isCharter
      ? "Charter privé en trimaran avec skipper, cabines et route construite jour après jour."
      : isPrivateBoat
        ? "Le bateau est réservé à votre groupe, avec arrêts et rythme définis avec le skipper."
        : isSharedBoat
          ? "Vous réservez des places individuelles et partagez l'expérience avec d'autres hôtes."
          : "Journée privée premium en trimaran avec chef, skipper et hôtesse.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nuits au mouillage", text: "Réveillez-vous près de criques protégées et adaptez chaque journée sans courir." },
          { title: "Favignana, Levanzo, Marettimo", text: "Les îles sont choisies selon le vent, la mer et la durée du charter." },
          { title: "Vie à bord", text: "Cabines, cuisine et espaces communs transforment le trimaran en maison flottante." },
        ]
      : isFullDay
        ? [
            { title: "Plus de temps dans l'eau", text: "Huit heures donnent plus de marge pour les criques, la baignade et le snorkeling." },
            { title: "Favignana et Levanzo", text: "L'équipage peut travailler entre les deux îles lorsque la mer le permet." },
            { title: "Retour détendu", text: "Le dernier tronçon garde la journée calme, avec la lumière changeante vers Trapani." },
          ]
        : [
            { title: "Horaire clair", text: "Une plage compacte pour ceux qui veulent mer, baignade et retour précis." },
            { title: "Criques protégées", text: "Le skipper choisit les eaux les plus sûres et claires accessibles en demi-journée." },
            { title: "Navigation panoramique", text: "Assez de temps pour sentir les Égades depuis la mer, même sur une sortie courte." },
          ];
    const faqs = [
      {
        question: "D'où part l'excursion ?",
        answer:
          "Le départ se fait depuis Trapani. Le point de rencontre habituel est Via dei Gladioli 15, 91100 Trapani, sauf indication opérationnelle différente de l'équipage.",
      },
      {
        question: "La route est-elle fixe ?",
        answer:
          "Non. Le skipper choisit la route la plus sûre et agréable selon le vent, la mer, l'affluence et le temps disponible.",
      },
      {
        question: "L'expérience est-elle partagée ou privée ?",
        answer: `${formulaText} Vous pouvez vérifier le format exact dans le titre et le panneau de réservation avant de choisir la date.`,
      },
      {
        question: "Que faut-il apporter à bord ?",
        answer:
          "Maillot, serviette, crème solaire, lunettes de soleil, chapeau et sac souple facile à ranger.",
      },
      {
        question: "Que se passe-t-il si la mer n'est pas adaptée ?",
        answer:
          "L'équipage vérifie les conditions avant le départ et privilégie toujours la sécurité. Si nécessaire, la route est adaptée ou les options opérationnelles disponibles sont proposées.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "L'expérience",
      overviewEyebrow: "Pourquoi la choisir",
      bookingTitle: "Planifier cette expérience",
      bookingText: "Choisissez la date et continuez vers la réservation avec prix et disponibilités à jour.",
      galleryTitle: "Un aperçu à bord",
      usefulInfo: "Informations utiles",
      routeTitle: isCharter ? "Route construite jour après jour" : isFullDay ? "Route de journée complète" : isHalfDay ? "Route compacte" : "Route selon la mer",
      routeText,
      onboardTitle: isCharter ? "Vie à bord" : isPrivateBoat ? "Bateau réservé" : isSharedBoat ? "Places partagées" : "Équipage et confort",
      onboardText: isCharter
        ? "Cabines, espaces communs et cuisine transforment le trimaran en petite maison sur la mer."
        : isPrivateBoat
          ? "Le bateau est dédié à votre groupe, donc les arrêts et le rythme se construisent avec le skipper."
          : isSharedBoat
            ? "Réservez vos places et partagez la route avec d'autres hôtes, avec une formule simple et accessible."
            : "Skipper et services à bord gardent la journée fluide du départ au retour.",
      rhythmTitle: isCharter ? "Jours lents" : isFullDay ? "Temps pour rester" : isHalfDay ? "Demi-journée essentielle" : "Rythme facile",
      rhythmText: isCharter
        ? "Dormez près de baies protégées, réveillez-vous au bord de l'eau et ajustez le programme sans vous presser."
        : isFullDay
          ? "Un créneau plus long signifie plus de temps dans l'eau, plus de flexibilité et moins de pression entre les arrêts."
          : isHalfDay
            ? "Une expérience courte et ciblée pour ceux qui veulent mer, baignade et horaires clairs."
            : "Arrêts baignade, temps au mouillage et retour clair gardent l'expérience équilibrée.",
      priceHeader: isCharter ? "Prix du forfait" : "Prix",
      charterType: "Forfait charter",
      daysLabel: (days: number) => `${days} jours`,
      bookNow: "Réserver",
      practicalEyebrow: "Avant de réserver",
      practicalTitle: "Détails pratiques",
      practicalItems: [
        { icon: Anchor, title: "Départ de Trapani", text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Durée",
          text: isCharter
            ? "De 3 à 7 jours, planifiés avant le départ."
            : isFullDay
              ? "8 heures."
              : isHalfDay
                ? "4 heures."
                : "Durée indiquée dans la fiche de l'expérience.",
        },
        { icon: Compass, title: "Route", text: routeText },
        { icon: Users, title: "Format et capacité", text: formulaText },
      ],
      whatYouSeeTitle: "Ce que vous vivrez à bord",
      whatYouSeeIntro: "Plus de contexte pour choisir la bonne expérience avant de réserver.",
      whatYouSeeItems,
      faqTitle: "Questions sur cette expérience",
      faqs,
    };
  }

  if (isEs) {
    const experienceLabel = isCharter
      ? "Charter privado"
      : isPrivateBoat
        ? "Excursión privada por las Egadi"
        : isSharedBoat
          ? "Excursión compartida por las Egadi"
          : "Experiencia en barco por las Egadi";
    const routeText = isCharter
      ? "Favignana, Levanzo y Marettimo se planifican según viento, mar y el ritmo que quieras a bordo."
      : isFullDay
        ? "Ocho horas permiten trabajar entre Favignana y Levanzo, adaptando calas y tiempos a las condiciones."
        : isHalfDay
          ? "Cuatro horas concentradas en las aguas más protegidas del día, con regreso claro y sin prisas."
          : "La tripulación elige las mejores bahías para bañarse, hacer snorkel y navegar con calma.";
    const formulaText = isCharter
      ? "Charter privado en trimarán con patrón, camarotes y ruta construida día a día."
      : isPrivateBoat
        ? "El barco queda reservado para tu grupo, con paradas y ritmo acordados con el patrón."
        : isSharedBoat
          ? "Reservas plazas individuales y compartes la experiencia con otros huéspedes."
	          : "Jornada privada premium en trimarán con chef, patrón y azafata.";
    const whatYouSeeItems = isCharter
      ? [
	          { title: "Noches al fondeo", text: "Despiértate cerca de calas protegidas y adapta cada día sin prisas." },
          { title: "Favignana, Levanzo, Marettimo", text: "Las islas se eligen según viento, mar y duración del charter." },
          { title: "Vida a bordo", text: "Camarotes, cocina y zonas comunes convierten el trimarán en una casa flotante." },
        ]
      : isFullDay
        ? [
            { title: "Más tiempo en el agua", text: "Ocho horas dan más margen para calas, baño y snorkel." },
            { title: "Favignana y Levanzo", text: "La tripulación puede trabajar entre ambas islas cuando el mar lo permite." },
            { title: "Regreso relajado", text: "El último tramo mantiene el día tranquilo, con luz cambiante de vuelta a Trapani." },
          ]
        : [
            { title: "Horario claro", text: "Una franja compacta para quienes quieren mar, baño y regreso preciso." },
            { title: "Calas protegidas", text: "El patrón elige las aguas más seguras y limpias alcanzables en medio día." },
            { title: "Navegación panorámica", text: "Tiempo suficiente para sentir las Egadi desde el mar incluso en una salida breve." },
          ];
    const faqs = [
      {
        question: "¿Desde dónde sale la excursión?",
        answer:
          "La salida es desde Trapani. El punto de encuentro habitual es Via dei Gladioli 15, 91100 Trapani, salvo indicación operativa distinta de la tripulación.",
      },
      {
        question: "¿La ruta es fija?",
        answer:
          "No. El patrón elige la ruta más segura y agradable según viento, mar, afluencia y tiempo disponible.",
      },
      {
        question: "¿Es una experiencia compartida o privada?",
        answer: `${formulaText} Puedes comprobar el formato exacto en el título y en el panel de reserva antes de elegir la fecha.`,
      },
      {
        question: "¿Qué debo llevar a bordo?",
        answer:
          "Bañador, toalla, protector solar, gafas de sol, sombrero y una bolsa blanda fácil de guardar.",
      },
      {
        question: "¿Qué pasa si el mar no es adecuado?",
        answer:
          "La tripulación revisa las condiciones antes de salir y prioriza siempre la seguridad. Si hace falta, se adapta la ruta o se proponen las opciones operativas disponibles.",
      },
    ];

    return {
      experienceLabel,
      overviewTitle: "La experiencia",
      overviewEyebrow: "Por qué elegirla",
      bookingTitle: "Planifica esta experiencia",
      bookingText: "Elige la fecha y continúa al proceso de reserva con precios y disponibilidad actualizados.",
      galleryTitle: "Un vistazo a bordo",
      usefulInfo: "Información útil",
      routeTitle: isCharter ? "Ruta construida día a día" : isFullDay ? "Ruta de día completo" : isHalfDay ? "Ruta compacta" : "Ruta según el mar",
      routeText,
      onboardTitle: isCharter ? "Vida a bordo" : isPrivateBoat ? "Barco reservado" : isSharedBoat ? "Plazas compartidas" : "Tripulación y confort",
      onboardText: isCharter
        ? "Camarotes, zonas comunes y cocina convierten el trimarán en una pequeña casa sobre el mar."
        : isPrivateBoat
          ? "El barco está dedicado a tu grupo, así que las paradas y el ritmo se ajustan con el patrón."
          : isSharedBoat
            ? "Reserva tus plazas y comparte la ruta con otros huéspedes, con una fórmula sencilla y accesible."
            : "Patrón y servicios a bordo mantienen la jornada fluida desde la salida hasta el regreso.",
      rhythmTitle: isCharter ? "Días lentos" : isFullDay ? "Tiempo para quedarse" : isHalfDay ? "Medio día esencial" : "Ritmo fácil",
      rhythmText: isCharter
        ? "Duerme cerca de bahías protegidas, despiértate junto al agua y ajusta el plan sin prisas."
        : isFullDay
          ? "Una franja más larga significa más tiempo en el agua, más flexibilidad y menos presión entre paradas."
          : isHalfDay
            ? "Una experiencia corta y enfocada para quienes quieren mar, baño y horarios claros."
	            : "Paradas de baño, tiempo al fondeo y regreso claro mantienen la experiencia equilibrada.",
      priceHeader: isCharter ? "Precio del paquete" : "Precio",
      charterType: "Paquete charter",
      daysLabel: (days: number) => `${days} días`,
      bookNow: "Reservar ahora",
      practicalEyebrow: "Antes de reservar",
      practicalTitle: "Detalles prácticos",
      practicalItems: [
        { icon: Anchor, title: "Salida desde Trapani", text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani." },
        {
          icon: Clock,
          title: "Duración",
          text: isCharter
            ? "De 3 a 7 días, planificados antes de la salida."
            : isFullDay
              ? "8 horas."
              : isHalfDay
                ? "4 horas."
                : "Duración indicada en la ficha de la experiencia.",
        },
        { icon: Compass, title: "Ruta", text: routeText },
        {
          icon: Users,
          title: "Formato y capacidad",
          text: formulaText,
        },
      ],
      whatYouSeeTitle: "Qué vivirás a bordo",
      whatYouSeeIntro: "Más contexto para elegir la experiencia adecuada antes de reservar.",
      whatYouSeeItems,
      faqTitle: "Preguntas sobre esta experiencia",
      faqs,
    };
  }

  return {
    experienceLabel: isCharter
      ? isEn
        ? "Private charter"
        : "Charter privato"
      : isPrivateBoat
        ? isEn
          ? "Private Egadi boat tour"
          : "Tour privato alle Egadi"
        : isSharedBoat
          ? isEn
            ? "Shared Egadi boat tour"
            : "Tour condiviso alle Egadi"
      : isEn
        ? "Egadi boat experience"
        : "Esperienza in barca alle Egadi",
	    overviewTitle: isEn ? "The experience" : "L'esperienza",
    overviewEyebrow: isEn ? "What makes it special" : "Perché sceglierla",
    bookingTitle: isEn ? "Plan this experience" : "Organizza questa esperienza",
    bookingText: isEn
      ? "Choose your date and continue to the booking flow with live prices and availability."
      : "Scegli la data e continua nel flusso di prenotazione con prezzi e disponibilità aggiornati.",
    galleryTitle: isEn ? "A glimpse on board" : "A bordo, in breve",
    usefulInfo: isEn ? "Useful info" : "Info utili",
    routeTitle: isCharter
      ? isEn
        ? "Route built day by day"
        : "Rotta costruita giorno per giorno"
      : isFullDay
        ? isEn
          ? "Full-day route"
          : "Rotta giornata intera"
        : isHalfDay
          ? isEn
            ? "Compact sea route"
            : "Rotta compatta"
      : isEn
        ? "Weather-aware route"
        : "Rotta scelta con il mare",
    routeText: isCharter
      ? isEn
        ? "Favignana, Levanzo and Marettimo are planned around wind, sea and the pace you want on board."
        : "Favignana, Levanzo e Marettimo vengono pianificate in base a vento, mare e ritmo che vuoi a bordo."
      : isFullDay
        ? isEn
          ? "Eight hours allow the crew to work between Favignana and Levanzo, adapting coves and timings to the conditions."
          : "Otto ore permettono alla crew di lavorare tra Favignana e Levanzo, adattando cale e tempi alle condizioni."
        : isHalfDay
          ? isEn
            ? "Four hours focus on the best sheltered waters of the day, with a clear return schedule."
            : "Quattro ore concentrate sulle acque più riparate della giornata, con rientro chiaro e senza corse."
      : isEn
        ? "The crew chooses the best bays for swimming, snorkelling and relaxed navigation."
        : "La crew sceglie le baie migliori per bagno, snorkeling e navigazione leggera.",
    onboardTitle: isCharter
      ? isEn
        ? "Life on board"
        : "Vita a bordo"
      : isPrivateBoat
        ? isEn
          ? "Reserved boat"
          : "Barca riservata"
        : isSharedBoat
          ? isEn
            ? "Shared seats"
            : "Posti condivisi"
      : isEn
        ? "Crew and comfort"
        : "Crew e comfort",
    onboardText: isCharter
      ? isEn
        ? "Cabins, shared spaces and galley make the trimaran a small floating home."
        : "Cabine, spazi comuni e cucina trasformano il trimarano in una piccola casa sul mare."
      : isPrivateBoat
        ? isEn
          ? "The boat is dedicated to your group, so stops and pace can be shaped with the skipper."
          : "La barca è dedicata al tuo gruppo, quindi soste e ritmo si costruiscono con lo skipper."
        : isSharedBoat
          ? isEn
            ? "Book your places and share the route with other guests, keeping the day simple and accessible."
            : "Prenoti i posti e condividi la rotta con altri ospiti, con una formula semplice e accessibile."
      : isEn
        ? "Skipper and on-board services keep the day smooth from departure to return."
        : "Skipper e servizi a bordo tengono la giornata fluida dalla partenza al rientro.",
    rhythmTitle: isCharter
      ? isEn
        ? "Slow days"
        : "Giorni lenti"
      : isFullDay
        ? isEn
          ? "Time to stay"
          : "Tempo per restare"
        : isHalfDay
          ? isEn
            ? "Essential half day"
            : "Mezza giornata essenziale"
      : isEn
        ? "Easy rhythm"
        : "Ritmo leggero",
    rhythmText: isCharter
      ? isEn
        ? "Sleep near sheltered bays, wake up by the water and adjust the plan without rushing."
        : "Dormi vicino alle baie, ti svegli sull'acqua e moduli il programma senza fretta."
      : isFullDay
        ? isEn
          ? "A longer slot means more swim time, more flexibility and less pressure between stops."
          : "Una fascia più lunga significa più tempo in acqua, più flessibilità e meno pressione tra le soste."
        : isHalfDay
          ? isEn
            ? "A short, focused experience for guests who want sea, swimming and a clean schedule."
            : "Un'esperienza breve e mirata per chi vuole mare, bagno e orari puliti."
      : isEn
        ? "Swim stops, time at anchor and a clear return schedule keep the experience balanced."
        : "Soste bagno, tempo in rada e rientro chiaro mantengono l'esperienza equilibrata.",
    priceHeader: isCharter ? (isEn ? "Package price" : "Prezzo pacchetto") : isEn ? "Price" : "Prezzo",
    charterType: isEn ? "Charter package" : "Pacchetto charter",
    daysLabel: (days: number) => (isEn ? `${days} days` : `${days} giornate`),
    bookNow: isEn ? "Book now" : "Prenota ora",
  };
}

function getSeoExpansionCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string; durationHours: number; capacityMax: number },
  durationText: string,
  boatTitle?: string,
) {
  if (isFishingService(service)) {
    return getFishingSeoExpansionCopy(locale, durationText, boatTitle, service.capacityMax);
  }

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

  if (isDe) {
    const routeText = isCharter
      ? "Favignana, Levanzo und Marettimo können über mehrere Tage kombiniert werden, immer nach Seewetter."
      : isFullDay
        ? "Der ganze Tag lässt Raum für Favignana, Levanzo, Badestopps und entspannte Zeit vor Anker."
        : isHalfDay
          ? "Der halbe Tag konzentriert sich auf die am besten geschützten Buchten zwischen Favignana und Levanzo."
          : "Die Crew plant die Route zwischen den schönsten und geschütztesten Buchten der Ägadischen Inseln.";
    const formulaText = isCharter
      ? "Privater Trimaran-Charter mit Skipper, Kabinen und Route Tag für Tag."
      : isPrivateBoat
        ? "Das Boot ist für Ihre Gruppe reserviert, mit Stopps und Rhythmus nach Absprache mit dem Skipper."
        : isSharedBoat
          ? "Sie buchen einzelne Plätze und teilen das Erlebnis mit anderen Gästen."
          : isGourmet
            ? "Privater Premium-Tag auf dem Trimaran mit Chef, Skipper und Hostess."
            : "Ein sorgfältig kuratiertes Erlebnis auf den Ägadischen Inseln mit professioneller Crew.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nächte vor Anker", text: "Wachen Sie nahe geschützter Buchten auf und passen Sie jeden Tag ohne Eile an." },
          { title: "Favignana, Levanzo, Marettimo", text: "Die Inseln werden nach Wind, Meer und Charterdauer gewählt." },
          { title: "Leben an Bord", text: "Kabinen, Küche und Gemeinschaftsflächen machen den Trimaran zu einem kleinen schwimmenden Zuhause." },
        ]
      : isFullDay
        ? [
            { title: "Mehr Zeit im Wasser", text: "Acht Stunden bedeuten weniger Druck zwischen den Buchten und mehr Zeit zum Schnorcheln." },
            { title: "Favignana und Levanzo", text: "Die Crew kann zwischen beiden Inseln arbeiten, wenn die Seebedingungen es erlauben." },
            { title: "Sanfte Rückfahrt", text: "Der letzte Abschnitt hält den Tag entspannt, mit wechselndem Licht auf dem Rückweg." },
          ]
        : [
            { title: "Klarer Zeitplan", text: "Ein kompaktes Zeitfenster für alle, die Meer, Baden und eine präzise Rückkehr wünschen." },
            { title: "Geschützte Buchten", text: "Der Skipper wählt die sichersten und klarsten Gewässer, die in einem halben Tag erreichbar sind." },
            { title: "Panoramafahrt", text: "Genug Zeit, um die Ägadischen Inseln auch bei einer kurzen Ausfahrt vom Wasser aus zu erleben." },
          ];
    const faqs = [
      {
        question: isCharter ? "Wie lange kann der Charter dauern?" : "Wo startet die Tour?",
        answer: isCharter
          ? "Der Charter auf den Ägadischen Inseln kann von 3 bis 7 Tagen geplant werden. Die endgültige Route wird mit dem Skipper bestätigt und an Wind, Meer und gewünschten Rhythmus angepasst."
          : "Die Tour startet in Trapani. Der übliche Treffpunkt ist Via dei Gladioli 15, 91100 Trapani, sofern die Crew nichts anderes mitteilt.",
      },
      {
        question: "Können wir die Route wählen?",
        answer:
          "Ja, die Route wird vor der Abfahrt mit der Crew besprochen. Der Skipper behält die notwendige Flexibilität, um die sichersten und angenehmsten Buchten des Tages zu wählen.",
      },
      {
        question: "Was ist enthalten?",
        answer: `${formulaText} Auf der Seite finden Sie außerdem Dauer, Kapazität, Preis und Hinweise dazu, was Sie an Bord mitbringen sollten.`,
      },
      {
        question: "Ist das Erlebnis für Kinder geeignet?",
        answer:
          "Ja, wenn das gewählte Format und die Seebedingungen passen. Für Familien bietet eine private Tour oft mehr Freiheit bei Zeiten und Pausen.",
      },
      {
        question: "Was passiert, wenn sich das Wetter ändert?",
        answer:
          "Die Route wird mit dem Skipper geprüft. Wenn die Bedingungen eine sichere Durchführung verhindern, teilt das Team die verfügbaren Optionen mit.",
      },
    ];

    return {
      practicalEyebrow: "Vor der Buchung",
      practicalTitle: "Praktische Details",
      practicalItems: [
        { icon: Anchor, title: "Abfahrt ab Trapani", text: "Treffpunkt: Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Dauer", text: isCharter ? "3 bis 7 Tage, vor der Abfahrt geplant." : durationText },
        { icon: Compass, title: "Route", text: routeText },
        {
          icon: Users,
          title: "Format und Kapazität",
          text: `${formulaText}${boatTitle ? ` Boot: ${boatTitle}.` : ""} Bis zu ${service.capacityMax} Gäste.`,
        },
      ],
      whatYouSeeTitle: "Was Sie an Bord erleben",
      whatYouSeeIntro: "Mehr Details, damit Sie vor der Buchung das richtige Erlebnis wählen.",
      whatYouSeeItems,
      faqTitle: "Fragen zu diesem Erlebnis",
      faqs,
    };
  }

  if (isFr) {
    const routeText = isCharter
      ? "Favignana, Levanzo et Marettimo peuvent se combiner sur plusieurs jours, toujours selon la météo marine."
      : isFullDay
        ? "La journée complète laisse de la place pour Favignana, Levanzo, les baignades et du temps détendu au mouillage."
        : isHalfDay
          ? "La demi-journée se concentre sur les criques les plus protégées entre Favignana et Levanzo."
          : "L'équipage planifie la route entre les baies les plus belles et protégées des Égades.";
    const formulaText = isCharter
      ? "Charter privé en trimaran avec skipper, cabines et route jour après jour."
      : isPrivateBoat
        ? "Le bateau est réservé à votre groupe, avec arrêts et rythme définis avec le skipper."
        : isSharedBoat
          ? "Vous réservez des places individuelles et partagez l'expérience avec d'autres hôtes."
          : isGourmet
            ? "Journée privée premium en trimaran avec chef, skipper et hôtesse."
            : "Une expérience soignée aux Égades avec équipage professionnel.";
    const whatYouSeeItems = isCharter
      ? [
          { title: "Nuits au mouillage", text: "Réveillez-vous près de baies protégées et ajustez chaque journée sans courir." },
          { title: "Favignana, Levanzo, Marettimo", text: "Les îles sont choisies selon le vent, la mer et la durée du charter." },
          { title: "Vie à bord", text: "Cabines, cuisine et espaces communs transforment le trimaran en petite maison flottante." },
        ]
      : isFullDay
        ? [
            { title: "Plus de temps dans l'eau", text: "Huit heures signifient moins de pression entre les criques et plus de temps pour le snorkeling." },
            { title: "Favignana et Levanzo", text: "L'équipage peut travailler entre les deux îles lorsque la mer le permet." },
            { title: "Retour doux", text: "Le dernier tronçon garde la journée détendue, avec lumière et vues changeantes au retour." },
          ]
        : [
            { title: "Horaire clair", text: "Une plage compacte pour ceux qui veulent mer, baignade et retour précis." },
            { title: "Criques protégées", text: "Le skipper choisit les eaux les plus sûres et claires accessibles en demi-journée." },
            { title: "Navigation panoramique", text: "Assez de temps pour sentir les Égades depuis l'eau, même sur une sortie courte." },
          ];
    const faqs = [
      {
        question: isCharter ? "Combien de temps peut durer le charter ?" : "D'où part le tour ?",
        answer: isCharter
          ? "Le charter aux îles Égades peut se planifier de 3 à 7 jours. La route finale est confirmée avec le skipper et adaptée au vent, à la mer et au rythme souhaité."
          : "Le tour part de Trapani. Le point habituel est Via dei Gladioli 15, 91100 Trapani, sauf communication opérationnelle différente.",
      },
      {
        question: "Peut-on choisir la route ?",
        answer:
          "Oui, elle se discute avec l'équipage avant le départ, mais le skipper garde la flexibilité nécessaire pour choisir les criques les plus sûres et agréables du jour.",
      },
      {
        question: "Qu'est-ce qui est inclus ?",
        answer: `${formulaText} La page indique aussi la durée, la capacité, le prix et ce qu'il faut apporter à bord.`,
      },
      {
        question: "Est-ce adapté aux enfants ?",
        answer:
          "Oui, lorsque le format choisi et les conditions de mer sont adaptés. Pour les familles, un tour privé offre souvent plus de liberté sur les horaires et les pauses.",
      },
      {
        question: "Que se passe-t-il si la météo change ?",
        answer:
          "La route est revue avec le skipper. Si les conditions empêchent de réaliser l'expérience en sécurité, l'équipe communique les options disponibles.",
      },
    ];

    return {
      practicalEyebrow: "Avant de réserver",
      practicalTitle: "Détails pratiques",
      practicalItems: [
        { icon: Anchor, title: "Départ de Trapani", text: "Point de rencontre : Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Durée", text: isCharter ? "De 3 à 7 jours, planifiés avant le départ." : durationText },
        { icon: Compass, title: "Route", text: routeText },
        {
          icon: Users,
          title: "Format et capacité",
          text: `${formulaText}${boatTitle ? ` Bateau : ${boatTitle}.` : ""} Jusqu'à ${service.capacityMax} hôtes.`,
        },
      ],
      whatYouSeeTitle: "Ce que vous vivrez à bord",
      whatYouSeeIntro: "Plus de détails pour choisir la bonne expérience avant de réserver.",
      whatYouSeeItems,
      faqTitle: "Questions sur cette expérience",
      faqs,
    };
  }

  if (isEs) {
    const routeText = isCharter
      ? "Favignana, Levanzo y Marettimo pueden combinarse en varios días, siempre según la meteorología."
      : isFullDay
	        ? "El día completo deja espacio para Favignana, Levanzo, baños y tiempo relajado al fondeo."
        : isHalfDay
          ? "El medio día se concentra en las calas más protegidas entre Favignana y Levanzo."
          : "La tripulación planifica la ruta entre las bahías más escénicas y protegidas de las Egadi.";
    const formulaText = isCharter
      ? "Charter privado en trimarán con patrón, camarotes y ruta día a día."
      : isPrivateBoat
        ? "El barco queda reservado para tu grupo, con paradas y ritmo definidos con el patrón."
        : isSharedBoat
          ? "Reservas plazas individuales y compartes la experiencia con otros huéspedes."
          : isGourmet
	            ? "Jornada privada premium en trimarán con chef, patrón y azafata."
            : "Una experiencia cuidada en las Egadi con tripulación profesional.";
    const whatYouSeeItems = isCharter
      ? [
	          { title: "Noches al fondeo", text: "Despiértate cerca de bahías protegidas y ajusta cada día sin prisas." },
          { title: "Favignana, Levanzo, Marettimo", text: "Las islas se eligen según viento, mar y duración del charter." },
          { title: "Vida a bordo", text: "Camarotes, cocina y zonas comunes convierten el trimarán en una pequeña casa flotante." },
        ]
      : isFullDay
        ? [
            { title: "Más tiempo en el agua", text: "Ocho horas significan menos presión entre calas y más tiempo para snorkel." },
            { title: "Favignana y Levanzo", text: "La tripulación puede trabajar entre ambas islas cuando el mar lo permite." },
            { title: "Regreso suave", text: "El último tramo mantiene la jornada relajada, con luz y vistas cambiando de vuelta." },
          ]
        : [
            { title: "Horario claro", text: "Una franja compacta para quien quiere mar, baño y un regreso preciso." },
            { title: "Calas protegidas", text: "El patrón elige las aguas más seguras y limpias alcanzables en medio día." },
            { title: "Navegación panorámica", text: "Tiempo suficiente para sentir las Egadi desde el agua, incluso en una salida breve." },
          ];
    const faqs = [
      {
        question: isCharter ? "¿Cuánto puede durar el charter?" : "¿Desde dónde sale el tour?",
        answer: isCharter
          ? "El charter por las Islas Egadi puede planificarse de 3 a 7 días. La ruta final se confirma con el patrón y se adapta a viento, mar y ritmo deseado."
          : "El tour sale desde Trapani. El punto habitual es Via dei Gladioli 15, 91100 Trapani, salvo comunicación operativa distinta.",
      },
      {
        question: "¿Podemos elegir la ruta?",
        answer:
          "Sí, se habla con la tripulación antes de salir, pero el patrón mantiene flexibilidad para elegir las calas más seguras y agradables del día.",
      },
      {
        question: "¿Qué incluye la experiencia?",
        answer: `${formulaText} En la página se indican también duración, capacidad, precio y qué llevar a bordo.`,
      },
      {
        question: "¿Es adecuada para niños?",
        answer:
          "Sí, cuando el formato elegido y las condiciones del mar son adecuados. Para familias, un tour privado suele ofrecer más libertad de horarios y pausas.",
      },
      {
        question: "¿Qué pasa si cambia el tiempo?",
        answer:
          "La ruta se revisa con el patrón. Si las condiciones impiden realizar la experiencia con seguridad, el equipo comunica las opciones disponibles.",
      },
    ];

    return {
      practicalEyebrow: "Antes de reservar",
      practicalTitle: "Detalles prácticos",
      practicalItems: [
        { icon: Anchor, title: "Salida desde Trapani", text: "Punto de encuentro: Via dei Gladioli 15, 91100 Trapani." },
        { icon: Clock, title: "Duración", text: isCharter ? "De 3 a 7 días, planificados antes de la salida." : durationText },
        { icon: Compass, title: "Ruta", text: routeText },
        {
          icon: Users,
          title: "Formato y capacidad",
          text: `${formulaText}${boatTitle ? ` Barco: ${boatTitle}.` : ""} Hasta ${service.capacityMax} huéspedes.`,
        },
      ],
      whatYouSeeTitle: "Qué vivirás a bordo",
      whatYouSeeIntro: "Más detalles para elegir la experiencia correcta antes de reservar.",
      whatYouSeeItems,
      faqTitle: "Preguntas sobre esta experiencia",
      faqs,
    };
  }

  const routeText = isCharter
    ? isEn
      ? "Favignana, Levanzo and Marettimo can be combined across several days, always according to the weather."
      : "Favignana, Levanzo e Marettimo possono entrare nella rotta su più giornate, sempre in base al meteo."
    : isFullDay
      ? isEn
        ? "The full day gives room for Favignana, Levanzo, swim stops and relaxed time at anchor."
        : "La giornata intera lascia spazio a Favignana, Levanzo, soste bagno e tempo in rada senza fretta."
      : isHalfDay
        ? isEn
          ? "The half day focuses on the best sheltered coves between Favignana and Levanzo."
          : "La mezza giornata si concentra sulle cale più riparate tra Favignana e Levanzo."
    : isEn
      ? "The crew plans the route between the most scenic and sheltered Egadi bays."
      : "La crew costruisce la rotta tra le baie più sceniche e riparate delle Egadi.";

  const formulaText = isCharter
    ? isEn
      ? "A private trimaran charter with skipper, cabins and a day-by-day route."
      : "Charter privato in trimarano con skipper, cabine e rotta costruita giorno per giorno."
    : isPrivateBoat
      ? isEn
        ? "The boat is reserved for your group, with stops and rhythm shaped with the skipper."
        : "La barca è riservata al tuo gruppo, con soste e ritmo concordati con lo skipper."
      : isSharedBoat
        ? isEn
          ? "Book individual seats and share the experience with other guests."
          : "Prenoti posti singoli e condividi l'esperienza con altri ospiti."
        : isGourmet
          ? isEn
            ? "A premium private trimaran day with chef, skipper and hostess."
            : "Giornata privata premium in trimarano con chef, skipper e hostess."
          : isEn
            ? "A curated Egadi experience with professional crew."
            : "Un'esperienza alle Egadi curata dalla crew professionale.";

  const whatYouSeeItems = isCharter
    ? [
        {
          title: isEn ? "Nights at anchor" : "Notti in rada",
          text: isEn
            ? "Wake up close to sheltered bays and adjust each day without rushing."
            : "Ti svegli vicino alle baie riparate e moduli ogni giornata senza fretta.",
        },
        {
          title: isEn ? "Favignana, Levanzo, Marettimo" : "Favignana, Levanzo, Marettimo",
          text: isEn
            ? "The islands are chosen according to wind, sea and the length of your charter."
            : "Le isole si scelgono in base a vento, mare e durata del charter.",
        },
        {
          title: isEn ? "Life on board" : "Vita a bordo",
          text: isEn
            ? "Cabins, galley and shared spaces make the trimaran a small floating home."
            : "Cabine, cucina e spazi comuni rendono il trimarano una piccola casa sul mare.",
        },
      ]
    : isFullDay
      ? [
          {
            title: isEn ? "More swim time" : "Più tempo in acqua",
            text: isEn
              ? "Eight hours mean less pressure between coves and more time for snorkelling."
              : "Otto ore significano meno pressione tra le cale e più tempo per snorkeling e bagno.",
          },
          {
            title: isEn ? "Favignana and Levanzo" : "Favignana e Levanzo",
            text: isEn
              ? "The crew can work across both islands when the sea conditions allow it."
              : "La crew può lavorare su entrambe le isole quando il mare lo permette.",
          },
          {
            title: isEn ? "Slow return" : "Rientro morbido",
            text: isEn
              ? "The last stretch keeps the day relaxed, with light and views changing on the way back."
              : "L'ultimo tratto resta rilassato, con luce e vista che cambiano durante il rientro.",
          },
        ]
      : [
          {
            title: isEn ? "Clear schedule" : "Orari chiari",
            text: isEn
              ? "A compact slot for guests who want sea, swimming and a precise return."
              : "Una fascia compatta per chi vuole mare, bagno e un rientro preciso.",
          },
          {
            title: isEn ? "Sheltered coves" : "Cale riparate",
            text: isEn
              ? "The skipper chooses the safest and clearest waters reachable in half a day."
              : "Lo skipper sceglie le acque più sicure e limpide raggiungibili in mezza giornata.",
          },
          {
            title: isEn ? "Scenic navigation" : "Navigazione panoramica",
            text: isEn
              ? "Enough route time to feel the Egadi from the water, even with a shorter experience."
              : "Abbastanza navigazione per sentire le Egadi dal mare, anche in un'esperienza breve.",
          },
        ];

  const faqs = isCharter
    ? [
        {
          question: isEn ? "How many days can the Egadi charter last?" : "Quanto può durare il charter alle Egadi?",
          answer: isEn
            ? "The Egadi charter can be planned from 3 to 7 days. The final route is confirmed with the skipper and adapted around wind, sea state, anchorage availability and the pace you want on board."
            : "Il charter alle Egadi può essere pianificato da 3 a 7 giornate. La rotta definitiva viene confermata con lo skipper e adattata a vento, stato del mare, disponibilità delle rade e ritmo che vuoi vivere a bordo.",
        },
        {
          question: isEn ? "Is provisioning included?" : "La cambusa è inclusa?",
          answer: isEn
            ? "Provisioning is not included in the charter package. Before departure the crew can help you organise the shopping list, pantry setup and any refills needed during the route between Favignana, Levanzo and Marettimo."
            : "La cambusa non è inclusa nel pacchetto charter. Prima della partenza la crew può aiutarti a organizzare lista spesa, dispensa iniziale ed eventuali refill durante la rotta tra Favignana, Levanzo e Marettimo.",
        },
        {
          question: isEn ? "Can we choose the route?" : "Possiamo scegliere la rotta?",
          answer: isEn
            ? "Yes. The itinerary is agreed with the skipper before departure and then adjusted day by day. This is important in the Egadi Islands because the best bay is not always the same: comfort, safety and sea clarity depend on the daily conditions."
            : "Sì. L'itinerario si concorda con lo skipper prima della partenza e poi viene aggiornato giorno per giorno. Alle Egadi è importante perché la baia migliore non è sempre la stessa: comfort, sicurezza e limpidezza dipendono dalle condizioni del giorno.",
        },
        {
          question: isEn ? "Where does boarding take place?" : "Dove avviene l'imbarco?",
          answer: isEn
            ? "Boarding is in Trapani, at Via dei Gladioli 15, 91100 Trapani, unless the crew confirms a different operational meeting point."
            : "L'imbarco è a Trapani, in Via dei Gladioli 15, 91100 Trapani, salvo diversa indicazione operativa della crew.",
        },
        {
          question: isEn ? "Can we sleep at anchor?" : "Si può dormire in rada?",
          answer: isEn
            ? "Yes, when weather and anchorage conditions allow it. Sleeping close to the islands is one of the strongest parts of an Egadi charter, but the skipper always chooses the safest and most sheltered option."
            : "Sì, quando meteo e condizioni della rada lo permettono. Dormire vicino alle isole è una delle parti più belle del charter alle Egadi, ma lo skipper sceglie sempre l'opzione più riparata e sicura.",
        },
        {
          question: isEn ? "Is the charter suitable for families?" : "Il charter è adatto alle famiglie?",
          answer: isEn
            ? "Yes, the trimaran works well for families and private groups that want space, shaded areas and a slower rhythm. Before confirming, the crew can help evaluate ages, needs and the most comfortable route length."
            : "Sì, il trimarano funziona bene per famiglie e gruppi privati che cercano spazio, zone d'ombra e un ritmo più lento. Prima della conferma la crew può valutare età, esigenze e durata di rotta più comoda.",
        },
        {
          question: isEn ? "What happens if the weather changes?" : "Cosa succede se cambia il meteo?",
          answer: isEn
            ? "The route is revised with the skipper. On a multi-day charter there is usually more flexibility to move the plan, choose sheltered anchorages and protect the quality of the experience."
            : "La rotta viene rivista con lo skipper. Su un charter di più giorni c'è in genere più flessibilità per spostare il programma, scegliere rade riparate e proteggere la qualità dell'esperienza.",
        },
      ]
    : isGourmet
      ? [
          {
            question: isEn ? "What is included in the Gourmet Experience?" : "Cosa include l'esperienza Gourmet?",
            answer: isEn
              ? "The Gourmet Experience includes skipper, hostess, private chef, lunch based on local fish and local products, fuel, aperitif, wine, water, soft drinks and snorkelling equipment."
              : "L'esperienza Gourmet include skipper, hostess, chef privato, pranzo a base di pesce locale e prodotti del territorio, carburante, aperitivo, vino, acqua, bevande e attrezzatura da snorkeling.",
          },
          {
            question: isEn ? "Which islands and coves are visited?" : "Quali isole e cale si visitano?",
            answer: isEn
              ? "The route is planned between Favignana and Levanzo according to sea and wind conditions. Check the itinerary on this page for more details about the usual stops."
              : "La rotta viene organizzata tra Favignana e Levanzo in base a mare e vento. Consulta l'itinerario in questa pagina per maggiori informazioni sulle soste previste.",
          },
          {
            question: isEn ? "Is the menu fixed?" : "Il menu è fisso?",
            answer: isEn
              ? "No. The menu changes according to the fresh catch and the local products available. You can view sample menus on this page to understand the style of the lunch served on board."
              : "No. Il menu varia in base al pescato fresco e ai prodotti locali disponibili. In questa pagina trovi alcuni menu di esempio per capire lo stile del pranzo servito a bordo.",
          },
          {
            question: isEn ? "Can allergies or intolerances be managed?" : "Si possono gestire allergie o intolleranze?",
            answer: isEn
              ? "Yes. Allergies, intolerances and important dietary needs must be communicated at least 48 hours before the experience, so the chef can organise the menu correctly."
              : "Sì. Allergie, intolleranze ed esigenze alimentari importanti devono essere comunicate almeno 48 ore prima dell'esperienza, così lo chef può organizzare correttamente il menu.",
          },
          {
            question: isEn ? "Are drinks included?" : "Le bevande sono incluse?",
            answer: isEn
              ? "Yes. Wine, soft drinks and water are included in the Gourmet Experience. Cocktails can be purchased separately on board."
              : "Sì. Vino, bevande analcoliche e acqua sono inclusi nell'esperienza Gourmet. I cocktail possono essere acquistati separatamente a bordo.",
          },
          {
            question: isEn ? "Is lunch served at anchor?" : "Il pranzo viene servito in rada?",
            answer: isEn
              ? "Yes. When sea and wind conditions allow it, lunch is served at anchor in a sheltered bay, with time to swim before or after the meal."
              : "Sì. Quando mare e vento lo permettono, il pranzo viene servito in rada in una baia riparata, con tempo per fare il bagno prima o dopo il pasto.",
          },
          {
            question: isEn ? "Is the Gourmet Experience private?" : "L'esperienza Gourmet è privata?",
            answer: isEn
              ? "Yes. The trimaran is reserved for your group, with skipper, hostess and private chef on board."
              : "Sì. Il trimarano è riservato al tuo gruppo, con skipper, hostess e chef privato a bordo.",
          },
          {
            question: isEn ? "How many people can join?" : "Quante persone possono partecipare?",
            answer: isEn
              ? "The Gourmet Experience can host up to 10 guests, keeping the day comfortable and the service on board curated."
              : "L'esperienza Gourmet può ospitare fino a un massimo di 10 persone, mantenendo la giornata comoda e il servizio a bordo curato.",
          },
          {
            question: isEn ? "What happens in case of bad weather?" : "Cosa succede in caso di maltempo?",
            answer: isEn
              ? "If conditions require it, the skipper changes the route to protect comfort and safety. In case of bad weather that prevents the experience from taking place, the refund is guaranteed."
              : "Se le condizioni lo richiedono, lo skipper cambia rotta per proteggere comfort e sicurezza. In caso di maltempo che impedisce lo svolgimento dell'esperienza, il rimborso è garantito.",
          },
          {
            question: isEn ? "Is it suitable for private events?" : "È adatta per eventi privati?",
            answer: isEn
              ? "Absolutely. The Gourmet Experience is often chosen for birthdays, proposals, anniversaries and private moments that need a more special setting on board."
              : "Assolutamente sì. L'esperienza Gourmet viene scelta spesso per compleanni, proposte, anniversari ed eventi privati che richiedono un contesto più speciale a bordo.",
          },
        ]
    : [
        {
          question: isEn ? "Where does the Egadi boat tour depart from?" : "Da dove parte il tour in barca alle Egadi?",
          answer: isEn
            ? "The Egadi boat tour departs from Trapani. The usual meeting point is Via dei Gladioli 15, 91100 Trapani, unless the crew sends a different operational update before departure."
            : "Il tour in barca alle Egadi parte da Trapani. Il punto di incontro abituale è Via dei Gladioli 15, 91100 Trapani, salvo diversa comunicazione operativa inviata dalla crew prima della partenza.",
        },
        {
          question: isEn ? "Is the route always fixed?" : "La rotta è sempre la stessa?",
          answer: isEn
            ? "No. The skipper chooses the safest and most enjoyable route according to wind, sea, crowding and the time available. Favignana, Levanzo and the most scenic coves are evaluated with the real conditions of the day."
            : "No. Lo skipper sceglie la rotta più sicura e piacevole in base a vento, mare, affollamento e tempo disponibile. Favignana, Levanzo e le cale più sceniche vengono valutate sulle condizioni reali della giornata.",
        },
        {
          question: isEn ? "Is this experience shared or private?" : "Questa esperienza è condivisa o privata?",
          answer: isEn
            ? `${formulaText} You can check the exact format in the title and booking panel of this page before choosing the date.`
            : `${formulaText} Puoi verificare la formula esatta nel titolo e nel box di prenotazione della pagina prima di scegliere la data.`,
        },
        {
          question: isEn ? "Should I choose 4 hours or 8 hours?" : "Meglio scegliere 4 ore o 8 ore?",
          answer: isHalfDay
            ? isEn
              ? "Choose 4 hours if you want a compact, clear schedule with sea, swimming and a smooth return. Choose 8 hours if you want more swim time, more route flexibility and a slower pace between Favignana and Levanzo."
              : "Scegli 4 ore se vuoi una fascia compatta, orari chiari, mare, bagno e rientro morbido. Scegli 8 ore se vuoi più tempo in acqua, più flessibilità di rotta e un ritmo più lento tra Favignana e Levanzo."
            : isEn
              ? "The 8-hour tour is best if you want a full day, more swim stops and a slower rhythm. The 4-hour tour works better when you have limited time or prefer a focused half day."
              : "Il tour di 8 ore è ideale se vuoi una giornata completa, più soste bagno e ritmo lento. Il 4 ore funziona meglio quando hai poco tempo o preferisci una mezza giornata essenziale.",
        },
        {
          question: isEn ? "Can children join the tour?" : "I bambini possono partecipare?",
          answer: isEn
            ? "Yes, children can join the experience when the selected format, weather and sea conditions are suitable. For families, a private tour often gives more freedom with timing, swim stops and shade breaks."
            : "Sì, i bambini possono partecipare quando formula scelta, meteo e condizioni del mare sono adatti. Per le famiglie, il tour privato offre spesso più libertà su tempi, soste bagno e pause all'ombra.",
        },
        {
          question: isEn ? "What should I bring on board?" : "Cosa devo portare a bordo?",
          answer: isEn
            ? "Bring swimwear, towel, sunscreen, sunglasses and a hat. Soft luggage is easier to store on board. The experience page also lists what is included and what is recommended before departure."
            : "Porta costume, asciugamano, crema solare, occhiali da sole e cappello. Una borsa morbida è più semplice da sistemare a bordo. Nella pagina trovi anche cosa è incluso e cosa è consigliato prima della partenza.",
        },
        {
          question: isEn ? "What happens in case of bad sea conditions?" : "Cosa succede in caso di mare non adatto?",
          answer: isEn
            ? "The crew checks conditions before departure and prioritises safety. If the planned route is not comfortable, the skipper can adapt the itinerary or the team will contact you with the available operational options."
            : "La crew controlla le condizioni prima della partenza e mette al primo posto la sicurezza. Se la rotta prevista non è confortevole, lo skipper può adattare l'itinerario o il team ti contatta con le opzioni operative disponibili.",
        },
      ];

  return {
    practicalEyebrow: isEn ? "Before booking" : "Prima di prenotare",
    practicalTitle: isEn ? "Practical details" : "Dettagli pratici",
    practicalItems: [
      {
        icon: Anchor,
        title: isEn ? "Departure from Trapani" : "Partenza da Trapani",
        text: isEn
          ? "Meeting point: Via dei Gladioli 15, 91100 Trapani."
          : "Punto di incontro: Via dei Gladioli 15, 91100 Trapani.",
      },
      {
        icon: Clock,
        title: isEn ? "Duration" : "Durata",
        text: isCharter
          ? isEn
            ? "From 3 to 7 days, planned before departure."
            : "Da 3 a 7 giornate, pianificate prima della partenza."
          : durationText,
      },
      {
        icon: Compass,
        title: isEn ? "Route" : "Rotta",
        text: routeText,
      },
      {
        icon: Users,
        title: isEn ? "Format and capacity" : "Formula e capienza",
        text: `${formulaText}${boatTitle ? ` ${isEn ? "Boat" : "Barca"}: ${boatTitle}.` : ""} ${
          isEn ? `Up to ${service.capacityMax} guests.` : `Fino a ${service.capacityMax} ospiti.`
        }`,
      },
    ],
    whatYouSeeTitle: isEn ? "What you will experience" : "Cosa vivrai a bordo",
    whatYouSeeIntro: isEn
      ? "Extra context for choosing the right experience before starting the booking flow."
      : "Qualche dettaglio in più per scegliere l'esperienza giusta prima di prenotare.",
    whatYouSeeItems,
    faqTitle: isEn ? "Questions about this experience" : "Domande su questa esperienza",
    faqs,
  };
}

function getEditorialExperienceCopy(
  locale: string,
  service: { id?: string; type: string; durationType: string; capacityMax: number },
  title: string,
  boatTitle?: string,
) {
  if (isFishingService(service)) return getFishingEditorialCopy(locale);

  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const boat =
    boatTitle ??
    (isDe
      ? "das ausgewählte Boot"
      : isFr
        ? "le bateau sélectionné"
        : isEn
          ? "the selected boat"
          : "la barca selezionata");
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const plannedIslandsEn = isCharter ? "Favignana, Levanzo and Marettimo" : "Favignana and Levanzo";
  const plannedIslandsIt = isCharter ? "Favignana, Levanzo e Marettimo" : "Favignana e Levanzo";
  const plannedIslandsDe = isCharter ? "Favignana, Levanzo und Marettimo" : "Favignana und Levanzo";

  if (isDe) {
    if (!isCharter && !isGourmet) {
      const boatTourFormat = isSharedBoat
        ? "eine geteilte Bootstour zu den Ägadischen Inseln ab Trapani, ideal, wenn Sie einen ganzen Tag auf dem Meer erleben möchten, ohne das gesamte Boot privat zu buchen"
        : isHalfDay
          ? "eine private 4-stündige Bootstour zu den Ägadischen Inseln, gedacht für Gäste, die klares Wasser, Badestopps und eine gut planbare Rückkehr wünschen"
          : "eine private Ganztages-Bootstour zu den Ägadischen Inseln, bei der das Boot nur für Ihre Gruppe reserviert ist und mehr Zeit für die Route bleibt";

      return {
        eyebrow: "Erlebnisguide",
        title: `Warum ${title} wählen`,
        paragraphs: [
          `${title} ist ${boatTourFormat}. Die Abfahrt erfolgt ab Trapani, und die Route wird nach den besten Bedingungen des Tages zwischen Favignana und Levanzo geplant. Das ist auf den Ägadischen Inseln wichtig: Wind, Seegang und Besucheraufkommen können sich schnell ändern, deshalb sollte eine gute Bootstour keinem starren Plan folgen. Sie sollte die Buchten wählen, in denen das Wasser klarer, der Ankerplatz ruhiger und der Tag von Anfang bis Ende entspannter ist.`,
          "Das Erlebnis ist auf das ausgerichtet, was Gäste bei einer Bootstour zu den Ägadischen Inseln meist suchen: türkisfarbenes Wasser, Badestopps, Schnorcheln, Küstenblicke und genügend Zeit, um das Meer ohne Eile zu genießen. Cala Rossa, Cala Azzurra, Bue Marino und die ruhigeren Ecken von Levanzo gehören zu den Orten, die der Skipper im Tagesverlauf bewertet. Die endgültige Wahl hängt aber immer von den realen Bedingungen auf See ab.",
          isSharedBoat
            ? "Das geteilte Format ist einfach und praktisch. Sie buchen Ihre Plätze, treffen die Crew in Trapani und teilen den Tag mit anderen Gästen, die dasselbe suchen: Meer, Baden und eine gut organisierte Route. Es ist eine gute Wahl, wenn Sie eine vollständige Egadi-Bootstour mit leichterem Budget und geselliger Stimmung an Bord wünschen."
            : isHalfDay
              ? "Die private 4-Stunden-Tour passt, wenn Sie ein kompaktes Erlebnis möchten: klare Zeiten, Privatsphäre für Ihre Gruppe und ein oder zwei gut gewählte Stopps statt vieler Orte im Eiltempo. Sie eignet sich für Paare, Familien und Reisende, die das Meer vor oder nach einem anderen Plan in Trapani erleben möchten."
              : "Die private Ganztagestour gibt dem Skipper mehr Freiheit, den Rhythmus an Ihre Gruppe anzupassen. Es bleibt mehr Zeit zum Baden, mehr Spielraum zwischen Favignana und Levanzo und ein ruhigeres Tempo an Bord. Sie ist die richtige Wahl, wenn Sie Privatsphäre, Raum und eine Route wünschen, die zu Kindern, Freunden oder einem besonderen Anlass passt.",
          `An Bord von ${boat} buchen Sie nicht nur einen Bootsnamen. Sie wählen ein offenes Motorboot, das sich leicht zwischen den Buchten bewegt. Es gibt Sitzplätze für die Gruppe, Raum für Sonne, Zugang zum Meer zum Baden und Schnorcheln, einen Skipper am Steuer und praktische Unterstützung vor der Abfahrt. Sie müssen die Ägadischen Inseln nicht bereits kennen; bringen Sie Badebekleidung, Handtuch, Sonnenschutz und eine weiche Tasche mit, die Crew führt die Route nach den Bedingungen des Tages.`,
          "Den Unterschied macht die lokale Einschätzung. Eine berühmte Bucht ist nicht immer der beste Stopp, wenn sie voll oder dem Wind ausgesetzt ist; manchmal bietet eine ruhigere Bucht klareres Wasser und ein angenehmeres Bad. Deshalb beschreiben wir diese Erfahrung als flexible Bootstour von Trapani zu den Ägadischen Inseln: Die Route hat eine klare Idee, aber der Skipper behält genug Freiheit, um Komfort, Sicherheit und Qualität des Tages zu schützen.",
        ],
      };
    }

    const formatText = isCharter
      ? "ein privater mehrtägiger Charter, gedacht für Reisende, die nahe an den Inseln schlafen und der Route Raum geben möchten"
      : isGourmet
        ? "ein privater Premium-Tag auf dem Trimaran, aufgebaut rund um Komfort, Essen und ruhige Zeit vor Anker"
        : isSharedBoat
          ? "eine geteilte Ganztages-Bootstour für Gäste, die die Ägadischen Inseln in einem einfachen und zugänglichen Format erleben möchten"
          : isHalfDay
            ? "eine private Halbtagestour für Gruppen, die Meer, Privatsphäre und klare Rückkehrzeiten wünschen"
            : "eine private Ganztagestour für Gruppen, die mehr Badezeit, flexible Route und ein langsameres Tempo suchen";

    return {
      eyebrow: "Erlebnisguide",
      title: `Warum ${title} wählen`,
      paragraphs: [
        `${title} ist ${formatText}. Das Erlebnis startet in Trapani und richtet sich nach den Ägadischen Inseln, wie sie am Tag der Abfahrt wirklich sind: hell, wechselhaft, an manchen Stellen offen und an anderen wunderbar geschützt. Deshalb verkaufen wir keine starre Postkartenroute. Wir zeigen ein professionell geführtes Meererlebnis, bei dem der Skipper Wind, Verkehr, Seegang und Licht liest, bevor er den angenehmsten Plan für ${plannedIslandsDe} wählt.`,
        `An Bord von ${boat} liegt der Wert nicht nur in der Liste der Buchten. Entscheidend ist, wie der Tag geführt wird: klare Abfahrt, entspannte Zeiten, sorgfältig gewählte Badestopps, ruhige Navigation und praktische Aufmerksamkeit für die Gruppe. Gäste erinnern sich oft an Cala Rossa, Cala Azzurra, Bue Marino oder die stilleren Seiten von Levanzo. Der echte Unterschied ist aber das Gefühl, von einer Crew begleitet zu werden, die weiß, wann man bleibt, wann man weiterfährt und wann eine ruhigere Bucht besser ist als der berühmteste Name auf der Karte.`,
        isCharter
          ? "Beim Charter wird der Rhythmus noch wichtiger. Eine mehrtägige Route lässt die Inseln langsam aufgehen: ein erster Badestopp nach der Abfahrt von Trapani, ein Abend vor Anker, wenn das Wetter passt, Morgenstunden nahe klarem Wasser und die Möglichkeit, den nächsten Tag anzupassen, statt ein fixes Programm zu erzwingen. Der Trimaran bietet dafür eine komfortable Basis mit Kabinen, Gemeinschaftsflächen und genug Raum, damit das Boot zu einem kleinen Zuhause auf dem Meer wird."
          : isGourmet
            ? "Beim Gourmet-Erlebnis wird das Boot zugleich Route und Tisch. Chef und Crew koordinieren die Zeiten so, dass das Mittagessen nicht wie eine Unterbrechung wirkt, sondern Teil des Tages wird: ein Bad vor dem Ankern, ruhiger Service an Bord, lokale Aromen und danach genug Zeit, wieder ins Wasser zu gehen. Es ist für Gäste gedacht, die Privatsphäre, Komfort und eine kuratiertere Art suchen, die Ägadischen Inseln zu erleben."
            : isPrivateBoat
              ? "Bei privaten Bootstouren ist Flexibilität der stärkste Vorteil. Das Boot ist für Ihre Gruppe reserviert, sodass der Skipper Badezeit, Tempo und Stopps anpassen kann, ohne unterschiedliche Erwartungen an Bord ausgleichen zu müssen. Das passt für Familien, Paare, Freundesgruppen und alle, die die Egadi-Inseln persönlicher erleben möchten."
              : "Bei der geteilten Ganztagestour liegt der Reiz in der Einfachheit. Sie buchen Ihre Plätze, treffen die Crew in Trapani und nehmen an einem Tag teil, der das Wesentliche zusammenhält: klares Wasser, Badestopps, Panorama-Navigation und eine gesellige, aber gut organisierte Atmosphäre.",
        "Die Route wird bewusst flexibel beschrieben, weil die Ägadischen Inseln Erfahrung stärker belohnen als Improvisation. Ein guter Tag auf See hängt von kleinen Entscheidungen ab: wo man mit weniger Schwell ankert, welche Inselseite klarer ist, wann eine bekannte Bucht zu voll wird und wie lange die Gruppe im Wasser bleiben kann, ohne die Rückfahrt hektisch zu machen. Die Crew hält diese Details im Gleichgewicht, damit der Ausflug natürlich wirkt. Dahinter stehen Planung, lokale Kenntnis und ständige Aufmerksamkeit für Komfort.",
        "Das ist besonders wichtig, wenn Sie vor der Buchung verschiedene Erlebnisse vergleichen. Ein privates Format gibt mehr Kontrolle über Rhythmus und Privatsphäre; ein geteilter Ganztag hält die Kosten zugänglicher und bewahrt die wichtigsten Meeresmomente; ein Gourmet-Tag auf dem Trimaran ergänzt Service, Essen und Raum; ein Charter macht aus den Inseln eine langsamere Reise. Diese Seite soll diese Unterschiede klar machen, damit die Wahl des Datums der letzte Schritt ist und nicht der Moment, in dem Sie noch verstehen müssen, was Sie buchen.",
        "Die Seite hilft Ihnen auch, vor der Buchung sicherer zu entscheiden. Die Bilder zeigen Boot und Atmosphäre an Bord, der Reiseverlauf erklärt die wahrscheinliche Struktur des Tages, und die FAQ beantworten die praktischen Fragen, die vor der Datumswahl zählen. Preise und Verfügbarkeit bleiben im Buchungsbereich; hier bekommen Sie den Kontext: wie sich das Erlebnis anfühlt, für wen es passt, wie die Crew arbeitet und warum eine gut geführte Route rund um die Ägadischen Inseln deutlich anders sein kann als eine generische Bootsfahrt.",
      ],
    };
  }

  if (isFr) {
    const formatText = isCharter
      ? "un charter privé de plusieurs jours pensé pour dormir près des îles et laisser respirer la route"
      : isGourmet
        ? "une journée privée premium en trimaran, construite autour du confort, du déjeuner et du temps lent au mouillage"
        : isSharedBoat
          ? "une excursion partagée de journée complète pour vivre les Égades avec une formule simple et accessible"
          : isHalfDay
            ? "un tour privé de demi-journée pour les groupes qui veulent mer, intimité et retour clair"
            : "un tour privé de journée complète pour les groupes qui veulent plus de temps de baignade, flexibilité et rythme lent";

    return {
      eyebrow: "Guide de l'expérience",
      title: `Pourquoi choisir ${title}`,
      paragraphs: [
        `${title} est ${formatText}. L'expérience part de Trapani et s'adapte aux îles Égades telles qu'elles sont le jour du départ : lumineuses, changeantes, exposées par endroits et très protégées ailleurs.`,
        `À bord de ${boat}, la valeur ne tient pas seulement à la liste des criques. Elle tient à la gestion de la journée : départ clair, temps confortables, arrêts baignade choisis avec soin et équipage capable de décider quand rester ou changer de baie.`,
        isCharter
          ? "En charter, le rythme est essentiel. Plusieurs jours permettent de découvrir les îles peu à peu, avec mouillages calmes, cabines et possibilité d'adapter la route au lendemain."
          : isGourmet
            ? "Dans l'expérience gourmet, le bateau devient à la fois route et table. Le chef et l'équipage coordonnent baignade, mouillage et déjeuner pour que tout fasse naturellement partie de la journée."
            : isSharedBoat
              ? "La formule partagée est pratique : vous réservez votre place, rencontrez l'équipage à Trapani et partagez la route avec d'autres hôtes qui cherchent mer, baignade et sortie bien organisée."
              : "Dans les tours privés, la flexibilité est le point fort. Le bateau est réservé à votre groupe, le skipper peut donc ajuster arrêts, rythme et navigation sans équilibrer les attentes d'autres hôtes.",
        "Cala Rossa, Cala Azzurra, Bue Marino et les coins tranquilles de Levanzo restent des repères importants, mais le meilleur arrêt dépend toujours du vent, de la mer et de l'affluence. C'est pourquoi la route garde une idée claire sans devenir un itinéraire rigide.",
      ],
    };
  }

  if (isEs) {
    const spanishBoat = boatTitle ?? "el barco seleccionado";
    const formatText = isCharter
      ? "un charter privado de varios días para dormir cerca de las islas y dejar respirar la ruta"
      : isGourmet
	        ? "una jornada privada premium en trimarán, construida alrededor del confort, la comida y el tiempo lento al fondeo"
        : isSharedBoat
          ? "una excursión compartida de día completo para vivir las Egadi con una fórmula sencilla y accesible"
          : isHalfDay
            ? "un tour privado de medio día para grupos que quieren mar, privacidad y regreso claro"
            : "un tour privado de día completo para grupos que quieren más tiempo de baño, flexibilidad y ritmo lento";

    return {
      eyebrow: "Guía de la experiencia",
      title: `Por qué elegir ${title}`,
      paragraphs: [
        `${title} es ${formatText}. La experiencia sale desde Trapani y se adapta a las Islas Egadi tal y como están el día de la salida: luminosas, cambiantes, expuestas en algunas zonas y muy protegidas en otras.`,
        `A bordo de ${spanishBoat}, el valor no está solo en la lista de calas. Está en cómo se gestiona la jornada: salida clara, tiempos cómodos, paradas de baño elegidas con cuidado y una tripulación que sabe cuándo quedarse y cuándo moverse.`,
        isCharter
	          ? "En el charter, el ritmo es fundamental. Varias jornadas permiten descubrir las islas poco a poco: primer baño tras salir de Trapani, noche al fondeo si el tiempo acompaña y posibilidad de adaptar el plan al día siguiente."
          : isGourmet
            ? "En la experiencia gourmet, el barco se convierte en ruta y mesa a la vez. El chef y la tripulación coordinan tiempos, baño, fondeo y comida para que todo forme parte natural del día."
            : isSharedBoat
              ? "La fórmula compartida es práctica: reservas tu plaza, conoces a la tripulación en Trapani y compartes la ruta con otros huéspedes que buscan mar, baño y una salida bien organizada."
              : "En los tours privados, la flexibilidad es el punto fuerte. El barco queda reservado para tu grupo, así que el patrón puede ajustar paradas, ritmo y navegación sin equilibrar expectativas de otros huéspedes.",
        "Cala Rossa, Cala Azzurra, Bue Marino y los rincones tranquilos de Levanzo son referencias importantes, pero la mejor parada depende siempre de viento, mar y afluencia. Por eso la ruta mantiene una idea clara sin convertirse en un itinerario rígido.",
      ],
    };
  }

  if (isEn) {
    if (!isCharter && !isGourmet) {
      const boatTourFormat = isSharedBoat
        ? "a shared boat tour in the Egadi Islands from Trapani, ideal if you want a full day at sea without booking the whole boat"
        : isHalfDay
          ? "a private 4-hour boat tour in the Egadi Islands, designed for guests who want clear water, swim stops and an easy return schedule"
          : "a private full-day boat tour in the Egadi Islands, with the boat reserved for your group and more time to enjoy the route";

      return {
        eyebrow: "Experience guide",
        title: `Why choose ${title}`,
        paragraphs: [
          `${title} is ${boatTourFormat}. The departure is from Trapani, and the route is planned around the best conditions of the day between Favignana and Levanzo. This is important in the Egadi Islands: wind, sea state and crowding can change quickly, so a good boat tour is not about forcing a fixed itinerary. It is about choosing the coves where the water is clearer, the anchorage is more comfortable and the day feels relaxed from start to finish.`,
          "The experience is built around the things people usually hope to find when they search for a boat tour in the Egadi Islands: turquoise water, swim stops, snorkelling, views of the coast and enough time to enjoy the sea without feeling rushed. Cala Rossa, Cala Azzurra, Bue Marino and the quieter corners of Levanzo are the kind of places the skipper evaluates during the day, but the final choice always depends on the real sea conditions.",
          isSharedBoat
	          ? "The shared format is simple and practical. You book your seats, meet the crew in Trapani and share the day with other guests who want the same kind of experience: sea, swimming and a well-organised route. It is a good option if you want a complete Egadi boat tour with a lighter budget and a sociable atmosphere on board."
            : isHalfDay
              ? "The 4-hour private tour is best when you want a compact experience: a clean schedule, privacy for your group and one or two well-chosen stops instead of a long list of places visited in a hurry. It works well for couples, families and travellers who want to enjoy the sea before or after another plan in Trapani."
              : "The private full-day format gives the skipper more freedom to shape the rhythm around your group. There is more time for swimming, more flexibility between Favignana and Levanzo and a calmer pace on board. It is the right choice if you want privacy, space and a route that can adapt to children, friends or a special occasion.",
          `On board ${boat}, you are not booking a technical boat name: you are choosing an open motorboat made for moving easily between the coves. There is seating for the group, space to enjoy the sun, sea access for swimming and snorkelling, a skipper at the helm and practical support before departure. You do not need to know the Egadi Islands already; bring swimwear, towel, sunscreen and a soft bag, and the crew will guide the route around the real conditions of the day.`,
          "What makes the difference is local judgement. A famous cove is not always the best stop if it is crowded or exposed; sometimes a quieter bay gives you clearer water and a better swim. That is why this experience is written as a flexible boat tour from Trapani to the Egadi Islands: the route has a clear idea, but the skipper keeps enough freedom to protect comfort, safety and the quality of the day.",
        ],
      };
    }

    const formatText = isCharter
      ? "a private multi-day charter designed for travellers who want to sleep close to the islands and let the route breathe"
      : isGourmet
        ? "a private premium day on the trimaran, built around comfort, food and unhurried time at anchor"
        : isSharedBoat
          ? "a shared full-day boat tour for guests who want the Egadi experience with a simple, accessible booking format"
          : isHalfDay
            ? "a private half-day tour for groups who want sea, privacy and a clear return schedule"
            : "a private full-day tour for groups who want more swim time, route flexibility and a slower pace";

    return {
      eyebrow: "Experience guide",
      title: `Why choose ${title}`,
      paragraphs: [
        `${title} is ${formatText}. The experience starts from Trapani and is shaped around the Egadi Islands as they really are on the day of departure: bright, changeable, exposed in some areas and wonderfully sheltered in others. This is why the page does not sell a rigid postcard route. It presents a professional sea experience where the skipper reads wind, traffic, sea state and light before choosing the most comfortable plan for ${plannedIslandsEn}.`,
        `On board ${boat}, the value of the experience is not only the list of coves. It is the way the day is managed: departure without confusion, clear timing, swim stops chosen with care, relaxed navigation and practical attention to the group. Guests often remember Cala Rossa, Cala Azzurra, Bue Marino or the quiet edges of Levanzo, but the real difference is the feeling of being guided by a crew that knows when to stay, when to move and when a quieter bay will be better than the most famous name on the map.`,
        isCharter
          ? "For charter guests, the rhythm becomes even more important. A multi-day route lets the islands open slowly: a first swim after leaving Trapani, dinner at anchor when the weather is right, mornings close to clear water and the possibility to adapt the following day instead of forcing a fixed programme. The trimaran gives the charter a more comfortable base, with cabins, shared spaces and enough room to turn the boat into a small floating home."
	          : isGourmet
	            ? "For the gourmet experience, the boat becomes both route and table. The chef and crew coordinate the timing so lunch does not feel like an interruption but part of the day: a swim before anchoring, calm service on board, local flavours and enough time after the meal to enjoy the water again. It is designed for guests who want privacy, comfort and a more curated way to experience the Egadi Islands."
          : isPrivateBoat
              ? "For private boat tours, flexibility is the strongest advantage. The boat is reserved for your group, so the skipper can adjust swim time, pace and stops without balancing different expectations on board. This is useful for families, couples, groups of friends and anyone who wants the Egadi with more privacy and a route that feels personal rather than standard."
	              : "For the shared full-day tour, the appeal is simplicity. You book your seats, meet the crew in Trapani and join a day that keeps the essentials: clear water, swim stops, scenic navigation and a sociable but organised atmosphere. It is a good choice when you want the full Egadi Islands experience without booking the entire boat privately.",
        `The route is intentionally described as flexible because the Egadi reward experience more than improvisation. A good day at sea depends on small decisions: where to anchor with less roll, which side of an island is clearer, when a famous cove is too crowded, and how long the group can stay in the water without turning the return into a rush. The crew keeps these details in balance so the trip feels natural, but behind that natural feeling there is planning, local knowledge and constant attention to comfort.`,
	        `This is especially important for guests comparing different experiences before booking. A private format gives more control over rhythm and privacy; a shared full day keeps the cost more accessible while preserving the main sea moments; a gourmet trimaran day adds service, food and space; a charter turns the islands into a slower journey. The goal of this page is to make those differences clear, so choosing the date is the last step, not the moment when you are still trying to understand what you are buying.`,
	        `The experience is also designed to help you decide before booking. The images show the boat and the atmosphere on board, the itinerary explains the likely structure of the day, and the FAQ answers the practical questions that usually matter before choosing a date. Prices and availability remain in the booking panel, while this page gives the context: what the experience feels like, who it is best for, how the crew works and why a well-managed route around the Egadi Islands can feel very different from a generic boat trip.`,
      ],
    };
  }

  const formatText = isCharter
    ? "un charter privato di più giorni pensato per chi vuole dormire vicino alle isole e lasciare respirare la rotta"
    : isGourmet
      ? "una giornata privata premium in trimarano, costruita intorno a comfort, tavola e tempo lento in rada"
      : isSharedBoat
        ? "un tour condiviso di giornata intera per chi vuole vivere le Egadi con una formula semplice e accessibile"
        : isHalfDay
          ? "un tour privato di mezza giornata per gruppi che cercano mare, privacy e orari chiari"
          : "un tour privato di giornata intera per gruppi che vogliono più tempo in acqua, flessibilità e ritmo lento";

  if (!isCharter && !isGourmet) {
    const boatTourFormat = isSharedBoat
      ? "un tour in barca alle Egadi da Trapani in formula condivisa, pensato per chi vuole vivere una giornata completa in mare senza riservare tutta la barca"
      : isHalfDay
        ? "un tour privato in barca alle Egadi di 4 ore, ideale per chi cerca acqua limpida, soste bagno e un rientro semplice da organizzare"
        : "un tour privato in barca alle Egadi di giornata intera, con la barca riservata al tuo gruppo e più tempo per godersi la rotta";

    return {
      eyebrow: "Guida all'esperienza",
      title: `Perché scegliere ${title}`,
      paragraphs: [
        `${title} è ${boatTourFormat}. Si parte da Trapani e la rotta viene costruita sulle condizioni migliori della giornata tra Favignana e Levanzo. Alle Egadi questa cosa conta davvero: vento, mare e affollamento possono cambiare in fretta, quindi un buon tour non deve inseguire una lista rigida di tappe. Deve scegliere le cale dove l'acqua è più bella, l'ancoraggio è più comodo e la giornata scorre senza forzature.`,
        "L'esperienza nasce per chi cerca un tour in barca alle Egadi fatto bene: acqua turchese, soste bagno, snorkeling, costa da vedere dal mare e tempi abbastanza morbidi per godersi il momento. Cala Rossa, Cala Azzurra, Bue Marino e i lati più tranquilli di Levanzo sono tra i luoghi che lo skipper valuta durante l'uscita, ma la scelta finale dipende sempre dal mare reale del giorno.",
        isSharedBoat
          ? "La formula condivisa è semplice e pratica. Prenoti il tuo posto, incontri la crew a Trapani e condividi la giornata con altri ospiti che cercano la stessa cosa: mare, bagno e una rotta organizzata bene. È una buona soluzione se vuoi vivere una giornata completa alle Egadi con un prezzo più accessibile e un'atmosfera leggera a bordo."
          : isHalfDay
            ? "Il tour privato di 4 ore funziona quando vuoi un'esperienza compatta: orari chiari, barca riservata al tuo gruppo e una o due soste scelte bene, invece di tante tappe fatte di corsa. È adatto a coppie, famiglie e a chi vuole inserire il mare in una giornata già organizzata a Trapani."
            : "La giornata intera privata dà allo skipper più libertà per adattare il ritmo al tuo gruppo. C'è più tempo per fare il bagno, più margine per muoversi tra Favignana e Levanzo e una navigazione più rilassata. È la scelta giusta se vuoi privacy, spazio e una rotta che tenga conto di bambini, amici o occasioni speciali.",
        `A bordo della ${boat} non devi conoscere il modello della barca per capire cosa stai prenotando: è una barca open, aperta e veloce, pensata per muoversi facilmente tra le cale. Ci sono sedute per il gruppo, spazio per prendere il sole, accesso al mare per bagno e snorkeling, skipper alla guida e assistenza pratica prima della partenza. Non serve conoscere già le Egadi o sapere quale cala scegliere: porta costume, asciugamano, crema solare e una borsa morbida; alla navigazione e alla rotta pensa la crew.`,
        "La differenza la fa la conoscenza locale. Una cala famosa non è sempre la migliore se è troppo piena o esposta al vento; a volte una baia più tranquilla regala acqua più limpida e una sosta molto più piacevole. Per questo parliamo di tour in barca da Trapani alle Egadi con rotta flessibile: c'è un programma di base, ma lo skipper mantiene la libertà necessaria per proteggere comfort, sicurezza e qualità della giornata.",
      ],
    };
  }

  return {
    eyebrow: "Guida all'esperienza",
    title: `Perché scegliere ${title}`,
    paragraphs: [
      `${title} è ${formatText}. Si parte da Trapani e si entra nelle Isole Egadi per come sono davvero il giorno dell'uscita: luminose, variabili, esposte in alcuni tratti e sorprendentemente riparate in altri. Per questo non vendiamo una rotta rigida da cartolina. Raccontiamo un'esperienza di mare gestita con criterio, in cui lo skipper valuta vento, traffico, stato del mare e luce prima di scegliere il piano più comodo tra ${plannedIslandsIt}.`,
      `A bordo di ${boat}, il valore non è solo nella lista delle cale. Conta il modo in cui viene condotta la giornata: accoglienza ordinata, tempi chiari, soste bagno scelte con attenzione, navigazione rilassata e cura pratica del gruppo. Spesso si ricordano Cala Rossa, Cala Azzurra, Bue Marino o i lati più tranquilli di Levanzo, ma la differenza vera è sentirsi accompagnati da una crew che sa quando restare, quando spostarsi e quando una baia meno famosa può offrire un'esperienza migliore.`,
      isCharter
        ? "Nel charter il ritmo diventa ancora più importante. Più giornate permettono alle isole di aprirsi lentamente: primo bagno dopo la partenza da Trapani, cena in rada quando il meteo lo consente, risvegli vicino all'acqua limpida e possibilità di adattare il giorno successivo senza forzare un programma fisso. Il trimarano offre una base comoda, con cabine, spazi comuni e abbastanza respiro per trasformare la barca in una piccola casa sul mare."
        : isGourmet
          ? "Nell'esperienza gourmet la barca diventa insieme rotta e tavola. Chef e crew coordinano i tempi per far sentire il pranzo come parte naturale della giornata: bagno prima dell'ancoraggio, servizio tranquillo a bordo, sapori locali e tempo sufficiente per tornare in acqua dopo il pasto. È una formula pensata per chi cerca privacy, comfort e un modo più curato di vivere le Egadi."
          : isPrivateBoat
            ? "Nei tour privati il vantaggio principale è la flessibilità. La barca è riservata al tuo gruppo, quindi lo skipper può modulare soste, ritmo e navigazione senza dover bilanciare aspettative diverse a bordo. Funziona bene per famiglie, coppie, gruppi di amici e per chi vuole sentire le Egadi in modo personale, senza trasformare l'uscita in un programma standard."
            : "Nel tour condiviso di giornata intera il punto forte è la semplicità. Prenoti i posti, incontri la crew a Trapani e vivi una giornata che tiene insieme gli elementi essenziali: acqua limpida, soste bagno, navigazione panoramica e un'atmosfera sociale ma ordinata. È una buona scelta se vuoi l'esperienza completa delle Egadi senza riservare tutta la barca.",
      "La rotta viene raccontata come flessibile perché le Egadi premiano l'esperienza più dell'improvvisazione. Una buona giornata in mare dipende da scelte piccole: dove ancorare con meno rollio, quale lato dell'isola è più limpido, quando una cala famosa è troppo affollata e quanto tempo restare in acqua senza trasformare il rientro in una corsa. La crew tiene insieme questi dettagli in modo naturale, ma dietro quella naturalezza ci sono pianificazione, conoscenza locale e attenzione continua al comfort.",
      "Questo conta soprattutto quando stai confrontando esperienze diverse prima di prenotare. Una formula privata offre più controllo su ritmo e privacy; una giornata condivisa mantiene l'esperienza più accessibile senza rinunciare ai momenti principali; il trimarano gourmet aggiunge servizio, tavola e spazio; il charter trasforma le isole in un viaggio lento. L'obiettivo di questa pagina è rendere chiare queste differenze, così la scelta della data diventa l'ultimo passo, non il momento in cui devi ancora capire cosa stai acquistando.",
      "La pagina è pensata anche per aiutarti a scegliere prima di prenotare. Le immagini mostrano la barca e il mood a bordo, l'itinerario spiega la struttura probabile dell'uscita e le FAQ rispondono alle domande pratiche che contano davvero prima di scegliere una data. Prezzi e disponibilità restano nel box di prenotazione, mentre qui trovi il contesto: cosa si vive, per chi è adatta l'esperienza, come lavora la crew e perché una rotta ben gestita alle Egadi può essere molto diversa da un semplice giro in barca.",
    ],
  };
}

function getGourmetMenuCopy(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return {
    eyebrow: isDe ? "Chef an Bord" : isEs ? "Chef a bordo" : isFr ? "Chef à bord" : isEn ? "Chef on board" : "Chef a bordo",
    title: isDe
      ? "Beispielmenüs für das Gourmet-Erlebnis"
      : isEs
        ? "Ejemplos de menús gourmet"
        : isFr
          ? "Exemples de menus gourmet"
          : isEn
            ? "Sample gourmet menus"
            : "Esempi di menu gourmet",
    intro: isEs
      ? "Tres ejemplos de comida servida a bordo durante la Premium Experience. El menú final se confirma con el chef según pesca fresca, temporada y necesidades de los huéspedes."
      : isDe
      ? "Drei Beispiele für das Mittagessen an Bord während der Premium Experience. Das endgültige Menü wird mit dem Chef nach frischem Fang, Saison und Bedürfnissen der Gäste bestätigt."
      : isFr
      ? "Trois exemples de déjeuner servis à bord pendant la Premium Experience. Le menu final est confirmé avec le chef selon la pêche fraîche, la saison et les besoins des hôtes."
      : isEn
      ? "Three sample lunch styles served on board during the Gourmet Experience. The final menu is confirmed with the chef according to fresh catch, seasonality and guest needs."
      : "Tre esempi di pranzo servito a bordo durante l'Esperienza Gourmet. Il menu definitivo viene concordato con lo chef in base a pescato fresco, stagione ed esigenze degli ospiti.",
    seasonalNote: isEs
      ? "Los menús pueden variar según disponibilidad. Alergias, intolerancias y necesidades alimentarias importantes deben comunicarse antes de la salida."
      : isDe
      ? "Die Menüs können je nach Verfügbarkeit variieren. Allergien, Unverträglichkeiten und wichtige Ernährungsbedürfnisse sollten vor der Abfahrt mitgeteilt werden."
      : isFr
      ? "Les menus peuvent varier selon la disponibilité. Allergies, intolérances et besoins alimentaires importants doivent être communiqués avant le départ."
      : isEn
      ? "Menus may vary according to availability. Allergies, intolerances and important dietary needs should be communicated before departure."
      : "I menu possono variare in base alla disponibilità. Allergie, intolleranze ed esigenze alimentari importanti vanno comunicate prima della partenza.",
  };
}

function getGourmetSampleMenus(locale: string) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";

  return [
    {
      title: isDe
        ? "Favignana-Thunfisch-Menü"
        : isEs
          ? "Menú de atún de Favignana"
          : isFr
            ? "Menu thon de Favignana"
            : isEn
              ? "Favignana Tuna Menu"
              : "Menu tonno di Favignana",
      subtitle: isDe
        ? "Lokaler Fisch, sizilianische Aromen und ein leichter Abschluss."
        : isEs
          ? "Pescado local, sabores sicilianos y un final ligero."
          : isFr
            ? "Poisson local, saveurs siciliennes et finale légère."
            : isEn
              ? "Local fish, Sicilian flavours and a relaxed finish."
              : "Pesce locale, sapori siciliani e chiusura leggera.",
      items: isEs
        ? [
            "Aperitivo de bruschette sicilianas tradicionales a base de pescado",
            "Rollé de atún fresco pescado en Favignana",
            "Pasta a la eoliana",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Aperitif mit typischen sizilianischen Fisch-Bruschette",
            "Roulade aus frischem Thunfisch, gefangen vor Favignana",
            "Pasta nach äolischer Art",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Apéritif de bruschette siciliennes traditionnelles au poisson",
            "Roulé de thon frais pêché à Favignana",
            "Pâtes à l'éolienne",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Aperitif with traditional Sicilian seafood bruschetta",
            "Fresh tuna roulade caught off Favignana",
            "Aeolian-style pasta",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Aperitivo di bruschette tipiche siciliane a base di pesce",
            "Rollè di tonno fresco pescato a Favignana",
            "Pasta all'eoliana",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
    {
      title: isDe
        ? "Trapani-Meeresmenü"
        : isEs
          ? "Menú marinero trapanese"
          : isFr
            ? "Menu marin de Trapani"
            : isEn
              ? "Trapani Sea Menu"
              : "Menu mare trapanese",
      subtitle: isDe
        ? "Eine feinere Meeresvariante mit Muscheln und lokalem Wein."
        : isEs
          ? "Una propuesta de mar más delicada, con mejillones y vino local."
          : isFr
            ? "Une proposition marine plus délicate, avec moules et vin local."
            : isEn
              ? "A softer seafood menu built around mussels and local wine."
              : "Una proposta di mare più delicata, con cozze e vino del territorio.",
      items: isEs
        ? [
            "Trío de mousses de mar",
            "Pasta con ragú de mejillones",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Dreierlei Meeresmousse",
            "Pasta mit Muschelragout",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Trio de mousses de mer",
            "Pâtes au ragoût de moules",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Trio of seafood mousses",
            "Pasta with mussel ragout",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Trittico di mousse di mare",
            "Pasta con ragù di cozze",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
    {
      title: isDe
        ? "Premium-Crudité-Menü"
        : isEs
          ? "Menú crudité premium"
          : isFr
            ? "Menu crudités de mer premium"
            : isEn
              ? "Premium Raw Seafood Menu"
              : "Menu crudité premium",
      subtitle: isDe
        ? "Nur auf ausdrückliche Anfrage und mit Aufpreis verfügbar."
        : isEs
          ? "Disponible solo bajo petición expresa y con suplemento."
          : isFr
            ? "Disponible uniquement sur demande explicite, avec supplément."
            : isEn
              ? "Available only on explicit request with a supplement."
              : "Disponibile solo su esplicita richiesta e con supplemento.",
      badge: isDe ? "Auf Anfrage" : isEs ? "Bajo petición" : isFr ? "Sur demande" : isEn ? "On request" : "Su richiesta",
      items: isEs
        ? [
            "Crudités de mar",
            "Pasta con gamba roja de Mazara del Vallo y pesto de pistacho",
            "Fruta fresca",
            "Vino trapanese y refrescos incluidos",
          ]
        : isDe
        ? [
            "Meeres-Crudités",
            "Pasta mit roter Garnele aus Mazara del Vallo und Pistazienpesto",
            "Frisches Obst",
            "Wein aus Trapani und Softdrinks inklusive",
          ]
        : isFr
        ? [
            "Crudités de mer",
            "Pâtes à la crevette rouge de Mazara del Vallo et pesto de pistache",
            "Fruits frais",
            "Vin de Trapani et boissons incluses",
          ]
        : isEn
        ? [
            "Seafood crudités",
            "Pasta with Mazara del Vallo red prawns and pistachio pesto",
            "Fresh fruit",
            "Trapani wine and soft drinks included",
          ]
        : [
            "Crudité di mare",
            "Pasta con gambero rosso di Mazara del Vallo e pesto di pistacchio",
            "Frutta fresca",
            "Vino trapanese e bibite incluse",
          ],
    },
  ];
}

const heroFrameLayouts = [
  "right-2 top-0 z-30 w-[25rem] rotate-2",
  "left-0 top-[10.5rem] z-20 w-[22.5rem] -rotate-5",
  "right-10 top-[23rem] z-10 w-[21.5rem] rotate-[4deg]",
] as const;

function SvgPhotoFrame({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <figure className={`absolute drop-shadow-[0_28px_42px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white/8 p-3 backdrop-blur-sm">
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          {children}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <path
            d="M18 18 C70 8 126 16 184 12 C250 8 312 10 382 18 L388 280 C316 290 256 285 194 289 C126 293 70 286 18 280 Z"
            fill="none"
            stroke="rgba(255,255,255,0.88)"
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <path
            d="M28 28 C92 20 150 27 206 22 C268 17 320 20 372 28 L377 270 C314 279 252 274 196 278 C132 283 78 276 28 270 Z"
            fill="none"
            stroke="rgba(212,175,55,0.72)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M35 47 L35 28 L56 28 M344 28 L371 28 L371 52 M371 248 L371 272 L345 272 M56 272 L29 272 L29 247"
            fill="none"
            stroke="rgba(212,175,55,0.9)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </figure>
  );
}

function HeroFramedGallery({
  items,
}: {
  items: Array<{ caption: string; alt: string; src?: string }>;
}) {
  return (
    <div className="relative h-[36rem] w-full">
      {items.slice(0, 3).map((item, index) => {
        if (!item.src) return null;

        return (
          <SvgPhotoFrame
            key={item.src}
            className={heroFrameLayouts[index] ?? heroFrameLayouts[0]}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              sizes="(max-width: 1200px) 360px, 420px"
              className="object-cover"
            />
          </SvgPhotoFrame>
        );
      })}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  if (!isPublicBookingServiceEnabled(serviceId)) return { title: "Not Found" };
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) return { title: "Not Found" };
  const content = getExperienceContent(service.id, locale);
  if (!content) return { title: "Not Found" };
  return buildPageMetadata({
    title: content.seoTitle,
    description: content.seoDescription,
    path: `/experiences/${getExperiencePublicSlug(service.id, locale)}`,
    locale,
    image: content.media[0]?.src,
    noIndex: !content.listed,
  });
}

export default async function ExperienceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations();
  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  if (!isPublicBookingServiceEnabled(serviceId)) notFound();

  const service = await db.service.findUnique({ where: { id: serviceId } });

  if (!service || !service.active) notFound();
  const content = getExperienceContent(service.id, locale);
  if (!content) notFound();
  const canonicalSlug = getExperiencePublicSlug(service.id, locale);
  if (slug !== canonicalSlug) permanentRedirect(localizedPath(locale, `/experiences/${canonicalSlug}`));

  const boatContent = getBoatContent(service.boatId, locale);
  const [displayPrice, itinerary] = await Promise.all([
    getDisplayPrice(service.id, 2026, locale),
    getExperienceItinerary(service.id, locale, content.itinerary),
  ]);

  const copy = getDetailCopy(locale, service);
  const pagePath = `/experiences/${canonicalSlug}`;
  const bookingServiceParam = getExperiencePublicSlug(service.id, locale);
  const bookingHref = localizedPath(locale, `/prenota?service=${bookingServiceParam}`);
  const recoveryHref = localizedStaticPath(locale, "/recupera-prenotazione");
  const recoveryLabel =
    locale === "es"
      ? "Buscar reserva"
      : locale === "fr"
        ? "Retrouver réservation"
        : locale === "de"
          ? "Buchung finden"
        : locale === "en"
          ? "Find booking"
          : "Recupera prenotazione";
  const durationText = getServiceDurationLabel(service, locale);
  const seoExpansion = getSeoExpansionCopy(locale, service, durationText, boatContent?.title);
  const priceUnit =
    service.type === "CABIN_CHARTER" || service.pricingUnit === "PER_PACKAGE"
      ? getPriceUnitLabel(service.pricingUnit, service.type, locale)
      : t("experience.perPerson");
  const heroMedia = content.media.find((item) => item.src) ?? content.media[0];
  const heroImage = heroMedia?.src ?? FALLBACK_HERO_IMAGE;
  const gallery = content.media.filter((item) => item.src);
  const boatGallery = boatContent?.gallery ?? [];
  const editorial = getEditorialExperienceCopy(locale, service, content.title, boatContent?.title);
  const gourmetMenuCopy = getGourmetMenuCopy(locale);
  const gourmetMenus = service.type === "EXCLUSIVE_EXPERIENCE" ? getGourmetSampleMenus(locale) : [];
  const relatedExperiences = getListedExperienceIds()
    .filter((id) => id !== service.id)
    .map((id) => getExperienceContent(id, locale))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 3);
  const priceLabel = displayPrice.amount
    ? `${t("experience.from")} ${formatEur(displayPrice.amount, locale)}`
    : displayPrice.label;
  const charterDurationDays = service.type === "CABIN_CHARTER" ? 3 : undefined;
  const bookingInfoItems = [
    {
      icon: "clock" as const,
      label: t("experience.duration"),
      value: durationText,
    },
    {
      icon: "users" as const,
      label: t("experience.capacity"),
      value: service.capacityMax,
    },
    ...(boatContent
      ? [
          {
            icon: "ship" as const,
            label: t("experience.boat"),
            value: boatContent.title,
          },
        ]
      : []),
  ];
  const siteBase = env.APP_URL.replace(/\/$/, "");
  const pageUrl = localizedAbsoluteUrl(siteBase, locale, pagePath);
  const bookingUrl = `${siteBase}${bookingHref}`;
  const schemaDuration =
    service.type === "CABIN_CHARTER"
      ? "P3D"
      : service.durationHours > 0
        ? `PT${service.durationHours}H`
        : undefined;
  const touristTypes =
    locale === "de"
      ? service.type === "CABIN_CHARTER"
        ? ["Privater Charter", "Mehrtägige Segelreise", "Ägadische Inseln"]
        : service.type === "BOAT_SHARED"
          ? ["Geteilte Bootstour", "Schnorcheln", "Ägadische Inseln"]
          : service.type === "BOAT_EXCLUSIVE"
            ? ["Private Bootstour", "Familien", "Kleine Gruppen"]
            : ["Gourmet-Erlebnis mit Chef an Bord", "Private Gruppe", "Ägadische Inseln"]
      : service.type === "CABIN_CHARTER"
        ? ["Private charter", "Multi-day sailing", "Egadi Islands"]
        : service.type === "BOAT_SHARED"
          ? ["Shared boat tour", "Snorkelling", "Egadi Islands"]
          : service.type === "BOAT_EXCLUSIVE"
            ? ["Private boat tour", "Families", "Small groups"]
            : ["Gourmet sailing experience", "Private group", "Egadi Islands"];
  const inLanguage =
    locale === "de"
      ? "de-DE"
      : locale === "fr"
        ? "fr-FR"
        : locale === "es"
          ? "es-ES"
          : locale === "en"
            ? "en-US"
            : "it-IT";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        inLanguage,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Egadisailing",
            item: localizedAbsoluteUrl(siteBase, locale, "/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: t("experience.allExperiences"),
            item: localizedAbsoluteUrl(siteBase, locale, "/experiences"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: content.title,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": ["Product", "TouristTrip"],
        "@id": `${pageUrl}#experience`,
        inLanguage,
        name: content.seoTitle,
        description: `${content.seoDescription} ${editorial.paragraphs[0]}`,
        duration: schemaDuration,
        touristType: touristTypes,
        image:
          gallery.length + boatGallery.length > 0
            ? [...gallery.map((item) => absoluteUrl(item.src!)), ...boatGallery.map((item) => absoluteUrl(item.src))]
            : [absoluteUrl(heroImage)],
        itinerary: {
          "@type": "ItemList",
          itemListElement: itinerary.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title ?? item.time,
            description: item.text,
          })),
        },
        provider: {
          "@type": "Organization",
          name: PUBLIC_COMPANY_LEGAL.name,
          alternateName: "Egadi Sailing",
          url: siteBase,
          email: PUBLIC_CONTACT_EMAIL,
          taxID: PUBLIC_COMPANY_LEGAL.vatNumber,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Via Calipso 42",
            postalCode: "91100",
            addressLocality: "Trapani",
            addressRegion: "Sicilia",
            addressCountry: "IT",
          },
        },
        brand: {
          "@type": "Brand",
          name: "Egadisailing",
        },
        offers: {
          "@type": "Offer",
          url: bookingUrl,
          priceCurrency: "EUR",
          ...(displayPrice.amount ? { price: displayPrice.amount.toFixed(2) } : {}),
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        inLanguage,
        mainEntity: seoExpansion.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#related-experiences`,
        name:
          locale === "es"
            ? "Experiencias Egadi relacionadas"
            : locale === "fr"
              ? "Expériences Égades liées"
              : locale === "de"
                ? "Verwandte Erlebnisse auf den Ägadischen Inseln"
              : locale === "en"
                ? "Related Egadi experiences"
                : "Esperienze Egadi correlate",
        itemListElement: relatedExperiences.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: localizedAbsoluteUrl(siteBase, locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`),
          name: item.title,
          description: item.seoDescription,
        })),
      },
    ],
  };

  const bookingCardProps = {
    locale,
    serviceId: bookingServiceParam,
    bookingServiceParam,
    charterDurationDays,
    title: copy.bookingTitle,
    text: copy.bookingText,
    priceLabel,
    priceUnit,
    bookNowLabel: copy.bookNow,
    infoItems: bookingInfoItems,
  };

  return (
    <div className="min-h-screen bg-[#f7f2e8] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#05182d] px-4 pb-16 pt-24 sm:min-h-[640px] sm:pb-20 sm:pt-28 md:px-8 lg:min-h-[720px] lg:px-12">
        <Image
          src={heroImage}
          alt={heroMedia?.alt ?? content.title}
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,24,45,0.92)_0%,rgba(5,24,45,0.72)_42%,rgba(5,24,45,0.32)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f2e8] via-[#f7f2e8]/70 to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-start gap-8 lg:grid-cols-[minmax(0,1fr)_32rem] lg:gap-12">
          <ScrollSection animation="fade-up" className="max-w-3xl">
            <Link
              href={localizedStaticPath(locale, "/experiences")}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/75 transition hover:text-white sm:mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("experience.allExperiences")}
            </Link>

            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)] sm:text-sm sm:tracking-[0.22em]">
              {copy.experienceLabel}
            </p>
            <h1 className="font-heading text-4xl font-bold leading-none text-white sm:text-5xl md:text-7xl">
              {content.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl">
              {content.detailDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-sm text-white sm:mt-8 sm:gap-3">
              {boatContent && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                  <Ship className="h-4 w-4 text-[var(--color-gold)]" />
                  {boatContent.title}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                <Clock className="h-4 w-4 text-[var(--color-gold)]" />
                {durationText}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur">
                <Users className="h-4 w-4 text-[var(--color-gold)]" />
                {service.capacityMax}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
              <ExperienceBookingDialogButton
                {...bookingCardProps}
                label={copy.bookNow}
                className="w-full !bg-[var(--color-gold)] px-8 py-6 text-base font-semibold !text-white shadow-xl hover:!bg-[#b86504] hover:!text-white sm:w-auto"
              />
              <SmoothAnchorLink
                targetId="itinerary"
                className={`inline-flex w-full items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white sm:w-auto ${liquidGlassButton}`}
              >
                {t("experience.itinerary")}
              </SmoothAnchorLink>
              <Link
                href={recoveryHref}
                className={`inline-flex w-full items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white sm:w-auto ${liquidGlassButton}`}
              >
                {recoveryLabel}
              </Link>
            </div>
          </ScrollSection>

          <ScrollSection animation="fade-left" delay={0.1} className="hidden lg:block">
            <HeroFramedGallery items={gallery} />
          </ScrollSection>
        </div>
      </section>
      <ExperiencePresenceNotice serviceId={service.id} locale={locale} />

      <main className="relative z-10 -mt-8 px-4 pb-20 sm:-mt-12 sm:pb-24 md:px-8 lg:px-12">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <div className="order-2 min-w-0 space-y-12 sm:space-y-16 lg:order-1">
            <ScrollSection animation="fade-up">
              <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {editorial.eyebrow}
                </p>
                <h2 className="mt-3 max-w-3xl font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {editorial.title}
                </h2>
                <div className="mt-6 space-y-5 text-base leading-8 text-slate-700 sm:mt-8 sm:text-lg sm:leading-9">
                  {editorial.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            </ScrollSection>

            {boatGallery.length > 0 && (
              <ScrollSection animation="fade-up">
                <ExperienceBoatGallery
                  eyebrow={
                    locale === "es"
                      ? "El barco"
                      : locale === "fr"
                        ? "Le bateau"
                        : locale === "de"
                          ? "Das Boot"
                          : locale === "en"
                            ? "The boat"
                            : "La barca"
                  }
                  title={boatContent?.title ?? ""}
                  description={boatContent?.description ?? ""}
                  items={boatGallery}
                />
              </ScrollSection>
            )}

            <ScrollSection animation="fade-up">
              <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                    {seoExpansion.practicalEyebrow}
                  </p>
                  <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                    {seoExpansion.practicalTitle}
                  </h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {seoExpansion.practicalItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <article key={item.title} className="rounded-lg bg-white p-5 shadow-sm">
                          <Icon className="h-5 w-5 text-[var(--color-gold)]" />
                          <h3 className="mt-4 text-base font-semibold text-[var(--color-ocean)]">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {item.text}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg bg-[var(--color-ocean)] p-6 text-white shadow-sm md:p-8">
                  <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                    {seoExpansion.whatYouSeeTitle}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/72">
                    {seoExpansion.whatYouSeeIntro}
                  </p>
                  <div className="mt-6 divide-y divide-white/12">
                    {seoExpansion.whatYouSeeItems.map((item) => (
                      <article key={item.title} className="py-4 first:pt-0 last:pb-0">
                        <h3 className="text-base font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-white/70">
                          {item.text}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </ScrollSection>

            {gallery.length > 0 && (
              <ScrollSection animation="fade-up">
                <section className="min-w-0">
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl">
                      {copy.galleryTitle}
                    </h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {gallery.map((item) => (
                      <figure key={item.src} className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={item.src!}
                            alt={item.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                        <figcaption className="px-4 py-3 text-sm font-medium text-slate-600">
                          {item.caption}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              </ScrollSection>
            )}

            <ScrollSection animation="fade-up">
              <section id="itinerary" className="scroll-mt-28">
                <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {t("experience.itinerary")}
                </h2>
                <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
                  {itinerary.map((item, index) => (
                    <div
                      key={`${item.time}-${item.text}`}
                      className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:gap-4 sm:p-5 md:grid-cols-[7rem_minmax(0,1fr)] md:items-start"
                    >
                      <div className="flex items-center gap-3 md:block">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-turquoise)]/12 text-sm font-bold text-[var(--color-ocean)]">
                          {index + 1}
                        </span>
                        <p className="font-heading text-base font-bold text-[var(--color-ocean)] sm:text-lg md:mt-3">
                          {item.time}
                        </p>
                      </div>
                      <div>
                        {item.title && (
                          <h3 className="font-heading text-lg font-bold text-[var(--color-ocean)]">
                            {item.title}
                          </h3>
                        )}
                        {item.location && (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-gold)]">
                            {item.location}
                          </p>
                        )}
                        <p
                          className={`${item.title || item.location ? "mt-2 " : ""}text-sm leading-6 text-slate-600 sm:text-base sm:leading-7`}
                        >
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </ScrollSection>

            {gourmetMenus.length > 0 && (
              <ScrollSection animation="fade-up">
                <section id="sample-menus" className="scroll-mt-28">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                      {gourmetMenuCopy.eyebrow}
                    </p>
                    <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                      {gourmetMenuCopy.title}
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                      {gourmetMenuCopy.intro}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {gourmetMenus.map((menu, index) => (
                      <article
                        key={menu.title}
                        className="flex h-full flex-col rounded-lg bg-white p-5 shadow-sm sm:p-6"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
                              {`Menu ${index + 1}`}
                            </p>
                            <h3 className="mt-2 font-heading text-xl font-bold text-[var(--color-ocean)]">
                              {menu.title}
                            </h3>
                          </div>
                          {menu.badge ? (
                            <span className="shrink-0 rounded-full bg-[var(--color-gold)]/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-gold)]">
                              {menu.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {menu.subtitle}
                        </p>
                        <ul className="mt-5 space-y-3">
                          {menu.items.map((item) => (
                            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-turquoise)]/12">
                                <Check className="h-3.5 w-3.5 text-[var(--color-turquoise)]" />
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>

                  <p className="mt-5 rounded-lg border border-[var(--color-gold)]/25 bg-white/65 p-4 text-sm leading-6 text-slate-600">
                    {gourmetMenuCopy.seasonalNote}
                  </p>
                </section>
              </ScrollSection>
            )}

            <ScrollSection animation="fade-up">
              <section className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl">
                    {t("experience.includes")}
                  </h2>
                  <div className="mt-6 grid gap-3">
                    {content.includes.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-turquoise)]/12">
                          <Check className="h-4 w-4 text-[var(--color-turquoise)]" />
                        </span>
                        <span className="text-sm leading-6 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl">
                    {t("experience.bring")}
                  </h2>
                  <div className="mt-6 grid gap-3">
                    {content.bringItems.map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)]/12">
                          <Luggage className="h-4 w-4 text-[var(--color-gold)]" />
                        </span>
                        <span className="text-sm leading-6 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </ScrollSection>

            <ScrollSection animation="fade-up">
              <section id="faq" className="scroll-mt-28">
                <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {seoExpansion.faqTitle}
                </h2>
                <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow-sm sm:mt-8">
                  {seoExpansion.faqs.map((faq, index) => (
                    <details key={faq.question} className="group p-5 open:bg-[#f7f2e8]/45 sm:p-6" open={index === 0}>
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left text-base font-semibold text-[var(--color-ocean)]">
                        <span>{faq.question}</span>
                        <span className="mt-1 text-xl leading-none text-[var(--color-gold)] transition group-open:rotate-45">
                          +
                        </span>
                      </summary>
                      <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            </ScrollSection>

          </div>

          <aside className="hidden lg:order-2 lg:block lg:sticky lg:top-24 lg:self-start">
            <ExperienceBookingCard {...bookingCardProps} />
          </aside>
        </div>

        {relatedExperiences.length > 0 && (
          <ScrollSection animation="fade-up" className="mx-auto mt-16 max-w-7xl">
            <section id="related-experiences" className="scroll-mt-28">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {locale === "es"
                    ? "Más ideas"
                    : locale === "fr"
                      ? "Autres idées"
                      : locale === "de"
                        ? "Weitere Ideen"
                        : locale === "en"
                          ? "More ideas"
                          : "Altre idee"}
                </p>
                <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {locale === "es"
                    ? "También puedes ver estas experiencias"
                    : locale === "fr"
                      ? "Vous pouvez aussi voir ces expériences"
                      : locale === "de"
                        ? "Diese Erlebnisse könnten auch passen"
                        : locale === "en"
                          ? "You may also want to view these experiences"
                          : "Prova a visionare anche queste esperienze"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  {locale === "es"
                    ? "Compara formatos, barcos y horarios antes de elegir la mejor forma de vivir las Islas Egadi."
                    : locale === "fr"
                      ? "Comparez formats, bateaux et horaires avant de choisir la meilleure façon de vivre les îles Égades."
                      : locale === "de"
                        ? "Vergleichen Sie Formate, Boote und Zeiten, bevor Sie die passende Art wählen, die Ägadischen Inseln zu erleben."
                        : locale === "en"
                          ? "Compare formats, boats and timings before choosing the right way to experience the Egadi Islands."
                          : "Confronta formule, barche e durata prima di scegliere il modo giusto per vivere le Isole Egadi."}
                </p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {relatedExperiences.map((item) => {
                  const relatedImage = item.media.find((media) => media.src) ?? item.media[0];
                  return (
                    <Link
                      key={item.serviceId}
                      href={localizedPath(locale, `/experiences/${getExperiencePublicSlug(item.serviceId, locale)}`)}
                      className="group overflow-hidden rounded-lg bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-gold)] focus:ring-offset-2"
                    >
                      <div className="relative aspect-[4/3] bg-slate-200">
                        {relatedImage?.src && (
                          <Image
                            src={relatedImage.src}
                            alt={relatedImage.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-heading text-xl font-bold text-[var(--color-ocean)]">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.subtitle}
                        </p>
                        <span className="mt-4 inline-flex text-sm font-bold text-[var(--color-gold)]">
                          {locale === "es"
                            ? "Ver experiencia"
                            : locale === "fr"
                              ? "Voir l'expérience"
                              : locale === "de"
                                ? "Erlebnis ansehen"
                                : locale === "en"
                                  ? "View experience"
                                  : "Vedi esperienza"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </ScrollSection>
        )}

        <ScrollSection animation="fade-up" className="mx-auto mt-16 max-w-7xl">
          <section className="overflow-hidden rounded-lg bg-[var(--color-ocean)] px-6 py-10 text-center shadow-xl md:px-12">
            <Anchor className="mx-auto h-8 w-8 text-[var(--color-gold)]" />
            <h2 className="mt-4 font-heading text-3xl font-bold text-white">
              {t("experience.bookNow")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/70">
              {content.subtitle}
            </p>
            <ExperienceBookingDialogButton
              {...bookingCardProps}
              label={copy.bookNow}
              showIcon={false}
              className="mt-8 !bg-white px-10 py-6 text-base font-semibold !text-[var(--color-ocean)] hover:!bg-white/90 hover:!text-[var(--color-ocean)]"
            />
            <Link
              href={recoveryHref}
              className={`ml-0 mt-3 inline-flex rounded-lg px-8 py-3 text-sm font-semibold text-white sm:ml-3 ${liquidGlassButton}`}
            >
              {recoveryLabel}
            </Link>
          </section>
        </ScrollSection>
      </main>
    </div>
  );
}
