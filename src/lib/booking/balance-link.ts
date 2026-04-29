import { ValidationError } from "@/lib/errors";

/**
 * Il saldo Egadisailing si incassa solamente in loco.
 * La funzione resta come guardia per vecchi call-site: se qualcuno prova a
 * generare ancora un link Stripe per il saldo, fallisce esplicitamente.
 */
export async function createBalancePaymentLink(bookingId: string): Promise<string> {
  void bookingId;
  throw new ValidationError("Il saldo deve essere pagato solamente in loco");
}
