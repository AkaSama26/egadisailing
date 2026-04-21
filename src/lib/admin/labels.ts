/**
 * Traduzioni italiane user-friendly per gli enum DB mostrati nell'admin UI.
 * Non toccare i valori enum raw (usati in query/business logic); convertire
 * solo a livello di presentazione.
 *
 * R29: consolidato prima sparso in 6+ file admin con duplicazione.
 */

import type {
  BookingStatus,
  BookingSource,
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PaymentSchedule,
  AvailabilityStatus,
} from "@/generated/prisma/enums";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "In attesa",
  CONFIRMED: "Confermato",
  CANCELLED: "Annullato",
  REFUNDED: "Rimborsato",
};

export const BOOKING_SOURCE_LABEL: Record<BookingSource, string> = {
  DIRECT: "Sito diretto",
  BOKUN: "Bokun",
  BOATAROUND: "Boataround",
  SAMBOAT: "SamBoat",
  CLICKANDBOAT: "Click&Boat",
  NAUTAL: "Nautal",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "In attesa",
  SUCCEEDED: "Completato",
  FAILED: "Fallito",
  REFUNDED: "Rimborsato",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  STRIPE: "Stripe (carta)",
  CASH: "Contanti",
  BANK_TRANSFER: "Bonifico",
  EXTERNAL: "Esterno (OTA)",
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  DEPOSIT: "Acconto",
  BALANCE: "Saldo",
  FULL: "Totale",
  REFUND: "Rimborso",
};

export const PAYMENT_SCHEDULE_LABEL: Record<PaymentSchedule, string> = {
  FULL: "Pagamento unico",
  DEPOSIT_BALANCE: "Acconto + Saldo",
};

export const AVAILABILITY_STATUS_LABEL: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Disponibile",
  PARTIALLY_BOOKED: "Parzialmente prenotato",
  BLOCKED: "Prenotato",
};

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  SOCIAL_BOATING: "Social Boating",
  BOAT_SHARED: "Barca condivisa",
  CABIN_CHARTER: "Cabin Charter",
  BOAT_EXCLUSIVE: "Barca esclusiva",
};

/** Helper: ritorna la label tradotta se esiste, altrimenti il valore raw. */
export function labelOrRaw<T extends string>(
  map: Record<string, string>,
  value: T,
): string {
  return map[value] ?? value;
}
