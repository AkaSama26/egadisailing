/**
 * Integration test — stripe-reconciliation cron cursor cross-run (R24-P2).
 *
 * Scenari:
 *  1. Run completo (no MAX_PAGES hit) → advance cursore a maxEventCreated -1,
 *     Redis continuation key clearata, healthStatus GREEN.
 *  2. Run cappato (hit MAX_PAGES + hasMore) → persist lastEventId in Redis,
 *     since invariato, healthStatus YELLOW.
 *  3. Run successivo con Redis continuation → usa starting_after da quella key.
 *  4. Stripe 404 resource_missing (cursor stale > 30d) → Redis key clearata +
 *     healthStatus RED.
 *  5. ProcessedStripeEvent dedup → event gia' processato skippato.
 *  6. since > 28d → capped a 28d (retention Stripe).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

// Redis mock condiviso con lease + cursor persist.
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
  ],
}));

// Mock Stripe SDK — controlled events.list responses per test.
const eventsListMock = vi.fn();
vi.mock("@/lib/stripe/server", () => ({
  stripe: () => ({
    events: { list: eventsListMock },
  }),
}));

// Mock handleStripeEvent — per verificare che venga chiamato con l'event
// corretto. Non vogliamo eseguire i side-effect reali (che avrebbero
// dipendenze su PI / booking etc).
const handleStripeEventMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/stripe/webhook-handler", () => ({
  handleStripeEvent: handleStripeEventMock,
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

function makeEvent(
  id: string,
  type: Stripe.Event.Type = "payment_intent.succeeded",
  createdSecondsAgo = 60,
): Stripe.Event {
  return {
    id,
    type,
    object: "event",
    api_version: "2026-03-25.dahlia",
    created: Math.floor(Date.now() / 1000) - createdSecondsAgo,
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: { object: {} as Stripe.Event.Data.Object },
  } as unknown as Stripe.Event;
}

function makeReq(): Request {
  return new Request("http://localhost/api/cron/stripe-reconciliation", {
    method: "GET",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? "test-cron"}` },
  });
}

describe("stripe-reconciliation cursor cross-run (R24-P2)", () => {
  it("run completo → advance since + clear Redis continuation + GREEN", async () => {
    // 2 eventi in response, has_more: false → run completo.
    const events = [makeEvent("evt_newest", "payment_intent.succeeded", 30)];
    eventsListMock.mockResolvedValueOnce({
      data: events,
      has_more: false,
    });

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.replayed).toBe(1);
    expect(body.hitMaxPages).toBe(false);

    // ChannelSyncStatus aggiornato: lastSyncAt ≈ maxEventCreated-1s,
    // healthStatus GREEN.
    const status = await db.channelSyncStatus.findUnique({
      where: { channel: "STRIPE_EVENTS_RECONCILIATION" },
    });
    expect(status?.healthStatus).toBe("GREEN");
    expect(status?.lastError).toBeNull();

    // Redis continuation key deve essere clearata (run completo).
    const redis = installRedisMock();
    const cursor = await redis.get("stripe-reconciliation:starting-after");
    expect(cursor).toBeNull();

    // Handler chiamato con l'event.
    expect(handleStripeEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_newest" }),
    );
  });

  it("hit MAX_PAGES + hasMore → persist Redis continuation + YELLOW", async () => {
    // Simuliamo backlog: ogni chiamata a events.list ritorna PAGE_SIZE=100
    // eventi + hasMore=true. Con MAX_PAGES=100 si ferma dopo 100 pages.
    // Per velocita' nei test, generiamo solo events id unique + hasMore=true
    // per N page cap. Mock sempre ritorna 1 evento per simplicity + hasMore.
    // Con MAX_PAGES=100 fa 100 call.
    let callIdx = 0;
    eventsListMock.mockImplementation(async () => {
      callIdx++;
      return {
        data: [makeEvent(`evt_page${callIdx}`, "payment_intent.succeeded", 300)],
        has_more: true,
      };
    });

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // Pages = MAX_PAGES (100), hasMore=true → hitMaxPages true.
    expect(body.pages).toBe(100);
    expect(body.hitMaxPages).toBe(true);

    // ChannelSyncStatus YELLOW + lastError con MAX_PAGES message.
    const status = await db.channelSyncStatus.findUnique({
      where: { channel: "STRIPE_EVENTS_RECONCILIATION" },
    });
    expect(status?.healthStatus).toBe("YELLOW");
    expect(status?.lastError).toMatch(/MAX_PAGES cap/);

    // Redis continuation key persistita con lastEventIdThisRun.
    const redis = installRedisMock();
    const cursor = await redis.get("stripe-reconciliation:starting-after");
    expect(cursor).toBe("evt_page100"); // ultimo event visto
  }, 45_000);

  it("Stripe 404 resource_missing → clear Redis cursor + RED", async () => {
    // Setup: Redis ha un cursor stale.
    const redis = installRedisMock();
    await redis.set("stripe-reconciliation:starting-after", "evt_stale_id");

    // Mock events.list throws Stripe 404 resource_missing.
    const stripeErr = Object.assign(new Error("No such event"), {
      code: "resource_missing",
      type: "StripeInvalidRequestError",
      statusCode: 404,
    });
    eventsListMock.mockRejectedValueOnce(stripeErr);

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    // `withErrorHandler` cattura il throw + ritorna 500 generic (Stripe SDK
    // error e' un Error non AppError). Response status 500 conferma throw
    // interno. Il side-effect principale e' `redis.del(CURSOR_REDIS_KEY)`
    // + ChannelSyncStatus RED — questi sono eseguiti prima del re-throw.
    const res = await GET(makeReq());
    expect(res.status).toBe(500);

    // Cursor key clearata (R25-A1-M1 fix).
    const cursor = await redis.get("stripe-reconciliation:starting-after");
    expect(cursor).toBeNull();

    // ChannelSyncStatus RED.
    const status = await db.channelSyncStatus.findUnique({
      where: { channel: "STRIPE_EVENTS_RECONCILIATION" },
    });
    expect(status?.healthStatus).toBe("RED");
  });

  it("ProcessedStripeEvent dedup skippa event gia' processato", async () => {
    // Seed: event "evt_dup" gia' processato.
    await db.processedStripeEvent.create({
      data: { eventId: "evt_dup", eventType: "payment_intent.succeeded" },
    });

    eventsListMock.mockResolvedValueOnce({
      data: [makeEvent("evt_dup", "payment_intent.succeeded", 60)],
      has_more: false,
    });

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.replayed).toBe(0);
    expect(body.skippedAlreadyProcessed).toBe(1);
    // Handler NON chiamato.
    expect(handleStripeEventMock).not.toHaveBeenCalled();
  });

  it("since > 28d → cappato a 28d (Stripe retention)", async () => {
    // Seed: ChannelSyncStatus con lastSyncAt 35 giorni fa.
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
    await db.channelSyncStatus.create({
      data: {
        channel: "STRIPE_EVENTS_RECONCILIATION",
        lastSyncAt: thirtyFiveDaysAgo,
        healthStatus: "GREEN",
      },
    });

    eventsListMock.mockResolvedValueOnce({ data: [], has_more: false });

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    // Verifica che events.list sia stato chiamato con `gte` >= 28d ago
    // (not 35d). Vedere arg su primo call.
    const firstCallArg = eventsListMock.mock.calls[0][0];
    const maxLookbackEpoch = Math.floor(
      (Date.now() - 28 * 24 * 60 * 60 * 1000) / 1000,
    );
    // Tolleranza 5s per latency test.
    expect(firstCallArg.created.gte).toBeGreaterThanOrEqual(maxLookbackEpoch - 5);
  });

  it("filtra event types non-reconciled (es. customer.created)", async () => {
    eventsListMock.mockResolvedValueOnce({
      data: [
        makeEvent("evt_customer", "customer.created" as Stripe.Event.Type, 60),
        makeEvent("evt_pi", "payment_intent.succeeded", 50),
      ],
      has_more: false,
    });

    const { GET } = await import("@/app/api/cron/stripe-reconciliation/route");
    const res = await GET(makeReq());
    const body = await res.json();

    // Solo 1 event replayato (payment_intent.succeeded); customer.created
    // scartato dal filter RECONCILED_EVENT_TYPES.
    expect(body.replayed).toBe(1);
    expect(handleStripeEventMock).toHaveBeenCalledTimes(1);
    expect(handleStripeEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_pi" }),
    );
  });
});
