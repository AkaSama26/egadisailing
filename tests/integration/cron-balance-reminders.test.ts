/**
 * Integration test — balance-reminders cron.
 *
 * Il saldo Egadisailing viene incassato solamente in loco. Il cron invia
 * promemoria operativo pre-partenza, ma non genera link Stripe saldo.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: vi.fn() }),
  availBokunQueue: () => ({ add: vi.fn() }),
  availBoataroundQueue: () => ({ add: vi.fn() }),
  availManualQueue: () => ({ add: vi.fn() }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  emailTransactionalQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
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
    "email.transactional",
  ],
}));

beforeEach(async () => {
  await resetRedisMock();
  if (testPrisma) await resetTestDb();
  vi.clearAllMocks();
});

function makeReq(auth = true): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = `Bearer ${process.env.CRON_SECRET ?? "test-cron"}`;
  return new Request("http://localhost/api/cron/balance-reminders", {
    method: "GET",
    headers,
  });
}

describe("balance-reminders cron", () => {
  beforeAll(async () => {
    testPrisma = await setupTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("accoda promemoria operativo senza link Stripe saldo", async () => {
    const now = new Date();
    const startDate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ));
    const boat = await testPrisma.boat.create({
      data: {
        id: "boat-reminder",
        name: "Test Boat",
        type: "TRIMARAN",
        description: "Test",
        amenities: [],
        images: [],
      },
    });
    const service = await testPrisma.service.create({
      data: {
        id: "service-reminder",
        boatId: boat.id,
        name: "Tour Test",
        type: "BOAT_PRIVATE",
        durationType: "FULL_DAY",
        durationHours: 8,
        capacityMax: 6,
      },
    });
    const customer = await testPrisma.customer.create({
      data: {
        email: "cliente-reminder@example.com",
        firstName: "Mario",
        lastName: "Rossi",
      },
    });
    const booking = await testPrisma.booking.create({
      data: {
        confirmationCode: "REM123",
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: boat.id,
        startDate,
        endDate: startDate,
        numPeople: 2,
        totalPrice: "1000.00",
        status: "CONFIRMED",
      },
    });
    await testPrisma.directBooking.create({
      data: {
        bookingId: booking.id,
        paymentSchedule: "DEPOSIT_BALANCE",
        depositAmount: "300.00",
        balanceAmount: "700.00",
      },
    });

    const { GET } = await import("@/app/api/cron/balance-reminders/route");

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toMatchObject({
      reminderQueued: 1,
      reviewQueued: 0,
    });
    const email = await testPrisma.emailOutbox.findFirst({
      where: {
        templateKey: "customer.pre-departure-reminder",
        recipientEmail: "cliente-reminder@example.com",
      },
    });
    expect(email?.htmlContent).toContain("in loco");
    expect(email?.htmlContent).not.toContain("stripe");
  });

  it("no Bearer → 401", async () => {
    const { GET } = await import("@/app/api/cron/balance-reminders/route");

    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
  });
});
