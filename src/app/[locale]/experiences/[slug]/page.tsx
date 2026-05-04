import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Anchor,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Compass,
  Luggage,
  Ship,
  Sparkles,
  Users,
  Waves,
} from "lucide-react";
import { ScrollSection } from "@/components/scroll-section";
import {
  ExperienceBookingCard,
  ExperienceBookingDialogButton,
  SmoothAnchorLink,
} from "@/components/experience-detail-actions";
import { ExperiencePresenceBadge } from "@/components/experience-presence-badge";
import {
  getExperienceContent,
  getExperiencePublicSlug,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { getBoatContent } from "@/data/catalog/boats";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { vatIncludedLabel } from "@/lib/pricing/vat-label";
import { getExperienceItinerary } from "@/lib/experiences/itineraries";
import {
  getCharterDurationDisplayPrices,
  getDisplayPrice,
  getSeasonalDisplayPrices,
} from "@/lib/pricing/display";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import { PUBLIC_COMPANY_LEGAL, PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";

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
    overviewTitle: isEn ? "The Experience" : "L'esperienza",
    overviewEyebrow: isEn ? "What makes it special" : "Perche sceglierla",
    bookingTitle: isEn ? "Plan this experience" : "Organizza questa esperienza",
    bookingText: isEn
      ? "Choose your date and continue to the booking flow with live prices and availability."
      : "Scegli la data e continua nel flusso di prenotazione con prezzi e disponibilita aggiornati.",
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
            : "Quattro ore concentrate sulle acque piu riparate della giornata, con rientro chiaro e senza corse."
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
          : "La barca e dedicata al tuo gruppo, quindi soste e ritmo si costruiscono con lo skipper."
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
          : "Una fascia piu lunga significa piu tempo in acqua, piu flessibilita e meno pressione tra le soste."
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
      : "Favignana, Levanzo e Marettimo possono entrare nella rotta su piu giornate, sempre in base al meteo."
    : isFullDay
      ? isEn
        ? "The full day gives room for Favignana, Levanzo, swim stops and relaxed time at anchor."
        : "La giornata intera lascia spazio a Favignana, Levanzo, soste bagno e tempo in rada senza fretta."
      : isHalfDay
        ? isEn
          ? "The half day focuses on the best sheltered coves between Favignana and Levanzo."
          : "La mezza giornata si concentra sulle cale piu riparate tra Favignana e Levanzo."
    : isEn
      ? "The crew plans the route between the most scenic and sheltered Egadi bays."
      : "La crew costruisce la rotta tra le baie piu sceniche e riparate delle Egadi.";

  const formulaText = isCharter
    ? isEn
      ? "A private trimaran charter with skipper, cabins and a day-by-day route."
      : "Charter privato in trimarano con skipper, cabine e rotta costruita giorno per giorno."
    : isPrivateBoat
      ? isEn
        ? "The boat is reserved for your group, with stops and rhythm shaped with the skipper."
        : "La barca e riservata al tuo gruppo, con soste e ritmo concordati con lo skipper."
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
            title: isEn ? "More swim time" : "Piu tempo in acqua",
            text: isEn
              ? "Eight hours mean less pressure between coves and more time for snorkelling."
              : "Otto ore significano meno pressione tra le cale e piu tempo per snorkeling e bagno.",
          },
          {
            title: isEn ? "Favignana and Levanzo" : "Favignana e Levanzo",
            text: isEn
              ? "The crew can work across both islands when the sea conditions allow it."
              : "La crew puo lavorare su entrambe le isole quando il mare lo permette.",
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
              : "Lo skipper sceglie le acque piu sicure e limpide raggiungibili in mezza giornata.",
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
          question: isEn ? "How many days can the Egadi charter last?" : "Quanto puo durare il charter alle Egadi?",
          answer: isEn
            ? "The charter can be planned from 3 to 7 days, with the route adjusted around weather, sea conditions and the pace you want on board."
            : "Il charter puo essere pianificato da 3 a 7 giornate, con rotta adattata a meteo, mare e ritmo che vuoi a bordo.",
        },
        {
          question: isEn ? "Is provisioning included?" : "La cambusa e inclusa?",
          answer: isEn
            ? "Provisioning is not included in the package price. It can be organised with the crew before departure, together with any pantry refills."
            : "La cambusa non e inclusa nel prezzo del pacchetto. Puo essere organizzata con la crew prima della partenza, insieme a eventuali refill.",
        },
        {
          question: isEn ? "Can we choose the route?" : "Possiamo scegliere la rotta?",
          answer: isEn
            ? "Yes. The itinerary is agreed with the skipper and then adapted day by day according to wind, sea and anchorage conditions."
            : "Si. L'itinerario si concorda con lo skipper e poi viene adattato giorno per giorno in base a vento, mare e condizioni delle rade.",
        },
        {
          question: isEn ? "Where does boarding take place?" : "Dove avviene l'imbarco?",
          answer: isEn
            ? "Boarding is in Trapani, at Via dei Gladioli 15, 91100 Trapani, unless the crew confirms a different operational meeting point."
            : "L'imbarco e a Trapani, in Via dei Gladioli 15, 91100 Trapani, salvo diversa indicazione operativa della crew.",
        },
      ]
    : [
        {
          question: isEn ? "Where does the Egadi boat tour depart from?" : "Da dove parte il tour in barca alle Egadi?",
          answer: isEn
            ? "Departure is from Trapani, meeting at Via dei Gladioli 15, 91100 Trapani, unless the crew sends a different operational update."
            : "La partenza e da Trapani, con punto di incontro in Via dei Gladioli 15, 91100 Trapani, salvo diversa comunicazione operativa della crew.",
        },
        {
          question: isEn ? "Is the route always fixed?" : "La rotta e sempre la stessa?",
          answer: isEn
            ? "No. The skipper chooses the safest and most enjoyable route according to wind, sea, crowding and the time available."
            : "No. Lo skipper sceglie la rotta piu sicura e piacevole in base a vento, mare, affollamento e tempo disponibile.",
        },
        {
          question: isEn ? "Is this experience shared or private?" : "Questa esperienza e condivisa o privata?",
          answer: formulaText,
        },
        {
          question: isEn ? "Should I choose 4 hours or 8 hours?" : "Meglio scegliere 4 ore o 8 ore?",
          answer: isHalfDay
            ? isEn
              ? "Choose 4 hours if you want a compact, clear schedule. Choose 8 hours if you want more swim time and more flexibility between Favignana and Levanzo."
              : "Scegli 4 ore se vuoi una fascia compatta e orari chiari. Scegli 8 ore se vuoi piu tempo in acqua e piu flessibilita tra Favignana e Levanzo."
            : isEn
              ? "The 8-hour tour is best if you want a full day, more swim stops and a slower rhythm. The 4-hour tour works better when you have limited time."
              : "Il tour di 8 ore e ideale se vuoi una giornata completa, piu soste bagno e ritmo lento. Il 4 ore funziona meglio quando hai poco tempo.",
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
      : "Qualche dettaglio in piu per scegliere l'esperienza giusta prima di prenotare.",
    whatYouSeeItems,
    faqTitle: isEn ? "Questions about this experience" : "Domande su questa esperienza",
    faqs,
  };
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

  const service = await db.service.findUnique({ where: { id: serviceId } });

  if (!service || !service.active) notFound();
  const content = getExperienceContent(service.id, locale);
  if (!content) notFound();

  const boatContent = getBoatContent(service.boatId, locale);
  const [seasonalPrices, charterPrices, displayPrice, itinerary] = await Promise.all([
    getSeasonalDisplayPrices(service.id),
    service.type === "CABIN_CHARTER"
      ? getCharterDurationDisplayPrices(service.id)
      : Promise.resolve([]),
    getDisplayPrice(service.id),
    getExperienceItinerary(service.id, locale, content.itinerary),
  ]);

  const copy = getDetailCopy(locale, service);
  const pagePath = `/experiences/${getExperiencePublicSlug(service.id)}`;
  const bookingServiceParam = getExperiencePublicSlug(service.id);
  const bookingHref = `/${locale}/prenota?service=${bookingServiceParam}`;
  const recoveryHref = `/${locale}/recupera-prenotazione`;
  const recoveryLabel = locale === "en" ? "Find booking" : "Recupera prenotazione";
  const durationText = getServiceDurationLabel(service);
  const seoExpansion = getSeoExpansionCopy(locale, service, durationText, boatContent?.title);
  const priceUnit =
    service.type === "CABIN_CHARTER" || service.pricingUnit === "PER_PACKAGE"
      ? getPriceUnitLabel(service.pricingUnit, service.type)
      : t("experience.perPerson");
  const priceUnitWithVat = `${priceUnit} · ${vatIncludedLabel(locale)}`;
  const heroMedia = content.media.find((item) => item.src) ?? content.media[0];
  const heroImage = heroMedia?.src ?? FALLBACK_HERO_IMAGE;
  const gallery = content.media.filter((item) => item.src);
  const priceLabel = displayPrice.amount
    ? `${t("experience.from")} ${formatEur(displayPrice.amount)}`
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
        description: content.seoDescription,
        duration: schemaDuration,
        touristType: touristTypes,
        image: gallery.length > 0 ? gallery.map((item) => absoluteUrl(item.src!)) : [absoluteUrl(heroImage)],
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
    ],
  };

  const highlights = [
    {
      icon: Compass,
      title: copy.routeTitle,
      text: copy.routeText,
    },
    {
      icon: service.type === "CABIN_CHARTER" ? Anchor : Ship,
      title: copy.onboardTitle,
      text: copy.onboardText,
    },
    {
      icon: service.type === "CABIN_CHARTER" ? Sparkles : Waves,
      title: copy.rhythmTitle,
      text: copy.rhythmText,
    },
  ];
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
              <ExperiencePresenceBadge serviceId={service.id} locale={locale} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row">
              <ExperienceBookingDialogButton
                {...bookingCardProps}
                label={copy.bookNow}
                className="w-full bg-[var(--color-gold)] px-8 py-6 text-base font-semibold text-white shadow-xl hover:bg-[var(--color-gold)]/90 sm:w-auto"
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

      <main className="relative z-10 -mt-8 px-4 pb-20 sm:-mt-12 sm:pb-24 md:px-8 lg:px-12">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
          <div className="order-2 min-w-0 space-y-12 sm:space-y-16 lg:order-1">
            <ScrollSection animation="fade-up">
              <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-gold)]">
                  {copy.overviewEyebrow}
                </p>
                <h2 className="mt-3 font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                  {copy.overviewTitle}
                </h2>
                <div className="mt-6 grid gap-4 md:mt-8 md:grid-cols-3">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-lg border border-slate-200 bg-[#f7f2e8]/60 p-5">
                        <Icon className="h-6 w-6 text-[var(--color-gold)]" />
                        <h3 className="mt-4 text-lg font-semibold text-[var(--color-ocean)]">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            </ScrollSection>

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

            {(service.type === "CABIN_CHARTER" ? charterPrices.length > 0 : seasonalPrices.length > 0) && (
              <ScrollSection animation="fade-up">
                <section>
                  <h2 className="font-heading text-2xl font-bold text-[var(--color-ocean)] sm:text-3xl md:text-4xl">
                    {t("experience.pricing")}
                  </h2>
                  <div className="mt-8 max-w-full overflow-hidden rounded-lg bg-white shadow-sm">
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full min-w-[620px]">
                        <thead>
                          <tr className="bg-[var(--color-ocean)] text-white">
                            <th className="p-4 text-left font-heading">
                              {service.type === "CABIN_CHARTER" ? "Durata" : t("experience.periodLabel")}
                            </th>
                            <th className="p-4 text-left font-heading">
                              {service.type === "CABIN_CHARTER" ? "Stagione" : t("experience.periodDates")}
                            </th>
                            <th className="p-4 text-right font-heading">
                              {copy.priceHeader}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {service.type === "CABIN_CHARTER"
                            ? charterPrices.map((price, i) => (
                                <tr
                                  key={`${price.durationDays}:${price.seasonKey ?? "all"}`}
                                  className={i % 2 === 0 ? "bg-white" : "bg-[#f7f2e8]/55"}
                                >
                                  <td className="p-4 font-medium text-[var(--color-ocean)]">
                                    {copy.daysLabel(price.durationDays)}
                                  </td>
                                  <td className="p-4 text-slate-600">
                                    {price.seasonLabel ?? copy.charterType}
                                  </td>
                                  <td className="p-4 text-right font-semibold text-[var(--color-gold)]">
                                    {formatEur(price.amount)}{" "}
                                    <span className="text-sm font-normal text-slate-500">
                                      {priceUnitWithVat}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            : seasonalPrices.map((period, i) => (
                                <tr
                                  key={period.seasonKey}
                                  className={i % 2 === 0 ? "bg-white" : "bg-[#f7f2e8]/55"}
                                >
                                  <td className="p-4 font-medium text-[var(--color-ocean)]">
                                    {period.seasonLabel}
                                  </td>
                                  <td className="p-4 text-slate-600">
                                    <span className="inline-flex items-center gap-1.5">
                                      <CalendarDays className="h-4 w-4" />
                                      {period.startDate.toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                      })}{" "}
                                      -{" "}
                                      {period.endDate.toLocaleDateString(locale, {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right font-semibold text-[var(--color-gold)]">
                                    {period.amount ? formatEur(period.amount) : "Su richiesta"}{" "}
                                    <span className="text-sm font-normal text-slate-500">
                                      {priceUnitWithVat}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </ScrollSection>
            )}
          </div>

          <aside className="hidden lg:order-2 lg:block lg:sticky lg:top-24 lg:self-start">
            <ExperienceBookingCard {...bookingCardProps} />
          </aside>
        </div>

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
              className="mt-8 bg-white px-10 py-6 text-base font-semibold text-[var(--color-ocean)] hover:bg-white/90"
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
