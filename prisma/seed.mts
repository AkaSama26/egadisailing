import "dotenv/config";
import { hashSync } from "bcryptjs";
import pg from "pg";
const { PrismaClient } = await import("../src/generated/prisma/client.js");
const { PrismaPg } = await import("@prisma/adapter-pg");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user — password from env, never hardcoded
  const rawAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && !rawAdminPassword) {
    throw new Error("SEED_ADMIN_PASSWORD is required in production");
  }
  const adminPasswordPlain =
    rawAdminPassword ??
    (() => {
      const generated = `dev-${Math.random().toString(36).slice(2, 10)}`;
      console.log(`⚠️  SEED_ADMIN_PASSWORD not set — generated dev password: ${generated}`);
      return generated;
    })();
  const adminPassword = hashSync(adminPasswordPlain, 12);
  await prisma.user.upsert({
    where: { email: "admin@egadisailing.com" },
    update: { passwordHash: adminPassword },
    create: {
      email: "admin@egadisailing.com",
      passwordHash: adminPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("✓ Admin user");

  // Boats
  const trimarano = await prisma.boat.upsert({
    where: { id: "trimarano" },
    update: {},
    create: {
      id: "trimarano",
      name: "Trimarano Egadisailing",
      type: "TRIMARAN",
      description:
        "Trimarano luxury 60ft con 3 cabine, cucina, bagno. Perfetto per escursioni e cabin charter settimanali nelle Egadi.",
      length: 18.3,
      year: 2020,
      cabins: 3,
      amenities: {
        beds: 10,
        kitchen: true,
        bathroom: true,
        shower: true,
        wifi: true,
        audio: true,
        snorkeling: true,
        bimini: true,
      },
      images: ["/images/trimarano.webp"],
    },
  });

  await prisma.boat.upsert({
    where: { id: "motoscafo" },
    update: {},
    create: {
      id: "motoscafo",
      name: "Motoscafo Egadisailing",
      type: "MOTORBOAT",
      description: "Motoscafo 10 posti, 200 HP, perfetto per giornate veloci alle Egadi.",
      engineHp: 200,
      amenities: {
        seats: 10,
        shade: true,
        swimLadder: true,
        snorkeling: true,
      },
      images: [],
    },
  });
  const boat = await prisma.boat.upsert({
    where: { id: "boat" },
    update: {
      name: "Barca",
      type: "MOTORBOAT",
      description: "Barca Egadisailing per esperienze condivise ed esclusive alle Egadi.",
    },
    create: {
      id: "boat",
      name: "Barca",
      type: "MOTORBOAT",
      description: "Barca Egadisailing per esperienze condivise ed esclusive alle Egadi.",
      amenities: {
        seats: 12,
        shade: true,
        swimLadder: true,
        snorkeling: true,
      },
      images: [],
    },
  });
  console.log("✓ Boats");

  // Services
  const orphanServiceIds = ["social-boating", "boat-tour", "boat-exclusive"];
  await prisma.hotDayOverride.deleteMany({
    where: { serviceId: { in: orphanServiceIds } },
  });
  await prisma.pricingPeriod.deleteMany({
    where: { serviceId: { in: orphanServiceIds } },
  });
  await prisma.service.deleteMany({
    where: {
      id: { in: orphanServiceIds },
      bookings: { none: {} },
    },
  });
  await prisma.service.updateMany({
    where: {
      id: { in: orphanServiceIds },
    },
    data: { active: false },
  });

  const services = [
    {
      id: "exclusive-experience",
      name: "Esperienza Gourmet",
      type: "EXCLUSIVE_EXPERIENCE",
      boatId: trimarano.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 10,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 8,
      pricingUnit: "PER_PACKAGE",
    },
    {
      id: "cabin-charter",
      name: "Esperienza Charter",
      type: "CABIN_CHARTER",
      boatId: trimarano.id,
      durationType: "MULTI_DAY" as const,
      durationHours: 72,
      capacityMax: 6,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 10,
      pricingUnit: "PER_PACKAGE",
    },
    {
      id: "boat-shared-full-day",
      name: "Barca condivisa giornata intera",
      type: "BOAT_SHARED",
      boatId: boat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      minPaying: 1,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 6,
      pricingUnit: "PER_PERSON",
    },
    {
      id: "boat-shared-morning",
      name: "Barca condivisa mattina",
      type: "BOAT_SHARED",
      boatId: boat.id,
      durationType: "HALF_DAY_MORNING" as const,
      durationHours: 4,
      capacityMax: 12,
      minPaying: 1,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 4,
      pricingUnit: "PER_PERSON",
    },
    {
      id: "boat-shared-afternoon",
      name: "Barca condivisa pomeriggio",
      type: "BOAT_SHARED",
      boatId: boat.id,
      durationType: "HALF_DAY_AFTERNOON" as const,
      durationHours: 4,
      capacityMax: 12,
      minPaying: 1,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 4,
      pricingUnit: "PER_PERSON",
    },
    {
      id: "boat-exclusive-full-day",
      name: "Barca esclusiva giornata intera",
      type: "BOAT_EXCLUSIVE",
      boatId: boat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 9,
      pricingUnit: "PER_PACKAGE",
    },
    {
      id: "boat-exclusive-morning",
      name: "Barca esclusiva mattina",
      type: "BOAT_EXCLUSIVE",
      boatId: boat.id,
      durationType: "HALF_DAY_MORNING" as const,
      durationHours: 4,
      capacityMax: 12,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 5,
      pricingUnit: "PER_PACKAGE",
    },
    {
      id: "boat-exclusive-afternoon",
      name: "Barca esclusiva pomeriggio",
      type: "BOAT_EXCLUSIVE",
      boatId: boat.id,
      durationType: "HALF_DAY_AFTERNOON" as const,
      durationHours: 4,
      capacityMax: 12,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 5,
      pricingUnit: "PER_PACKAGE",
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: svc,
      create: svc,
    });
  }
  await prisma.service.updateMany({
    where: {
      id: {
        in: [
          "charter-3-days",
          "charter-4-days",
          "charter-5-days",
          "charter-6-days",
          "charter-7-days",
        ],
      },
    },
    data: { active: false },
  });
  console.log(`✓ ${services.length} services`);

  const seasons = [
    {
      id: "season-2026-low",
      year: 2026,
      key: "LOW",
      label: "Bassa stagione",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-06-15T00:00:00.000Z"),
      priceBucket: "LOW",
    },
    {
      id: "season-2026-mid",
      year: 2026,
      key: "MID",
      label: "Media stagione",
      startDate: new Date("2026-06-16T00:00:00.000Z"),
      endDate: new Date("2026-07-15T00:00:00.000Z"),
      priceBucket: "MID",
    },
    {
      id: "season-2026-high",
      year: 2026,
      key: "HIGH",
      label: "Alta stagione",
      startDate: new Date("2026-07-16T00:00:00.000Z"),
      endDate: new Date("2026-09-15T00:00:00.000Z"),
      priceBucket: "HIGH",
    },
    {
      id: "season-2026-late-low",
      year: 2026,
      key: "LATE_LOW",
      label: "Bassa tardiva",
      startDate: new Date("2026-09-16T00:00:00.000Z"),
      endDate: new Date("2026-10-31T00:00:00.000Z"),
      priceBucket: "LOW",
    },
  ];

  for (const season of seasons) {
    await prisma.season.upsert({
      where: { year_key: { year: season.year, key: season.key } },
      update: {
        label: season.label,
        startDate: season.startDate,
        endDate: season.endDate,
        priceBucket: season.priceBucket,
      },
      create: season,
    });
  }
  console.log(`✓ ${seasons.length} seasons`);

  const servicePrices = [
    ["sp-2026-gourmet-low", "exclusive-experience", "LOW", null, 2000, "PER_PACKAGE"],
    ["sp-2026-gourmet-mid", "exclusive-experience", "MID", null, 2200, "PER_PACKAGE"],
    ["sp-2026-gourmet-high", "exclusive-experience", "HIGH", null, 2500, "PER_PACKAGE"],

    ["sp-2026-boat-excl-full-low", "boat-exclusive-full-day", "LOW", null, 900, "PER_PACKAGE"],
    ["sp-2026-boat-excl-full-mid", "boat-exclusive-full-day", "MID", null, 1050, "PER_PACKAGE"],
    ["sp-2026-boat-excl-full-high", "boat-exclusive-full-day", "HIGH", null, 1200, "PER_PACKAGE"],
    ["sp-2026-boat-excl-morning-low", "boat-exclusive-morning", "LOW", null, 630, "PER_PACKAGE"],
    ["sp-2026-boat-excl-morning-mid", "boat-exclusive-morning", "MID", null, 740, "PER_PACKAGE"],
    ["sp-2026-boat-excl-morning-high", "boat-exclusive-morning", "HIGH", null, 840, "PER_PACKAGE"],
    ["sp-2026-boat-excl-afternoon-low", "boat-exclusive-afternoon", "LOW", null, 630, "PER_PACKAGE"],
    ["sp-2026-boat-excl-afternoon-mid", "boat-exclusive-afternoon", "MID", null, 740, "PER_PACKAGE"],
    ["sp-2026-boat-excl-afternoon-high", "boat-exclusive-afternoon", "HIGH", null, 840, "PER_PACKAGE"],

    ["sp-2026-boat-shared-full-low", "boat-shared-full-day", "LOW", null, 75, "PER_PERSON"],
    ["sp-2026-boat-shared-full-mid", "boat-shared-full-day", "MID", null, 85, "PER_PERSON"],
    ["sp-2026-boat-shared-full-high", "boat-shared-full-day", "HIGH", null, 100, "PER_PERSON"],
    ["sp-2026-boat-shared-morning-low", "boat-shared-morning", "LOW", null, 55, "PER_PERSON"],
    ["sp-2026-boat-shared-morning-mid", "boat-shared-morning", "MID", null, 65, "PER_PERSON"],
    ["sp-2026-boat-shared-morning-high", "boat-shared-morning", "HIGH", null, 75, "PER_PERSON"],
    ["sp-2026-boat-shared-afternoon-low", "boat-shared-afternoon", "LOW", null, 55, "PER_PERSON"],
    ["sp-2026-boat-shared-afternoon-mid", "boat-shared-afternoon", "MID", null, 65, "PER_PERSON"],
    ["sp-2026-boat-shared-afternoon-high", "boat-shared-afternoon", "HIGH", null, 75, "PER_PERSON"],

    ["sp-2026-charter-3", "cabin-charter", null, 3, 3250, "PER_PACKAGE"],
    ["sp-2026-charter-4", "cabin-charter", null, 4, 4300, "PER_PACKAGE"],
    ["sp-2026-charter-5", "cabin-charter", null, 5, 5400, "PER_PACKAGE"],
    ["sp-2026-charter-6", "cabin-charter", null, 6, 6450, "PER_PACKAGE"],
    ["sp-2026-charter-7", "cabin-charter", null, 7, 7500, "PER_PACKAGE"],
  ] as const;

  for (const [id, serviceId, priceBucket, durationDays, amount, pricingUnit] of servicePrices) {
    await prisma.servicePrice.upsert({
      where: { id },
      update: {
        serviceId,
        year: 2026,
        priceBucket,
        durationDays,
        amount,
        pricingUnit,
      },
      create: {
        id,
        serviceId,
        year: 2026,
        priceBucket,
        durationDays,
        amount,
        pricingUnit,
      },
    });
  }
  console.log(`✓ ${servicePrices.length} service prices`);

  // Crew members (placeholder per testing)
  const crew = [
    { name: "Marco Skipper", role: "SKIPPER" as const, phone: "+39 333 1111111", dailyRate: 200 },
    { name: "Chef Giuseppe", role: "CHEF" as const, phone: "+39 333 2222222", dailyRate: 250 },
    { name: "Laura Hostess", role: "HOSTESS" as const, phone: "+39 333 3333333", dailyRate: 150 },
  ];

  for (const c of crew) {
    const existing = await prisma.crewMember.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.crewMember.create({ data: c });
    }
  }
  console.log(`✓ ${crew.length} crew members`);

  // Channel sync status (initial entries)
  const channels = ["DIRECT", "BOKUN", "BOATAROUND", "SAMBOAT", "CLICKANDBOAT", "NAUTAL"];
  for (const ch of channels) {
    await prisma.channelSyncStatus.upsert({
      where: { channel: ch },
      update: {},
      create: { channel: ch, healthStatus: "GREEN" },
    });
  }
  console.log(`✓ ${channels.length} channel sync statuses`);

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
