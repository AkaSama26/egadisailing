import { Queue, Worker, QueueEvents, type Processor } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Job as SyncJob, JobType } from "./types";

const JOB_BACKOFF_BASE_MS = 60_000; // 1min → 2min → 4min → 8min → 16min
const JOB_MAX_ATTEMPTS = 5;
const JOB_COMPLETED_RETENTION = { count: 1000, age: 7 * 24 * 60 * 60 };
const JOB_FAILED_RETENTION = { count: 5000 };
const DEFAULT_WORKER_CONCURRENCY = 5;

/**
 * Singleton Redis via globalThis per sopravvivere all'HMR di Next in dev.
 * Senza questo pattern, ogni reload crea una nuova connessione che non viene
 * chiusa, accumulando connessioni zombie.
 */
const globalForQueue = globalThis as unknown as {
  __redis__?: IORedis;
  __queues__?: Map<string, Queue>;
  __workers__?: Worker[];
};

export function getRedisConnection(): IORedis {
  if (!globalForQueue.__redis__) {
    const connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    connection.on("error", (err) => logger.error({ err }, "Redis error"));
    connection.on("connect", () => logger.info("Redis connected"));
    globalForQueue.__redis__ = connection;
  }
  return globalForQueue.__redis__;
}

function getQueuesMap(): Map<string, Queue> {
  if (!globalForQueue.__queues__) {
    globalForQueue.__queues__ = new Map();
  }
  return globalForQueue.__queues__;
}

export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: JOB_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: JOB_BACKOFF_BASE_MS },
      removeOnComplete: JOB_COMPLETED_RETENTION,
      removeOnFail: JOB_FAILED_RETENTION,
    },
  });
}

export interface WorkerOptions {
  concurrency?: number;
  /**
   * Rate limiter per il worker: cappa N job per finestra di `duration` ms.
   * Utile per non martellare i canali upstream (Bokun 429).
   */
  limiter?: { max: number; duration: number };
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  concurrencyOrOptions: number | WorkerOptions = DEFAULT_WORKER_CONCURRENCY,
): Worker<T> {
  const options: WorkerOptions =
    typeof concurrencyOrOptions === "number"
      ? { concurrency: concurrencyOrOptions }
      : concurrencyOrOptions;
  const worker = new Worker<T>(name, processor, {
    connection: getRedisConnection(),
    concurrency: options.concurrency ?? DEFAULT_WORKER_CONCURRENCY,
    limiter: options.limiter,
  });
  worker.on("failed", (job, err) =>
    // Stack troncato per non inondare i log: 5 retry * 200 linee = 1k per job.
    logger.error(
      {
        jobId: job?.id,
        jobName: name,
        errCode: (err as { code?: string }).code,
        errMessage: err.message,
        errStack: err.stack?.slice(0, 2000),
      },
      "Job failed",
    ),
  );
  worker.on("completed", (job) =>
    logger.debug({ jobId: job.id, jobName: name }, "Job completed"),
  );
  return worker;
}

export function getRegisteredWorkers(): Worker[] {
  if (!globalForQueue.__workers__) globalForQueue.__workers__ = [];
  return globalForQueue.__workers__;
}

export function registerWorker(worker: Worker): void {
  getRegisteredWorkers().push(worker);
}

export function createQueueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: getRedisConnection() });
}

/**
 * Named queue factory. Tiene un singleton per nome per evitare di creare
 * Queue duplicate sotto HMR.
 */
export function getQueue<T = unknown>(name: string): Queue<T> {
  const queues = getQueuesMap();
  let q = queues.get(name);
  if (!q) {
    q = createQueue<T>(name);
    queues.set(name, q);
  }
  return q as Queue<T>;
}

/** Queue principale per il fan-out di sync verso i canali esterni. */
export function syncQueue(): Queue<SyncJob> {
  return getQueue<SyncJob>("sync");
}

export type { SyncJob, JobType };
