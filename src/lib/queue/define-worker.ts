import type { Worker, Job } from "bullmq";
import { createWorker, registerWorker, type WorkerOptions } from "@/lib/queue";
import { logger } from "@/lib/logger";

export interface DefineWorkerConfig<TJob, TData> {
  /** Queue name (es. QUEUE_NAMES.AVAIL_BOKUN). */
  queue: string;
  /** Job name expected (es. "availability.update"). Skip + log warn se diverso. */
  jobName: string;
  /** Worker label per logger context. Default: queue. */
  label?: string;
  /** Pre-condition: configurazione canale presente (env vars). Skip se false. */
  configCheck?: () => boolean;
  /** Logger context da emettere su skip configCheck (es. {boatId, date}). */
  configCheckLogContext?: (data: TData) => Record<string, unknown>;
  /** Worker options BullMQ (concurrency, limiter, etc.). */
  workerOptions?: WorkerOptions;
  /** Business logic handler — riceve job.data tipizzato e job intero. */
  handler: (data: TData, job: Job<TJob>) => Promise<void>;
  /**
   * Se `true`, registra automaticamente il worker via `registerWorker` per
   * SIGTERM shutdown tracking. Default: true.
   */
  autoRegister?: boolean;
}

/**
 * Factory per BullMQ Worker. Standardizza:
 *   1. Job name validation (skip + warn se != jobName atteso)
 *   2. Data presence check (skip se data missing)
 *   3. Optional configCheck (es. isBokunConfigured) con context log
 *   4. Worker options pass-through (concurrency, limiter)
 *   5. Worker registration via globalForWorkers (SIGTERM cleanup)
 *
 * Uso:
 *   export function startMyWorker() {
 *     return defineWorker({
 *       queue: QUEUE_NAMES.MY_QUEUE,
 *       jobName: "my.job.name",
 *       label: "my-worker",
 *       configCheck: isMyChannelConfigured,
 *       workerOptions: { concurrency: 3, limiter: { max: 10, duration: 1000 } },
 *       handler: async (data, _job) => { ... },
 *     });
 *   }
 *
 * Note: `createWorker` (in `lib/queue/index.ts`) gia' attacca handler
 * `failed` con SYNC_FAILURE dispatch + log standardizzato. Questo factory
 * non duplica quei comportamenti.
 */
export function defineWorker<TJob extends { type: string; data: TData }, TData>(
  config: DefineWorkerConfig<TJob, TData>,
): Worker<TJob> {
  const label = config.label ?? config.queue;
  const log = logger.child({ worker: label });

  const worker = createWorker<TJob>(
    config.queue,
    async (job) => {
      // 1. Job name validation — guard rail per evolu producer/consumer drift.
      if (job.name !== config.jobName) {
        log.warn(
          { jobName: job.name, expected: config.jobName, queue: config.queue },
          "Unexpected job name on queue",
        );
        return;
      }
      // 2. Data presence check.
      const data = job.data?.data;
      if (!data) {
        log.warn({ jobId: job.id, queue: config.queue }, "Missing job data, skipping");
        return;
      }
      // 3. Optional configCheck.
      if (config.configCheck && !config.configCheck()) {
        log.warn(
          {
            jobId: job.id,
            queue: config.queue,
            ...(config.configCheckLogContext ? config.configCheckLogContext(data) : {}),
          },
          "Channel not configured, skipping job",
        );
        return;
      }
      // 4. Run business logic handler.
      await config.handler(data, job);
    },
    config.workerOptions,
  );

  if (config.autoRegister !== false) {
    registerWorker(worker);
  }
  return worker;
}
