import Link from "next/link";
import { CalendarDays, Euro, Pencil, Plus, Ship, Tags } from "lucide-react";
import { db } from "@/lib/db";
import { formatEur } from "@/lib/pricing/cents";
import { AdminCard } from "@/components/admin/admin-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { formatItDay } from "@/lib/dates";
import { getPriceUnitLabel } from "@/lib/services/display";
import { cn } from "@/lib/utils";

function durationLabel(durationType: string) {
  switch (durationType) {
    case "FULL_DAY":
      return "Giornata intera";
    case "HALF_DAY_MORNING":
      return "Mattina";
    case "HALF_DAY_AFTERNOON":
      return "Pomeriggio";
    case "MULTI_DAY":
      return "Piu' giorni";
    case "WEEK":
      return "Settimana";
    default:
      return durationType;
  }
}

export default async function PrezziPage() {
  const [periods, services] = await Promise.all([
    db.pricingPeriod.findMany({
      where: { service: { active: true } },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            type: true,
            durationType: true,
            pricingUnit: true,
            boat: { select: { name: true } },
          },
        },
      },
      orderBy: [{ year: "desc" }, { serviceId: "asc" }, { startDate: "asc" }],
    }),
    db.service.findMany({
      where: { active: true },
      select: { id: true, pricingPeriods: { select: { id: true } } },
    }),
  ]);

  const configuredServices = new Set(periods.map((period) => period.service.id)).size;
  const servicesWithoutPrices = services.filter((service) => service.pricingPeriods.length === 0).length;
  const packagePeriods = periods.filter((period) => period.service.pricingUnit === "PER_PACKAGE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prezzi"
        subtitle="Listini stagionali usati dal checkout e dalle sincronizzazioni canali."
        actions={
          <Link href="/admin/prezzi/nuovo" className={cn(buttonVariants(), "gap-1.5")}>
            <Plus className="size-4" />
            Nuovo prezzo
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <AdminCard className="flex items-center gap-3">
          <Euro className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{periods.length}</div>
            <div className="text-xs text-slate-500">periodi inseriti</div>
          </div>
        </AdminCard>
        <AdminCard className="flex items-center gap-3">
          <Ship className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{configuredServices}</div>
            <div className="text-xs text-slate-500">servizi con listino</div>
          </div>
        </AdminCard>
        <AdminCard className="flex items-center gap-3">
          <Tags className="size-5 text-slate-500" />
          <div>
            <div className="text-2xl font-semibold tabular-nums">{packagePeriods}</div>
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

      <AdminCard padding="none">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold text-slate-900">Listini inseriti</h2>
            <p className="text-sm text-slate-500">Apri un periodo per modificarlo o cancellarlo.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Listini prezzo configurati</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">Servizio</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">Periodo</th>
                <th scope="col" className="px-4 py-2 text-left font-medium">Validita'</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Prezzo</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const unitLabel = getPriceUnitLabel(period.service.pricingUnit, period.service.type);
                return (
                  <tr key={period.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{period.service.name}</div>
                      <div className="text-xs text-slate-500">
                        {period.service.boat.name} · {durationLabel(period.service.durationType)} · {unitLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{period.label}</div>
                      <div className="text-xs text-slate-500">{period.year}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatItDay(period.startDate)} - {formatItDay(period.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono font-semibold tabular-nums">
                        {formatEur(period.pricePerPerson.toString())}
                      </div>
                      <div className="text-xs text-slate-500">{unitLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/prezzi/${period.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
                      >
                        <Pencil className="size-3.5" />
                        Modifica
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {periods.length === 0 && (
                <EmptyState message="Nessun prezzo configurato." colSpan={5} />
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
