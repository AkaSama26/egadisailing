import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { parseIsoDay } from "@/lib/dates";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
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
  await db.user.create({
    data: {
      id: "admin-receipts",
      email: "admin-receipts@test.local",
      passwordHash: "test",
      name: "Admin Receipts",
      role: "ADMIN",
    },
  });
});

describe("internal receipts", () => {
  it("creates a custom receipt without creating Payment rows", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");

    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Test" },
        lineItems: [
          {
            description: "Servizio custom",
            quantity: "2",
            unitPrice: "50.00",
            vatTreatment: "VAT_INCLUDED",
          },
        ],
      },
      "admin-receipts",
    );

    expect(receipt.number).toBe("RC-2026-0001");
    expect(receipt.totalAmount.toString()).toBe("100");
    await expect(db.payment.count()).resolves.toBe(0);
  });

  it("creates one receipt from multiple payments of the same booking", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const seeded = await seedBookingWithPayments();

    const receipt = await createReceiptFromPayments(
      {
        paymentIds: seeded.payments.map((payment) => payment.id),
        language: "EN",
      },
      "admin-receipts",
    );

    expect(receipt.origin).toBe("PAYMENT");
    expect(receipt.bookingId).toBe(seeded.booking.id);
    expect(receipt.totalAmount.toString()).toBe("200");
    await expect(db.receiptPayment.count()).resolves.toBe(2);
  });

  it("blocks payments already linked to a receipt", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const seeded = await seedBookingWithPayments();
    await createReceiptFromPayments(
      { paymentIds: [seeded.payments[0].id], language: "IT" },
      "admin-receipts",
    );

    await expect(
      createReceiptFromPayments(
        { paymentIds: [seeded.payments[0].id], language: "IT" },
        "admin-receipts",
      ),
    ).rejects.toThrow("gia' una ricevuta");
  });

  it("blocks refunds, failed payments and payments from different bookings", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const first = await seedBookingWithPayments("A");
    const second = await seedBookingWithPayments("B");
    const refund = await db.payment.create({
      data: {
        bookingId: first.booking.id,
        amount: "10.00",
        currency: "EUR",
        type: "REFUND",
        method: "CASH",
        status: "SUCCEEDED",
        processedAt: new Date(),
      },
    });
    const failed = await db.payment.create({
      data: {
        bookingId: first.booking.id,
        amount: "10.00",
        currency: "EUR",
        type: "BALANCE",
        method: "CASH",
        status: "FAILED",
        processedAt: new Date(),
      },
    });

    await expect(
      createReceiptFromPayments({ paymentIds: [refund.id], language: "IT" }, "admin-receipts"),
    ).rejects.toThrow("rimborsi");
    await expect(
      createReceiptFromPayments({ paymentIds: [failed.id], language: "IT" }, "admin-receipts"),
    ).rejects.toThrow("completati");
    await expect(
      createReceiptFromPayments(
        { paymentIds: [first.payments[0].id, second.payments[0].id], language: "IT" },
        "admin-receipts",
      ),
    ).rejects.toThrow("stessa prenotazione");
  });

  it("generates annual sequence atomically under concurrent creation", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");
    const makeInput = (name: string) =>
      ({
        language: "IT" as const,
        issueDate: "2026-05-18",
        recipient: { name },
        lineItems: [
          {
            description: "Riga",
            quantity: "1",
            unitPrice: "10.00",
            vatTreatment: "VAT_INCLUDED" as const,
          },
        ],
      });

    const receipts = await Promise.all([
      createCustomReceipt(makeInput("Cliente A"), "admin-receipts"),
      createCustomReceipt(makeInput("Cliente B"), "admin-receipts"),
    ]);

    expect(receipts.map((receipt) => receipt.number).sort()).toEqual([
      "RC-2026-0001",
      "RC-2026-0002",
    ]);
  });

  it("updates active receipts and soft-cancels while keeping the number", async () => {
    const { cancelReceipt, createCustomReceipt, updateReceipt } = await import("@/lib/receipts/service");
    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Test" },
        lineItems: [
          {
            description: "Vecchia riga",
            quantity: "1",
            unitPrice: "10.00",
            vatTreatment: "VAT_INCLUDED",
          },
        ],
      },
      "admin-receipts",
    );

    const updated = await updateReceipt(
      {
        receiptId: receipt.id,
        language: "EN",
        issueDate: "2026-05-19",
        recipient: { name: "Updated Customer" },
        lineItems: [
          {
            description: "Updated line",
            quantity: "2",
            unitPrice: "12.50",
            vatTreatment: "VAT_EXEMPT",
          },
        ],
      },
      "admin-receipts",
    );
    const cancelled = await cancelReceipt(updated.id, "admin-receipts");

    expect(updated.totalAmount.toString()).toBe("25");
    expect(cancelled.number).toBe(receipt.number);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).toBeTruthy();
  });

  it("serializes concurrent cancellation and writes one cancel audit", async () => {
    const { cancelReceipt, createCustomReceipt } = await import("@/lib/receipts/service");
    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Race" },
        lineItems: [
          {
            description: "Riga race",
            quantity: "1",
            unitPrice: "10.00",
            vatTreatment: "VAT_INCLUDED",
          },
        ],
      },
      "admin-receipts",
    );

    const [first, second] = await Promise.all([
      cancelReceipt(receipt.id, "admin-receipts"),
      cancelReceipt(receipt.id, "admin-receipts"),
    ]);

    expect(first.number).toBe(receipt.number);
    expect(second.number).toBe(receipt.number);
    await expect(
      db.auditLog.count({
        where: { entityId: receipt.id, action: "RECEIPT_CANCEL" },
      }),
    ).resolves.toBe(1);
  });

  it("rejects duplicate line ids when updating payment-linked receipts", async () => {
    const { createReceiptFromPayments, updateReceipt } = await import("@/lib/receipts/service");
    const seeded = await seedBookingWithPayments();
    const receipt = await createReceiptFromPayments(
      {
        paymentIds: seeded.payments.map((payment) => payment.id),
        language: "IT",
      },
      "admin-receipts",
    );
    const lines = await db.receiptLineItem.findMany({
      where: { receiptId: receipt.id },
      orderBy: { sortOrder: "asc" },
    });

    await expect(
      updateReceipt(
        {
          receiptId: receipt.id,
          language: "IT",
          issueDate: "2026-05-18",
          recipient: { name: "Cliente Test" },
          lineItems: [
            {
              id: lines[0].id,
              description: "Duplicata A",
              quantity: "1",
              unitPrice: "1.00",
              vatTreatment: "VAT_INCLUDED",
            },
            {
              id: lines[0].id,
              description: "Duplicata B",
              quantity: "1",
              unitPrice: "1.00",
              vatTreatment: "VAT_INCLUDED",
            },
          ],
        },
        "admin-receipts",
      ),
    ).rejects.toThrow("Righe ricevuta non valide");
  });
});

async function seedBookingWithPayments(suffix = "") {
  const boat = await db.boat.create({
    data: {
      id: `boat-receipt-${suffix || "main"}`,
      name: `Boat ${suffix}`,
      type: "TRIMARAN",
      description: "Boat",
      amenities: [],
      images: [],
    },
  });
  const service = await db.service.create({
    data: {
      id: `service-receipt-${suffix || "main"}`,
      boatId: boat.id,
      name: `Service ${suffix}`,
      type: "BOAT_EXCLUSIVE",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax: 10,
      active: true,
    },
  });
  const customer = await db.customer.create({
    data: {
      email: `customer-${suffix || "main"}@test.local`,
      firstName: "Test",
      lastName: `Customer ${suffix}`,
    },
  });
  const booking = await db.booking.create({
    data: {
      confirmationCode: `RCPT${suffix || "MAIN"}`,
      source: "DIRECT",
      customerId: customer.id,
      serviceId: service.id,
      boatId: boat.id,
      startDate: parseIsoDay("2026-06-01"),
      endDate: parseIsoDay("2026-06-01"),
      numPeople: 2,
      totalPrice: "200.00",
      currency: "EUR",
      status: "CONFIRMED",
    },
  });
  const payments = await Promise.all([
    db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "80.00",
        currency: "EUR",
        type: "DEPOSIT",
        method: "STRIPE",
        status: "SUCCEEDED",
        processedAt: new Date("2026-05-18T10:00:00.000Z"),
      },
    }),
    db.payment.create({
      data: {
        bookingId: booking.id,
        amount: "120.00",
        currency: "EUR",
        type: "BALANCE",
        method: "BANK_TRANSFER",
        status: "SUCCEEDED",
        processedAt: new Date("2026-05-19T10:00:00.000Z"),
      },
    }),
  ]);
  return { boat, service, customer, booking, payments };
}
