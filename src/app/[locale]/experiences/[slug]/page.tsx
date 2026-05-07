import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
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

const FALLBACK_HERO_IMAGE =
  "/images/egadisailing-experience/02-isole-egadi-come-non-le-hai-mai-viste.webp";

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function getDetailCopy(
  locale: string,
  service: { type: string; durationType: string },
) {
  const isEn = locale === "en";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isHalfDay = service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

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
  service: { type: string; durationType: string; durationHours: number; capacityMax: number },
  durationText: string,
  boatTitle?: string,
) {
  const isEn = locale === "en";
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const isFullDay = service.durationType === "FULL_DAY";

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
  service: { type: string; durationType: string; capacityMax: number },
  title: string,
  boatTitle?: string,
) {
  const isEn = locale === "en";
  const boat = boatTitle ?? (isEn ? "the selected boat" : "la barca selezionata");
  const isCharter = service.type === "CABIN_CHARTER";
  const isPrivateBoat = service.type === "BOAT_EXCLUSIVE";
  const isSharedBoat = service.type === "BOAT_SHARED";
  const isGourmet = service.type === "EXCLUSIVE_EXPERIENCE";
  const isHalfDay =
    service.durationType === "HALF_DAY_MORNING" || service.durationType === "HALF_DAY_AFTERNOON";
  const plannedIslandsEn = isCharter ? "Favignana, Levanzo and Marettimo" : "Favignana and Levanzo";
  const plannedIslandsIt = isCharter ? "Favignana, Levanzo e Marettimo" : "Favignana e Levanzo";

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

  return {
    eyebrow: isEn ? "Chef on board" : "Chef a bordo",
    title: isEn ? "Sample gourmet menus" : "Esempi di menu gourmet",
    intro: isEn
      ? "Three sample lunch styles served on board during the Gourmet Experience. The final menu is confirmed with the chef according to fresh catch, seasonality and guest needs."
      : "Tre esempi di pranzo servito a bordo durante l'Esperienza Gourmet. Il menu definitivo viene concordato con lo chef in base a pescato fresco, stagione ed esigenze degli ospiti.",
    seasonalNote: isEn
      ? "Menus may vary according to availability. Allergies, intolerances and important dietary needs should be communicated before departure."
      : "I menu possono variare in base alla disponibilità. Allergie, intolleranze ed esigenze alimentari importanti vanno comunicate prima della partenza.",
  };
}

function getGourmetSampleMenus(locale: string) {
  const isEn = locale === "en";

  return [
    {
      title: isEn ? "Favignana Tuna Menu" : "Menu tonno di Favignana",
      subtitle: isEn ? "Local fish, Sicilian flavours and a relaxed finish." : "Pesce locale, sapori siciliani e chiusura leggera.",
      items: isEn
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
      title: isEn ? "Trapani Sea Menu" : "Menu mare trapanese",
      subtitle: isEn ? "A softer seafood menu built around mussels and local wine." : "Una proposta di mare più delicata, con cozze e vino del territorio.",
      items: isEn
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
      title: isEn ? "Premium Raw Seafood Menu" : "Menu crudité premium",
      subtitle: isEn ? "Available only on explicit request with a supplement." : "Disponibile solo su esplicita richiesta e con supplemento.",
      badge: isEn ? "On request" : "Su richiesta",
      items: isEn
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
    path: `/experiences/${getExperiencePublicSlug(service.id)}`,
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

  const boatContent = getBoatContent(service.boatId, locale);
  const [displayPrice, itinerary] = await Promise.all([
    getDisplayPrice(service.id, 2026, locale),
    getExperienceItinerary(service.id, locale, content.itinerary),
  ]);

  const copy = getDetailCopy(locale, service);
  const pagePath = `/experiences/${getExperiencePublicSlug(service.id)}`;
  const bookingServiceParam = getExperiencePublicSlug(service.id);
  const bookingHref = `/${locale}/prenota?service=${bookingServiceParam}`;
  const recoveryHref = `/${locale}/recupera-prenotazione`;
  const recoveryLabel = locale === "en" ? "Find booking" : "Recupera prenotazione";
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
  const pageUrl = `${siteBase}/${locale}${pagePath}`;
  const bookingUrl = `${siteBase}${bookingHref}`;
  const schemaDuration =
    service.type === "CABIN_CHARTER"
      ? "P3D"
      : service.durationHours > 0
        ? `PT${service.durationHours}H`
        : undefined;
  const touristTypes =
    service.type === "CABIN_CHARTER"
      ? ["Private charter", "Multi-day sailing", "Egadi Islands"]
      : service.type === "BOAT_SHARED"
        ? ["Shared boat tour", "Snorkelling", "Egadi Islands"]
        : service.type === "BOAT_EXCLUSIVE"
          ? ["Private boat tour", "Families", "Small groups"]
          : ["Gourmet sailing experience", "Private group", "Egadi Islands"];
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Egadisailing",
            item: `${siteBase}/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: t("experience.allExperiences"),
            item: `${siteBase}/${locale}/experiences`,
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
        name: locale === "en" ? "Related Egadi experiences" : "Esperienze Egadi correlate",
        itemListElement: relatedExperiences.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${siteBase}/${locale}/experiences/${getExperiencePublicSlug(item.serviceId)}`,
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
              href={`/${locale}/experiences`}
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
                  eyebrow={locale === "en" ? "The boat" : "La barca"}
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
                  {locale === "en" ? "More ideas" : "Altre idee"}
                </p>
                <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {locale === "en"
                    ? "You may also want to view these experiences"
                    : "Prova a visionare anche queste esperienze"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  {locale === "en"
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
                      href={`/${locale}/experiences/${getExperiencePublicSlug(item.serviceId)}`}
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
                          {locale === "en" ? "View experience" : "Vedi esperienza"}
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
