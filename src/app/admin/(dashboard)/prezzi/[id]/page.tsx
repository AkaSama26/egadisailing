import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { DetailRow } from "@/components/admin/detail-row";
import { PageHeader } from "@/components/admin/page-header";
import { formatEur } from "@/lib/pricing/cents";
import { formatItDay } from "@/lib/dates";
import { getPriceUnitLabel } from "@/lib/services/display";

export default async function PrezzoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const period = await db.pricingPeriod.findUnique({
    where: { id },
    include: {
      service: {
        include: { boat: { select: { name: true } } },
      },
    },
  });

  if (!period) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={period.label}
        subtitle="Periodo legacy in sola lettura"
        backHref="/admin/prezzi"
        backLabel="Prezzi"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <AdminCard tone="warn">
          <p className="text-sm text-amber-900">
            Questo `PricingPeriod` resta consultabile solo come fallback temporaneo.
            Le modifiche operative vanno fatte dalla matrice stagionale `ServicePrice`.
          </p>
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
