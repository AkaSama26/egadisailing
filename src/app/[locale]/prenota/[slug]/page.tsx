export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { OceanLayout } from "@/components/customer/ocean-layout";
import {
  getExperienceContent,
  resolveExperienceServiceIdFromSlug,
} from "@/data/catalog/experiences";
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
        : locale === "de"
          ? "Buchung abschließen"
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
  const serviceId = resolveExperienceServiceIdFromSlug(slug);
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) notFound();
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
    <OceanLayout padding="sm" className="sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-none">
        <div className="mb-5 text-center text-white sm:mb-7 lg:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100 sm:text-sm">
            {locale === "es" ? "Reserva guiada" : locale === "fr" ? "Réservation guidée" : locale === "de" ? "Geführte Buchung" : locale === "en" ? "Guided booking" : "Prenotazione guidata"}
          </p>
          <h1 className="mx-auto mt-2 max-w-5xl text-balance break-words font-heading text-3xl font-bold leading-[1.02] sm:mt-3 sm:text-4xl md:text-5xl lg:text-6xl">
            {locale === "es" ? "Reserva" : locale === "fr" ? "Réserver" : locale === "de" ? "Buchen" : locale === "en" ? "Book" : "Prenota"} {serviceTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/76 sm:mt-4 sm:text-base sm:leading-7 lg:mt-5 lg:text-lg">
            {locale === "es"
              ? "Elige fecha, huéspedes, datos y pago en un recorrido claro paso a paso."
              : locale === "fr"
                ? "Choisissez date, invités, coordonnées et paiement dans un parcours clair étape par étape."
                : locale === "de"
                  ? "Wählen Sie Datum, Gäste, Daten und Zahlung in einem klaren Schritt-für-Schritt-Ablauf."
                  : locale === "en"
                    ? "Choose date, guests, details and payment in a clear step-by-step flow."
                    : "Scegli data, ospiti, dati e pagamento in un percorso chiaro passo dopo passo."}
          </p>
        </div>
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
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          initialDurationDays={initialDurationDays}
        />
      </div>
    </OceanLayout>
  );
}
