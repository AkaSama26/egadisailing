import { db } from "@/lib/db";
import { TripForm } from "../../../_components/trip-form";

export default async function NewTripPage() {
  const services = await db.service.findMany({
    where: { active: true },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nuova Uscita</h1>
      <TripForm services={services} />
    </div>
  );
}
