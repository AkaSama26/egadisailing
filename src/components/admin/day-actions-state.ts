import type { DayCellEnriched } from "@/app/admin/(dashboard)/calendario/enrich";

export interface ActionState {
  canBlock: boolean;
  canRelease: boolean;
  blockDisabledReason?: string;
  releaseDisabledReason?: string;
  blockWarning?: string; // per partially-booked social
}

/**
 * Deriva permessi + motivi disabled dai dati della cella.
 * Pura: nessun side effect, testabile unit senza Next runtime (evita di
 * trascinare server actions + next-auth nel test runner).
 *
 * Casi:
 * - AVAILABLE: solo blocca abilitato.
 * - BLOCKED admin manuale: solo rilascia abilitato.
 * - BLOCKED con booking attivo PENDING/CONFIRMED: entrambi disabled
 *   (admin deve prima cancellare la prenotazione).
 * - PARTIALLY_BOOKED (social tour): blocca abilitato con warning (richiede
 *   cancel manuale + refund dei clienti esistenti).
 * - Fallback (BLOCKED senza admin + senza booking attivo — edge drift):
 *   solo rilascia abilitato.
 */
export function computeActionState(day: DayCellEnriched): ActionState {
  const activeBookings = day.bookings.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED",
  );
  const hasActiveBooking = activeBookings.length > 0;

  if (day.status === "AVAILABLE") {
    return {
      canBlock: true,
      canRelease: false,
      releaseDisabledReason: "Niente da rilasciare",
    };
  }
  if (day.status === "BLOCKED" && day.isAdminBlock) {
    return { canBlock: false, canRelease: true, blockDisabledReason: "Gia' bloccato" };
  }
  if (day.status === "BLOCKED" && hasActiveBooking) {
    return {
      canBlock: false,
      canRelease: false,
      blockDisabledReason: "Cancella prima la prenotazione attiva",
      releaseDisabledReason: "Cancella prima la prenotazione attiva",
    };
  }
  if (day.status === "PARTIALLY_BOOKED") {
    return {
      canBlock: true,
      canRelease: false,
      blockWarning: `Bloccare annulla il tour per ${activeBookings.length} cliente/i pagante/i — dovrai cancellare + rimborsare manualmente.`,
      releaseDisabledReason: "Non applicabile a tour condiviso",
    };
  }
  // Fallback edge case
  return { canBlock: false, canRelease: true };
}
