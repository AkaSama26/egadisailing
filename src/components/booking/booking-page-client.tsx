"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Clock3,
  type LucideIcon,
  Users,
} from "lucide-react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { cn } from "@/lib/utils";

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
  "tour-rib": 30,
  "fishing-rib": 40,
};
const LUNCH_TRIMARAN_SERVICE_ID = "exclusive-experience";
const LUNCH_TRIMARAN_CARD_IMAGE_SRC = "/images/home/trimarano-favignana.webp";
const LUNCH_TRIMARAN_DESKTOP_CARD_IMAGE_SRC = "/images/boats/neel-47/neel-47-pranzo-a-bordo.webp";
const PRIVATE_BOAT_DESKTOP_CARD_IMAGE_SRC =
  "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-hero.webp";

function bookingBoatTitle(boatId: string, fallback: string, locale: string): string {
  if (boatId !== "boat") return fallback;
  if (locale === "es") return "Barco";
  if (locale === "fr") return "Bateau";
  if (locale === "de") return "Boot";
  if (locale === "en") return "Boat";
  return "Barca";
}

function bookingCategoryLabel(boatId: string, fallback: string, locale: string): string {
  if (boatId === "trimarano") {
    if (locale === "es") return "Catamarán";
    if (locale === "fr") return "Catamaran";
    if (locale === "de") return "Katamaran";
    if (locale === "en") return "Catamaran";
    return "Catamarano";
  }
  if (boatId === "fishing-rib") {
    if (locale === "es") return "Barco de pesca";
    if (locale === "fr") return "Bateau de pêche";
    if (locale === "de") return "Angelboot";
    if (locale === "en") return "Fishing boat";
    return "Barca da pesca";
  }
  if (boatId === "tour-rib") {
    if (locale === "es") return "Neumática";
    if (locale === "fr") return "Semi-rigide";
    if (locale === "de") return "RIB";
    if (locale === "en") return "RIB";
    return "Gommone";
  }
  return bookingBoatTitle(boatId, fallback, locale);
}

function bookingCategoryHint(boatId: string, locale: string): string {
  if (boatId === "boat") {
    return locale === "es"
      ? "Compartido o privado"
      : locale === "fr"
        ? "Partagé ou privé"
        : locale === "de"
          ? "Geteilt oder privat"
          : locale === "en"
            ? "Shared or private"
            : "Condivisa o esclusiva";
  }
  if (boatId === "trimarano") {
    return locale === "es"
      ? "Confort y almuerzo"
      : locale === "fr"
        ? "Confort et déjeuner"
        : locale === "de"
          ? "Komfort und Mittagessen"
          : locale === "en"
            ? "Comfort and lunch"
            : "Comfort e pranzo";
  }
  if (boatId === "fishing-rib") {
    return locale === "es"
      ? "Charter pesca"
      : locale === "fr"
        ? "Charter pêche"
        : locale === "de"
          ? "Angelcharter"
          : locale === "en"
            ? "Fishing charter"
            : "Charter pesca";
  }
  if (boatId === "tour-rib") {
    return locale === "es"
      ? "Compartido o privado"
      : locale === "fr"
        ? "Partagé ou privé"
        : locale === "de"
          ? "Geteilt oder privat"
          : locale === "en"
            ? "Shared or private"
            : "Condiviso o esclusivo";
  }
  return bookingBoatSubtitle(boatId, locale);
}

function bookingBoatSubtitle(boatId: string, locale: string): string {
  if (boatId === "trimarano") {
    return locale === "es"
      ? "Confort premium, almuerzo a bordo y charter privado."
      : locale === "fr"
        ? "Confort premium, déjeuner à bord et charters privés."
        : locale === "de"
          ? "Premium-Komfort, Mittagessen an Bord und private Charter."
          : locale === "en"
            ? "Premium comfort, lunch on board and private charters."
            : "Comfort premium, pranzo a bordo e charter privati.";
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
  if (boatId === "tour-rib") {
    return locale === "es"
      ? "Tours ágiles en neumática, compartidos o privados, con paradas de baño."
      : locale === "fr"
        ? "Excursions agiles en semi-rigide, partagées ou privées, avec baignades."
        : locale === "de"
          ? "Agile RIB-Touren, geteilt oder privat, mit Badestopps."
          : locale === "en"
            ? "Agile RIB tours, shared or private, with swim stops."
            : "Tour agili in gommone, condivisi o privati, con soste bagno.";
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
  if (service.boatId === "tour-rib") return "/images/boats/tour-rib/tour-rib-main.webp";
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
  if (boatId === "tour-rib") {
    if (locale === "es") return "Neumática de excursión navegando por las Islas Egadi";
    if (locale === "fr") return "Semi-rigide d'excursion naviguant aux îles Égades";
    if (locale === "de") return "Ausflugs-RIB auf Fahrt zwischen den Ägadischen Inseln";
    if (locale === "en") return "Tour RIB cruising through the Egadi Islands";
    return "Gommone da escursione in navigazione alle Isole Egadi";
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
    if (service.boatId === "tour-rib") {
      return locale === "es"
        ? "Neumática compartida"
        : locale === "fr"
          ? "Semi-rigide partagé"
          : locale === "de"
            ? "Geteiltes RIB"
            : locale === "en"
              ? "Shared RIB"
              : "Gommone condiviso";
    }
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
    if (service.boatId === "fishing-rib") return service.title;
    if (service.boatId === "tour-rib") {
      return locale === "es"
        ? "Neumática privada"
        : locale === "fr"
          ? "Semi-rigide privatisé"
          : locale === "de"
            ? "Privates RIB"
            : locale === "en"
              ? "Private RIB"
              : "Gommone in esclusiva";
    }
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

function isLunchTrimaranService(service: BookingServiceOption | undefined): boolean {
  return Boolean(service && service.id === LUNCH_TRIMARAN_SERVICE_ID && service.boatId === "trimarano");
}

function cardImageSrc(service: BookingServiceOption | undefined): string {
  if (!service) return "/videos/hero-poster.webp";
  if (isLunchTrimaranService(service)) return LUNCH_TRIMARAN_CARD_IMAGE_SRC;
  return service.imageSrc ?? service.boatImageSrc ?? bookingBoatImageSrc(service);
}

function desktopCardImageSrc(service: BookingServiceOption | undefined): string | undefined {
  if (isLunchTrimaranService(service)) return LUNCH_TRIMARAN_DESKTOP_CARD_IMAGE_SRC;
  if (service?.boatId === "boat" && service.serviceType === "BOAT_EXCLUSIVE") {
    return PRIVATE_BOAT_DESKTOP_CARD_IMAGE_SRC;
  }
  return undefined;
}

function experienceCardImageSrc(option: ExperienceOption, primaryService: BookingServiceOption | undefined): string {
  if (isLunchTrimaranService(primaryService)) return LUNCH_TRIMARAN_CARD_IMAGE_SRC;
  return option.imageSrc ?? cardImageSrc(primaryService);
}

function experienceCardDesktopImageSrc(
  option: ExperienceOption,
  primaryService: BookingServiceOption | undefined,
): string | undefined {
  if (isLunchTrimaranService(primaryService)) return LUNCH_TRIMARAN_DESKTOP_CARD_IMAGE_SRC;
  if (option.key === "boat:BOAT_EXCLUSIVE") return PRIVATE_BOAT_DESKTOP_CARD_IMAGE_SRC;
  return desktopCardImageSrc(primaryService);
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
  const initialCategoryBoatId = resolvedInitialBoatId;
  const resolvedInitialExperienceKey = requestedService
    ? experienceKey(requestedService)
    : matchedInitialExperienceService
      ? experienceKey(matchedInitialExperienceService)
      : "";
  const resolvedInitialExperienceServices = resolvedInitialExperienceKey
    ? services
        .filter(
          (service) =>
            service.boatId === initialCategoryBoatId &&
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
      : initialCategoryBoatId
        ? "experience"
        : "boat";
  const [selectionStep, setSelectionStep] = useState<SelectionStep>(resolvedInitialStep);
  const [selectedBoatId, setSelectedBoatId] = useState(initialCategoryBoatId);
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
        title: bookingCategoryLabel(service.boatId, service.boatTitle, locale),
        subtitle: bookingCategoryHint(service.boatId, locale),
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

  function chooseBoat(boatId: string) {
    setSelectedBoatId(boatId);
    setSelectedExperienceKey("");
    setSelectedServiceId("");
    setSelectionStep("experience");
  }

  function chooseExperience(option: ExperienceOption) {
    setSelectedExperienceKey(option.key);
    setSelectedServiceId(option.services.length === 1 ? option.services[0].id : "");
  }

  function chooseExperienceAndContinue(option: ExperienceOption) {
    chooseExperience(option);
    const next = nextStepAfterExperience(option.services);
    if (next === "booking" && option.services[0]) {
      setSelectedServiceId(option.services[0].id);
    }
    setSelectionStep(next);
  }

  function resetToStep(step: SelectionStep) {
    if (step === "boat") {
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

  function backToSelectionFromBooking() {
    resetToStep(selectedExperience && selectedExperience.services.length > 1 ? "duration" : "experience");
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
    <div className="mx-auto mt-10 flex min-h-[calc(100svh-6.5rem)] w-full max-w-none flex-col px-2 py-3 sm:mt-12 sm:min-h-[calc(100svh-7rem)] sm:px-4 sm:py-5 lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden">
      {selectionStep === "booking" ? (
        <h1 className="sr-only">{copy.title}</h1>
      ) : (
        <div className="shrink-0 pb-3 text-center text-white sm:pb-4">
          <h1 className="mx-auto max-w-3xl font-heading text-2xl font-bold leading-none sm:text-4xl md:text-5xl">
            {copy.title}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
            {copy.subtitle}
          </p>
        </div>
      )}

      <section
        className="min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden"
        aria-labelledby="booking-wizard-title"
      >
        {selectionStep === "booking" && selectedService ? (
          <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
            <h2 id="booking-wizard-title" className="sr-only">
              {copy.bookingWizard} {selectedService.title}
            </h2>
            <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
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
                onBackToSelection={backToSelectionFromBooking}
                constrainHeight
              />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "mx-auto flex w-full flex-col rounded-lg border border-white/16 bg-white p-2 shadow-2xl shadow-black/20 sm:p-4 lg:h-full lg:max-h-full lg:overflow-hidden",
              selectionStep === "boat" ? "max-w-7xl" : "max-w-5xl",
            )}
          >
            <h2 id="booking-wizard-title" className="sr-only">
              {selectionStep === "boat"
                ? copy.chooseBoatTitle
                : selectionStep === "duration"
                  ? copy.chooseDurationTitle
                  : copy.chooseExperienceTitle}
            </h2>

            <div className="flex flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
              {selectionStep === "boat" ? (
                <div className="grid flex-1 auto-rows-[minmax(11rem,1fr)] grid-cols-1 gap-2 sm:grid-cols-2 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-2 lg:auto-rows-[minmax(0,1fr)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                  {boats.map((boat) => (
                    <button
                      key={boat.id}
                      type="button"
                      onClick={() => chooseBoat(boat.id)}
                      className={cn(
                        "group relative flex h-full min-h-0 w-full flex-col justify-end overflow-hidden rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:p-4",
                        selectedBoatId === boat.id
                          ? "border-sky-300 ring-2 ring-sky-400"
                          : "border-white/20 hover:border-sky-200",
                      )}
                      aria-pressed={selectedBoatId === boat.id}
                    >
                      <Image
                        src={boat.imageSrc}
                        alt=""
                        aria-hidden="true"
                        fill
                        sizes="(min-width: 1280px) 620px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,18,37,0.08)_0%,rgba(3,18,37,0.26)_42%,rgba(3,18,37,0.82)_100%)]" />
                      <span className="relative z-10 block font-heading text-xl font-bold leading-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.88)] sm:text-2xl">
                        {boat.title}
                      </span>
                    </button>
                  ))}
                </div>
              ) : selectionStep === "duration" && selectedExperience ? (
                <>
                  <div className="mb-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => resetToStep("experience")}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                      {copy.back}
                    </button>
                  </div>
                  <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-2 pb-2 sm:gap-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                    {selectedExperience.services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => {
                          setSelectedServiceId(service.id);
                          setSelectionStep("booking");
                        }}
                        className={cn(
                          "group relative flex aspect-video w-full shrink-0 flex-col justify-between overflow-hidden rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:p-4 lg:aspect-[16/5]",
                          selectedServiceId === service.id
                            ? "border-sky-300 ring-2 ring-sky-400"
                            : "border-white/20 hover:border-sky-200",
                        )}
                        aria-pressed={selectedServiceId === service.id}
                      >
                        <ResponsiveCardImage
                          src={cardImageSrc(service)}
                          desktopSrc={desktopCardImageSrc(service)}
                          sizes="(min-width: 1024px) 896px, (min-width: 640px) 80vw, 100vw"
                        />
                        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,18,37,0.22)_0%,rgba(3,18,37,0.3)_38%,rgba(3,18,37,0.78)_100%)]" />
                        <span className="relative z-10 flex flex-wrap gap-1.5">
                          <InteractivePill icon={Clock3}>
                            {durationDetail(service, locale)}
                          </InteractivePill>
                        </span>
                        <span className="relative z-10 mt-5 block font-heading text-2xl font-bold leading-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.88)] sm:text-3xl">
                          {durationOptionLabel(service, locale)}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => resetToStep("boat")}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                      {copy.back}
                    </button>
                  </div>
                  <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-2 pb-2 sm:gap-3 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
                    {experienceOptions.map((option) => {
                      const primaryService = option.services[0];
                      const requiresDuration = nextStepAfterExperience(option.services) === "duration";
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => chooseExperienceAndContinue(option)}
                          className={cn(
                            "group relative flex aspect-video w-full shrink-0 flex-col justify-between overflow-hidden rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:p-4 lg:aspect-[16/5]",
                            selectedExperienceKey === option.key
                              ? "border-sky-300 ring-2 ring-sky-400"
                              : "border-white/20 hover:border-sky-200",
                          )}
                          aria-pressed={selectedExperienceKey === option.key}
                        >
                          <ResponsiveCardImage
                            src={experienceCardImageSrc(option, primaryService)}
                            desktopSrc={experienceCardDesktopImageSrc(option, primaryService)}
                            sizes="(min-width: 1024px) 896px, (min-width: 640px) 80vw, 100vw"
                          />
                          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,18,37,0.22)_0%,rgba(3,18,37,0.3)_38%,rgba(3,18,37,0.78)_100%)]" />
                          <span className="relative z-10 flex flex-wrap gap-1.5">
                            {primaryService && (
                              <>
                                <InteractivePill icon={Clock3}>
                                  {requiresDuration ? copy.durationToChoose : primaryService.durationLabel}
                                </InteractivePill>
                                <InteractivePill icon={Users}>
                                  {copy.upTo} {primaryService.capacityMax}
                                </InteractivePill>
                              </>
                            )}
                          </span>
                          <span className="relative z-10 mt-5 block font-heading text-2xl font-bold leading-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.88)] sm:text-3xl">
                            {option.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
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

function ResponsiveCardImage({
  src,
  desktopSrc,
  sizes,
}: {
  src: string;
  desktopSrc?: string;
  sizes: string;
}) {
  const hasDesktopOverride = Boolean(desktopSrc && desktopSrc !== src);
  const imageClass = "object-cover transition duration-500 group-hover:scale-105";

  return (
    <>
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        className={cn(imageClass, hasDesktopOverride && "lg:hidden")}
      />
      {hasDesktopOverride && desktopSrc && (
        <Image
          src={desktopSrc}
          alt=""
          aria-hidden="true"
          fill
          sizes={sizes}
          className={cn("hidden lg:block", imageClass)}
        />
      )}
    </>
  );
}

function getBookingPageCopy(locale: string) {
  if (locale === "de") {
    return {
      eyebrow: "Buchungen",
      title: "Buchen Sie in wenigen Schritten",
      subtitle:
        "Wählen Sie eine Kategorie, dann das Erlebnis. Danach sehen Sie nur Datum, Gäste und Zahlung.",
      guidedLabel: "Geführte Buchung",
      guideItems: ["Boot oder Erlebnis wählen", "Datum und Gäste hinzufügen", "Sicher bezahlen"],
      emptyTitle: "Keine aktiven Erlebnisse",
      emptyText: "Derzeit sind keine Services online buchbar.",
      chooseBoatTitle: "Wählen Sie, was Sie erleben möchten",
      chooseBoatSubtitle: "Die Bilder helfen bei der Auswahl zwischen Trimaran-Komfort, Boots- oder RIB-Touren und Angelcharter.",
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
      title: "Réservez en quelques étapes",
      subtitle:
        "Choisissez une catégorie, puis l'expérience. Ensuite seulement date, invités et paiement.",
      guidedLabel: "Réservation guidée",
      guideItems: ["Choisir bateau ou expérience", "Ajouter date et invités", "Payer en sécurité"],
      emptyTitle: "Aucune expérience active",
      emptyText: "Aucun service n'est actuellement disponible à la réservation en ligne.",
      chooseBoatTitle: "Choisissez ce que vous voulez vivre",
      chooseBoatSubtitle: "Les images aident à distinguer le confort du trimaran, les sorties en bateau ou semi-rigide et le charter pêche.",
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
      title: "Reserva en pocos pasos",
      subtitle:
        "Elige una categoría y luego la actividad. Después solo fecha, huéspedes y pago.",
      guidedLabel: "Reserva guiada",
      guideItems: ["Elegir barco o experiencia", "Añadir fecha y huéspedes", "Pagar con seguridad"],
      emptyTitle: "No hay experiencias activas",
      emptyText: "En este momento no hay servicios disponibles para reservar online.",
      chooseBoatTitle: "Elige lo que quieres vivir",
      chooseBoatSubtitle: "Las imágenes ayudan a distinguir entre confort en trimarán, tours en barco o neumática y charter de pesca.",
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
      title: "Book in a few steps",
      subtitle:
        "Choose a category, then the activity. After that you only see date, guests and payment.",
      guidedLabel: "Guided booking",
      guideItems: ["Choose boat or experience", "Add date and guests", "Pay securely"],
      emptyTitle: "No active experiences",
      emptyText: "There are currently no services available to book online.",
      chooseBoatTitle: "Choose what you want to experience",
      chooseBoatSubtitle: "The images help you choose between trimaran comfort, boat or RIB tours, and fishing charter.",
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
    title: "Prenota in pochi passaggi",
    subtitle:
      "Scegli una categoria, poi l'attività. Dopo vedi solo data, ospiti e pagamento.",
    guidedLabel: "Prenotazione guidata",
    guideItems: ["Scegli mezzo o esperienza", "Aggiungi data e ospiti", "Paga in sicurezza"],
    emptyTitle: "Nessuna esperienza attiva",
    emptyText: "Al momento non ci sono servizi prenotabili online.",
    chooseBoatTitle: "Scegli cosa vuoi vivere",
    chooseBoatSubtitle: "Le immagini aiutano a distinguere comfort in trimarano, tour in barca o gommone e charter pesca.",
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
