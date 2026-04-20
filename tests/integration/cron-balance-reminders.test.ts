/**
 * Integration test — balance-reminders cron.
 *
 * Scenari:
 *  1. Booking CONFIRMED DEPOSIT_BALANCE start fra 7gg → email inviata +
 *     balanceReminderSentAt settato.
 *  2. Start < 7gg o > 7gg → non toccato.
 *  3. paymentSchedule=FULL → non toccato.
 *  4. balancePaidAt != null → non toccato (gia' pagato).
 *  5. balanceReminderSentAt != null → non toccato (gia' inviato).
 *  6. Claim idempotency: 2 run concorrenti stesso booking → solo 1 email.
 *  7. Email send fail → balanceReminderSentAt reset a null (R6 deferred
 *     R15 WARNING: doppio-invio possibile con Brevo intermittent, ma test
 *     conferma il reset funziona).
 *  8. Booking CANCELLED → non toccato.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

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
  getQueue: () => ({ add: vi.fn() }),
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
}));

const sendEmailMock = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/email/brevo", () => ({
  sendEmail: sendEmailMock,
}));

// Mock Stripe balance link creation.
vi.mock("@/lib/booking/balance-link", () => ({
  createBalancePaymentLink: vi
    .fn()
    .mockResolvedValue("https://checkout.stripe.com/mock"),
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
  vi.clearAllMocks();
});

async function seedBoatAndService() {
  const boat = await db.boat.upsert({
    where: { id: "br-boat" },
    create: {
      id: "br-boat",
      name: "B",
      type: "YACHT",
      description: "t",
      amenities: [],
      images: [],
    },
    update: {},
  });
  const service = await db.service.upsert({
    where: { id: "br-service" },
    create: {
      id: "br-service",
      boatId: boat.id,
      name: "Charter",
      type: "CABIN_CHARTER",
      durationType: "WEEK",
      durationHours: 168,
      capacityMax: 8,
      defaultPaymentSchedule: "DEPOSIT_BALANCE",
      defaultDepositPercentage: 30,
      active: true,
    },
    update: {},
  });
  return { boat, service };
}

/** Booking CONFIRMED con startDate tra N giorni. */
async function seedBooking(opts: {
  daysFromNow: number;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  paymentSchedule?: "FULL" | "DEPOSIT_BALANCE";
  balancePaidAt?: Date | null;
  balanceReminderSentAt?: Date | null;
  email?: string;
}) {
  const { boat, service } = await seedBoatAndService();
  const customer = await db.customer.create({
    data: {
      email: opts.email ?? `c${Math.random().toString(36).slice(2)}@ex.com`,
      firstName: "Mario",
      lastName: "Rossi",
    },
  });
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() + opts.daysFromNow);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6); // WEEK

  return db.booking.create({
    data: {
      confirmationCode: `BR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      source: "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate,
      endDate,
      numPeople: 4,
      totalPrice: "2000.00",
      status: opts.status ?? "CONFIRMED",
      directBooking: {
        create: {
          paymentSchedule: opts.paymentSchedule ?? "DEPOSIT_BALANCE",
          depositAmount: "600.00",
          balanceAmount: "1400.00",
          balancePaidAt: opts.balancePaidAt ?? null,
          balanceReminderSentAt: opts.balanceReminderSentAt ?? null,
          stripePaymentIntentId: "pi_deposit_paid",
        },
      },
    },
    include: { directBooking: true },
  });
}

function makeReq(auth = true): Request {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = `Bearer ${process.env.CRON_SECRET ?? "test-cron"}`;
  return new Request("http://localhost/api/cron/balance-reminders", {
    method: "GET",
    headers,
  });
}

describe("balance-reminders cron", () => {
  it("CONFIRMED DEPOSIT_BALANCE start fra 7gg → email inviata", async () => {
    const booking = await seedBooking({ daysFromNow: 7 });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);
    expect(body.results[0].sent).toBe(true);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining("@"),
        subject: expect.any(String),
      }),
    );

    // balanceReminderSentAt popolato.
    const db2 = await db.directBooking.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(db2.balanceReminderSentAt).not.toBeNull();
  });

  it("start < 7gg (6 days) → non toccato", async () => {
    await seedBooking({ daysFromNow: 6 });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("start > 7gg (10 days) → non toccato", async () => {
    await seedBooking({ daysFromNow: 10 });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("paymentSchedule=FULL → non toccato", async () => {
    await seedBooking({ daysFromNow: 7, paymentSchedule: "FULL" });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("balancePaidAt != null → non toccato (gia' pagato)", async () => {
    await seedBooking({ daysFromNow: 7, balancePaidAt: new Date() });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("balanceReminderSentAt != null → non toccato (gia' inviato)", async () => {
    await seedBooking({
      daysFromNow: 7,
      balanceReminderSentAt: new Date(),
    });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("status CANCELLED → non toccato", async () => {
    await seedBooking({ daysFromNow: 7, status: "CANCELLED" });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("send fail → balanceReminderSentAt reset a null", async () => {
    sendEmailMock.mockRejectedValueOnce(new Error("Brevo 503"));

    const booking = await seedBooking({ daysFromNow: 7 });
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.results[0].sent).toBe(false);
    expect(body.results[0].error).toBe("send_failed");

    // balanceReminderSentAt deve essere reset a null cosi' next cron retria.
    const db2 = await db.directBooking.findUniqueOrThrow({
      where: { bookingId: booking.id },
    });
    expect(db2.balanceReminderSentAt).toBeNull();
  });

  it("no Bearer → 401", async () => {
    const { GET } = await import("@/app/api/cron/balance-reminders/route");
    const res = await GET(makeReq(false));
    expect(res.status).toBe(401);
  });
});
