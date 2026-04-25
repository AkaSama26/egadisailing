/**
 * Boilerplate condiviso per integration test (Postgres + Redis mock + mocks
 * standard di moduli esterni). Riduce ~80 LoC di setup duplicato per file.
 *
 * Esempio uso:
 *   import { setupIntegrationTest } from "../helpers/integration-setup";
 *   const ctx = setupIntegrationTest({ mockEmail: true, mockStripe: true });
 *   beforeEach(...) // ctx auto-installs lifecycle
 *
 * NOTE: vi.mock chiamate DENTRO al test file (top-level) — vitest hoisting
 * impone che `vi.mock` veda la chiamata staticamente. I mock helpers qui
 * sono FACTORY che ritornano l'oggetto da passare a `vi.mock`.
 */
import { vi } from "vitest";

/**
 * Factory per `vi.mock("@/lib/queue", () => mockQueueModule())`.
 * Ritorna un mock module compatibile con i 5 helper queue + QUEUE_NAMES + ALL_QUEUE_NAMES.
 */
export function mockQueueModule() {
  const sharedAdd = vi.fn();
  return {
    getRedisConnection: () => ({ quit: vi.fn() }),
    syncQueue: () => ({ add: sharedAdd }),
    availBokunQueue: () => ({ add: sharedAdd }),
    availBoataroundQueue: () => ({ add: sharedAdd }),
    availManualQueue: () => ({ add: sharedAdd }),
    pricingBokunQueue: () => ({ add: sharedAdd }),
    getQueue: () => ({ add: sharedAdd }),
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
    // Esposto per assertion: tests possono importare e fare expect(sharedAdd)
    __sharedAdd: sharedAdd,
  };
}

/**
 * Factory per `vi.mock("@/lib/email/brevo", () => mockEmailModule())`.
 * Ritorna sendEmail come vi.fn — esposto via __sendEmailMock per assertion.
 */
export function mockEmailModule() {
  const sendEmail = vi.fn().mockResolvedValue(true);
  return {
    sendEmail,
    __sendEmailMock: sendEmail,
  };
}

/**
 * Factory per `vi.mock("@/lib/notifications/dispatcher", () => mockDispatcherModule())`.
 * Include defaultNotificationChannels (richiesto post R21-P2-ALTA).
 */
export function mockDispatcherModule() {
  const dispatchNotification = vi.fn().mockResolvedValue({
    emailOk: true,
    telegramOk: false,
    anyOk: true,
    skipped: false,
  });
  return {
    dispatchNotification,
    defaultNotificationChannels: vi.fn().mockReturnValue(["EMAIL"]),
    __dispatchMock: dispatchNotification,
  };
}

/**
 * Factory per Stripe mocks (refundPayment + getChargeRefundState + cancelPaymentIntent + createPaymentIntent).
 */
export function mockStripeModule() {
  const refundPayment = vi.fn().mockResolvedValue({ id: "re_test", status: "succeeded" });
  const getChargeRefundState = vi.fn().mockResolvedValue({
    totalCents: 200000,
    refundedCents: 0,
    residualCents: 200000,
  });
  const cancelPaymentIntent = vi.fn();
  const createPaymentIntent = vi.fn().mockResolvedValue({
    paymentIntentId: "pi_test",
    clientSecret: "pi_test_secret",
  });
  return {
    refundPayment,
    getChargeRefundState,
    cancelPaymentIntent,
    createPaymentIntent,
    __refundPaymentMock: refundPayment,
    __getChargeRefundStateMock: getChargeRefundState,
  };
}

/**
 * Factory per Availability mocks (releaseDates + blockDates + updateAvailability).
 */
export function mockAvailabilityModule() {
  const releaseDates = vi.fn().mockResolvedValue(undefined);
  const blockDates = vi.fn().mockResolvedValue(undefined);
  const updateAvailability = vi.fn();
  return {
    releaseDates,
    blockDates,
    updateAvailability,
    __releaseDatesMock: releaseDates,
    __blockDatesMock: blockDates,
  };
}
