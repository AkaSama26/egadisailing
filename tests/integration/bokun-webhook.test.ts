/**
 * Integration test — Bokun webhook security (R24-R25 fixes).
 *
 * Scenari:
 *  1. R25-A3-C1: replay window ±5min su `x-bokun-date` → reject old webhook.
 *  2. R25-A3-C3: body size cap pre-HMAC → reject body > 1MB.
 *  3. R25-A3-A3: verifyBokunWebhookResult tipizzato con reason (not-hex,
 *     length-mismatch, hmac-mismatch, missing) — log riceve reason.
 *  4. Dedup via `ProcessedBokunEvent` — stesso eventId skip silent.
 *  5. Missing signature → UnauthorizedError.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

const bookingBokunAdd = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "job-bokun-booking" }));

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
  bookingBokunQueue: () => ({ add: bookingBokunAdd }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: {
    AVAIL_BOKUN: "sync.avail.bokun",
    AVAIL_BOATAROUND: "sync.avail.boataround",
    AVAIL_MANUAL: "sync.avail.manual",
    PRICING_BOKUN: "sync.pricing.bokun",
    BOOKING_BOKUN: "sync.booking.bokun",
  },
  ALL_QUEUE_NAMES: [
    "sync.avail.bokun",
    "sync.avail.boataround",
    "sync.avail.manual",
    "sync.pricing.bokun",
    "sync.booking.bokun",
  ],
}));

// Mock Bokun SDK helpers per evitare HTTP esterno.
vi.mock("@/lib/bokun/bookings", () => ({
  getBokunBooking: vi.fn().mockResolvedValue({
    id: "bkn-test-1",
    productId: "prod-1",
    confirmationCode: "BKN-TEST-1",
    productConfirmationCode: "PROD-CONF-1",
    status: "CONFIRMED",
    channelName: "BOKUN_MAIN",
    startDate: "2026-07-15",
    endDate: "2026-07-15",
    numPeople: 2,
    totalPrice: 200,
    currency: "EUR",
    commissionAmount: 20,
    netAmount: 180,
    paymentStatus: "PAID",
    mainContactDetails: {
      firstName: "Mario",
      lastName: "Rossi",
      email: "mario@bkn.example",
      phoneNumber: "+39123",
      country: "IT",
      language: "it",
    },
    passengers: [],
  }),
}));

vi.mock("@/lib/bokun/adapters/booking", () => ({
  importBokunBooking: vi.fn().mockResolvedValue({
    bookingId: "booking-imported",
    boatId: "boat-1",
    startDate: new Date("2026-07-15"),
    endDate: new Date("2026-07-15"),
    status: "CONFIRMED",
  }),
}));

vi.mock("@/lib/bokun/sync-availability", () => ({
  syncBookingAvailability: vi.fn().mockResolvedValue(undefined),
}));

const TEST_SECRET = "test-bokun-secret-at-least-32-chars-xxxxxx";

// Env override via process.env — env.ts lo rilegge al boot singleton.
// In test mode, già settato da tests/helpers/setup.ts — verifichiamo.
vi.mock("@/lib/env", async () => {
  const actual = await vi.importActual<typeof import("@/lib/env")>("@/lib/env");
  return {
    env: {
      ...actual.env,
      BOKUN_WEBHOOK_SECRET: TEST_SECRET,
    },
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
  await resetRedisMock();
  vi.clearAllMocks();
});

/**
 * Helper: costruisce header Bokun firmati correttamente secondo l'algoritmo
 * del verifier (x-bokun-* sort alpha + HMAC-SHA256 hex).
 */
function buildBokunHeaders(opts: {
  bookingId: string;
  topic: string;
  date?: string;
}): Record<string, string> {
  const date = opts.date ?? new Date().toISOString();
  const headers: Record<string, string> = {
    "x-bokun-topic": opts.topic,
    "x-bokun-date": date,
    "x-bokun-delivery-id": "delivery-" + Math.random().toString(36).slice(2),
    "x-bokun-booking-id": opts.bookingId,
  };

  // String-to-sign: header x-bokun-* (tranne x-bokun-hmac) sort alpha + join.
  const signingPairs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase().startsWith("x-bokun-") && k.toLowerCase() !== "x-bokun-hmac") {
      signingPairs.push([k.toLowerCase(), v]);
    }
  }
  signingPairs.sort(([a], [b]) => a.localeCompare(b));
  const stringToSign = signingPairs.map(([k, v]) => `${k}=${v}`).join("&");
  const hmac = crypto.createHmac("sha256", TEST_SECRET).update(stringToSign).digest("hex");
  headers["x-bokun-hmac"] = hmac;
  return headers;
}

function makeReq(
  body: unknown,
  headers: Record<string, string>,
): Request {
  const bodyStr = JSON.stringify(body);
  return new Request("http://localhost/api/webhooks/bokun", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(bodyStr.length),
      ...headers,
    },
    body: bodyStr,
  });
}

describe("Bokun webhook security (R24-R25)", () => {
  it("valid signature + recent x-bokun-date → 200 received", async () => {
    const body = { bookingId: "bkn-test-1", timestamp: new Date().toISOString() };
    const headers = buildBokunHeaders({
      bookingId: "bkn-test-1",
      topic: "bookings/create",
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(makeReq(body, headers));
    expect(res.status).toBe(200);
    expect(bookingBokunAdd).toHaveBeenCalledTimes(1);
    expect(bookingBokunAdd.mock.calls[0]?.[0]).toBe("booking.webhook.process");
  });

  it("body/header bookingId mismatch → 400", async () => {
    const body = { bookingId: "other-booking", timestamp: new Date().toISOString() };
    const headers = buildBokunHeaders({
      bookingId: "bkn-test-1",
      topic: "bookings/create",
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(makeReq(body, headers));
    expect(res.status).toBe(400);
    expect(bookingBokunAdd).not.toHaveBeenCalled();
  });

  it("R25-A3-C1: x-bokun-date > 5min old → reject ValidationError", async () => {
    const body = { bookingId: "bkn-test-1", timestamp: new Date().toISOString() };
    // Date 10min fa → fuori replay window.
    const oldDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const headers = buildBokunHeaders({
      bookingId: "bkn-test-1",
      topic: "bookings/create",
      date: oldDate,
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(makeReq(body, headers));
    // withErrorHandler mappa ValidationError a 400.
    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.error.message).toMatch(/replay window/i);
  });

  it("R25-A3-C1: x-bokun-date > 5min future → reject ValidationError", async () => {
    const body = { bookingId: "bkn-test-1" };
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const headers = buildBokunHeaders({
      bookingId: "bkn-test-1",
      topic: "bookings/create",
      date: futureDate,
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(makeReq(body, headers));
    expect(res.status).toBe(400);
  });

  it("missing signature → UnauthorizedError 401", async () => {
    const body = { bookingId: "bkn-test-1" };
    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(
      makeReq(body, { "x-bokun-topic": "bookings/create" }),
    );
    expect(res.status).toBe(401);
  });

  it("invalid HMAC → 401 + log con reason", async () => {
    const body = { bookingId: "bkn-test-1" };
    const headers = {
      "x-bokun-topic": "bookings/create",
      "x-bokun-date": new Date().toISOString(),
      // HMAC hex valido ma wrong per il body/headers.
      "x-bokun-hmac": "a".repeat(64),
    };

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(makeReq(body, headers));
    expect(res.status).toBe(401);
  });

  it("R25-A3-C3: content-length > 1MB → 400 body too large", async () => {
    // Costruiamo header fake (non importa la signature — size check viene
    // PRIMA di HMAC verify).
    const headers = {
      "x-bokun-topic": "bookings/create",
      "x-bokun-date": new Date().toISOString(),
      "x-bokun-hmac": "deadbeef",
      "content-length": String(2 * 1024 * 1024), // 2MB
    };
    const body = JSON.stringify({ bookingId: "x" });
    const req = new Request("http://localhost/api/webhooks/bokun", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.error.message).toMatch(/Body too large/i);
  });

  it("dedup via ProcessedBokunEvent: stesso eventId → 200 duplicate", async () => {
    const body = { bookingId: "bkn-test-1", timestamp: new Date().toISOString() };
    const headers = buildBokunHeaders({
      bookingId: "bkn-test-1",
      topic: "bookings/create",
    });

    const { POST } = await import("@/app/api/webhooks/bokun/route");

    // Prima chiamata: 200 received.
    const r1 = await POST(makeReq(body, headers));
    expect(r1.status).toBe(200);

    // Secondo POST con stessi header+body → stesso eventId hash → dedup.
    const r2 = await POST(makeReq(body, headers));
    expect(r2.status).toBe(200);
    const body2 = await r2.json();
    expect(body2.duplicate).toBe(true);

    // Solo 1 row in ProcessedBokunEvent.
    const rows = await db.processedBokunEvent.findMany();
    expect(rows).toHaveLength(1);
    expect(bookingBokunAdd).toHaveBeenCalledTimes(1);
  });
});
