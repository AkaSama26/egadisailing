// @ts-nocheck - legacy schema references, refactored in Plan 5
import { db } from "@/lib/db";
import { PricingForm } from "../../_components/pricing-form";
import { PricingTable } from "../../_components/pricing-table";

export default async function PricingPage() {
  const services = await db.service.findMany({
    where: { active: true },
    include: { pricingPeriods: { orderBy: { startDate: "asc" } } },
    orderBy: { name: "asc" },
  });

  // Serialize Decimal fields for client component
  const serialized = services.map((s) => ({
    id: s.id,
    name: s.name,
    pricingPeriods: s.pricingPeriods.map((p) => ({
      id: p.id,
      label: p.label,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      pricePerPerson: p.pricePerPerson.toString(),
      year: p.year,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestione Prezzi</h1>
        <PricingForm
          services={services.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
      <PricingTable services={serialized} />
    </div>
  );
}
