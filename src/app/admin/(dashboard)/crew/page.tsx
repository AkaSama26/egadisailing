import { db } from "@/lib/db";
import { CrewForm } from "../../_components/crew-form";
import { CrewTable } from "../../_components/crew-table";

export default async function CrewPage() {
  const crewMembers = await db.crewMember.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Crew</h1>
        <CrewForm />
      </div>
      <CrewTable crewMembers={crewMembers} />
    </div>
  );
}
