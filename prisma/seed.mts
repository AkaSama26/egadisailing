import "dotenv/config";
import { hashSync } from "bcryptjs";
import pg from "pg";
const { PrismaClient } = await import("../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Fixed IDs for idempotency
const IDS = {
  admin: "seed-admin-001",
  trimarano: "seed-boat-trimarano",
  barca: "seed-boat-barca",
  socialBoating: "seed-svc-social-boating",
  exclusiveExperience: "seed-svc-exclusive-experience",
  cabinCharter: "seed-svc-cabin-charter",
  boatSharedFull: "seed-svc-boat-shared-full",
  boatSharedMorning: "seed-svc-boat-shared-morning",
  boatExclusiveFull: "seed-svc-boat-exclusive-full",
  boatExclusiveMorning: "seed-svc-boat-exclusive-morning",
  crewSkipper: "seed-crew-skipper",
  crewChef: "seed-crew-chef",
  crewHostess: "seed-crew-hostess",
};

try {
  // 1. Admin user
  const passwordHash = hashSync("admin123", 10);
  await prisma.user.upsert({
    where: { id: IDS.admin },
    update: {},
    create: {
      id: IDS.admin,
      email: "admin@egadisailing.com",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("Admin user created");

  // 2. Boats
  const trimarano = await prisma.boat.upsert({
    where: { id: IDS.trimarano },
    update: {},
    create: {
      id: IDS.trimarano,
      name: "Trimarano",
      type: "trimaran",
      cabins: 3,
      description: {
        it: "Trimarano per escursioni e cabin charter nelle Isole Egadi",
        en: "Trimaran for excursions and cabin charter in the Egadi Islands",
      },
    },
  });

  const barca = await prisma.boat.upsert({
    where: { id: IDS.barca },
    update: {},
    create: {
      id: IDS.barca,
      name: "Barca",
      type: "motorboat",
      description: {
        it: "Barca a motore per tour giornalieri nelle Isole Egadi",
        en: "Motorboat for daily tours in the Egadi Islands",
      },
    },
  });

  console.log("Boats created");

  // 3. Services
  const services = [
    {
      id: IDS.socialBoating,
      name: "Social Boating",
      type: "SOCIAL_BOATING" as const,
      description: {
        it: "Esperienza di social boating in trimarano nelle Isole Egadi",
        en: "Social boating experience on a trimaran in the Egadi Islands",
      },
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      minPaying: 11,
      boatId: trimarano.id,
    },
    {
      id: IDS.exclusiveExperience,
      name: "Exclusive Experience",
      type: "EXCLUSIVE_EXPERIENCE" as const,
      description: {
        it: "Esperienza esclusiva in trimarano nelle Isole Egadi",
        en: "Exclusive experience on a trimaran in the Egadi Islands",
      },
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      boatId: trimarano.id,
    },
    {
      id: IDS.cabinCharter,
      name: "Cabin Charter",
      type: "CABIN_CHARTER" as const,
      description: {
        it: "Cabin charter settimanale in trimarano nelle Isole Egadi",
        en: "Weekly cabin charter on a trimaran in the Egadi Islands",
      },
      durationType: "WEEK" as const,
      durationHours: 168,
      capacityMax: 8,
      boatId: trimarano.id,
    },
    {
      id: IDS.boatSharedFull,
      name: "Boat Tour Condiviso Giornata",
      type: "BOAT_SHARED" as const,
      description: {
        it: "Tour condiviso in barca a motore, giornata intera nelle Isole Egadi",
        en: "Shared full-day motorboat tour in the Egadi Islands",
      },
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      boatId: barca.id,
    },
    {
      id: IDS.boatSharedMorning,
      name: "Boat Tour Condiviso Mattina",
      type: "BOAT_SHARED" as const,
      description: {
        it: "Tour condiviso in barca a motore, mattina nelle Isole Egadi",
        en: "Shared morning motorboat tour in the Egadi Islands",
      },
      durationType: "HALF_DAY_MORNING" as const,
      durationHours: 4,
      capacityMax: 12,
      boatId: barca.id,
    },
    {
      id: IDS.boatExclusiveFull,
      name: "Boat Tour Esclusivo Giornata",
      type: "BOAT_EXCLUSIVE" as const,
      description: {
        it: "Tour esclusivo in barca a motore, giornata intera nelle Isole Egadi",
        en: "Exclusive full-day motorboat tour in the Egadi Islands",
      },
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      boatId: barca.id,
    },
    {
      id: IDS.boatExclusiveMorning,
      name: "Boat Tour Esclusivo Mattina",
      type: "BOAT_EXCLUSIVE" as const,
      description: {
        it: "Tour esclusivo in barca a motore, mattina nelle Isole Egadi",
        en: "Exclusive morning motorboat tour in the Egadi Islands",
      },
      durationType: "HALF_DAY_MORNING" as const,
      durationHours: 4,
      capacityMax: 12,
      boatId: barca.id,
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: {},
      create: svc,
    });
  }
  console.log("Services created");

  // 4. Pricing periods for 2026
  // Periods: bassa May, media Jun-Jul15, alta Jul16-Aug, settembre Sep-Oct
  const periods = {
    bassa: { label: "Bassa Stagione", start: "2026-05-01", end: "2026-05-31" },
    media: { label: "Media Stagione", start: "2026-06-01", end: "2026-07-15" },
    alta: { label: "Alta Stagione", start: "2026-07-16", end: "2026-08-31" },
    settembre: { label: "Settembre", start: "2026-09-01", end: "2026-10-31" },
  };

  const pricingData: Array<{
    serviceId: string;
    prices: Partial<Record<keyof typeof periods, number>>;
  }> = [
    {
      serviceId: IDS.socialBoating,
      prices: { bassa: 120, media: 135, alta: 150, settembre: 120 },
    },
    {
      serviceId: IDS.boatSharedFull,
      prices: { bassa: 75, media: 85, alta: 100, settembre: 75 },
    },
    {
      serviceId: IDS.boatSharedMorning,
      prices: { bassa: 60, media: 75, alta: 90, settembre: 60 },
    },
    {
      serviceId: IDS.boatExclusiveFull,
      prices: { bassa: 75, media: 85, alta: 100, settembre: 75 },
    },
    {
      serviceId: IDS.boatExclusiveMorning,
      prices: { bassa: 60, media: 75, alta: 90, settembre: 60 },
    },
    {
      serviceId: IDS.cabinCharter,
      prices: { alta: 2300 },
    },
  ];

  let pricingIndex = 0;
  for (const { serviceId, prices } of pricingData) {
    for (const [periodKey, price] of Object.entries(prices)) {
      const period = periods[periodKey as keyof typeof periods];
      pricingIndex++;
      const id = `seed-pricing-${pricingIndex.toString().padStart(3, "0")}`;
      await prisma.pricingPeriod.upsert({
        where: { id },
        update: {},
        create: {
          id,
          serviceId,
          label: period.label,
          startDate: new Date(period.start),
          endDate: new Date(period.end),
          pricePerPerson: price,
          year: 2026,
        },
      });
    }
  }
  console.log("Pricing periods created");

  // 5. Crew members
  const crewMembers = [
    { id: IDS.crewSkipper, name: "Skipper Demo", role: "SKIPPER" as const, phone: "+39 333 1234567", email: "skipper@egadisailing.com" },
    { id: IDS.crewChef, name: "Chef Demo", role: "CHEF" as const, phone: "+39 333 2345678", email: "chef@egadisailing.com" },
    { id: IDS.crewHostess, name: "Hostess Demo", role: "HOSTESS" as const, phone: "+39 333 3456789", email: "hostess@egadisailing.com" },
  ];

  for (const crew of crewMembers) {
    await prisma.crewMember.upsert({
      where: { id: crew.id },
      update: {},
      create: crew,
    });
  }
  console.log("Crew members created");

  console.log("Seed completato!");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
