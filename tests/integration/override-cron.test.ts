/**
 * Integration test — 4 override cron endpoints.
 *
 * Scenari per ciascun endpoint (override-reminders, override-dropdead,
 * refund-retry, override-reconcile):
 *  1. 401 senza Bearer → UnauthorizedError via withErrorHandler.
 *  2. 200 con Bearer → esegue il job helper + logga completion.
 *  3. Single-flight via Redis lease → 2 run paralleli uno skippa.
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

// Rate-limit bypass (abbiamo failOpen:true ma comunque evitiamo I/O Redis).
vi.mock("@/lib/rate-limit/service", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(undefined),
}));

// Email + Stripe + Availability mock per evitare side-effect esterni.
vi.mock("@/lib/email/brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: vi.fn().mockResolvedValue({ id: "re_test", status: "succeeded" }),
  getChargeRefundState: vi.fn().mockResolvedValue({
    totalCents: 200000,
    refundedCents: 0,
    residualCents: 200000,
  }),
  cancelPaymentIntent: vi.fn(),
}));

vi.mock("@/lib/availability/service", () => ({
  releaseDates: vi.fn().mockResolvedValue(undefined),
  blockDates: vi.fn().mockResolvedValue(undefined),
  updateAvailability: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/bokun/bookings", () => ({
  getBokunBooking: vi.fn().mockResolvedValue({ status: "CANCELLED" }),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue({
    emailOk: true,
    telegramOk: false,
    anyOk: true,
    skipped: false,
  }),
}));

beforeAll(async () => {
  testPrisma = await setupTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  await resetRedisMock();
  vi.clearAllMocks();
});

const ENDPOINTS = [
  "override-reminders",
  "override-dropdead",
  "refund-retry",
  "override-reconcile",
] as const;

function makeReq(endpoint: string, auth = true): Request {
  const headers: Record<string, string> = {};
  if (auth) {
    // env.CRON_SECRET e' caricato via dotenv da tests/helpers/setup.ts.
    // Usiamo stringa literal presente in .env (non e' substituita perche'
    // dotenv non fa shell expansion).
    headers.authorization = `Bearer ${process.env.CRON_SECRET ?? "dev-cron-secret-$(openssl rand -hex 8)"}`;
  }
  return new Request(`http://localhost/api/cron/${endpoint}`, {
    method: "POST",
    headers,
  });
}

describe("override cron endpoints — bearer + single-flight", () => {
  for (const endpoint of ENDPOINTS) {
    it(`${endpoint} — 401 senza Bearer`, async () => {
      const mod = await import(`@/app/api/cron/${endpoint}/route`);
      const res = await mod.POST(makeReq(endpoint, false));
      expect(res.status).toBe(401);
    });

    it(`${endpoint} — 200 con Bearer`, async () => {
      const mod = await import(`@/app/api/cron/${endpoint}/route`);
      const res = await mod.POST(makeReq(endpoint, true));
      expect(res.status).toBe(200);
    });

    it(`${endpoint} — single-flight via Redis lease`, async () => {
      const mod = await import(`@/app/api/cron/${endpoint}/route`);
      const [r1, r2] = await Promise.all([
        mod.POST(makeReq(endpoint, true)),
        mod.POST(makeReq(endpoint, true)),
      ]);
      const bodies = await Promise.all([r1.json(), r2.json()]);
      const skipped = bodies.filter(
        (b) => b?.skipped === "already-running",
      ).length;
      // Almeno 1 deve skippare (l'altro lavora). In ioredis-mock SET NX
      // serializza due `set(key, val, "NX")` concorrenti → il secondo
      // vede la chiave gia' presente.
      expect(skipped).toBeGreaterThanOrEqual(1);
    });
  }
});
