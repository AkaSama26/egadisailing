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

vi.mock("@/lib/queue", () => {
  const mockQueue = () => ({ add: vi.fn().mockResolvedValue({ id: "job-mock" }) });
  return {
    getRedisConnection: () => installRedisMock(),
    // R23-Q-CRITICA-1: queue split per-channel. Tutti i helper ritornano
    // una mock add.
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
  // R21-P2-ALTA: mock new export introdotto in commit 1002624.
  // Senza, il webhook-handler crashava al require() mock-gated → swallow in
  // try/catch di notifyNewBooking → test pass ma notification path testato 0.
  defaultNotificationChannels: vi.fn().mockReturnValue(["EMAIL"]),
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

  it("happy path: PENDING → succeeded → CONFIRMED + Payment + blockDates + confirmation email", async () => {
    const { booking, boat } = await seedBooking("PENDING");
    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const { sendEmail } = await import("@/lib/email/brevo");
    const { dispatchNotification } = await import("@/lib/notifications/dispatcher");

    const event = makeEvent("payment_intent.succeeded", {
      id: "pi_happy",
      amount_received: 40000,
      latest_charge: "ch_happy",
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        paymentType: "FULL",
      },
    });

    await handleStripeEvent(event);

    // Booking PENDING → CONFIRMED.
    const after = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(after.status).toBe("CONFIRMED");

    // Payment SUCCEEDED creato con amount e charge id.
    const payments = await db.payment.findMany({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("SUCCEEDED");
    expect(payments[0].type).toBe("FULL");
    expect(payments[0].stripeChargeId).toBe("ch_happy");
    expect(payments[0].amount.toString()).toBe("400");

    // BoatAvailability BLOCKED per la data del booking.
    const cells = await db.boatAvailability.findMany({
      where: { boatId: boat.id },
    });
    expect(cells.length).toBeGreaterThanOrEqual(1);
    expect(cells[0].status).toBe("BLOCKED");
    expect(cells[0].lockedByBookingId).toBe(booking.id);

    // Email confermazione inviata al cliente.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "mario@example.com",
        subject: expect.stringContaining(booking.confirmationCode),
      }),
    );

    // Notification admin dispatched (NEW_BOOKING_DIRECT).
    expect(dispatchNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "NEW_BOOKING_DIRECT",
      }),
    );

    // ProcessedStripeEvent marker inserito post-success.
    const marker = await db.processedStripeEvent.findUnique({
      where: { eventId: event.id },
    });
    expect(marker).not.toBeNull();
  });

  it("R23-S-CRITICA-2: charge.refunded partial → sibling REFUND row, original resta SUCCEEDED", async () => {
    const { booking } = await seedBooking("CONFIRMED");
    // Seed Payment originale SUCCEEDED (simulated webhook succeeded gia' processato).
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "400.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_partial",
        processedAt: new Date(),
      },
    });

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const refundEvent = makeEvent("charge.refunded", {
      id: "ch_partial",
      amount: 40000,
      amount_refunded: 15000, // 150€ su 400€ = partial
      refunds: { data: [{ id: "re_partial_1" }] },
    });

    await handleStripeEvent(refundEvent);

    // Sibling REFUND Payment creato con amount_refunded + stripeRefundId.
    const payments = await db.payment.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(payments).toHaveLength(2);

    const original = payments.find((p) => p.type === "FULL");
    const refund = payments.find((p) => p.type === "REFUND");
    expect(original).toBeDefined();
    expect(refund).toBeDefined();

    // Partial refund: original resta SUCCEEDED (non REFUNDED).
    expect(original?.status).toBe("SUCCEEDED");

    // Sibling REFUND con stripeRefundId popolato + status REFUNDED +
    // stripeChargeId=null (per non violare unique originale).
    expect(refund?.status).toBe("REFUNDED");
    expect(refund?.stripeRefundId).toBe("re_partial_1");
    expect(refund?.stripeChargeId).toBeNull();
    expect(refund?.amount.toString()).toBe("150");

    // Booking resta CONFIRMED (partial refund = cliente viene).
    const bookingAfter = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(bookingAfter.status).toBe("CONFIRMED");
  });

  it("R23-S-CRITICA-2: charge.refunded full → original REFUNDED + booking REFUNDED", async () => {
    const { booking } = await seedBooking("CONFIRMED");
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "400.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_full",
        processedAt: new Date(),
      },
    });

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const refundEvent = makeEvent("charge.refunded", {
      id: "ch_full",
      amount: 40000,
      amount_refunded: 40000, // full
      refunds: { data: [{ id: "re_full_1" }] },
    });

    await handleStripeEvent(refundEvent);

    const payments = await db.payment.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(payments).toHaveLength(2);

    const original = payments.find((p) => p.type === "FULL");
    const refund = payments.find((p) => p.type === "REFUND");

    // Full refund: sia original che booking transitano a REFUNDED.
    expect(original?.status).toBe("REFUNDED");
    expect(refund?.status).toBe("REFUNDED");

    const bookingAfter = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(bookingAfter.status).toBe("REFUNDED");
  });

  it("R23-S-CRITICA-2: webhook replay stesso refundId → idempotent skip", async () => {
    const { booking } = await seedBooking("CONFIRMED");
    await db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "400.00",
        type: "FULL",
        method: "STRIPE",
        status: "SUCCEEDED",
        stripeChargeId: "ch_replay",
        processedAt: new Date(),
      },
    });

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const refundEvent1 = makeEvent(
      "charge.refunded",
      {
        id: "ch_replay",
        amount: 40000,
        amount_refunded: 10000,
        refunds: { data: [{ id: "re_replay" }] },
      },
      "evt_replay_1",
    );
    const refundEvent2 = makeEvent(
      "charge.refunded",
      {
        id: "ch_replay",
        amount: 40000,
        amount_refunded: 10000,
        refunds: { data: [{ id: "re_replay" }] },
      },
      "evt_replay_2", // event.id diverso ma refund.id uguale
    );

    await handleStripeEvent(refundEvent1);
    await handleStripeEvent(refundEvent2);

    // Idempotency via `stripeRefundId` unique — solo 1 sibling REFUND.
    const refunds = await db.payment.findMany({
      where: { bookingId: booking.id, type: "REFUND" },
    });
    expect(refunds).toHaveLength(1);
  });

  it("R24-S-ALTA-1: payment_intent.canceled → PENDING → CANCELLED + releaseDates", async () => {
    const { booking, boat } = await seedBooking("PENDING");
    // Seed cell BLOCKED come se fosse stato committato.
    await db.boatAvailability.create({
      data: {
        boatId: boat.id,
        date: new Date("2026-07-15"),
        status: "BLOCKED",
        lockedByBookingId: booking.id,
      },
    });

    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");
    const canceledEvent = makeEvent("payment_intent.canceled", {
      id: "pi_canceled",
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        paymentType: "FULL",
      },
    });

    await handleStripeEvent(canceledEvent);

    // Booking PENDING → CANCELLED.
    const after = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CANCELLED");

    // BoatAvailability rilasciata (AVAILABLE + lockedByBookingId=null).
    const cell = await db.boatAvailability.findUniqueOrThrow({
      where: {
        boatId_date: { boatId: boat.id, date: new Date("2026-07-15") },
      },
    });
    expect(cell.status).toBe("AVAILABLE");
    expect(cell.lockedByBookingId).toBeNull();
  });

  it("R24-S-ALTA-3: payment_intent.payment_failed terminal (card_declined) → cleanup PENDING", async () => {
    const { booking } = await seedBooking("PENDING");
    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");

    const failedEvent = makeEvent("payment_intent.payment_failed", {
      id: "pi_failed_terminal",
      last_payment_error: { code: "card_declined", message: "Card declined" },
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        paymentType: "FULL",
      },
    });

    await handleStripeEvent(failedEvent);

    // Booking PENDING → CANCELLED (card_declined = terminal).
    const after = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CANCELLED");
  });

  it("R24-S-ALTA-3: payment_failed NON-terminal (authentication_required) → booking resta PENDING", async () => {
    const { booking } = await seedBooking("PENDING");
    const { handleStripeEvent } = await import("@/lib/stripe/webhook-handler");

    const failedEvent = makeEvent("payment_intent.payment_failed", {
      id: "pi_failed_nonterminal",
      last_payment_error: {
        code: "authentication_required",
        message: "Need 3DS",
      },
      metadata: {
        bookingId: booking.id,
        confirmationCode: booking.confirmationCode,
        paymentType: "FULL",
      },
    });

    await handleStripeEvent(failedEvent);

    // Non-terminal: cliente puo' retry stesso PI → booking resta PENDING.
    const after = await db.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("PENDING");
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
