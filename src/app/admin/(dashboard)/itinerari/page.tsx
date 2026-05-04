import { db } from "@/lib/db";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import {
  getCopyableItinerarySteps,
  getItineraryLocaleOptions,
} from "@/lib/experiences/itineraries";
import { getServiceDurationLabel } from "@/lib/services/display";
import { ItineraryEditor, type ItineraryServiceOption } from "./itinerary-editor";

type Props = {
  searchParams: Promise<{ service?: string }>;
};

export default async function ItinerariPage({ searchParams }: Props) {
  const sp = await searchParams;
  const services = await db.service.findMany({
    include: {
      boat: { select: { name: true } },
      itinerarySteps: { select: { id: true }, where: { active: true } },
    },
    orderBy: [{ active: "desc" }, { priority: "desc" }, { name: "asc" }],
  });

  const selectedServiceId =
    sp.service && services.some((service) => service.id === sp.service)
      ? sp.service
      : services[0]?.id;
  const initialSteps = selectedServiceId
    ? await getCopyableItinerarySteps(selectedServiceId)
    : [];
  const localeOptions = getItineraryLocaleOptions();

  const options: ItineraryServiceOption[] = services.map((service) => ({
    id: service.id,
    name: service.name,
    boatName: service.boat.name,
    durationLabel: getServiceDurationLabel(service),
    configuredSteps: service.itinerarySteps.length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Itinerari esperienze"
        subtitle="Modifica le tappe pubbliche in italiano e inglese, oppure copia una rotta gia' pronta da un'altra barca o esperienza."
      />

      <AdminCard className="space-y-5">
        {selectedServiceId ? (
          <ItineraryEditor
            services={options}
            localeOptions={localeOptions}
            selectedServiceId={selectedServiceId}
            initialSteps={initialSteps}
          />
        ) : (
          <p className="text-sm text-slate-500">Nessun servizio configurato.</p>
        )}
      </AdminCard>
    </div>
  );
}
