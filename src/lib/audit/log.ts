import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before as never,
        after: entry.after as never,
        ip: entry.ip,
        userAgent: entry.userAgent,
      },
    });
  } catch (err) {
    // Non blocchiamo mai il flusso principale se il log fallisce
    logger.error({ err, entry }, "Failed to write audit log");
  }
}
