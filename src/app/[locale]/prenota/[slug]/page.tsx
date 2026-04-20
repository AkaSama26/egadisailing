import type { Metadata } from "next";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { BookingWizard } from "@/components/booking/booking-wizard";

// Round 11 SEO-M3: wizard di prenotazione non indexabile (no SEO value,
// contiene codici/intent-dati sensibili).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const service = await db.service.findUnique({ where: { id: slug } });
  if (!service || !service.active) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-4xl md:text-5xl font-heading font-bold mb-8 text-center">
          Prenota {service.name}
        </h1>
        <BookingWizard
          locale={locale}
          serviceId={service.id}
          serviceName={service.name}
          durationType={service.durationType}
          durationHours={service.durationHours}
          capacityMax={service.capacityMax}
          defaultPaymentSchedule={service.defaultPaymentSchedule}
          defaultDepositPercentage={service.defaultDepositPercentage}
          turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          appUrl={env.APP_URL}
        />
      </div>
    </div>
  );
}
