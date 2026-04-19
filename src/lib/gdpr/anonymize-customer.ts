import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * GDPR art. 17 — diritto all'oblio.
 *
 * Hard-delete su Customer non e' possibile per FK `Booking.customerId
 * onDelete: Restrict` (vincolato da art. 2220 c.c. — ritenzione contabile
 * 10 anni). Quindi applichiamo **anonymization**: mask email + nomi +
 * campi contatto, preservando la riga e le FK per audit fiscale.
 *
 * Chiamabile da:
 *  - `/admin/clienti/[id]` (azione admin a seguito di richiesta scritta)
 *  - endpoint self-service Data Subject Rights (Plan 7, da implementare
 *    in `/b/sessione` con conferma OTP)
 *
 * Idempotent: una seconda chiamata e' no-op (rileva email gia' anonymized).
 */
export async function anonymizeCustomer(
  customerId: string,
  opts: { actorUserId?: string; reason?: string } = {},
): Promise<{ alreadyAnonymized: boolean }> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new NotFoundError("Customer", customerId);

  if (customer.email.startsWith("anon-") && customer.email.endsWith("@deleted.local")) {
    return { alreadyAnonymized: true };
  }

  // Validazione anti-piede: no anonymize di booking non-terminale (il
  // cliente e' atteso). Forziamo l'admin a cancellare/rimborsare prima.
  const activeBookings = await db.booking.count({
    where: {
      customerId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startDate: { gte: new Date() },
    },
  });
  if (activeBookings > 0) {
    throw new ValidationError(
      `Cannot anonymize: ${activeBookings} active future booking(s). Cancel or wait until past date.`,
    );
  }

  const maskedEmail = `anon-${customerId}@deleted.local`;
  // R14-REG-A3: mask customer + ConsentRecord.ipAddress/userAgent nella
  // stessa tx. IP address e' personal data GDPR art. 4(1). ConsentRecord
  // sopravvive 10y per audit fiscale, ma IP/UA non sono necessari per la
  // prova del consenso → mask on anonymize.
  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: {
        email: maskedEmail,
        firstName: "ANONIMO",
        lastName: "",
        phone: null,
        nationality: null,
        language: null,
        notes: null,
      },
    });
    await tx.consentRecord.updateMany({
      where: { customerId },
      data: { ipAddress: null, userAgent: null },
    });
  });

  await auditLog({
    userId: opts.actorUserId,
    entity: "Customer",
    entityId: customerId,
    action: "ANONYMIZE",
    after: { reason: opts.reason ?? "gdpr_art_17" },
  });

  logger.info({ customerId, reason: opts.reason }, "Customer anonymized (GDPR art. 17)");
  return { alreadyAnonymized: false };
}
