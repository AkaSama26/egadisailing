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

  it("creates a custom receipt with a product-linked deposit row and residual balance", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");

    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Custom" },
        lineItems: [
          {
            clientKey: "product-1",
            lineType: "PRODUCT",
            description: "Servizio manuale",
            quantity: "1",
            unitPrice: "500.00",
            vatTreatment: "VAT_INCLUDED",
          },
          {
            clientKey: "payment-1",
            lineType: "PAYMENT_RECEIVED",
            description: "Acconto ricevuto",
            quantity: "1",
            unitPrice: "150.00",
            vatTreatment: "VAT_INCLUDED",
            paymentType: "DEPOSIT",
            paymentMethod: "CASH",
            paymentDate: "2026-05-18",
            productLineKey: "product-1",
          },
        ],
        note: "Nota visibile",
      },
      "admin-receipts",
    );

    const vm = await getReceiptViewModel(receipt.id);
    expect(vm.note).toBe("Nota visibile");
    expect(receipt.totalAmount.toString()).toBe("500");
    expect(vm.lineItems).toHaveLength(2);
    expect(vm.lineItems[1]).toMatchObject({
      lineType: "PAYMENT_RECEIVED",
      paymentType: "DEPOSIT",
      paymentMethod: "CASH",
      productLineLabel: "Servizio manuale",
    });
    expect(vm.paymentSummary).toMatchObject({
      bookingTotal: "500.00",
      depositPaid: "150.00",
      balancePaid: "0.00",
      totalPaid: "150.00",
      remainingBalance: "350.00",
    });
  });

  it("creates a custom receipt with an unlinked payment row", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");

    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Custom" },
        lineItems: [
          {
            clientKey: "product-1",
            lineType: "PRODUCT",
            description: "Servizio manuale",
            quantity: "1",
            unitPrice: "200.00",
            vatTreatment: "VAT_INCLUDED",
          },
          {
            clientKey: "payment-1",
            lineType: "PAYMENT_RECEIVED",
            description: "Acconto ricevuto libero",
            quantity: "1",
            unitPrice: "80.00",
            vatTreatment: "VAT_INCLUDED",
            paymentType: "DEPOSIT",
            paymentMethod: "BANK_TRANSFER",
            paymentDate: "2026-05-18",
          },
        ],
      },
      "admin-receipts",
    );

    const vm = await getReceiptViewModel(receipt.id);
    expect(vm.lineItems[1].productLineLabel).toBeNull();
    expect(vm.paymentSummary).toMatchObject({
      bookingTotal: "200.00",
      totalPaid: "80.00",
      remainingBalance: "120.00",
    });
  });

  it("sets custom residual to zero after deposit and balance rows", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");

    const receipt = await createCustomReceipt(
      {
        language: "IT",
        issueDate: "2026-05-18",
        recipient: { name: "Cliente Custom" },
        lineItems: [
          {
            clientKey: "product-1",
            lineType: "PRODUCT",
            description: "Servizio manuale",
            quantity: "1",
            unitPrice: "200.00",
            vatTreatment: "VAT_INCLUDED",
          },
          {
            clientKey: "deposit-1",
            lineType: "PAYMENT_RECEIVED",
            description: "Acconto ricevuto",
            quantity: "1",
            unitPrice: "80.00",
            vatTreatment: "VAT_INCLUDED",
            paymentType: "DEPOSIT",
            paymentMethod: "CASH",
            paymentDate: "2026-05-18",
            productLineKey: "product-1",
          },
          {
            clientKey: "balance-1",
            lineType: "PAYMENT_RECEIVED",
            description: "Saldo ricevuto",
            quantity: "1",
            unitPrice: "120.00",
            vatTreatment: "VAT_INCLUDED",
            paymentType: "BALANCE",
            paymentMethod: "CASH",
            paymentDate: "2026-05-19",
            productLineKey: "product-1",
          },
        ],
      },
      "admin-receipts",
    );

    const vm = await getReceiptViewModel(receipt.id);
    expect(vm.paymentSummary).toMatchObject({
      depositPaid: "80.00",
      balancePaid: "120.00",
      totalPaid: "200.00",
      remainingBalance: "0.00",
    });
  });

  it("blocks custom payment rows greater than product total", async () => {
    const { createCustomReceipt } = await import("@/lib/receipts/service");

    await expect(
      createCustomReceipt(
        {
          language: "IT",
          issueDate: "2026-05-18",
          recipient: { name: "Cliente Custom" },
          lineItems: [
            {
              clientKey: "product-1",
              lineType: "PRODUCT",
              description: "Servizio manuale",
              quantity: "1",
              unitPrice: "100.00",
              vatTreatment: "VAT_INCLUDED",
            },
            {
              clientKey: "payment-1",
              lineType: "PAYMENT_RECEIVED",
              description: "Acconto ricevuto",
              quantity: "1",
              unitPrice: "120.00",
              vatTreatment: "VAT_INCLUDED",
              paymentType: "DEPOSIT",
              paymentMethod: "CASH",
            },
          ],
        },
        "admin-receipts",
      ),
    ).rejects.toThrow("eccedono il totale prodotti");
  });

  it("creates one booking-style receipt from multiple payments of the same booking", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");
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

    const lines = await db.receiptLineItem.findMany({ where: { receiptId: receipt.id } });
    expect(lines).toHaveLength(3);
    const productLine = lines.find((line) => line.lineType === "PRODUCT");
    const paymentLines = lines.filter((line) => line.lineType === "PAYMENT_RECEIVED");
    expect(productLine?.quantity.toString()).toBe("1");
    expect(productLine?.unitPrice.toString()).toBe("200");
    expect(productLine?.description).toContain("Service");
    expect(paymentLines).toHaveLength(2);
    expect(paymentLines.map((line) => line.unitPrice.toString()).sort()).toEqual(["120", "80"]);
    expect(paymentLines.every((line) => line.productLineItemId === productLine?.id)).toBe(true);

    const vm = await getReceiptViewModel(receipt.id);
    expect(vm.paymentSummary).toMatchObject({
      bookingTotal: "200.00",
      depositPaid: "80.00",
      balancePaid: "120.00",
      totalPaid: "200.00",
      includedPayments: "200.00",
      remainingBalance: "0.00",
    });
  });

  it("shows deposit paid and residual balance for a deposit-only receipt", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");
    const seeded = await seedBookingWithPayments("DEPOSIT_ONLY", [
      {
        amount: "80.00",
        type: "DEPOSIT",
        method: "STRIPE",
        processedAt: new Date("2026-05-10T10:00:00.000Z"),
      },
    ]);

    const receipt = await createReceiptFromPayments(
      { paymentIds: [seeded.payments[0].id], language: "IT" },
      "admin-receipts",
    );
    const vm = await getReceiptViewModel(receipt.id);

    expect(receipt.totalAmount.toString()).toBe("200");
    expect(vm.paymentSummary).toMatchObject({
      bookingTotal: "200.00",
      depositPaid: "80.00",
      balancePaid: "0.00",
      totalPaid: "80.00",
      includedPayments: "80.00",
      remainingBalance: "120.00",
    });
    expect(vm.paymentSummary?.rows.map((row) => row.label)).toContain("Residuo da pagare");
  });

  it("shows balance paid as the selected payment while preserving residual", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");
    const seeded = await seedBookingWithPayments("BALANCE_ONLY");

    const receipt = await createReceiptFromPayments(
      { paymentIds: [seeded.payments[1].id], language: "IT" },
      "admin-receipts",
    );
    const vm = await getReceiptViewModel(receipt.id);

    expect(vm.paymentSummary).toMatchObject({
      bookingTotal: "200.00",
      depositPaid: "0.00",
      balancePaid: "120.00",
      totalPaid: "120.00",
      includedPayments: "120.00",
      remainingBalance: "80.00",
    });
  });

  it("keeps a deposit receipt snapshot unchanged after a later balance payment", async () => {
    const { createReceiptFromPayments } = await import("@/lib/receipts/service");
    const { getReceiptViewModel } = await import("@/lib/receipts/view-model");
    const seeded = await seedBookingWithPayments("SNAPSHOT", [
      {
        amount: "80.00",
        type: "DEPOSIT",
        method: "STRIPE",
        processedAt: new Date("2026-05-10T10:00:00.000Z"),
      },
    ]);

    const receipt = await createReceiptFromPayments(
      { paymentIds: [seeded.payments[0].id], language: "IT" },
      "admin-receipts",
    );
    await db.payment.create({
      data: {
        bookingId: seeded.booking.id,
        amount: "120.00",
        currency: "EUR",
        type: "BALANCE",
        method: "BANK_TRANSFER",
        status: "SUCCEEDED",
        processedAt: new Date(receipt.createdAt.getTime() + 60_000),
      },
    });

    const vm = await getReceiptViewModel(receipt.id);
    expect(vm.paymentSummary).toMatchObject({
      depositPaid: "80.00",
      balancePaid: "0.00",
      totalPaid: "80.00",
      includedPayments: "80.00",
      remainingBalance: "120.00",
    });
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

  it("rejects row count changes when updating payment-linked receipts", async () => {
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
    ).rejects.toThrow("non possono cambiare numero righe");
  });
});

type ReceiptPaymentSpec = {
  amount: string;
  type: "DEPOSIT" | "BALANCE" | "FULL";
  method: "STRIPE" | "CASH" | "BANK_TRANSFER" | "EXTERNAL";
  processedAt: Date;
};

async function seedBookingWithPayments(
  suffix = "",
  paymentSpecs: ReceiptPaymentSpec[] = [
    {
      amount: "80.00",
      type: "DEPOSIT",
      method: "STRIPE",
      processedAt: new Date("2026-05-10T10:00:00.000Z"),
    },
    {
      amount: "120.00",
      type: "BALANCE",
      method: "BANK_TRANSFER",
      processedAt: new Date("2026-05-11T10:00:00.000Z"),
    },
  ],
) {
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
  const payments = await Promise.all(
    paymentSpecs.map((payment) =>
      db.payment.create({
        data: {
          bookingId: booking.id,
          amount: payment.amount,
          currency: "EUR",
          type: payment.type,
          method: payment.method,
          status: "SUCCEEDED",
          processedAt: payment.processedAt,
        },
      }),
    ),
  );
  return { boat, service, customer, booking, payments };
}
