/**
 * Integration test — admin manual booking from calendar.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import type { CreateManualAdminBookingInput } from "@/lib/booking/create-manual-admin";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => {
  const mockQueue = () => ({ add: vi.fn().mockResolvedValue({ id: "job-mock" }) });
  return {
    getRedisConnection: vi.fn(),
    syncQueue: mockQueue,
    availBokunQueue: mockQueue,
    availBoataroundQueue: mockQueue,
    availManualQueue: mockQueue,
    pricingBokunQueue: mockQueue,
    emailTransactionalQueue: mockQueue,
    getQueue: mockQueue,
    QUEUE_NAMES: {
      AVAIL_BOKUN: "sync.avail.bokun",
      AVAIL_BOATAROUND: "sync.avail.boataround",
      AVAIL_MANUAL: "sync.avail.manual",
      PRICING_BOKUN: "sync.pricing.bokun",
      EMAIL_TRANSACTIONAL: "email.transactional",
    },
    ALL_QUEUE_NAMES: [
      "sync.avail.bokun",
      "sync.avail.boataround",
      "sync.avail.manual",
      "sync.pricing.bokun",
    ],
  };
});

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  testPrisma = db;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  vi.clearAllMocks();
  await db.user.create({
    data: {
      id: "test-admin-user",
      email: "admin@test.local",
      passwordHash: "test",
      name: "Test Admin",
      role: "ADMIN",
    },
  });
});

async function seedService(overrides: {
  boatId?: string;
  serviceId?: string;
  type?: string;
  capacityMax?: number;
} = {}) {
  const boat = await db.boat.create({
    data: {
      id: overrides.boatId ?? "boat-manual",
      name: "Manual Boat",
      type: "TRIMARAN",
      description: "Test boat",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: overrides.serviceId ?? "service-manual",
      boatId: boat.id,
      name: "Manual Experience",
      type: overrides.type ?? "EXCLUSIVE_EXPERIENCE",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: overrides.capacityMax ?? 8,
      minPaying: 1,
      defaultPaymentSchedule: "FULL",
      active: true,
    },
  });
  return { boat, service };
}

function baseInput(
  overrides: Partial<CreateManualAdminBookingInput> = {},
): CreateManualAdminBookingInput {
  return {
    boatId: "boat-manual",
    serviceId: "service-manual",
    dateIso: "2026-07-15",
    seats: 3,
    customer: {
      firstName: "Mario",
      lastName: "Rossi",
      email: "Mario.Rossi@example.com",
      phone: "+39 123",
    },
    totalEur: 300,
    depositEur: 100,
    balanceEur: 200,
    paymentMethod: "CASH" as const,
    note: "Prenotazione telefonica",
    userId: "test-admin-user",
    ...overrides,
  };
}

describe("createManualAdminBooking", () => {
  it("crea booking confermato, pagamento manuale, nota, audit e blocco availability", async () => {
    await seedService();
    const { createManualAdminBooking } = await import("@/lib/booking/create-manual-admin");

    const result = await createManualAdminBooking(baseInput());

    const booking = await db.booking.findUnique({
      where: { id: result.bookingId },
      include: {
        customer: true,
        directBooking: true,
        payments: true,
        bookingNotes: true,
      },
    });
    expect(booking?.status).toBe("CONFIRMED");
    expect(booking?.source).toBe("DIRECT");
    expect(booking?.numPeople).toBe(3);
    expect(booking?.adultCount).toBe(3);
    expect(Number(booking?.totalPrice.toString())).toBe(300);
    // Dot stripping e' Gmail-specific; sugli altri domini il local-part non
    // va alterato perche' puo' identificare mailbox differenti.
    expect(booking?.customer.email).toBe("mario.rossi@example.com");
    expect(booking?.directBooking?.paymentSchedule).toBe("DEPOSIT_BALANCE");
    expect(Number(booking?.directBooking?.depositAmount?.toString())).toBe(100);
    expect(Number(booking?.directBooking?.balanceAmount?.toString())).toBe(200);
    expect(booking?.payments).toHaveLength(1);
    expect(booking?.payments[0].type).toBe("DEPOSIT");
    expect(booking?.payments[0].method).toBe("CASH");
    expect(booking?.payments[0].status).toBe("SUCCEEDED");
    expect(booking?.bookingNotes[0].note).toContain("Prenotazione manuale admin");

    const availability = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: "boat-manual", date: new Date("2026-07-15") } },
    });
    expect(availability?.status).toBe("BLOCKED");
    expect(availability?.lockedByBookingId).toBe(result.bookingId);

    const audit = await db.auditLog.findFirst({
      where: { entity: "Booking", entityId: result.bookingId },
    });
    expect(audit?.action).toBe("CREATE_MANUAL_BOOKING");
  });

  it("rifiuta un secondo booking esclusivo sulla stessa data", async () => {
    await seedService();
    const { createManualAdminBooking } = await import("@/lib/booking/create-manual-admin");

    await createManualAdminBooking(baseInput());
    await expect(
      createManualAdminBooking(
        baseInput({
          customer: {
            firstName: "Luigi",
            lastName: "Verdi",
            email: "luigi@example.com",
            phone: "+39 456",
          },
        }),
      ),
    ).rejects.toThrow(/non disponibili/i);
  });

  it("rifiuta posti oltre capacityMax", async () => {
    await seedService({ capacityMax: 4 });
    const { createManualAdminBooking } = await import("@/lib/booking/create-manual-admin");

    await expect(createManualAdminBooking(baseInput({ seats: 5 }))).rejects.toThrow(
      /Posti fuori range/i,
    );
  });

  it("rifiuta importi incoerenti", async () => {
    await seedService();
    const { createManualAdminBooking } = await import("@/lib/booking/create-manual-admin");

    await expect(
      createManualAdminBooking(baseInput({ totalEur: 300, depositEur: 50, balanceEur: 200 })),
    ).rejects.toThrow(/totale deve essere uguale/i);
  });

  it("mantiene PARTIALLY_BOOKED e blocca over-capacity per BOAT_SHARED", async () => {
    await seedService({ type: "BOAT_SHARED", capacityMax: 5 });
    const { createManualAdminBooking } = await import("@/lib/booking/create-manual-admin");

    await createManualAdminBooking(baseInput({ seats: 3, totalEur: 300, depositEur: 0, balanceEur: 300 }));

    const availability = await db.boatAvailability.findUnique({
      where: { boatId_date: { boatId: "boat-manual", date: new Date("2026-07-15") } },
    });
    expect(availability?.status).toBe("PARTIALLY_BOOKED");

    await expect(
      createManualAdminBooking(
        baseInput({
          seats: 3,
          totalEur: 300,
          depositEur: 0,
          balanceEur: 300,
          customer: {
            firstName: "Anna",
            lastName: "Bianchi",
            email: "anna@example.com",
            phone: "+39 789",
          },
        }),
      ),
    ).rejects.toThrow(/Capienza residua insufficiente/i);
  });
});
