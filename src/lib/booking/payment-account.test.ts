import { describe, expect, it } from "vitest";
import { buildBookingPaymentAccount } from "./payment-account";

describe("buildBookingPaymentAccount", () => {
  it("calcola incassato, residuo e saldo progressivo", () => {
    const account = buildBookingPaymentAccount({
      totalPrice: "2500.00",
      externallyPaidInFull: false,
      accountClosed: false,
      payments: [
        { id: "deposit", amount: "750.00", type: "DEPOSIT", status: "SUCCEEDED" },
        { id: "partial", amount: "500.00", type: "DEPOSIT", status: "SUCCEEDED" },
      ],
    });

    expect(account.collectedCents).toBe(125_000);
    expect(account.outstandingCents).toBe(125_000);
    expect(account.lines.map((line) => line.runningBalanceCents)).toEqual([
      175_000,
      125_000,
    ]);
  });

  it("non contabilizza movimenti pendenti o falliti", () => {
    const account = buildBookingPaymentAccount({
      totalPrice: "500.00",
      externallyPaidInFull: false,
      accountClosed: false,
      payments: [
        { id: "pending", amount: "100.00", type: "DEPOSIT", status: "PENDING" },
        { id: "failed", amount: "200.00", type: "DEPOSIT", status: "FAILED" },
      ],
    });

    expect(account.collectedCents).toBe(0);
    expect(account.outstandingCents).toBe(50_000);
    expect(account.lines.every((line) => line.movement === "IGNORED")).toBe(true);
  });

  it("sottrae i rimborsi dall'incassato", () => {
    const account = buildBookingPaymentAccount({
      totalPrice: "1000.00",
      externallyPaidInFull: false,
      accountClosed: false,
      payments: [
        { id: "payment", amount: "1000.00", type: "FULL", status: "SUCCEEDED" },
        { id: "refund", amount: "200.00", type: "REFUND", status: "REFUNDED" },
      ],
    });

    expect(account.collectedCents).toBe(80_000);
    expect(account.outstandingCents).toBe(20_000);
    expect(account.lines[1]).toMatchObject({
      movement: "REFUND",
      runningBalanceCents: 20_000,
    });
  });

  it("riconcilia come saldato un pagamento gestito dal canale esterno", () => {
    const account = buildBookingPaymentAccount({
      totalPrice: "900.00",
      externallyPaidInFull: true,
      accountClosed: false,
      payments: [],
    });

    expect(account.externalCreditCents).toBe(90_000);
    expect(account.collectedCents).toBe(90_000);
    expect(account.outstandingCents).toBe(0);
  });

  it("azzera il dovuto quando la prenotazione e' chiusa", () => {
    const account = buildBookingPaymentAccount({
      totalPrice: "400.00",
      externallyPaidInFull: false,
      accountClosed: true,
      payments: [],
    });

    expect(account.collectedCents).toBe(0);
    expect(account.outstandingCents).toBe(0);
  });
});
