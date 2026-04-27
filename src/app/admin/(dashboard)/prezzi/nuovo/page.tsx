import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { PricingPeriodForm, type PricingServiceOption } from "../_components/pricing-period-form";

export default async function NuovoPrezzoPage() {
  const services = await db.service.findMany({
    where: { active: true },
    include: { boat: { select: { name: true } } },
    orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
  });

  const serviceOptions: PricingServiceOption[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    type: service.type,
    durationType: service.durationType,
    pricingUnit: service.pricingUnit,
    boatName: service.boat.name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuovo prezzo"
        subtitle="Creazione guidata di un periodo listino."
        backHref="/admin/prezzi"
        backLabel="Prezzi"
      />

      <AdminCard>
        <PricingPeriodForm services={serviceOptions} mode="create" />
      </AdminCard>
    </div>
  );
}
