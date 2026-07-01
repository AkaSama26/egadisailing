export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { BookingPageClient, type BookingServiceOption } from "@/components/booking/booking-page-client";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { getBoatContent } from "@/data/catalog/boats";
import {
  compareExperienceOrder,
  getExperienceContent,
  getPublicExperienceIds,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getDisplayPriceMap } from "@/lib/pricing/display";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";

const HIDDEN_BOOKING_SERVICE_IDS = new Set(["boat-exclusive-afternoon"]);

function experienceKeyForOption(service: BookingServiceOption): string {
  if (service.serviceType === "BOAT_SHARED") return `${service.boatId}:BOAT_SHARED`;
  if (service.serviceType === "BOAT_EXCLUSIVE") return `${service.boatId}:BOAT_EXCLUSIVE`;
  return `${service.boatId}:${service.id}`;
}

function uniqueDefined(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return buildPageMetadata({
    title: isEs
      ? "Reserva paseos en barco por las Islas Egadi desde Trapani"
      : isFr
      ? "Réserver une excursion bateau aux îles Égades depuis Trapani"
      : isDe
      ? "Bootstouren zu den Ägadischen Inseln ab Trapani buchen"
      : isEn
      ? "Book Egadi Boat Tours from Trapani Online"
      : "Prenota Escursioni in Barca alle Egadi Online",
    description: isEs
      ? "Reserva paseos y excursiones en barco por las Islas Egadi desde Trapani con disponibilidad en vivo, precios actualizados y checkout seguro Egadisailing."
      : isFr
      ? "Réservez une excursion bateau aux îles Égades depuis Trapani avec disponibilités en direct, prix à jour et checkout sécurisé Egadisailing."
      : isDe
      ? "Prüfen Sie Verfügbarkeit und buchen Sie Bootstouren zu den Ägadischen Inseln ab Trapani mit aktuellen Preisen und sicherem Egadisailing-Checkout."
      : isEn
      ? "Book Egadi Islands boat tours from Trapani with live availability, updated prices, secure checkout and shared, private or charter options."
      : "Prenota escursioni in barca alle Isole Egadi con disponibilità live, prezzi aggiornati e checkout sicuro Egadisailing.",
    path: "/prenota",
    locale,
  });
}

export default async function BookingIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    service?: string;
    boat?: string;
    experience?: string;
    durationType?: string;
    date?: string;
    endDate?: string;
    durationDays?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const services = await db.service.findMany({
    where: { active: true, id: { in: getPublicExperienceIds() } },
    select: {
      id: true,
      name: true,
      type: true,
      boatId: true,
      durationType: true,
      durationHours: true,
      capacityMax: true,
      defaultPaymentSchedule: true,
      defaultDepositPercentage: true,
      pricingUnit: true,
      boat: {
        select: { id: true, name: true },
      },
    },
  });
  const bookableServices = services.filter((service) => !HIDDEN_BOOKING_SERVICE_IDS.has(service.id));
  const displayPrices = await getDisplayPriceMap(bookableServices.map((service) => service.id), 2026, locale);

  const options: BookingServiceOption[] = bookableServices
    .sort((a, b) => compareExperienceOrder(a.id, b.id))
    .map((service) => {
      const content = getExperienceContent(service.id, locale);
      const boat = getBoatContent(service.boatId, locale);
      const primaryMedia = content?.media.find((media) => media.src);
      return {
        id: service.id,
        title: content?.title ?? service.name,
        subtitle: content?.subtitle ?? "",
        detailDescription: content?.detailDescription ?? content?.subtitle ?? "",
        imageSrc: primaryMedia?.src,
        imageAlt: primaryMedia?.alt,
        includes: content?.includes ?? [],
        notIncluded: content?.bringItems ?? [],
        locations: uniqueDefined(content?.itinerary.map((item) => item.location) ?? []),
        boatId: service.boatId,
        boatTitle: boat?.title ?? service.boat.name,
        boatImageSrc: boat?.imageSrc ?? boat?.gallery[0]?.src,
        boatImageAlt: boat?.imageAlt,
        serviceType: service.type,
        durationType: service.durationType,
        durationHours: service.durationHours,
        capacityMax: service.capacityMax,
        defaultPaymentSchedule: service.defaultPaymentSchedule,
        defaultDepositPercentage: service.defaultDepositPercentage,
        priceLabel:
          displayPrices.get(service.id)?.label ??
          (locale === "es"
            ? "Precio bajo petición"
            : locale === "fr"
              ? "Prix sur demande"
              : locale === "de"
                ? "Preis auf Anfrage"
              : locale === "en"
                ? "Price on request"
                : "Prezzo su richiesta"),
        priceUnitLabel: getPriceUnitLabel(service.pricingUnit, service.type, locale),
        durationLabel: getServiceDurationLabel(service, locale),
      };
    });

  const initialStartDate =
    typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? sp.date
      : undefined;
  const parsedDurationDays =
    typeof sp.durationDays === "string" ? Number.parseInt(sp.durationDays, 10) : undefined;
  const initialEndDate =
    typeof sp.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.endDate)
      ? sp.endDate
      : undefined;
  const initialDurationDays =
    parsedDurationDays && parsedDurationDays >= 3 && parsedDurationDays <= 7
      ? parsedDurationDays
      : undefined;
  const requestedServiceId =
    typeof sp.service === "string" ? resolveExperienceServiceIdFromSlug(sp.service) : undefined;
  const initialServiceId =
    requestedServiceId && options.some((service) => service.id === requestedServiceId)
      ? requestedServiceId
      : undefined;
  const initialBoatId =
    typeof sp.boat === "string" && options.some((service) => service.boatId === sp.boat)
      ? sp.boat
      : undefined;
  const initialExperienceKey =
    typeof sp.experience === "string" &&
    sp.experience.length <= 160 &&
    options.some((service) => experienceKeyForOption(service) === sp.experience)
      ? sp.experience
      : undefined;
  const initialDurationType =
    typeof sp.durationType === "string" &&
    options.some((service) => service.durationType === sp.durationType)
      ? sp.durationType
      : undefined;
  const clientStateKey = [
    initialBoatId ?? "",
    initialExperienceKey ?? "",
    initialServiceId ?? "",
    initialDurationType ?? "",
    initialStartDate ?? "",
    initialEndDate ?? "",
    initialDurationDays ?? "",
  ].join("|");

  return (
    <OceanLayout padding="sm">
      <BookingPageClient
        key={clientStateKey}
        locale={locale}
        services={options}
        initialServiceId={initialServiceId}
        initialBoatId={initialBoatId}
        initialExperienceKey={initialExperienceKey}
        initialDurationType={initialDurationType}
        turnstileSiteKey={getPublicTurnstileSiteKey()}
        appUrl={env.APP_URL}
        useStripeCheckout={env.FEATURE_STRIPE_CHECKOUT_ENABLED}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
        initialDurationDays={initialDurationDays}
      />
    </OceanLayout>
  );
}
