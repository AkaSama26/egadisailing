import { Queue, Worker, QueueEvents, type Processor } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@/lib/logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    connection.on("error", (err) => logger.error({ err }, "Redis error"));
    connection.on("connect", () => logger.info("Redis connected"));
  }
  return connection;
}

export function createQueue<T = unknown>(name: string): Queue<T> {
  return new Queue<T>(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 60_000 }, // 1min, 2min, 4min, 8min, 16min
      removeOnComplete: { count: 1000, age: 7 * 24 * 60 * 60 },
      removeOnFail: { count: 5000 },
    },
  });
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  concurrency = 5,
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: getRedisConnection(),
    concurrency,
  });
  worker.on("failed", (job, err) =>
    logger.error({ jobId: job?.id, jobName: name, err }, "Job failed"),
  );
  worker.on("completed", (job) =>
    logger.debug({ jobId: job.id, jobName: name }, "Job completed"),
  );
  return worker;
}

export function createQueueEvents(name: string): QueueEvents {
  return new QueueEvents(name, { connection: getRedisConnection() });
}

// Queue instances (lazy getters so test environments don't always spin them up)
let _syncQueue: Queue | null = null;
export function syncQueue(): Queue {
  if (!_syncQueue) _syncQueue = createQueue("sync");
  return _syncQueue;
}
