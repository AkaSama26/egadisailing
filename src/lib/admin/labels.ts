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
  OverrideStatus,
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
  EXCLUSIVE_EXPERIENCE: "Esperienza Gourmet",
  CABIN_CHARTER: "Esperienza Charter",
  BOAT_SHARED: "Barca condivisa",
  BOAT_EXCLUSIVE: "Barca in esclusiva",
  SOCIAL_BOATING: "Social Boating",
};

/** Health status cross-channel (ChannelSyncStatus.healthStatus). */
export const HEALTH_STATUS_LABEL: Record<string, string> = {
  GREEN: "Operativo",
  YELLOW: "Attenzione",
  RED: "Errore",
};

/** Mode di sync canale (CHANNEL_SYNC_MODE). */
export const CHANNEL_SYNC_MODE_LABEL: Record<string, string> = {
  API: "API bidirezionale",
  ICAL: "iCal (polling)",
  EMAIL: "Email con controllo admin",
};

export const MANUAL_ALERT_ACTION_LABEL: Record<string, string> = {
  BLOCK: "Bloccare la data sul portale esterno",
  UNBLOCK: "Riaprire la data sul portale esterno",
  REVIEW: "Controllare e decidere cosa fare",
};

export const MANUAL_ALERT_CHANNEL_LABEL: Record<string, string> = {
  ...BOOKING_SOURCE_LABEL,
  CROSS_OTA_DOUBLE_BOOKING: "Conflitto tra canali",
  STRIPE_EVENTS_RECONCILIATION: "Controllo pagamenti Stripe",
};

export const OVERRIDE_STATUS_LABEL: Record<OverrideStatus, string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
  EXPIRED: "Scaduta",
  PENDING_RECONCILE_FAILED: "Reconcile failed",
};

/** Helper: ritorna la label tradotta se esiste, altrimenti il valore raw. */
export function labelOrRaw<T extends string>(
  map: Record<string, string>,
  value: T,
): string {
  return map[value] ?? value;
}
