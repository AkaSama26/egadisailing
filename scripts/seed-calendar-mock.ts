import "dotenv/config";

// Seed intenzionalmente separato dal seed catalogo: modifica solo il DB locale.

import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { updateAvailability } from "../src/lib/availability/service";
import { eachUtcDayInclusive, parseIsoDay } from "../src/lib/dates";
import { isBoatExclusiveServiceType } from "../src/lib/booking/service-types";

const ADMIN_EMAIL = "admin@egadisailing.com";
const MOCK_NOTE = "Dati demo calendario admin — non contattare il cliente";

interface MockBookingDefinition {
  id: string;
  confirmationCode: string;
  serviceId: string;
  startDate: string;
  endDate?: string;
  numPeople: number;
  totalPrice: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

const mockBookings: MockBookingDefinition[] = [
  {
    id: "mock-calendar-boat-1901",
    confirmationCode: "MOCK-B1901",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-19",
    numPeople: 4,
    totalPrice: "400.00",
    customer: mockCustomer("Luca", "Romano", "1901"),
  },
  {
    id: "mock-calendar-boat-1902",
    confirmationCode: "MOCK-B1902",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-19",
    numPeople: 3,
    totalPrice: "300.00",
    customer: mockCustomer("Sara", "Conti", "1902"),
  },
  {
    id: "mock-calendar-boat-2101",
    confirmationCode: "MOCK-B2101",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-21",
    numPeople: 5,
    totalPrice: "500.00",
    customer: mockCustomer("Andrea", "Gallo", "2101"),
  },
  {
    id: "mock-calendar-boat-2102",
    confirmationCode: "MOCK-B2102",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-21",
    numPeople: 5,
    totalPrice: "500.00",
    customer: mockCustomer("Elena", "Costa", "2102"),
  },
  {
    id: "mock-calendar-boat-2301",
    confirmationCode: "MOCK-B2301",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-23",
    numPeople: 6,
    totalPrice: "600.00",
    customer: mockCustomer("Paolo", "Riva", "2301"),
  },
  {
    id: "mock-calendar-boat-2302",
    confirmationCode: "MOCK-B2302",
    serviceId: "boat-shared-full-day",
    startDate: "2026-08-23",
    numPeople: 6,
    totalPrice: "600.00",
    customer: mockCustomer("Giulia", "Ferri", "2302"),
  },
  {
    id: "mock-calendar-boat-2601",
    confirmationCode: "MOCK-B2601",
    serviceId: "boat-exclusive-full-day",
    startDate: "2026-08-26",
    numPeople: 8,
    totalPrice: "1200.00",
    customer: mockCustomer("Anna", "Greco", "2601"),
  },
  {
    id: "mock-calendar-rib-2001",
    confirmationCode: "MOCK-R2001",
    serviceId: "rib-shared-full-day",
    startDate: "2026-08-20",
    numPeople: 3,
    totalPrice: "300.00",
    customer: mockCustomer("Davide", "Leone", "2001"),
  },
  {
    id: "mock-calendar-rib-2201",
    confirmationCode: "MOCK-R2201",
    serviceId: "rib-shared-full-day",
    startDate: "2026-08-22",
    numPeople: 5,
    totalPrice: "500.00",
    customer: mockCustomer("Marta", "Serra", "2201"),
  },
  {
    id: "mock-calendar-rib-2202",
    confirmationCode: "MOCK-R2202",
    serviceId: "rib-shared-full-day",
    startDate: "2026-08-22",
    numPeople: 4,
    totalPrice: "400.00",
    customer: mockCustomer("Marco", "Sala", "2202"),
  },
  {
    id: "mock-calendar-rib-2501",
    confirmationCode: "MOCK-R2501",
    serviceId: "rib-exclusive-full-day",
    startDate: "2026-08-25",
    numPeople: 10,
    totalPrice: "1200.00",
    customer: mockCustomer("Claudia", "Moretti", "2501"),
  },
  {
    id: "mock-calendar-rib-2801",
    confirmationCode: "MOCK-R2801",
    serviceId: "rib-shared-full-day",
    startDate: "2026-08-28",
    numPeople: 12,
    totalPrice: "1200.00",
    customer: mockCustomer("Stefano", "Neri", "2801"),
  },
  {
    id: "mock-calendar-gourmet-1901",
    confirmationCode: "MOCK-G1901",
    serviceId: "exclusive-experience",
    startDate: "2026-08-19",
    numPeople: 8,
    totalPrice: "2500.00",
    customer: mockCustomer("Marco", "Rossi", "g1901"),
  },
  {
    id: "mock-calendar-gourmet-2401",
    confirmationCode: "MOCK-G2401",
    serviceId: "exclusive-experience",
    startDate: "2026-08-24",
    numPeople: 6,
    totalPrice: "2500.00",
    customer: mockCustomer("Francesca", "Villa", "g2401"),
  },
  {
    id: "mock-calendar-charter-2701",
    confirmationCode: "MOCK-C2701",
    serviceId: "cabin-charter",
    startDate: "2026-08-27",
    endDate: "2026-08-29",
    numPeople: 6,
    totalPrice: "3250.00",
    customer: mockCustomer("Alessandro", "Fontana", "c2701"),
  },
  {
    id: "mock-calendar-fishing-2101",
    confirmationCode: "MOCK-F2101",
    serviceId: "fishing-full-day",
    startDate: "2026-08-21",
    numPeople: 4,
    totalPrice: "1000.00",
    customer: mockCustomer("Roberto", "Marini", "f2101"),
  },
];

function mockCustomer(firstName: string, lastName: string, suffix: string) {
  return {
    firstName,
    lastName,
    email: `calendar.${suffix}@example.test`,
    phone: `+39 320 000 ${suffix.replace(/\D/g, "").padStart(4, "0").slice(-4)}`,
  };
}

function assertLocalDatabase(): void {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error("DATABASE_URL non configurato");

  const url = new URL(rawUrl);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`Seed mock rifiutato: database non locale (${url.hostname})`);
  }
}

async function main(): Promise<void> {
  assertLocalDatabase();

  const adminPassword = process.env.DEV_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("DEV_ADMIN_PASSWORD deve contenere almeno 12 caratteri");
  }

  const mockIds = mockBookings.map((booking) => booking.id);
  const serviceIds = [...new Set(mockBookings.map((booking) => booking.serviceId))];
  const services = await db.service.findMany({
    where: { id: { in: serviceIds }, active: true },
    select: { id: true, boatId: true, type: true },
  });
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const missingServices = serviceIds.filter((serviceId) => !servicesById.has(serviceId));
  if (missingServices.length > 0) {
    throw new Error(`Servizi mock mancanti o inattivi: ${missingServices.join(", ")}`);
  }

  const targets = mockBookings.map((booking) => {
    const service = servicesById.get(booking.serviceId)!;
    return {
      boatId: service.boatId,
      startDate: parseIsoDay(booking.startDate),
      endDate: parseIsoDay(booking.endDate ?? booking.startDate),
    };
  });
  const conflictingBookings = await db.booking.findMany({
    where: {
      id: { notIn: mockIds },
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: targets.map((target) => ({
        boatId: target.boatId,
        startDate: { lte: target.endDate },
        endDate: { gte: target.startDate },
      })),
    },
    select: { confirmationCode: true },
  });
  if (conflictingBookings.length > 0) {
    throw new Error(
      `Seed mock annullato: date occupate da booking non mock (${conflictingBookings
        .map((booking) => booking.confirmationCode)
        .join(", ")})`,
    );
  }

  const targetCells = targets.flatMap((target) =>
    Array.from(eachUtcDayInclusive(target.startDate, target.endDate), (date) => ({
        boatId: target.boatId,
        date,
      })),
  );
  const adminBlocks = await db.boatAvailability.findMany({
    where: {
      status: "BLOCKED",
      lockedByBookingId: null,
      OR: targetCells.map((cell) => ({ boatId: cell.boatId, date: cell.date })),
    },
    select: { boatId: true, date: true },
  });
  if (adminBlocks.length > 0) {
    throw new Error("Seed mock annullato: una o più giornate sono bloccate manualmente");
  }

  const passwordHash = await hash(adminPassword, 12);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, name: "Admin", role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  const createdBookings: Array<{
    id: string;
    boatId: string;
    startDate: Date;
    endDate: Date;
    exclusive: boolean;
  }> = [];

  for (const definition of mockBookings) {
    const service = servicesById.get(definition.serviceId)!;
    const startDate = parseIsoDay(definition.startDate);
    const endDate = parseIsoDay(definition.endDate ?? definition.startDate);
    const exclusive = isBoatExclusiveServiceType(service.type);
    const customer = await db.customer.upsert({
      where: { email: definition.customer.email },
      update: {
        firstName: definition.customer.firstName,
        lastName: definition.customer.lastName,
        phone: definition.customer.phone,
      },
      create: {
        ...definition.customer,
        nationality: "IT",
        language: "it",
        notes: MOCK_NOTE,
      },
    });

    const booking = await db.booking.upsert({
      where: { id: definition.id },
      update: {
        confirmationCode: definition.confirmationCode,
        source: "DIRECT",
        customerId: customer.id,
        serviceId: definition.serviceId,
        boatId: service.boatId,
        startDate,
        endDate,
        cancellationPolicyAnchorDate: startDate,
        numPeople: definition.numPeople,
        adultCount: definition.numPeople,
        childCount: 0,
        freeChildSeatCount: 0,
        infantCount: 0,
        totalPrice: definition.totalPrice,
        currency: "EUR",
        status: "CONFIRMED",
        exclusiveSlot: exclusive,
        claimsAvailability: true,
        notes: MOCK_NOTE,
      },
      create: {
        id: definition.id,
        confirmationCode: definition.confirmationCode,
        source: "DIRECT",
        customerId: customer.id,
        serviceId: definition.serviceId,
        boatId: service.boatId,
        startDate,
        endDate,
        cancellationPolicyAnchorDate: startDate,
        numPeople: definition.numPeople,
        adultCount: definition.numPeople,
        totalPrice: definition.totalPrice,
        currency: "EUR",
        status: "CONFIRMED",
        exclusiveSlot: exclusive,
        claimsAvailability: true,
        notes: MOCK_NOTE,
      },
      select: { id: true, boatId: true, startDate: true, endDate: true },
    });

    await db.directBooking.upsert({
      where: { bookingId: booking.id },
      update: {
        paymentSchedule: "FULL",
        depositAmount: null,
        balanceAmount: null,
        balancePaidAt: null,
      },
      create: { bookingId: booking.id, paymentSchedule: "FULL" },
    });

    createdBookings.push({ ...booking, exclusive });
  }

  const uniqueCells = new Map<string, { boatId: string; date: Date }>();
  for (const booking of createdBookings) {
    for (const date of eachUtcDayInclusive(booking.startDate, booking.endDate)) {
      uniqueCells.set(`${booking.boatId}|${date.toISOString().slice(0, 10)}`, {
        boatId: booking.boatId,
        date,
      });
    }
  }

  for (const cell of uniqueCells.values()) {
    const bookingsForDay = createdBookings.filter(
      (booking) =>
        booking.boatId === cell.boatId &&
        booking.startDate.getTime() <= cell.date.getTime() &&
        booking.endDate.getTime() >= cell.date.getTime(),
    );
    const exclusive = bookingsForDay.find((booking) => booking.exclusive);
    await updateAvailability({
      boatId: cell.boatId,
      date: cell.date,
      status: exclusive ? "BLOCKED" : "PARTIALLY_BOOKED",
      sourceChannel: "DIRECT",
      lockedByBookingId: exclusive?.id,
      skipFanOut: true,
    });
  }

  console.log(`Creati/aggiornati ${createdBookings.length} booking mock.`);
  console.log(`Credenziali admin locali aggiornate per ${ADMIN_EMAIL}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
