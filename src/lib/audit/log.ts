import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
}

/**
 * Converte un valore arbitrario in InputJsonValue safe per Prisma.
 * - Rimuove `undefined`
 * - Serializza `Date` come ISO
 * - Converte `Decimal`-like (.toString()) a stringa
 * - Gestisce circular refs silenziosamente (fallback a "[Circular]")
 */
function toJsonSafe(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) return null as unknown as Prisma.InputJsonValue;
  try {
    const serialized = JSON.stringify(value, (_key, v) => {
      if (v === undefined) return null;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "bigint") return v.toString();
      if (v && typeof v === "object" && "toString" in v && typeof v.toString === "function") {
        // Decimal-like objects
        if (v.constructor?.name === "Decimal") return v.toString();
      }
      return v;
    });
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    return { _note: "serialization_failed" } as Prisma.InputJsonValue;
  }
}

/**
 * Scrive un entry in AuditLog. Failure-safe: se fallisce, logga ma non
 * blocca il flusso principale (audit e' per compliance, non per correttezza).
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before !== undefined ? toJsonSafe(entry.before) : undefined,
        after: entry.after !== undefined ? toJsonSafe(entry.after) : undefined,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    // Non loggiamo entry intero (PII/secrets): solo metadata.
    logger.error(
      {
        err,
        auditAction: entry.action,
        auditEntity: entry.entity,
        auditEntityId: entry.entityId,
      },
      "Failed to write audit log",
    );
  }
}
