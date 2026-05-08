import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { getExperienceContent } from "@/data/catalog/experiences";
import { getPassengerFareRulesForServiceType } from "@/lib/pricing/passenger-fare-rules";
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";

// Round 11 SEO-M3: wizard di prenotazione non indexabile (no SEO value,
// contiene codici/intent-dati sensibili).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "es"
        ? "Completa tu reserva"
        : locale === "fr"
          ? "Finalisez votre réservation"
        : locale === "en"
          ? "Complete your booking"
          : "Completa la prenotazione",
    robots: { index: false, follow: false },
  };
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ date?: string; endDate?: string; durationDays?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const service = await db.service.findUnique({ where: { id: slug } });
  if (!service || !service.active) notFound();
  const passengerFareRules = await getPassengerFareRulesForServiceType(service.type);
  const content = getExperienceContent(service.id, locale);
  const serviceTitle = content?.title ?? service.name;
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
    service.type === "CABIN_CHARTER" &&
    parsedDurationDays &&
    parsedDurationDays >= 3 &&
    parsedDurationDays <= 7
      ? parsedDurationDays
      : undefined;

  return (
    <OceanLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-4xl md:text-5xl font-heading font-bold mb-8 text-center">
          {locale === "es" ? "Reserva" : locale === "fr" ? "Réserver" : locale === "en" ? "Book" : "Prenota"} {serviceTitle}
        </h1>
        <BookingWizard
          locale={locale}
          serviceId={service.id}
          serviceName={serviceTitle}
          serviceType={service.type}
          durationType={service.durationType}
          durationHours={service.durationHours}
          capacityMax={service.capacityMax}
          defaultPaymentSchedule={service.defaultPaymentSchedule}
          defaultDepositPercentage={service.defaultDepositPercentage}
          turnstileSiteKey={getPublicTurnstileSiteKey()}
          appUrl={env.APP_URL}
          useStripeCheckout={env.FEATURE_STRIPE_CHECKOUT_ENABLED}
          passengerFareRules={passengerFareRules}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          initialDurationDays={initialDurationDays}
        />
      </div>
    </OceanLayout>
  );
}
