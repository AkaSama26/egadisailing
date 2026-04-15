import "dotenv/config";
import { hashSync } from "bcryptjs";
import pg from "pg";
const { PrismaClient } = await import("../src/generated/prisma/client.js");
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

  // 6. Fake customers
  const customers = [
    { id: "seed-cust-001", name: "Marco Rossi", email: "marco.rossi@gmail.com", phone: "+39 340 1111111", nationality: "IT", language: "it" },
    { id: "seed-cust-002", name: "Giulia Bianchi", email: "giulia.b@outlook.com", phone: "+39 345 2222222", nationality: "IT", language: "it" },
    { id: "seed-cust-003", name: "Hans Mueller", email: "hans.mueller@web.de", phone: "+49 170 3333333", nationality: "DE", language: "de" },
    { id: "seed-cust-004", name: "Sophie Dupont", email: "sophie.dupont@free.fr", phone: "+33 6 44444444", nationality: "FR", language: "fr" },
    { id: "seed-cust-005", name: "James Smith", email: "james.smith@gmail.com", phone: "+44 7700 555555", nationality: "GB", language: "en" },
    { id: "seed-cust-006", name: "Alessandro Ferretti", email: "ale.ferretti@libero.it", phone: "+39 347 6666666", nationality: "IT", language: "it" },
    { id: "seed-cust-007", name: "Anna Kowalski", email: "anna.k@wp.pl", phone: "+48 500 777777", nationality: "PL", language: "pl" },
    { id: "seed-cust-008", name: "Maria Garcia", email: "maria.garcia@gmail.com", phone: "+34 600 888888", nationality: "ES", language: "es" },
    { id: "seed-cust-009", name: "Luca Moretti", email: "luca.moretti@gmail.com", phone: "+39 333 9999999", nationality: "IT", language: "it" },
    { id: "seed-cust-010", name: "Emma Johnson", email: "emma.j@yahoo.com", phone: "+44 7800 000000", nationality: "GB", language: "en" },
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log("Customers created");

  // 7. Trips — upcoming and past
  const trips = [
    // Past trips (completed)
    { id: "seed-trip-001", serviceId: IDS.socialBoating, date: "2026-04-05", departureTime: "09:00", returnTime: "17:00", status: "COMPLETED" as const, availableSpots: 5 },
    { id: "seed-trip-002", serviceId: IDS.boatSharedFull, date: "2026-04-06", departureTime: "09:00", returnTime: "17:00", status: "COMPLETED" as const, availableSpots: 4 },
    { id: "seed-trip-003", serviceId: IDS.exclusiveExperience, date: "2026-04-08", departureTime: "10:00", returnTime: "18:00", status: "COMPLETED" as const, availableSpots: 0 },
    { id: "seed-trip-004", serviceId: IDS.socialBoating, date: "2026-04-10", departureTime: "09:00", returnTime: "17:00", status: "COMPLETED" as const, availableSpots: 8 },
    { id: "seed-trip-005", serviceId: IDS.boatExclusiveFull, date: "2026-04-12", departureTime: "09:00", returnTime: "17:00", status: "COMPLETED" as const, availableSpots: 0 },
    // Today and upcoming (scheduled)
    { id: "seed-trip-006", serviceId: IDS.socialBoating, date: "2026-04-16", departureTime: "09:00", returnTime: "17:00", status: "SCHEDULED" as const, availableSpots: 12 },
    { id: "seed-trip-007", serviceId: IDS.boatSharedFull, date: "2026-04-17", departureTime: "09:00", returnTime: "17:00", status: "SCHEDULED" as const, availableSpots: 8 },
    { id: "seed-trip-008", serviceId: IDS.exclusiveExperience, date: "2026-04-18", departureTime: "10:00", returnTime: "18:00", status: "SCHEDULED" as const, availableSpots: 20 },
    { id: "seed-trip-009", serviceId: IDS.socialBoating, date: "2026-04-20", departureTime: "09:00", returnTime: "17:00", status: "SCHEDULED" as const, availableSpots: 15 },
    { id: "seed-trip-010", serviceId: IDS.boatExclusiveMorning, date: "2026-04-20", departureTime: "09:00", returnTime: "13:00", status: "SCHEDULED" as const, availableSpots: 12 },
    { id: "seed-trip-011", serviceId: IDS.boatSharedMorning, date: "2026-04-22", departureTime: "09:00", returnTime: "13:00", status: "SCHEDULED" as const, availableSpots: 10 },
    { id: "seed-trip-012", serviceId: IDS.socialBoating, date: "2026-04-25", departureTime: "09:00", returnTime: "17:00", status: "SCHEDULED" as const, availableSpots: 20 },
    // Cancelled
    { id: "seed-trip-013", serviceId: IDS.boatSharedFull, date: "2026-04-09", departureTime: "09:00", returnTime: "17:00", status: "CANCELLED" as const, availableSpots: 12 },
  ];

  for (const t of trips) {
    await prisma.trip.upsert({
      where: { id: t.id },
      update: {},
      create: {
        ...t,
        date: new Date(t.date),
      },
    });
  }
  console.log("Trips created");

  // 8. Crew assignments
  const crewAssignments = [
    { tripId: "seed-trip-001", crewMemberId: IDS.crewSkipper },
    { tripId: "seed-trip-001", crewMemberId: IDS.crewChef },
    { tripId: "seed-trip-001", crewMemberId: IDS.crewHostess },
    { tripId: "seed-trip-003", crewMemberId: IDS.crewSkipper },
    { tripId: "seed-trip-003", crewMemberId: IDS.crewChef },
    { tripId: "seed-trip-006", crewMemberId: IDS.crewSkipper },
    { tripId: "seed-trip-006", crewMemberId: IDS.crewChef },
    { tripId: "seed-trip-006", crewMemberId: IDS.crewHostess },
    { tripId: "seed-trip-008", crewMemberId: IDS.crewSkipper },
    { tripId: "seed-trip-008", crewMemberId: IDS.crewChef },
  ];

  for (const ca of crewAssignments) {
    const id = `seed-tc-${ca.tripId.slice(-3)}-${ca.crewMemberId.slice(-7)}`;
    await prisma.tripCrew.upsert({
      where: { id },
      update: {},
      create: { id, ...ca },
    });
  }
  console.log("Crew assignments created");

  // 9. Bookings — mix of channels, statuses
  const bookings = [
    // Past confirmed bookings
    { id: "seed-book-001", tripId: "seed-trip-001", customerId: "seed-cust-001", numPeople: 4, totalPrice: 480, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-002", tripId: "seed-trip-001", customerId: "seed-cust-003", numPeople: 2, totalPrice: 240, status: "CONFIRMED" as const, channel: "GET_YOUR_GUIDE" as const },
    { id: "seed-book-003", tripId: "seed-trip-001", customerId: "seed-cust-005", numPeople: 6, totalPrice: 720, status: "CONFIRMED" as const, channel: "AIRBNB" as const },
    { id: "seed-book-004", tripId: "seed-trip-001", customerId: "seed-cust-007", numPeople: 3, totalPrice: 360, status: "CONFIRMED" as const, channel: "VIATOR" as const },
    { id: "seed-book-005", tripId: "seed-trip-002", customerId: "seed-cust-002", numPeople: 4, totalPrice: 300, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-006", tripId: "seed-trip-002", customerId: "seed-cust-004", numPeople: 3, totalPrice: 225, status: "CONFIRMED" as const, channel: "MANUAL" as const },
    { id: "seed-book-007", tripId: "seed-trip-003", customerId: "seed-cust-006", numPeople: 20, totalPrice: 4000, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-008", tripId: "seed-trip-004", customerId: "seed-cust-008", numPeople: 5, totalPrice: 600, status: "CONFIRMED" as const, channel: "GET_YOUR_GUIDE" as const },
    { id: "seed-book-009", tripId: "seed-trip-004", customerId: "seed-cust-009", numPeople: 4, totalPrice: 480, status: "CONFIRMED" as const, channel: "CLICK_AND_BOAT" as const },
    { id: "seed-book-010", tripId: "seed-trip-004", customerId: "seed-cust-010", numPeople: 3, totalPrice: 360, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-011", tripId: "seed-trip-005", customerId: "seed-cust-001", numPeople: 12, totalPrice: 900, status: "CONFIRMED" as const, channel: "MANUAL" as const },
    // Today's bookings
    { id: "seed-book-012", tripId: "seed-trip-006", customerId: "seed-cust-002", numPeople: 3, totalPrice: 360, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-013", tripId: "seed-trip-006", customerId: "seed-cust-003", numPeople: 2, totalPrice: 240, status: "CONFIRMED" as const, channel: "GET_YOUR_GUIDE" as const },
    { id: "seed-book-014", tripId: "seed-trip-006", customerId: "seed-cust-004", numPeople: 3, totalPrice: 360, status: "PENDING" as const, channel: "AIRBNB" as const },
    // Upcoming bookings
    { id: "seed-book-015", tripId: "seed-trip-007", customerId: "seed-cust-005", numPeople: 4, totalPrice: 300, status: "CONFIRMED" as const, channel: "VIATOR" as const },
    { id: "seed-book-016", tripId: "seed-trip-008", customerId: "seed-cust-006", numPeople: 15, totalPrice: 3000, status: "CONFIRMED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-017", tripId: "seed-trip-009", customerId: "seed-cust-007", numPeople: 5, totalPrice: 600, status: "PENDING" as const, channel: "MUSEMENT" as const },
    // Cancelled / refunded
    { id: "seed-book-018", tripId: "seed-trip-004", customerId: "seed-cust-004", numPeople: 2, totalPrice: 240, status: "CANCELLED" as const, channel: "WEBSITE" as const },
    { id: "seed-book-019", tripId: "seed-trip-002", customerId: "seed-cust-008", numPeople: 5, totalPrice: 375, status: "REFUNDED" as const, channel: "GET_YOUR_GUIDE" as const },
  ];

  for (const b of bookings) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });
  }
  console.log("Bookings created");

  console.log("Seed completato!");
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
