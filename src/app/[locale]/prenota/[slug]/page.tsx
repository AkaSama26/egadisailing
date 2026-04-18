import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const service = await db.service.findUnique({ where: { id: slug } });
  if (!service || !service.active) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-white text-4xl md:text-5xl font-heading font-bold mb-8 text-center">
          Prenota {service.name}
        </h1>
        <BookingWizard
          serviceId={service.id}
          serviceName={service.name}
          durationType={service.durationType}
          durationHours={service.durationHours}
          capacityMax={service.capacityMax}
          defaultPaymentSchedule={service.defaultPaymentSchedule}
          defaultDepositPercentage={service.defaultDepositPercentage}
        />
      </div>
    </div>
  );
}
