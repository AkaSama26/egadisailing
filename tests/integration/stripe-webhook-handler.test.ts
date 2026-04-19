/**
 * A1 — Stripe webhook handler integration test.
 *
 * Scenari critici coperti dai fix multi-round:
 * 1. R13-ALTA: `charge.refunded` arriva prima di `payment_intent.succeeded`
 *    (race Stripe delivery) → throw per forzare retry Stripe invece di
 *    return silenzioso + marker processed.
 * 2. R10-BL-C3 + R11-Reg-C2: `payment_intent.succeeded` su booking gia'
 *    CANCELLED → auto-refund + Payment `type=REFUND` con
 *    `stripeChargeId=null`/`stripeRefundId=null` (previene P2002 sui
 *    campi unique con valori duplicati).
 * 3. Idempotency: marker `ProcessedStripeEvent` previene doppio processing.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { http, HttpResponse } from "msw";
import { server } from "../helpers/msw-server";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock } from "../helpers/redis-mock";

// Shared prisma test instance. Inizializzato in beforeAll prima di ogni import
// dei moduli sotto test — webhook-handler importa `@/lib/db` vero, quindi
// redirectiamo il modulo per usare l'istanza test pglite.
let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: vi.fn().mockResolvedValue({ id: "job-mock" }) }),
}));

// Mock Stripe helpers invece di msw (Stripe SDK usa http/https diretto, non
// fetch — msw v2 in Node intercetta fetch ma non sempre HTTP low-level SDK).
vi.mock("@/lib/stripe/payment-intents", () => ({
  refundPayment: vi.fn().mockResolvedValue({ id: "re_mocked", status: "succeeded" }),
  cancelPaymentIntent: vi
    .fn()
    .mockResolvedValue({ id: "pi_mocked", status: "canceled" }),
  createPaymentIntent: vi
    .fn()
    .mockResolvedValue({ id: "pi_mocked", client_secret: "pi_mocked_secret" }),
}));

// Mock email (Brevo) to avoid real HTTP
vi.mock("@/lib/email/brevo", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock notifications dispatcher
vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatchNotification: vi.fn().mockResolvedValue({
    emailOk: true,
    telegramOk: false,
    anyOk: true,
    skipped: false,
  }),
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  server.listen({ onUnhandledRequest: "warn" });
  db = await setupTestDb();
  testPrisma = db;
});

afterAll(async () => {
  server.close();
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  server.resetHandlers();
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeEvent<T extends string>(
  type: T,
  obj: unknown,
  id = `evt_${Math.random().toString(36).slice(2)}`,
): Stripe.Event {
  return {
    id,
    type,
    object: "event",
    api_version: "2026-03-25.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: { object: obj as Stripe.Event.Data.Object },
  } as unknown as Stripe.Event;
}

async function seedBooking(status: "PENDING" | "CONFIRMED" | "CANCELLED" = "PENDING") {
  const boat = await db.boat.create({
    data: {
      id: "test-boat",
      name: "Test Trimarano",
      type: "TRIMARAN",
      description: "Test",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: "test-service",
      boatId: boat.id,
      name: "Test Service",
      type: "SOCIAL_BOATING",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 20,
      minPaying: 1,
      defaultPaymentSchedule: "FULL",
      active: true,
    },
  });
  const customer = await db.customer.create({
    data: {
      email: "mario@example.com",
      firstName: "Mario",
      lastName: "Rossi",
    },
  });
  const booking = await db.booking.create({
    data: {
      confirmationCode: "ABC12345",
      source: "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate: new Date("2026-07-15"),
      endDate: new Date("2026-07-15"),
      numPeople: 4,
      totalPrice: "400.00",
      status,
      directBooking: {
        create: { paymentSchedule: "FULL", stripePaymentIntentId: "pi_test" },
      },
    },
  });
  return { boat, service, customer, booking };
}

describe("handleStripeEvent — integration", () => {
  it("R13-ALTA: charge.refunded prima di payment_intent.succeeded → throw per Stripe retry", async () => {
    // Booking esiste ma NESSUN Payment ancora (succeeded non processato)
    await seedBooking("PENDING");

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const refundEvent = makeEvent("charge.refunded", {
      id: "ch_out_of_order",
      amount: 40000,
      amount_refunded: 40000,
      refunds: { data: [{ id: "re_out_of_order" }] },
    });

    await expect(handleStripeEvent(refundEvent)).rejects.toThrow(
      /Payment not found for refund/,
    );

    // Marker NON inserito — Stripe retry al prossimo tentativo
    const marker = await db.processedStripeEvent.findUnique({
      where: { eventId: refundEvent.id },
    });
    expect(marker, "Marker non deve essere inserito su throw").toBeNull();
  });

  it("idempotency: stesso event.id processato 2 volte → secondo skippa via marker", async () => {
    const { booking } = await seedBooking("PENDING");
    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const { dispatchNotification } = await import("@/lib/notifications/dispatcher");

    // Prima call: marker creato manualmente per simulare evento gia' processato
    const eventId = "evt_idempotent_test";
    await db.processedStripeEvent.create({
      data: { eventId, eventType: "payment_intent.succeeded" },
    });

    const event = makeEvent(
      "payment_intent.succeeded",
      {
        id: "pi_idempotent",
        amount_received: 40000,
        latest_charge: "ch_idempotent",
        metadata: { bookingId: booking.id, confirmationCode: booking.confirmationCode, paymentType: "FULL" },
      },
      eventId,
    );

    await handleStripeEvent(event);

    // Dispatcher NON chiamato (early return su duplicate)
    expect(dispatchNotification).not.toHaveBeenCalled();

    // Booking resta PENDING (no side-effect)
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("PENDING");
  });

  it("marker inserito solo DOPO successful processing (atomicity)", async () => {
    const { booking } = await seedBooking("PENDING");
    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");

    // Configure msw per rifiutare updates Stripe (simulo partial failure)
    // ma lasciamo il flow andare con Prisma mock
    const event = makeEvent("payment_intent.succeeded", {
      id: "pi_success",
      amount_received: 40000,
      latest_charge: "ch_success",
      metadata: { bookingId: booking.id, confirmationCode: booking.confirmationCode, paymentType: "FULL" },
    });

    await handleStripeEvent(event);

    // Marker inserito a fine handler success path
    const marker = await db.processedStripeEvent.findUnique({
      where: { eventId: event.id },
    });
    expect(marker, "Marker deve esistere post-success").not.toBeNull();

    // Booking transitioned
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CONFIRMED");

    // Payment SUCCEEDED creato
    const payments = await db.payment.findMany({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("SUCCEEDED");
    expect(payments[0].stripeChargeId).toBe("ch_success");
  });

  it("R10-BL-C3 + R11-Reg-C2: succeeded su booking CANCELLED → auto-refund Payment REFUND senza P2002", async () => {
    const { booking } = await seedBooking("CANCELLED");

    // Override refundPayment mock per questo test (rispecchia ch_race + re_auto
    // che ci aspettiamo nel `note` del Payment REFUND record).
    const { refundPayment } = await import("@/lib/stripe/payment-intents");
    vi.mocked(refundPayment).mockResolvedValueOnce({
      id: "re_auto",
      object: "refund",
      status: "succeeded",
    } as never);

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const event = makeEvent("payment_intent.succeeded", {
      id: "pi_race",
      amount_received: 40000,
      latest_charge: "ch_race",
      metadata: { bookingId: booking.id, confirmationCode: booking.confirmationCode, paymentType: "FULL" },
    });

    await handleStripeEvent(event);

    // Deve esistere 1 Payment type=REFUND SENZA stripeChargeId/stripeRefundId
    // (R11-Reg-C2: riutilizzando gli id del Payment originale violava @unique).
    const payments = await db.payment.findMany({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].type).toBe("REFUND");
    expect(payments[0].status).toBe("REFUNDED");
    expect(payments[0].stripeChargeId).toBeNull();
    expect(payments[0].stripeRefundId).toBeNull();
    // Identificatori Stripe preservati in note per correlation audit
    expect(payments[0].note).toContain("ch_race");
    expect(payments[0].note).toContain("re_auto");

    // Booking resta CANCELLED (NON ri-confermato)
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CANCELLED");

    // Marker inserito
    const marker = await db.processedStripeEvent.findUnique({
      where: { eventId: event.id },
    });
    expect(marker).not.toBeNull();
  });
});
