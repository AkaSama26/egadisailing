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

  const motorboat = await prisma.boat.upsert({
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
  console.log("✓ Boats");

  // Services
  const services = [
    {
      id: "social-boating",
      name: "Social Boating",
      type: "SOCIAL_BOATING",
      boatId: trimarano.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      minPaying: 11,
      defaultPaymentSchedule: "FULL" as const,
      priority: 6,
    },
    {
      id: "exclusive-experience",
      name: "Exclusive Experience",
      type: "EXCLUSIVE_EXPERIENCE",
      boatId: trimarano.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 20,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 8,
    },
    {
      id: "cabin-charter",
      name: "Cabin Charter",
      type: "CABIN_CHARTER",
      boatId: trimarano.id,
      durationType: "WEEK" as const,
      durationHours: 168,
      capacityMax: 8,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 10,
    },
    {
      id: "boat-tour",
      name: "Boat Tour",
      type: "BOAT_SHARED",
      boatId: motorboat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      defaultPaymentSchedule: "FULL" as const,
      priority: 4,
    },
    {
      id: "boat-exclusive",
      name: "Barca Esclusiva",
      type: "BOAT_EXCLUSIVE",
      boatId: motorboat.id,
      durationType: "FULL_DAY" as const,
      durationHours: 8,
      capacityMax: 12,
      defaultPaymentSchedule: "DEPOSIT_BALANCE" as const,
      defaultDepositPercentage: 30,
      priority: 5,
    },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: svc,
      create: svc,
    });
  }
  console.log(`✓ ${services.length} services`);

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
