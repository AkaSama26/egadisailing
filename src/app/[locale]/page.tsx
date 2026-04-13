import { db } from "@/lib/db";
import { HeroSection } from "@/components/hero-section";
import { LandingSections } from "./landing-sections";

export default async function HomePage() {
  const services = await db.service.findMany({
    where: { active: true },
    include: {
      pricingPeriods: { orderBy: { pricePerPerson: "asc" }, take: 1 },
    },
  });

  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    durationType: s.durationType,
    description: s.description as Record<string, string>,
    minPrice: s.pricingPeriods[0]?.pricePerPerson?.toString() ?? null,
  }));

  return (
    <>
      <HeroSection />
      <LandingSections services={serializedServices} />
    </>
  );
}
