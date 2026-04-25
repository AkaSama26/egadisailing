import type { Prisma } from "@/generated/prisma/client";
import { normalizeEmail } from "@/lib/email-normalize";

export interface UpsertCustomerFromExternalInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  nationality?: string | null;
  /** Bokun-specific (booking customer language preference). */
  language?: string | null;
  /** Notes opzionali (raramente usato dagli adapter, supportato per future). */
  notes?: string | null;
}

/**
 * Upsert Customer da payload OTA esterno (Bokun/Boataround/Charter).
 *
 * Convenzioni rispettate:
 * - `normalizeEmail` (invariant #17) sull'email: dedup Gmail-alias e match
 *   case-insensitive.
 * - Update preserva firstName/lastName esistenti (invariant #19: "Customer
 *   upsert NON sovrascrive firstName alla 2a prenotazione stessa email"):
 *   un cliente che corregge errori di battitura nel proprio nome al primo
 *   booking lo trova preservato sui successivi.
 * - Update aggiorna SOLO i campi trasversali (phone, nationality, language,
 *   notes) e SOLO se il valore in input e' truthy (non-null/non-empty):
 *   replica behavior `field || undefined` dei call site originali per non
 *   sovrascrivere phone/nationality esistenti con stringhe vuote.
 *
 * Caller-specific GDPR/audit/transaction concerns restano fuori (callable
 * dentro tx Prisma esistente con stesso advisory lock).
 */
export async function upsertCustomerFromExternal(
  tx: Prisma.TransactionClient,
  input: UpsertCustomerFromExternalInput,
): Promise<{ id: string }> {
  const emailLower = normalizeEmail(input.email);

  // Solo campi trasversali — non firstName/lastName per invariant #19.
  // Gate `truthy` (non-null/non-empty) replica `value || undefined` originale.
  const updateData: Prisma.CustomerUpdateInput = {};
  if (input.phone) updateData.phone = input.phone;
  if (input.nationality) updateData.nationality = input.nationality;
  if (input.language) updateData.language = input.language;
  if (input.notes) updateData.notes = input.notes;

  const customer = await tx.customer.upsert({
    where: { email: emailLower },
    update: updateData,
    create: {
      email: emailLower,
      firstName: input.firstName ?? "",
      lastName: input.lastName ?? "",
      phone: input.phone ?? null,
      nationality: input.nationality ?? null,
      language: input.language ?? null,
      notes: input.notes ?? null,
    },
    select: { id: true },
  });

  return customer;
}
