import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { auditLog } from "@/lib/audit/log";
import {
  ALL_QUEUE_NAMES,
  getQueue,
  JOB_COMPLETED_RETENTION_SECONDS,
  JOB_FAILED_RETENTION_SECONDS,
} from "@/lib/queue";

const CLEAN_BATCH_SIZE = 5_000;
const MAX_CLEAN_BATCHES = 10;

export interface QueueRetentionResult {
  completedDeleted: number;
  failedDeleted: number;
  byQueue: Array<{ queue: string; completedDeleted: number; failedDeleted: number }>;
}

async function cleanBatched(
  queueName: string,
  graceMs: number,
  state: "completed" | "failed",
): Promise<number> {
  const queue = getQueue(queueName);
  let deleted = 0;
  for (let batch = 0; batch < MAX_CLEAN_BATCHES; batch++) {
    const ids = await queue.clean(graceMs, CLEAN_BATCH_SIZE, state);
    deleted += ids.length;
    if (ids.length < CLEAN_BATCH_SIZE) break;
  }
  return deleted;
}

/** Applica la retention anche ai job gia' terminali prima del deploy della
 * nuova removeOn* policy. Non viene invocata dal deploy: solo dal cron GDPR. */
export async function cleanExpiredQueueJobs(): Promise<QueueRetentionResult> {
  const byQueue = [] as QueueRetentionResult["byQueue"];
  for (const queueName of ALL_QUEUE_NAMES) {
    const completedDeleted = await cleanBatched(
      queueName,
      JOB_COMPLETED_RETENTION_SECONDS * 1000,
      "completed",
    );
    const failedDeleted = await cleanBatched(
      queueName,
      JOB_FAILED_RETENTION_SECONDS * 1000,
      "failed",
    );
    byQueue.push({ queue: queueName, completedDeleted, failedDeleted });
    if (completedDeleted > 0 || failedDeleted > 0) {
      await auditLog({
        action: AUDIT_ACTIONS.QUEUE_RETENTION_PURGE,
        entity: "BullMQQueue",
        entityId: queueName,
        after: {
          completedDeleted,
          failedDeleted,
          completedRetentionDays: 7,
          failedRetentionDays: 30,
        },
      });
    }
  }
  return {
    completedDeleted: byQueue.reduce((sum, row) => sum + row.completedDeleted, 0),
    failedDeleted: byQueue.reduce((sum, row) => sum + row.failedDeleted, 0),
    byQueue,
  };
}
