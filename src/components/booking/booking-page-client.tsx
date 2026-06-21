"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Ship,
  type LucideIcon,
  Users,
} from "lucide-react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { cn } from "@/lib/utils";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";
import { vatIncludedLabel } from "@/lib/pricing/vat-label";

export interface BookingServiceOption {
  id: string;
  title: string;
  subtitle: string;
  detailDescription: string;
  imageSrc?: string;
  imageAlt?: string;
  includes: string[];
  notIncluded: string[];
  locations: string[];
  boatId: string;
  boatTitle: string;
  boatImageSrc?: string;
  boatImageAlt?: string;
  serviceType: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  defaultPaymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  defaultDepositPercentage: number | null;
  priceLabel: string;
  priceUnitLabel: string;
  durationLabel: string;
}

interface BookingPageClientProps {
  locale: string;
  services: BookingServiceOption[];
  initialServiceId?: string;
  initialBoatId?: string;
  initialExperienceKey?: string;
  initialDurationType?: string;
  turnstileSiteKey: string;
  appUrl: string;
  useStripeCheckout: boolean;
  initialStartDate?: string;
  initialEndDate?: string;
  initialDurationDays?: number;
}

type SelectionStep = "boat" | "experience" | "duration" | "booking";

interface ExperienceOption {
  key: string;
  title: string;
  subtitle: string;
  detailDescription: string;
  imageSrc?: string;
  imageAlt?: string;
  includes: string[];
  notIncluded: string[];
  locations: string[];
  services: BookingServiceOption[];
}

const BOOKING_BOAT_ORDER: Record<string, number> = {
  trimarano: 10,
  boat: 20,
  "fishing-rib": 30,
};
const IMAGE_CARD_TEXT_SHADOW = "[text-shadow:0_2px_14px_rgba(0,0,0,0.88)]";
const IMAGE_CARD_SUBTEXT_SHADOW = "[text-shadow:0_1px_10px_rgba(0,0,0,0.82)]";

function bookingBoatTitle(boatId: string, fallback: string, locale: string): string {
  if (boatId !== "boat") return fallback;
  if (locale === "es") return "Barco";
  if (locale === "fr") return "Bateau";
  if (locale === "de") return "Boot";
  if (locale === "en") return "Boat";
  return "Barca";
}

function bookingBoatSubtitle(boatId: string, locale: string): string {
  if (boatId === "trimarano") {
    return locale === "es"
      ? "Confort premium, chef a bordo y charter privado."
      : locale === "fr"
        ? "Confort premium, chef à bord et charters privés."
        : locale === "de"
          ? "Premium-Komfort, Chefkoch an Bord und private Charter."
          : locale === "en"
            ? "Premium comfort, chef on board and private charters."
            : "Comfort premium, chef a bordo e charter privati.";
  }
  if (boatId === "boat") {
    return locale === "es"
      ? "Tours ágiles en barco, privados o compartidos, con paradas de baño."
      : locale === "fr"
        ? "Sorties bateau agiles, privées ou partagées, avec baignades."
        : locale === "de"
          ? "Agile Bootstouren, privat oder geteilt, mit Badestopps."
          : locale === "en"
            ? "Agile boat tours, private or shared, with swim stops."
            : "Tour in barca agili, privati o condivisi, con soste bagno.";
  }
  if (boatId === "fishing-rib") {
    return locale === "es"
      ? "Jornada de pesca deportiva con setup profesional."
      : locale === "fr"
        ? "Journée de pêche sportive avec setup professionnel."
        : locale === "de"
          ? "Sportangeltag mit professionellem Setup."
          : locale === "en"
            ? "Sport fishing day with professional setup."
            : "Giornata di pesca sportiva con setup professionale.";
  }
  return locale === "es"
    ? "Elige esta opción para ver las experiencias disponibles."
    : locale === "fr"
      ? "Choisissez cette option pour voir les expériences disponibles."
      : locale === "de"
        ? "Wählen Sie diese Option, um verfügbare Erlebnisse zu sehen."
        : locale === "en"
          ? "Choose this option to see available experiences."
          : "Scegli questa opzione per vedere le esperienze disponibili.";
}

function bookingBoatImageSrc(service: BookingServiceOption): string {
  if (service.boatImageSrc) return service.boatImageSrc;
  if (service.boatId === "trimarano") return "/images/boats/neel-47/neel-47-hero.webp";
  if (service.boatId === "boat") return "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";
  if (service.boatId === "fishing-rib") return "/images/boats/fishing-rib/fishing-rib-hero.webp";
  return "/videos/hero-poster.webp";
}

function bookingBoatImageAlt(
  boatId: string,
  fallback: string | undefined,
  locale: string,
): string {
  if (boatId === "boat") {
    if (locale === "es") return "Barco en navegación por las Islas Egadi";
    if (locale === "fr") return "Bateau en navigation aux îles Égades";
    if (locale === "de") return "Boot auf Fahrt zwischen den Ägadischen Inseln";
    if (locale === "en") return "Boat cruising through the Egadi Islands";
    return "Barca in navigazione alle Isole Egadi";
  }
  return fallback ?? bookingBoatTitle(boatId, boatId, locale);
}

function experienceKey(service: BookingServiceOption): string {
  if (service.serviceType === "BOAT_SHARED") return `${service.boatId}:BOAT_SHARED`;
  if (service.serviceType === "BOAT_EXCLUSIVE") return `${service.boatId}:BOAT_EXCLUSIVE`;
  return `${service.boatId}:${service.id}`;
}

function experienceTitle(service: BookingServiceOption, locale: string): string {
  if (service.serviceType === "BOAT_SHARED") {
    return locale === "es"
      ? "Barco compartido"
      : locale === "fr"
        ? "Bateau partagé"
        : locale === "de"
          ? "Geteiltes Boot"
        : locale === "en"
          ? "Shared boat"
          : "Barca condivisa";
  }
  if (service.serviceType === "BOAT_EXCLUSIVE") {
    return locale === "es"
      ? "Barco exclusivo"
      : locale === "fr"
        ? "Bateau privatisé"
        : locale === "de"
          ? "Privates Boot"
        : locale === "en"
          ? "Exclusive boat"
          : "Barca in esclusiva";
  }
  return service.title;
}

function durationOptionLabel(service: BookingServiceOption, locale: string): string {
  if (service.durationType === "FULL_DAY") {
    return locale === "es" ? "Día completo" : locale === "fr" ? "Journée complète" : locale === "de" ? "Ganztag" : locale === "en" ? "Full day" : "Giornata intera";
  }
  if (service.durationType === "HALF_DAY_MORNING") {
    return locale === "es" ? "Mañana" : locale === "fr" ? "Matin" : locale === "de" ? "Vormittag" : locale === "en" ? "Morning" : "Mattina";
  }
  if (service.durationType === "HALF_DAY_AFTERNOON") {
    return locale === "es" ? "Tarde" : locale === "fr" ? "Après-midi" : locale === "de" ? "Nachmittag" : locale === "en" ? "Afternoon" : "Pomeriggio";
  }
  return service.durationLabel;
}

function durationDetail(service: BookingServiceOption, locale: string): string {
  const unit =
    locale === "es"
      ? service.durationHours === 1
        ? "hora"
        : "horas"
      : locale === "en"
        ? service.durationHours === 1
          ? "hour"
          : "hours"
        : locale === "de"
          ? service.durationHours === 1
            ? "Stunde"
            : "Stunden"
        : locale === "fr"
          ? service.durationHours === 1
            ? "heure"
            : "heures"
        : "ore";
  if (service.durationType === "FULL_DAY") return `${service.durationHours} ${unit}`;
  if (service.durationType === "HALF_DAY_MORNING") return `${service.durationHours} ${unit}`;
  if (service.durationType === "HALF_DAY_AFTERNOON") return `${service.durationHours} ${unit}`;
  return service.durationLabel;
}

function sortServicesForDuration(a: BookingServiceOption, b: BookingServiceOption): number {
  const order: Record<string, number> = {
    FULL_DAY: 0,
    HALF_DAY_MORNING: 1,
    HALF_DAY_AFTERNOON: 2,
  };
  return (order[a.durationType] ?? 99) - (order[b.durationType] ?? 99);
}

function nextStepAfterExperience(services: BookingServiceOption[]): SelectionStep {
  if (services.length > 1) return "duration";
  return "booking";
}

interface BookingInfoContent {
  eyebrow: string;
  title: string;
  description: string;
  includes: string[];
  notIncluded: string[];
  locations: string[];
  priceLabel?: string;
  durationLabel?: string;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function fallbackLocations(locale: string) {
  if (locale === "es") return ["Favignana", "Levanzo", "Cala Rossa", "Cala Azzurra"];
  if (locale === "fr") return ["Favignana", "Levanzo", "Cala Rossa", "Cala Azzurra"];
  if (locale === "de") return ["Favignana", "Levanzo", "Cala Rossa", "Cala Azzurra"];
  return ["Favignana", "Levanzo", "Cala Rossa", "Cala Azzurra"];
}

function fallbackIncludes(locale: string) {
  if (locale === "es") return ["Skipper", "Combustible de la ruta", "Paradas de baño", "Asistencia antes de salir"];
  if (locale === "fr") return ["Skipper", "Carburant de la route", "Arrêts baignade", "Assistance avant départ"];
  if (locale === "de") return ["Skipper", "Kraftstoff der Route", "Badestopps", "Support vor Abfahrt"];
  if (locale === "en") return ["Skipper", "Fuel for the route", "Swim stops", "Pre-departure support"];
  return ["Skipper", "Carburante rotta", "Soste bagno", "Assistenza prima della partenza"];
}

function fallbackNotIncluded(locale: string) {
  if (locale === "es") return ["Toallas", "Protector solar", "Extras no indicados"];
  if (locale === "fr") return ["Serviettes", "Crème solaire", "Extras non indiqués"];
  if (locale === "de") return ["Handtücher", "Sonnencreme", "Nicht genannte Extras"];
  if (locale === "en") return ["Towels", "Sunscreen", "Extras not listed"];
  return ["Teli mare", "Crema solare", "Extra non indicati"];
}

function limitedItems(items: string[], fallback: string[], limit = 4) {
  const values = uniqueStrings(items);
  return (values.length > 0 ? values : fallback).slice(0, limit);
}

function locationsFromServices(services: BookingServiceOption[], locale: string) {
  return limitedItems(
    services.flatMap((service) => service.locations),
    fallbackLocations(locale),
    5,
  );
}

function trimaranLocations(locale: string) {
  if (locale === "en") return ["Favignana", "Levanzo", "San Vito Lo Capo", "Marettimo", "Aeolian Islands"];
  if (locale === "es") return ["Favignana", "Levanzo", "San Vito Lo Capo", "Marettimo", "Islas Eolias"];
  if (locale === "fr") return ["Favignana", "Levanzo", "San Vito Lo Capo", "Marettimo", "Îles Éoliennes"];
  if (locale === "de") return ["Favignana", "Levanzo", "San Vito Lo Capo", "Marettimo", "Äolische Inseln"];
  return ["Favignana", "Levanzo", "San Vito Lo Capo", "Marettimo", "Isole Eolie"];
}

function boatIncludes(locale: string) {
  if (locale === "en") {
    return [
      "Visit to the most iconic coves of Favignana and Levanzo",
      "Skipper",
      "Fuel for the planned route",
      "Weather-aware swim stops",
    ];
  }
  if (locale === "es") {
    return [
      "Visita a las calas más icónicas de Favignana y Levanzo",
      "Patrón",
      "Combustible de la ruta prevista",
      "Paradas de baño según el tiempo",
    ];
  }
  if (locale === "fr") {
    return [
      "Visite des criques les plus iconiques de Favignana et Levanzo",
      "Skipper",
      "Carburant pour la route prévue",
      "Arrêts baignade selon la météo",
    ];
  }
  if (locale === "de") {
    return [
      "Besuch der ikonischsten Buchten von Favignana und Levanzo",
      "Skipper",
      "Kraftstoff für die geplante Route",
      "Wetterabhängige Badestopps",
    ];
  }
  return [
    "Visita alle calette piu iconiche di Favignana e Levanzo",
    "Skipper",
    "Carburante per la rotta prevista",
    "Soste bagno meteo-dipendenti",
  ];
}

function boatNotIncluded(locale: string) {
  if (locale === "en") return ["Lunch", "Towels", "Sunscreen"];
  if (locale === "es") return ["Almuerzo", "Toallas", "Protector solar"];
  if (locale === "fr") return ["Déjeuner", "Serviettes", "Crème solaire"];
  if (locale === "de") return ["Mittagessen", "Handtücher", "Sonnencreme"];
  return ["Pranzo", "Teli mare", "Crema solare"];
}

function charterNotIncluded(locale: string, items: string[] = []) {
  const required =
    locale === "en"
      ? ["Galley provisioning", "Mooring fees at the islands"]
      : locale === "es"
        ? ["Despensa de a bordo", "Tasas de amarre en las islas"]
        : locale === "fr"
          ? ["Avitaillement de bord", "Frais d'amarrage dans les îles"]
          : locale === "de"
            ? ["Bordproviant", "Liegegebühren an den Inseln"]
            : ["Cambusa", "Pedaggi per gli ormeggi alle isole"];
  return limitedItems([...required, ...items], required, 4);
}

function fishingIncludes(locale: string) {
  if (locale === "en") return ["Lunch", "Skipper", "Professional fishing gear", "Fuel for the planned route"];
  if (locale === "es") return ["Almuerzo", "Patrón", "Equipo profesional de pesca", "Combustible de la ruta prevista"];
  if (locale === "fr") return ["Déjeuner", "Skipper", "Matériel de pêche professionnel", "Carburant pour la route prévue"];
  if (locale === "de") return ["Mittagessen", "Skipper", "Professionelle Angelausrüstung", "Kraftstoff für die geplante Route"];
  return ["Pranzo", "Skipper", "Attrezzatura pesca professionale", "Carburante per la rotta prevista"];
}

function fishingLocations(locale: string) {
  if (locale === "en") return ["Egadi Islands fishing spots"];
  if (locale === "es") return ["Puntos de pesca de las Islas Egadi"];
  if (locale === "fr") return ["Points de pêche des îles Égades"];
  if (locale === "de") return ["Angelplätze der Ägadischen Inseln"];
  return ["Punti di pesca Isole Egadi"];
}

function applyBoatInfoOverrides(
  boatId: string | undefined,
  info: BookingInfoContent,
  locale: string,
): BookingInfoContent {
  if (boatId === "trimarano") {
    return {
      ...info,
      locations: trimaranLocations(locale),
    };
  }
  if (boatId === "boat") {
    return {
      ...info,
      includes: boatIncludes(locale),
      notIncluded: boatNotIncluded(locale),
      locations: ["Favignana", "Levanzo"],
    };
  }
  if (boatId === "fishing-rib") {
    return {
      ...info,
      includes: fishingIncludes(locale),
      locations: fishingLocations(locale),
    };
  }
  return info;
}

function bookingBoatInfo(
  boat: { id: string; title: string; subtitle: string } | undefined,
  services: BookingServiceOption[],
  copy: ReturnType<typeof getBookingPageCopy>,
  locale: string,
): BookingInfoContent {
  return applyBoatInfoOverrides(boat?.id ?? services[0]?.boatId, {
    eyebrow: copy.quickOverview,
    title: boat?.title ?? copy.chooseBoatTitle,
    description: boat?.subtitle ?? copy.chooseBoatSubtitle,
    includes: limitedItems(services.flatMap((service) => service.includes), fallbackIncludes(locale)),
    notIncluded: fallbackNotIncluded(locale),
    locations: locationsFromServices(services, locale),
  }, locale);
}

function bookingExperienceInfo(
  option: ExperienceOption | undefined,
  copy: ReturnType<typeof getBookingPageCopy>,
  locale: string,
): BookingInfoContent {
  const primaryService = option?.services[0];
  const notIncludedSource = option?.notIncluded ?? primaryService?.notIncluded ?? [];
  const isCharter = primaryService?.serviceType === "CABIN_CHARTER";
  return applyBoatInfoOverrides(primaryService?.boatId, {
    eyebrow: copy.quickOverview,
    title: option?.title ?? copy.chooseExperienceTitle,
    description:
      option?.detailDescription ||
      option?.subtitle ||
      (primaryService ? primaryService.detailDescription || primaryService.subtitle : copy.chooseExperienceSubtitle),
    includes: limitedItems(option?.includes ?? primaryService?.includes ?? [], fallbackIncludes(locale)),
    notIncluded: isCharter
      ? charterNotIncluded(locale, notIncludedSource)
      : limitedItems(notIncludedSource, fallbackNotIncluded(locale)),
    locations: limitedItems(option?.locations ?? primaryService?.locations ?? [], fallbackLocations(locale), 5),
    priceLabel: primaryService?.priceLabel,
    durationLabel: primaryService?.durationLabel,
  }, locale);
}

function bookingServiceInfo(
  service: BookingServiceOption | undefined,
  copy: ReturnType<typeof getBookingPageCopy>,
  locale: string,
): BookingInfoContent {
  const notIncludedSource = service?.notIncluded ?? [];
  const isCharter = service?.serviceType === "CABIN_CHARTER";
  return applyBoatInfoOverrides(service?.boatId, {
    eyebrow: copy.quickOverview,
    title: service?.title ?? copy.chooseDurationTitle,
    description: service?.detailDescription || service?.subtitle || copy.chooseDurationSubtitle,
    includes: limitedItems(service?.includes ?? [], fallbackIncludes(locale)),
    notIncluded: isCharter
      ? charterNotIncluded(locale, notIncludedSource)
      : limitedItems(notIncludedSource, fallbackNotIncluded(locale)),
    locations: limitedItems(service?.locations ?? [], fallbackLocations(locale), 5),
    priceLabel: service?.priceLabel,
    durationLabel: service?.durationLabel,
  }, locale);
}

export function BookingPageClient({
  locale,
  services,
  initialServiceId,
  initialBoatId,
  initialExperienceKey: requestedInitialExperienceKey,
  initialDurationType,
  turnstileSiteKey,
  appUrl,
  useStripeCheckout,
  initialStartDate,
  initialEndDate,
  initialDurationDays,
}: BookingPageClientProps) {
  const copy = getBookingPageCopy(locale);
  const requestedService = services.find((service) => service.id === initialServiceId);
  const validInitialBoatId =
    initialBoatId && services.some((service) => service.boatId === initialBoatId)
      ? initialBoatId
      : "";
  const matchedInitialExperienceService =
    !requestedService && requestedInitialExperienceKey
      ? services.find(
          (service) =>
            experienceKey(service) === requestedInitialExperienceKey &&
            (!validInitialBoatId || service.boatId === validInitialBoatId),
        )
      : undefined;
  const resolvedInitialBoatId =
    requestedService?.boatId ??
    (validInitialBoatId || matchedInitialExperienceService?.boatId || "");
  const resolvedInitialExperienceKey = requestedService
    ? experienceKey(requestedService)
    : matchedInitialExperienceService
      ? experienceKey(matchedInitialExperienceService)
      : "";
  const resolvedInitialExperienceServices = resolvedInitialExperienceKey
    ? services
        .filter(
          (service) =>
            service.boatId === resolvedInitialBoatId &&
            experienceKey(service) === resolvedInitialExperienceKey,
        )
        .sort(sortServicesForDuration)
    : [];
  const durationMatchedInitialService =
    !requestedService && initialDurationType
      ? resolvedInitialExperienceServices.find(
          (service) => service.durationType === initialDurationType,
        )
      : undefined;
  const singleInitialService =
    !requestedService &&
    !durationMatchedInitialService &&
    resolvedInitialExperienceServices.length === 1 &&
    nextStepAfterExperience(resolvedInitialExperienceServices) === "booking"
      ? resolvedInitialExperienceServices[0]
      : undefined;
  const resolvedInitialService =
    requestedService ?? durationMatchedInitialService ?? singleInitialService;
  const resolvedInitialStep: SelectionStep = resolvedInitialService
    ? "booking"
    : resolvedInitialExperienceServices.length > 0
      ? nextStepAfterExperience(resolvedInitialExperienceServices)
      : resolvedInitialBoatId
        ? "experience"
        : "boat";
  const [selectionStep, setSelectionStep] = useState<SelectionStep>(resolvedInitialStep);
  const [selectedBoatId, setSelectedBoatId] = useState(resolvedInitialBoatId);
  const [selectedExperienceKey, setSelectedExperienceKey] = useState(
    resolvedInitialExperienceKey,
  );
  const [selectedServiceId, setSelectedServiceId] = useState(resolvedInitialService?.id ?? "");

  const boats = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        title: string;
        subtitle: string;
        imageSrc: string;
        imageAlt: string;
        serviceCount: number;
      }
    >();
    for (const service of services) {
      const current = map.get(service.boatId);
      map.set(service.boatId, {
        id: service.boatId,
        title: bookingBoatTitle(service.boatId, service.boatTitle, locale),
        subtitle: bookingBoatSubtitle(service.boatId, locale),
        imageSrc: current?.imageSrc ?? bookingBoatImageSrc(service),
        imageAlt: current?.imageAlt ?? bookingBoatImageAlt(service.boatId, service.boatImageAlt, locale),
        serviceCount: (current?.serviceCount ?? 0) + 1,
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const byOrder = (BOOKING_BOAT_ORDER[a.id] ?? 99) - (BOOKING_BOAT_ORDER[b.id] ?? 99);
      if (byOrder !== 0) return byOrder;
      return a.title.localeCompare(
        b.title,
        locale === "es" ? "es" : locale === "fr" ? "fr" : locale === "de" ? "de" : locale === "en" ? "en" : "it",
      );
    });
  }, [locale, services]);

  const selectedBoatServices = useMemo(
    () => services.filter((service) => service.boatId === selectedBoatId),
    [selectedBoatId, services],
  );

  const experienceOptions = useMemo(() => {
    const map = new Map<string, ExperienceOption>();
    for (const service of selectedBoatServices) {
      const key = experienceKey(service);
      const current = map.get(key);
      if (current) {
        current.services.push(service);
      } else {
        map.set(key, {
          key,
          title: experienceTitle(service, locale),
          subtitle: service.subtitle,
          detailDescription: service.detailDescription || service.subtitle,
          imageSrc: service.imageSrc,
          imageAlt: service.imageAlt,
          includes: service.includes,
          notIncluded: service.notIncluded,
          locations: service.locations,
          services: [service],
        });
      }
    }
    return Array.from(map.values()).map((option) => ({
      ...option,
      services: option.services.sort(sortServicesForDuration),
    }));
  }, [locale, selectedBoatServices]);

  const selectedExperience = useMemo(
    () => experienceOptions.find((option) => option.key === selectedExperienceKey),
    [experienceOptions, selectedExperienceKey],
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId),
    [selectedServiceId, services],
  );

  const selectedBoatTitle =
    boats.find((boat) => boat.id === selectedBoatId)?.title ?? selectedService?.boatTitle ?? "";
  const needsDurationStep =
    Boolean(selectedExperience && nextStepAfterExperience(selectedExperience.services) === "duration");
  const selectedDurationLabel = selectedService
    ? selectedService.serviceType === "CABIN_CHARTER"
      ? selectedService.durationLabel
      : `${durationOptionLabel(selectedService, locale)} · ${durationDetail(selectedService, locale)}`
    : "";
  const selectedBoat = boats.find((boat) => boat.id === selectedBoatId);
  const boatInfo = bookingBoatInfo(selectedBoat, selectedBoatServices, copy, locale);
  const experienceInfo = bookingExperienceInfo(selectedExperience, copy, locale);
  const serviceInfo = bookingServiceInfo(selectedService, copy, locale);
  const durationInfo = selectedService ? serviceInfo : experienceInfo;

  function chooseBoat(boatId: string) {
    setSelectedBoatId(boatId);
    setSelectedExperienceKey("");
    setSelectedServiceId("");
  }

  function chooseExperience(option: ExperienceOption) {
    setSelectedExperienceKey(option.key);
    setSelectedServiceId(option.services.length === 1 ? option.services[0].id : "");
  }

  function continueFromExperience() {
    if (!selectedExperience) return;
    const next = nextStepAfterExperience(selectedExperience.services);
    if (next === "booking" && selectedExperience.services[0]) {
      setSelectedServiceId(selectedExperience.services[0].id);
    }
    setSelectionStep(next);
  }

  function resetToStep(step: SelectionStep) {
    if (step === "boat") {
      setSelectedBoatId("");
      setSelectedExperienceKey("");
      setSelectedServiceId("");
    }
    if (step === "experience") {
      setSelectedExperienceKey("");
      setSelectedServiceId("");
    }
    if (step === "duration") {
      setSelectedServiceId("");
    }
    setSelectionStep(step);
  }

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-heading font-bold">{copy.emptyTitle}</h1>
        <p className="mt-4 text-white/75">
          {copy.emptyText}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-10 sm:px-4 md:py-14 lg:px-8">
      <div className="mx-auto max-w-4xl text-center text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-100">
          {copy.eyebrow}
        </p>
        <h1 className="mx-auto mt-3 max-w-4xl font-heading text-4xl font-bold leading-[0.98] md:text-6xl">
          {copy.title}
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/78 md:text-lg">
          {copy.subtitle}
        </p>
      </div>

      <StepProgress
        currentStep={selectionStep}
        hasDurationStep={needsDurationStep}
        locale={locale}
      />

      <section className="mt-8" aria-labelledby="booking-wizard-title">
        {selectionStep === "boat" && (
          <SelectionSplitLayout
            stepLabel={`${copy.step} 1`}
            title={copy.chooseBoatTitle}
            subtitle={copy.chooseBoatSubtitle}
            panel={<BookingInfoPanel copy={copy} info={boatInfo} />}
            canContinue={Boolean(selectedBoatId)}
            onContinue={() => setSelectionStep("experience")}
            continueLabel={copy.continue}
          >
            <div className="grid gap-4">
              {boats.map((boat) => (
                <button
                  key={boat.id}
                  type="button"
                  onClick={() => chooseBoat(boat.id)}
                  className={cn(
                    "group relative aspect-video overflow-hidden rounded-lg border p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]",
                    selectedBoatId === boat.id
                      ? "border-[var(--color-gold)] ring-2 ring-[var(--color-gold)]"
                      : "border-white/30 hover:border-white/75",
                  )}
                  style={{ backgroundImage: `url(${boat.imageSrc})` }}
                  aria-pressed={selectedBoatId === boat.id}
                  aria-label={`${boat.title}. ${boat.subtitle}`}
                >
                  <span
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${boat.imageSrc})` }}
                    role="img"
                    aria-label={boat.imageAlt}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/48 to-slate-950/8" />
                  <span className="relative z-10 flex h-full flex-col justify-between p-4 text-white sm:p-5">
                    <span className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                        {boat.serviceCount} {copy.bookableOptions}
                      </span>
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full border border-white/35 bg-white/15 backdrop-blur",
                          selectedBoatId === boat.id && "border-[var(--color-gold)] bg-[var(--color-gold)] text-[#06233a]",
                        )}
                        aria-hidden="true"
                      >
                        {selectedBoatId === boat.id ? (
                          <Check className="size-5" />
                        ) : (
                          <Ship className="size-5" />
                        )}
                      </span>
                    </span>
                    <span>
                      <span className={cn("block font-heading text-2xl font-bold leading-tight md:text-3xl", IMAGE_CARD_TEXT_SHADOW)}>
                        {boat.title}
                      </span>
                      <span className={cn("mt-2 line-clamp-2 block text-sm leading-6 text-white/84", IMAGE_CARD_SUBTEXT_SHADOW)}>
                        {boat.subtitle}
                      </span>
                      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-gold)] px-4 py-2 text-sm font-black text-[#06233a]">
                        {selectedBoatId === boat.id ? copy.selected : copy.select}
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </SelectionSplitLayout>
        )}

        {selectionStep === "experience" && (
          <SelectionSplitLayout
            stepLabel={`${copy.step} 2`}
            title={copy.chooseExperienceTitle}
            subtitle={`${copy.availableFor} ${selectedBoatTitle || copy.selectedBoat}.`}
            onBack={() => resetToStep("boat")}
            backLabel={copy.back}
            panel={<BookingInfoPanel copy={copy} info={experienceInfo} />}
            canContinue={Boolean(selectedExperience)}
            onContinue={continueFromExperience}
            continueLabel={copy.continue}
          >
            <div className="grid gap-4">
              {experienceOptions.map((option) => {
                const primaryService = option.services[0];
                const requiresDuration = nextStepAfterExperience(option.services) === "duration";
                const imageSrc =
                  option.imageSrc ?? (primaryService ? bookingBoatImageSrc(primaryService) : undefined);
                const imageAlt = option.imageAlt ?? primaryService?.boatImageAlt ?? option.title;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => chooseExperience(option)}
                    className={cn(
                      "group relative aspect-video overflow-hidden rounded-lg border p-0 text-left transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                      selectedExperienceKey === option.key
                        ? "border-sky-300 ring-2 ring-sky-300"
                        : "border-white/30 hover:border-white/75",
                    )}
                    aria-pressed={selectedExperienceKey === option.key}
                  >
                    {imageSrc && (
                      <span
                        className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${imageSrc})` }}
                        role="img"
                        aria-label={imageAlt}
                      />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-slate-950/10" />
                    <span className="relative z-10 flex h-full flex-col justify-between gap-4 p-4 text-white sm:p-5">
                      <span className="flex justify-end">
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full border",
                            selectedExperienceKey === option.key
                              ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[#06233a]"
                              : "border-white/35 bg-white/15 text-white backdrop-blur",
                          )}
                          aria-hidden="true"
                        >
                          {selectedExperienceKey === option.key ? (
                            <Check className="size-5" />
                          ) : (
                            <ChevronRight className="size-5" />
                          )}
                        </span>
                      </span>

                      <span>
                        <span className={cn("block font-heading text-2xl font-bold leading-tight md:text-3xl", IMAGE_CARD_TEXT_SHADOW)}>
                          {option.title}
                        </span>
                        <span className="mt-3 flex flex-wrap gap-2">
                          {primaryService && (
                            <>
                              <InteractivePill icon={Clock3}>
                                {requiresDuration ? copy.durationToChoose : primaryService.durationLabel}
                              </InteractivePill>
                              <InteractivePill icon={Users}>
                                {copy.upTo} {primaryService.capacityMax} {copy.people}
                              </InteractivePill>
                              <InteractivePill icon={CreditCard}>
                                {primaryService.priceLabel}
                              </InteractivePill>
                            </>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </SelectionSplitLayout>
        )}

        {selectionStep === "duration" && selectedExperience && (
          <SelectionSplitLayout
            stepLabel={`${copy.step} 3`}
            title={copy.chooseDurationTitle}
            subtitle={copy.chooseDurationSubtitle}
            onBack={() => resetToStep("experience")}
            backLabel={copy.back}
            panel={<BookingInfoPanel copy={copy} info={durationInfo} />}
            canContinue={Boolean(selectedServiceId)}
            onContinue={() => setSelectionStep("booking")}
            continueLabel={copy.continue}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedExperience.services.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedServiceId(service.id)}
                  className={cn(
                    "aspect-video rounded-lg border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg",
                    selectedServiceId === service.id
                      ? "border-sky-500 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50",
                  )}
                  aria-pressed={selectedServiceId === service.id}
                >
                  <span className="block font-heading text-2xl font-bold leading-tight text-slate-950">
                    {durationOptionLabel(service, locale)}
                  </span>
                  <span className="mt-2 block text-sm text-slate-600">
                    {durationDetail(service, locale)}
                  </span>
                  <span className="mt-5 inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {service.priceLabel} {service.priceUnitLabel} · {vatIncludedLabel(locale)}
                  </span>
                </button>
              ))}
            </div>
          </SelectionSplitLayout>
        )}

        {selectionStep === "booking" && selectedService && (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-white/15 bg-white/10 p-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">
                  {copy.selectedPath}
                </p>
                <p className="mt-1 break-words text-xl font-bold">
                  {selectedBoatTitle} · {experienceTitle(selectedService, locale)}
                </p>
                <p className="mt-1 text-sm text-white/75">{selectedDurationLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => resetToStep("experience")}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold text-white",
                  liquidGlassButton,
                )}
              >
                {copy.changeSelection}
              </button>
            </div>

            <h2 id="booking-wizard-title" className="sr-only">
              {copy.bookingWizard} {selectedService.title}
            </h2>
            <BookingWizard
              key={[
                selectedService.id,
                initialStartDate ?? "no-date",
                initialEndDate ?? "no-end",
                initialDurationDays ?? "no-days",
              ].join(":")}
              locale={locale}
              serviceId={selectedService.id}
              serviceName={selectedService.title}
              serviceType={selectedService.serviceType}
              durationType={selectedService.durationType}
              durationHours={selectedService.durationHours}
              capacityMax={selectedService.capacityMax}
              defaultPaymentSchedule={selectedService.defaultPaymentSchedule}
              defaultDepositPercentage={selectedService.defaultDepositPercentage}
              turnstileSiteKey={turnstileSiteKey}
              appUrl={appUrl}
              useStripeCheckout={useStripeCheckout}
              initialStartDate={initialStartDate}
              initialEndDate={initialEndDate}
              initialDurationDays={initialDurationDays}
            />
          </>
        )}
      </section>
    </div>
  );
}

function StepProgress({
  currentStep,
  hasDurationStep,
  locale,
}: {
  currentStep: SelectionStep;
  hasDurationStep: boolean;
  locale: string;
}) {
  const steps =
    locale === "fr"
      ? ([
          { key: "boat", label: "Bateau", shortLabel: "Bateau" },
          { key: "experience", label: "Expérience", shortLabel: "Expérience" },
          { key: "duration", label: "Durée", shortLabel: "Durée" },
          { key: "booking", label: "Date et paiement", shortLabel: "Paiement" },
        ] as const)
      : locale === "de"
      ? ([
          { key: "boat", label: "Boot", shortLabel: "Boot" },
          { key: "experience", label: "Erlebnis", shortLabel: "Erlebnis" },
          { key: "duration", label: "Dauer", shortLabel: "Dauer" },
          { key: "booking", label: "Datum und Zahlung", shortLabel: "Zahlung" },
        ] as const)
      : locale === "es"
      ? ([
          { key: "boat", label: "Barco", shortLabel: "Barco" },
          { key: "experience", label: "Experiencia", shortLabel: "Experiencia" },
          { key: "duration", label: "Duración", shortLabel: "Duración" },
          { key: "booking", label: "Fecha y checkout", shortLabel: "Checkout" },
        ] as const)
      : locale === "en"
      ? ([
          { key: "boat", label: "Boat", shortLabel: "Boat" },
          { key: "experience", label: "Experience", shortLabel: "Experience" },
          { key: "duration", label: "Duration", shortLabel: "Duration" },
          { key: "booking", label: "Date and checkout", shortLabel: "Checkout" },
        ] as const)
      : ([
          { key: "boat", label: "Mezzo", shortLabel: "Mezzo" },
          { key: "experience", label: "Esperienza", shortLabel: "Esperienza" },
          { key: "duration", label: "Durata", shortLabel: "Durata" },
          { key: "booking", label: "Data e checkout", shortLabel: "Checkout" },
        ] as const);
  const currentIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <div
      className="mx-auto mt-8 grid w-full max-w-5xl gap-2 rounded-lg border border-white/12 bg-white/[0.08] p-2 text-[11px] font-semibold text-white/72 shadow-2xl shadow-black/10 backdrop-blur sm:grid-cols-4 sm:text-xs"
      aria-label={
        locale === "es"
          ? "Progreso de reserva"
          : locale === "fr"
            ? "Progression de réservation"
            : locale === "de"
              ? "Buchungsfortschritt"
              : locale === "en"
                ? "Booking progress"
                : "Avanzamento prenotazione"
      }
    >
      {steps.map((step, index) => {
        const skipped = step.key === "duration" && !hasDurationStep && currentStep === "booking";
        const active = step.key === currentStep;
        const complete = index < currentIndex && !skipped;
        return (
          <div
            key={step.key}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left transition",
              active && "bg-white text-slate-950 shadow-lg shadow-black/10",
              complete && "bg-emerald-100 text-emerald-900",
              skipped && "opacity-45",
            )}
            aria-current={active ? "step" : undefined}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border",
                active && "border-slate-900 bg-slate-950 text-white",
                complete && "border-emerald-600 bg-emerald-600 text-white",
                !active && !complete && "border-white/20 bg-white/10 text-white/75",
              )}
            >
              {complete ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <span className="tabular-nums">{index + 1}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="hidden truncate sm:block">{step.label}</span>
              <span className="block truncate sm:hidden">{active ? step.shortLabel : step.shortLabel}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SelectionSplitLayout({
  stepLabel,
  title,
  subtitle,
  onBack,
  backLabel = "Indietro",
  children,
  panel,
  canContinue,
  onContinue,
  continueLabel,
}: {
  stepLabel: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  backLabel?: string;
  children: React.ReactNode;
  panel: React.ReactNode;
  canContinue: boolean;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-start">
      <div className="rounded-lg border border-white/16 bg-white p-4 shadow-2xl shadow-black/20 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              {stepLabel}
            </p>
            <h2
              id="booking-wizard-title"
              className="mt-1 font-heading text-2xl font-bold text-slate-950 md:text-3xl"
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex self-start items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {backLabel}
            </button>
          )}
        </div>
        {children}
      </div>
      <div className="lg:sticky lg:top-24">
        {panel}
        <SelectionActions
          canContinue={canContinue}
          onContinue={onContinue}
          label={continueLabel}
        />
      </div>
    </div>
  );
}

function BookingInfoPanel({
  copy,
  info,
}: {
  copy: ReturnType<typeof getBookingPageCopy>;
  info: BookingInfoContent;
}) {
  return (
    <aside className="rounded-lg border border-white/16 bg-white p-5 text-slate-950 shadow-2xl shadow-black/20 md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">
        {info.eyebrow}
      </p>
      <h3 className="mt-2 font-heading text-2xl font-bold leading-tight md:text-3xl">
        {info.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {info.description}
      </p>
      {(info.durationLabel || info.priceLabel) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {info.durationLabel && (
            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800">
              {info.durationLabel}
            </span>
          )}
          {info.priceLabel && (
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
              {info.priceLabel}
            </span>
          )}
        </div>
      )}

      <InfoPanelList title={copy.includedTitle} items={info.includes} tone="include" />
      <InfoPanelList title={copy.notIncludedTitle} items={info.notIncluded} tone="exclude" />
      <InfoPanelList title={copy.locationsTitle} items={info.locations} tone="location" />
    </aside>
  );
}

function InfoPanelList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "include" | "exclude" | "location";
}) {
  const iconClass =
    tone === "include"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "exclude"
        ? "bg-slate-100 text-slate-500"
        : "bg-sky-100 text-sky-700";
  return (
    <div className="mt-6">
      <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h4>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
              {tone === "exclude" ? "-" : <Check className="size-3.5" aria-hidden="true" />}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelectionActions({
  canContinue,
  onContinue,
  label = "Continua",
}: {
  canContinue: boolean;
  onContinue: () => void;
  label?: string;
}) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] px-6 py-4 text-base font-black text-white shadow-lg shadow-amber-900/15 transition hover:bg-[#f2b84b] hover:text-[#06233a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function InteractivePill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold leading-5 text-slate-700 shadow-sm transition group-hover:border-sky-200 group-hover:bg-sky-50">
      <Icon className="size-4 shrink-0 text-sky-700" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

function getBookingPageCopy(locale: string) {
  if (locale === "de") {
    return {
      eyebrow: "Buchungen",
      title: "Bootstouren zu den Ägadischen Inseln online buchen",
      subtitle:
        "Wählen Sie Boot, Erlebnis, Dauer und ein verfügbares Datum mit aktuellem Preis. Der Checkout erstellt eine direkte Buchung im zentralen Egadisailing-Kalender.",
      guidedLabel: "Geführte Buchung",
      guideItems: ["Boot oder Erlebnis wählen", "Datum und Gäste hinzufügen", "Sicher bezahlen"],
      emptyTitle: "Keine aktiven Erlebnisse",
      emptyText: "Derzeit sind keine Services online buchbar.",
      chooseBoatTitle: "Wählen Sie, was Sie erleben möchten",
      chooseBoatSubtitle: "Die Bilder helfen bei der Auswahl zwischen Trimaran-Komfort, Bootstouren und Angelcharter.",
      quickOverview: "Kurz erklärt",
      includedTitle: "Inklusive",
      notIncludedTitle: "Nicht inklusive / mitbringen",
      locationsTitle: "Mögliche Orte",
      bookableOptions: "buchbare Optionen",
      chooseExperienceTitle: "Wählen Sie das Erlebnis",
      chooseExperienceSubtitle: "Wählen Sie ein Erlebnis, um Details, Route und Leistungen zu sehen.",
      availableFor: "Verfügbare Erlebnisse für",
      selectedBoat: "das ausgewählte Boot",
      durationToChoose: "Dauer auswählen",
      chooseDurationTitle: "Wählen Sie die Dauer",
      chooseDurationSubtitle:
        "Die Dauer bestimmt den tatsächlichen Service für Preise, Verfügbarkeiten und Checkout.",
      step: "Schritt",
      continue: "Weiter",
      back: "Zurück",
      select: "Auswählen",
      selected: "Ausgewählt",
      selectedPath: "Ausgewählter Weg",
      changeSelection: "Auswahl ändern",
      duration: "Dauer",
      capacity: "Kapazität",
      checkout: "Zahlung",
      upTo: "Bis zu",
      people: "Personen",
      bookingWizard: "Buchungsassistent",
    };
  }

  if (locale === "fr") {
    return {
      eyebrow: "Réservations",
      title: "Réserver des excursions en bateau aux îles Égades en ligne",
      subtitle:
        "Choisissez le bateau, l'expérience, la durée et une date disponible avec un prix à jour. Le checkout crée une réservation directe dans le calendrier central d'Egadisailing.",
      guidedLabel: "Réservation guidée",
      guideItems: ["Choisir bateau ou expérience", "Ajouter date et invités", "Payer en sécurité"],
      emptyTitle: "Aucune expérience active",
      emptyText: "Aucun service n'est actuellement disponible à la réservation en ligne.",
      chooseBoatTitle: "Choisissez ce que vous voulez vivre",
      chooseBoatSubtitle: "Les images aident à distinguer le confort du trimaran, les sorties bateau et le charter pêche.",
      quickOverview: "En bref",
      includedTitle: "Inclus",
      notIncludedTitle: "Non inclus / à prévoir",
      locationsTitle: "Lieux possibles",
      bookableOptions: "options réservables",
      chooseExperienceTitle: "Choisissez l'expérience",
      chooseExperienceSubtitle: "Choisissez une expérience pour voir les détails, la route et les services.",
      availableFor: "Expériences disponibles pour",
      selectedBoat: "le bateau sélectionné",
      durationToChoose: "Durée à choisir",
      chooseDurationTitle: "Choisissez la durée",
      chooseDurationSubtitle:
        "La durée détermine le service réel utilisé pour les prix, les disponibilités et le checkout.",
      step: "Étape",
      continue: "Continuer",
      back: "Retour",
      select: "Choisir",
      selected: "Sélectionné",
      selectedPath: "Parcours sélectionné",
      changeSelection: "Modifier la sélection",
      duration: "Durée",
      capacity: "Capacité",
      checkout: "Paiement",
      upTo: "Jusqu'à",
      people: "personnes",
      bookingWizard: "Assistant de réservation",
    };
  }

  if (locale === "es") {
    return {
      eyebrow: "Reservas",
      title: "Reserva excursiones en barco por las Islas Egadi online",
      subtitle:
        "Elige barco, experiencia, duración y fecha disponible con precio actualizado. El checkout crea una reserva directa en el calendario central de Egadisailing.",
      guidedLabel: "Reserva guiada",
      guideItems: ["Elegir barco o experiencia", "Añadir fecha y huéspedes", "Pagar con seguridad"],
      emptyTitle: "No hay experiencias activas",
      emptyText: "En este momento no hay servicios disponibles para reservar online.",
      chooseBoatTitle: "Elige lo que quieres vivir",
      chooseBoatSubtitle: "Las imágenes ayudan a distinguir entre confort en trimarán, tours en barco y charter de pesca.",
      quickOverview: "Resumen rápido",
      includedTitle: "Incluido",
      notIncludedTitle: "No incluido / qué llevar",
      locationsTitle: "Lugares posibles",
      bookableOptions: "opciones reservables",
      chooseExperienceTitle: "Elige la experiencia",
      chooseExperienceSubtitle: "Elige una experiencia para ver detalles, ruta y servicios.",
      availableFor: "Experiencias disponibles para",
      selectedBoat: "el barco seleccionado",
      durationToChoose: "Duración por elegir",
      chooseDurationTitle: "Elige la duración",
      chooseDurationSubtitle:
        "La duración determina el servicio real utilizado para precios, disponibilidad y checkout.",
      step: "Paso",
      continue: "Continuar",
      back: "Atrás",
      select: "Elegir",
      selected: "Seleccionado",
      selectedPath: "Ruta seleccionada",
      changeSelection: "Cambiar selección",
      duration: "Duración",
      capacity: "Capacidad",
      checkout: "Pago",
      upTo: "Hasta",
      people: "personas",
      bookingWizard: "Asistente de reserva",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Bookings",
      title: "Book Egadi Islands boat tours online",
      subtitle:
        "Choose the boat, experience, duration and available date with updated pricing. Checkout creates a direct booking on the central Egadisailing calendar.",
      guidedLabel: "Guided booking",
      guideItems: ["Choose boat or experience", "Add date and guests", "Pay securely"],
      emptyTitle: "No active experiences",
      emptyText: "There are currently no services available to book online.",
      chooseBoatTitle: "Choose what you want to experience",
      chooseBoatSubtitle: "The images help you choose between trimaran comfort, boat tours and fishing charter.",
      quickOverview: "Quick overview",
      includedTitle: "Included",
      notIncludedTitle: "Not included / bring",
      locationsTitle: "Possible locations",
      bookableOptions: "bookable options",
      chooseExperienceTitle: "Choose the experience",
      chooseExperienceSubtitle: "Choose an experience to see details, route and services.",
      availableFor: "Experiences available for",
      selectedBoat: "the selected boat",
      durationToChoose: "Duration to choose",
      chooseDurationTitle: "Choose the duration",
      chooseDurationSubtitle:
        "The duration determines the actual service used for prices, availability and checkout.",
      step: "Step",
      continue: "Continue",
      back: "Back",
      select: "Select",
      selected: "Selected",
      selectedPath: "Selected path",
      changeSelection: "Change selection",
      duration: "Duration",
      capacity: "Capacity",
      checkout: "Payment",
      upTo: "Up to",
      people: "people",
      bookingWizard: "Booking wizard",
    };
  }

  return {
    eyebrow: "Prenotazioni",
    title: "Prenota escursioni in barca alle Isole Egadi online",
    subtitle:
      "Scegli mezzo, esperienza, durata e data disponibile con prezzo aggiornato. Il checkout crea una prenotazione diretta sul calendario centrale Egadisailing.",
    guidedLabel: "Prenotazione guidata",
    guideItems: ["Scegli mezzo o esperienza", "Aggiungi data e ospiti", "Paga in sicurezza"],
    emptyTitle: "Nessuna esperienza attiva",
    emptyText: "Al momento non ci sono servizi prenotabili online.",
    chooseBoatTitle: "Scegli cosa vuoi vivere",
    chooseBoatSubtitle: "Le immagini aiutano a distinguere comfort in trimarano, tour in barca e charter pesca.",
    quickOverview: "Spiegazione veloce",
    includedTitle: "Cosa e' incluso",
    notIncludedTitle: "Cosa non e' incluso / da portare",
    locationsTitle: "Location visitabili",
    bookableOptions: "opzioni prenotabili",
    chooseExperienceTitle: "Scegli l'esperienza",
    chooseExperienceSubtitle: "Scegli un'esperienza per vedere dettagli, rotta e servizi inclusi.",
    availableFor: "Esperienze disponibili per",
    selectedBoat: "il mezzo selezionato",
    durationToChoose: "Durata da scegliere",
    chooseDurationTitle: "Scegli per quanto tempo",
    chooseDurationSubtitle:
      "La durata determina il servizio reale usato da prezzi, disponibilità e checkout.",
    step: "Passo",
    continue: "Continua",
    back: "Indietro",
    select: "Scegli",
    selected: "Selezionato",
    selectedPath: "Percorso selezionato",
    changeSelection: "Cambia selezione",
    duration: "Durata",
    capacity: "Capacità",
    checkout: "Pagamento",
    upTo: "Fino a",
    people: "persone",
    bookingWizard: "Wizard prenotazione",
  };
}
