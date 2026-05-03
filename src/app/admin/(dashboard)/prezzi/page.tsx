import { CalendarDays, Euro, Ship, Tags } from "lucide-react";
import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { PriceMatrixForm } from "./_components/price-matrix-form";
import { getPassengerFareRulesForServiceType } from "@/lib/pricing/passenger-fare-rules";
import { PASSENGER_FARE_SERVICE_TYPE } from "@/lib/pricing/passenger-fare-rules-shared";

const LIST_YEAR = 2026;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function PrezziPage() {
  const [services, prices, seasons, legacyPeriods, passengerFareRules] = await Promise.all([
    db.service.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        type: true,
        durationType: true,
        pricingUnit: true,
        priority: true,
        boat: { select: { name: true } },
      },
      orderBy: [{ boatId: "asc" }, { priority: "desc" }, { name: "asc" }],
    }),
    db.servicePrice.findMany({
      where: { year: LIST_YEAR },
      select: {
        serviceId: true,
        priceBucket: true,
        durationDays: true,
        amount: true,
        pricingUnit: true,
      },
      orderBy: [{ serviceId: "asc" }, { priceBucket: "asc" }, { durationDays: "asc" }],
    }),
    db.season.findMany({
      where: { year: LIST_YEAR },
      orderBy: { startDate: "asc" },
    }),
    db.pricingPeriod.count({ where: { year: LIST_YEAR } }),
    getPassengerFareRulesForServiceType(PASSENGER_FARE_SERVICE_TYPE),
  ]);

  const configuredServices = new Set(prices.map((price) => price.serviceId)).size;
  const servicesWithoutPrices = services.filter((service) => !prices.some((p) => p.serviceId === service.id)).length;
  const packageRows = prices.filter((price) => price.pricingUnit === "PER_PACKAGE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Listino"
        subtitle="Matrice stagionale usata da checkout, calendario e canali di vendita."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <AdminCard className="flex items-center gap-3">
          <Euro className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{prices.length}</div>
            <div className="text-xs text-slate-500">righe listino {LIST_YEAR}</div>
          </div>
        </AdminCard>
        <AdminCard className="flex items-center gap-3">
          <Ship className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{configuredServices}</div>
            <div className="text-xs text-slate-500">servizi configurati</div>
          </div>
        </AdminCard>
        <AdminCard className="flex items-center gap-3">
          <Tags className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{packageRows}</div>
            <div className="text-xs text-slate-500">prezzi a pacchetto</div>
          </div>
        </AdminCard>
        <AdminCard className="flex items-center gap-3" tone={servicesWithoutPrices > 0 ? "warn" : "success"}>
          <CalendarDays className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{servicesWithoutPrices}</div>
            <div className="text-xs text-slate-500">servizi senza listino</div>
          </div>
        </AdminCard>
      </div>

      {legacyPeriods > 0 && (
        <AdminCard tone="warn">
          <p className="text-sm text-amber-900">
            Ci sono {legacyPeriods} periodi storici per il {LIST_YEAR}. Per l'operativita'
            quotidiana usa la matrice qui sotto.
          </p>
        </AdminCard>
      )}

      <PriceMatrixForm
        year={LIST_YEAR}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          type: service.type,
          durationType: service.durationType,
          pricingUnit: service.pricingUnit,
          boatName: service.boat.name,
        }))}
        prices={prices.map((price) => ({
          serviceId: price.serviceId,
          priceBucket: price.priceBucket,
          durationDays: price.durationDays,
          amount: price.amount.toString(),
          pricingUnit: price.pricingUnit,
        }))}
        seasons={seasons.map((season) => ({
          key: season.key as "LOW" | "MID" | "HIGH" | "LATE_LOW",
          label: season.label,
          startDate: isoDate(season.startDate),
          endDate: isoDate(season.endDate),
          priceBucket: season.priceBucket as "LOW" | "MID" | "HIGH",
        }))}
        passengerFareRules={passengerFareRules}
      />
    </div>
  );
}
