import { beforeEach, describe, expect, test, vi } from "vitest";
import { createCheckoutSession } from "./checkout-sessions";

const sessionsCreate = vi.hoisted(() => vi.fn());

vi.mock("./server", () => ({
  stripe: () => ({
    checkout: {
      sessions: {
        create: sessionsCreate,
      },
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("createCheckoutSession", () => {
  beforeEach(() => {
    sessionsCreate.mockReset();
    sessionsCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      payment_intent: "pi_test_123",
      expires_at: 1_800_000_000,
    });
  });

  test("creates a hosted Checkout Session with dynamic total and minimal customer data", async () => {
    await createCheckoutSession({
      amountCents: 12345,
      customerEmail: "mario@example.com",
      clientReferenceId: "booking_123",
      productName: "Egadisailing experience",
      successUrl: "https://egadisailing.com/it/prenota/success/ES-ABC",
      cancelUrl: "https://egadisailing.com/it/prenota/service_123",
      metadata: {
        bookingId: "booking_123",
        confirmationCode: "ES-ABC",
        paymentType: "DEPOSIT",
      },
    });

    expect(sessionsCreate).toHaveBeenCalledWith({
      mode: "payment",
      success_url: "https://egadisailing.com/it/prenota/success/ES-ABC",
      cancel_url: "https://egadisailing.com/it/prenota/service_123",
      client_reference_id: "booking_123",
      customer_email: "mario@example.com",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: 12345,
            product_data: {
              name: "Egadisailing experience",
            },
          },
        },
      ],
      metadata: {
        bookingId: "booking_123",
        confirmationCode: "ES-ABC",
        paymentType: "DEPOSIT",
      },
      payment_intent_data: {
        receipt_email: "mario@example.com",
        metadata: {
          bookingId: "booking_123",
          confirmationCode: "ES-ABC",
          paymentType: "DEPOSIT",
        },
      },
    });

    const args = sessionsCreate.mock.calls[0]?.[0] ?? {};
    expect(args).not.toHaveProperty("adjustable_quantity");
    expect(args).not.toHaveProperty("customer_creation");
    expect(args).not.toHaveProperty("phone_number_collection");
    expect(args).not.toHaveProperty("shipping_address_collection");
    expect(args).not.toHaveProperty("tax_id_collection");
  });

  test("returns session identifiers for persistence", async () => {
    const created = await createCheckoutSession({
      amountCents: 5000,
      customerEmail: "mario@example.com",
      clientReferenceId: "booking_123",
      productName: "Egadisailing experience",
      successUrl: "https://egadisailing.com/success",
      cancelUrl: "https://egadisailing.com/cancel",
      metadata: {
        bookingId: "booking_123",
        confirmationCode: "ES-ABC",
        paymentType: "FULL",
      },
    });

    expect(created).toEqual({
      checkoutSessionId: "cs_test_123",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_123",
      paymentIntentId: "pi_test_123",
      expiresAt: new Date(1_800_000_000 * 1000),
    });
  });
});
