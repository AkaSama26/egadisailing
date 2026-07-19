import type { Prisma } from "@/generated/prisma/client";

export const PERSISTENT_DEPLOYMENT_CUTOVER_ENTITY = "DeploymentCutover";
export const PERSISTENT_HISTORICAL_EMAIL_CUTOVER_ID = "historical-email-v1";

/**
 * I marker correnti e le generazioni superseded sono recovery state, non log
 * applicativi ordinari: il cron non deve eliminarli allo scadere dei 24 mesi.
 */
export function auditLogRetentionWhere(
  cutoff: Date,
): Prisma.AuditLogWhereInput {
  return {
    timestamp: { lt: cutoff },
    NOT: {
      entity: PERSISTENT_DEPLOYMENT_CUTOVER_ENTITY,
      entityId: PERSISTENT_HISTORICAL_EMAIL_CUTOVER_ID,
    },
  };
}
