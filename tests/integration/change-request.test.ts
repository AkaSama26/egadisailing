import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { addDays, isoDay, toUtcDay } from "@/lib/dates";
import { seedBoatAndService, seedBooking } from "../helpers/seed-override";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;

vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => {
  const mockQueue = () => ({ add: vi.fn().mockResolvedValue({ id: "job-mock" }) });
  return {
    getRedisConnection: () => installRedisMock(),
    syncQueue: mockQueue,
    availBokunQueue: mockQueue,
    availBoataroundQueue: mockQueue,
    availManualQueue: mockQueue,
    pricingBokunQueue: mockQueue,
    getQueue: mockQueue,
    QUEUE_NAMES: {
      AVAIL_BOKUN: "sync.avail.bokun",
      AVAIL_BOATAROUND: "sync.avail.boataround",
      AVAIL_MANUAL: "sync.avail.manual",
      PRICING_BOKUN: "sync.pricing.bokun",
    },
    ALL_QUEUE_NAMES: [
      "sync.avail.bokun",
      "sync.avail.boataround",
      "sync.avail.manual",
      "sync.pricing.bokun",
    ],
  };
});

vi.mock("@/lib/session/verify", () => ({
  getBookingSession: vi.fn().mockResolvedValue({ email: "cliente@test.local" }),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ userId: "test-admin-user" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

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
  await resetRedisMock();
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

describe("booking change requests", () => {
  it("customer request creates a pending change without moving the booking", async () => {
    const { booking } = await seedChangeRequestFixture();
    const requestedDate = addDays(new Date(), 20);
    const { requestCustomerReschedule } = await import(
      "@/app/[locale]/b/sessione/actions"
    );

    const fd = new FormData();
    fd.append("bookingId", booking.id);
    fd.append("newDate", isoDay(requestedDate));
    fd.append("note", "Preferiremmo il weekend successivo");

    await requestCustomerReschedule(fd);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.startDate).toEqual(booking.startDate);

    const requests = await db.bookingChangeRequest.findMany({
      where: { bookingId: booking.id },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].status).toBe("PENDING");
    expect(requests[0].requestedStartDate).toEqual(toUtcDay(requestedDate));
    expect(requests[0].customerNote).toBe("Preferiremmo il weekend successivo");
  });

  it("second customer request updates the existing pending request", async () => {
    const { booking } = await seedChangeRequestFixture();
    const { requestCustomerReschedule } = await import(
      "@/app/[locale]/b/sessione/actions"
    );

    for (const [date, note] of [
      [addDays(new Date(), 20), "Prima scelta"],
      [addDays(new Date(), 25), "Seconda scelta"],
    ] as const) {
      const fd = new FormData();
      fd.append("bookingId", booking.id);
      fd.append("newDate", isoDay(date));
      fd.append("note", note);
      await requestCustomerReschedule(fd);
    }

    const requests = await db.bookingChangeRequest.findMany({
      where: { bookingId: booking.id },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].requestedStartDate).toEqual(toUtcDay(addDays(new Date(), 25)));
    expect(requests[0].customerNote).toBe("Seconda scelta");
  });

  it("admin approval moves the booking and anchors cancellation policy for late requests", async () => {
    const originalDate = addDays(new Date(), 5);
    const requestedDate = addDays(new Date(), 25);
    const { booking } = await seedChangeRequestFixture({ startDate: originalDate });
    const request = await db.bookingChangeRequest.create({
      data: {
        bookingId: booking.id,
        originalStartDate: toUtcDay(originalDate),
        originalEndDate: toUtcDay(originalDate),
        requestedStartDate: toUtcDay(requestedDate),
        requestedEndDate: toUtcDay(requestedDate),
        customerNote: "Siamo malati",
      },
    });

    const { approveChangeRequest } = await import(
      "@/app/admin/(dashboard)/change-requests/actions"
    );
    const fd = new FormData();
    fd.append("requestId", request.id);
    await approveChangeRequest(fd);

    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.startDate).toEqual(toUtcDay(requestedDate));
    expect(after.cancellationPolicyAnchorDate).toEqual(toUtcDay(originalDate));

    const decided = await db.bookingChangeRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedByUserId).toBe("test-admin-user");
  });

  it("admin can count all change requests made by the same customer", async () => {
    const { customer, booking, boat, service } = await seedChangeRequestFixture();
    const secondBooking = await seedBooking(db, {
      boatId: boat.id,
      serviceId: service.id,
      customerId: customer.id,
      startDate: toUtcDay(addDays(new Date(), 40)),
      endDate: toUtcDay(addDays(new Date(), 40)),
      status: "CONFIRMED",
      claimsAvailability: true,
      withDirectBooking: true,
    });

    await db.bookingChangeRequest.createMany({
      data: [
        {
          bookingId: booking.id,
          originalStartDate: booking.startDate,
          originalEndDate: booking.endDate,
          requestedStartDate: toUtcDay(addDays(new Date(), 21)),
          requestedEndDate: toUtcDay(addDays(new Date(), 21)),
          status: "REJECTED",
        },
        {
          bookingId: booking.id,
          originalStartDate: booking.startDate,
          originalEndDate: booking.endDate,
          requestedStartDate: toUtcDay(addDays(new Date(), 22)),
          requestedEndDate: toUtcDay(addDays(new Date(), 22)),
          status: "PENDING",
        },
        {
          bookingId: secondBooking.id,
          originalStartDate: secondBooking.startDate,
          originalEndDate: secondBooking.endDate,
          requestedStartDate: toUtcDay(addDays(new Date(), 45)),
          requestedEndDate: toUtcDay(addDays(new Date(), 45)),
          status: "APPROVED",
        },
      ],
    });

    const [customerRequestCount, bookingRequestCount] = await Promise.all([
      db.bookingChangeRequest.count({
        where: { booking: { customerId: customer.id } },
      }),
      db.bookingChangeRequest.count({
        where: { bookingId: booking.id },
      }),
    ]);

    expect(customerRequestCount).toBe(3);
    expect(bookingRequestCount).toBe(2);
  });
});

async function seedChangeRequestFixture(opts: { startDate?: Date } = {}) {
  const { boat, service } = await seedBoatAndService(db, {
    serviceType: "BOAT_EXCLUSIVE",
  });
  const customer = await db.customer.create({
    data: {
      email: "cliente@test.local",
      firstName: "Cliente",
      lastName: "Test",
    },
  });
  const startDate = toUtcDay(opts.startDate ?? addDays(new Date(), 20));
  const booking = await seedBooking(db, {
    boatId: boat.id,
    serviceId: service.id,
    customerId: customer.id,
    startDate,
    endDate: startDate,
    status: "CONFIRMED",
    claimsAvailability: true,
    withDirectBooking: true,
  });
  return { boat, service, customer, booking };
}
