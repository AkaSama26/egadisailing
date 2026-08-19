import { toCents } from "@/lib/pricing/cents";

export interface PaymentAccountInput {
  id: string;
  amount: string | number;
  type: "DEPOSIT" | "BALANCE" | "FULL" | "REFUND";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
}

export interface PaymentAccountLine {
  paymentId: string;
  movement: "PAYMENT" | "REFUND" | "IGNORED";
  amountCents: number;
  runningBalanceCents: number;
}

export interface BookingPaymentAccount {
  totalCents: number;
  collectedCents: number;
  outstandingCents: number;
  externalCreditCents: number;
  lines: PaymentAccountLine[];
}

/**
 * Costruisce il conto cliente della singola prenotazione.
 *
 * I pagamenti riusciti riducono il saldo, i rimborsi registrati lo aumentano
 * e i movimenti pendenti/falliti restano visibili senza alterare i totali.
 * Un pagamento OTA marcato come saldato copre l'eventuale residuo non ancora
 * rappresentato da movimenti locali.
 */
export function buildBookingPaymentAccount(input: {
  totalPrice: string | number;
  payments: PaymentAccountInput[];
  externallyPaidInFull: boolean;
  accountClosed: boolean;
}): BookingPaymentAccount {
  const totalCents = toCents(input.totalPrice);
  let runningBalanceCents = totalCents;
  let grossCollectedCents = 0;
  let refundedCents = 0;

  const lines = input.payments.map((payment): PaymentAccountLine => {
    const amountCents = toCents(payment.amount);
    let movement: PaymentAccountLine["movement"] = "IGNORED";

    if (payment.type === "REFUND" && payment.status === "REFUNDED") {
      movement = "REFUND";
      refundedCents += amountCents;
      runningBalanceCents += amountCents;
    } else if (
      payment.type !== "REFUND" &&
      (payment.status === "SUCCEEDED" || payment.status === "REFUNDED")
    ) {
      movement = "PAYMENT";
      grossCollectedCents += amountCents;
      runningBalanceCents = Math.max(runningBalanceCents - amountCents, 0);
    }

    return {
      paymentId: payment.id,
      movement,
      amountCents,
      runningBalanceCents,
    };
  });

  const locallyCollectedCents = Math.max(grossCollectedCents - refundedCents, 0);
  const externalCreditCents = input.externallyPaidInFull
    ? Math.max(totalCents - locallyCollectedCents, 0)
    : 0;
  const collectedCents = Math.min(
    locallyCollectedCents + externalCreditCents,
    totalCents,
  );

  return {
    totalCents,
    collectedCents,
    outstandingCents: input.accountClosed
      ? 0
      : Math.max(totalCents - collectedCents, 0),
    externalCreditCents,
    lines,
  };
}
