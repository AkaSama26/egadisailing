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
import { getPassengerFareRulesForServiceType } from "@/lib/pricing/passenger-fare-rules";
import { PASSENGER_FARE_SERVICE_TYPE } from "@/lib/pricing/passenger-fare-rules-shared";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPriceUnitLabel, getServiceDurationLabel } from "@/lib/services/display";
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";

function experienceKeyForOption(service: BookingServiceOption): string {
  if (service.serviceType === "BOAT_SHARED") return `${service.boatId}:BOAT_SHARED`;
  if (service.serviceType === "BOAT_EXCLUSIVE") return `${service.boatId}:BOAT_EXCLUSIVE`;
  return `${service.boatId}:${service.id}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";
  return buildPageMetadata({
    title: isEn
      ? "Book Egadi Islands Boat Tours Online"
      : "Prenota Escursioni in Barca alle Egadi Online",
    description: isEn
      ? "Book boat tours in the Egadi Islands with live availability, updated prices and secure Egadisailing checkout."
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
  const [displayPrices, passengerFareRules] = await Promise.all([
    getDisplayPriceMap(services.map((service) => service.id), 2026, locale),
    getPassengerFareRulesForServiceType(PASSENGER_FARE_SERVICE_TYPE),
  ]);

  const options: BookingServiceOption[] = services
    .sort((a, b) => compareExperienceOrder(a.id, b.id))
    .map((service) => {
      const content = getExperienceContent(service.id, locale);
      const boat = getBoatContent(service.boatId, locale);
      return {
        id: service.id,
        title: content?.title ?? service.name,
        subtitle: content?.subtitle ?? "",
        boatId: service.boatId,
        boatTitle: boat?.title ?? service.boat.name,
        serviceType: service.type,
        durationType: service.durationType,
        durationHours: service.durationHours,
        capacityMax: service.capacityMax,
        defaultPaymentSchedule: service.defaultPaymentSchedule,
        defaultDepositPercentage: service.defaultDepositPercentage,
        priceLabel:
          displayPrices.get(service.id)?.label ??
          (locale === "en" ? "Price on request" : "Prezzo su richiesta"),
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
        passengerFareRules={passengerFareRules}
        initialStartDate={initialStartDate}
        initialEndDate={initialEndDate}
        initialDurationDays={initialDurationDays}
      />
    </OceanLayout>
  );
}
