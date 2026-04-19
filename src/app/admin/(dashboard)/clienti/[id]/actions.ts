"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { anonymizeCustomer } from "@/lib/gdpr/anonymize-customer";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  return { userId: session.user.id };
}

/**
 * GDPR art. 17 — richiesta di cancellazione dati. Non facciamo hard-delete
 * (vincolato dall'art. 2220 c.c. retention fiscale 10 anni) ma mask dei
 * campi PII via helper `anonymizeCustomer`. Il flow:
 *   1. Admin apre `/admin/clienti/[id]`
 *   2. Cliente ha chiesto via email erasure art. 17
 *   3. Admin verifica identita' (email con doc allegato)
 *   4. Admin clicca "Anonimizza (GDPR art. 17)"
 *   5. Server action mask Customer + ConsentRecord + AuditLog.
 *   6. Redirect a `/admin/clienti` (il record anonymizzato e' comunque
 *      visibile in lista come "ANONIMO" — audit trail preservato).
 *
 * Guardia: il helper throws `ValidationError` se customer ha booking
 * PENDING/CONFIRMED futuri → admin deve cancellare/refund prima.
 */
export async function anonymizeCustomerAction(customerId: string): Promise<void> {
  const { userId } = await requireAdmin();
  const result = await anonymizeCustomer(customerId, {
    actorUserId: userId,
    reason: "gdpr_art_17_admin_ui",
  });
  logger.info(
    { customerId, alreadyAnonymized: result.alreadyAnonymized, actorUserId: userId },
    "Customer anonymize triggered via admin UI",
  );
  revalidatePath("/admin/clienti");
  revalidatePath(`/admin/clienti/${customerId}`);
  redirect("/admin/clienti");
}
