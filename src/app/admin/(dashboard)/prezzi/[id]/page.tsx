import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { PageHeader } from "@/components/admin/page-header";
import { formatEur } from "@/lib/pricing/cents";
import { formatItDay } from "@/lib/dates";
import {
  PricingPeriodForm,
  type PricingPeriodFormValue,
  type PricingServiceOption,
} from "../_components/pricing-period-form";
import { getPriceUnitLabel } from "@/lib/services/display";

function isoDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function PrezzoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [period, services] = await Promise.all([
    db.pricingPeriod.findUnique({
      where: { id },
      include: {
        service: {
          include: { boat: { select: { name: true } } },
        },
      },
    }),
    db.service.findMany({
      where: { active: true },
      include: { boat: { select: { name: true } } },
      orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!period) notFound();

  const serviceOptions: PricingServiceOption[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    type: service.type,
    durationType: service.durationType,
    pricingUnit: service.pricingUnit,
    boatName: service.boat.name,
  }));

  const initialValue: PricingPeriodFormValue = {
    id: period.id,
    serviceId: period.serviceId,
    label: period.label,
    startDate: isoDateInput(period.startDate),
    endDate: isoDateInput(period.endDate),
    pricePerPerson: period.pricePerPerson.toString(),
    year: period.year,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={period.label}
        subtitle={`${period.service.name} · ${period.service.boat.name}`}
        backHref="/admin/prezzi"
        backLabel="Prezzi"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <AdminCard>
          <PricingPeriodForm services={serviceOptions} initialValue={initialValue} mode="edit" />
        </AdminCard>

        <AdminCard title="Riepilogo" className="h-fit">
          <div className="space-y-1 text-sm">
            <DetailRow label="Servizio" value={period.service.name} />
            <DetailRow label="Barca" value={period.service.boat.name} />
            <DetailRow label="Validita'" value={`${formatItDay(period.startDate)} - ${formatItDay(period.endDate)}`} />
            <DetailRow
              label="Prezzo"
              value={`${formatEur(period.pricePerPerson.toString())} ${getPriceUnitLabel(period.service.pricingUnit, period.service.type)}`}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
