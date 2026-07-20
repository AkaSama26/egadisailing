import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  getActiveQueueNames,
  getQueue,
  JOB_COMPLETED_RETENTION_COUNT,
  QUEUE_NAMES,
} from "@/lib/queue";

export const QUEUE_FAILURE_RECENT_MS = 24 * 60 * 60 * 1000;
export const QUEUE_STALE_MS = 15 * 60 * 1000;

interface JobLike {
  timestamp: number;
  delay?: number;
  processedOn?: number;
  finishedOn?: number;
  data?: unknown;
}

type PendingState = "waiting" | "paused" | "active" | "delayed" | "prioritized";

interface PendingJobLike {
  job: JobLike;
  state: PendingState;
}

export interface QueueJobAnalysis {
  failedRecent24h: number;
  unresolvedRecent: number;
  stale: number;
  oldestAgeMs: number | null;
}

function logicalKeyOf(job: JobLike): string | null {
  const data = job.data;
  if (!data || typeof data !== "object") return null;
  const logicalKey = (data as { logicalKey?: unknown }).logicalKey;
  return typeof logicalKey === "string" ? logicalKey : null;
}

function eventTime(job: JobLike): number {
  return job.finishedOn ?? job.processedOn ?? job.timestamp;
}

function eligibleTime({ job, state }: PendingJobLike): number {
  if (state === "delayed") {
    // BullMQ conserva processedOn durante il backoff di un retry: il nuovo
    // istante di eleggibilita' e' quindi ultimo tentativo + delay. Per un job
    // delayed iniziale processedOn e' assente e la base resta timestamp.
    return (job.processedOn ?? job.timestamp) + Math.max(0, job.delay ?? 0);
  }

  // Active: inizio reale del worker. Waiting: timestamp originale oppure
  // ultimo tentativo per un retry gia' promosso dalla delayed queue.
  return job.processedOn ?? job.timestamp;
}

/** Pure core, esportato per test deterministici del criterio health. */
export function analyzeQueueJobs(input: {
  failed: JobLike[];
  completed: JobLike[];
  pending: PendingJobLike[];
  terminalLogicalKeys?: ReadonlySet<string>;
  /** Errori persistenti nel master DB non necessariamente rappresentati da
   * un job BullMQ failed (es. EmailOutbox dopo crash/purge Redis). */
  additionalUnresolvedLogicalKeys?: ReadonlySet<string>;
  /** Record master DB eleggibili ma senza garanzia di un job Redis (es. crash
   * tra commit EmailOutbox ed enqueue). */
  additionalPending?: ReadonlyArray<{ logicalKey: string; eligibleAtMs: number }>;
  nowMs: number;
}): QueueJobAnalysis {
  const recentCutoff = input.nowMs - QUEUE_FAILURE_RECENT_MS;
  const completedAt = new Map<string, number>();
  for (const job of input.completed) {
    const key = logicalKeyOf(job);
    if (!key) continue;
    completedAt.set(key, Math.max(completedAt.get(key) ?? 0, eventTime(job)));
  }

  const recentFailed = input.failed.filter((job) => eventTime(job) >= recentCutoff);
  const unresolvedLogicalKeys = new Set<string>();
  let unresolvedWithoutLogicalKey = 0;
  for (const job of recentFailed) {
    const key = logicalKeyOf(job);
    if (!key) {
      unresolvedWithoutLogicalKey++;
      continue;
    }
    if (input.terminalLogicalKeys?.has(key)) continue;
    const unresolved = (completedAt.get(key) ?? 0) <= eventTime(job);
    if (unresolved) unresolvedLogicalKeys.add(key);
  }
  for (const key of input.additionalUnresolvedLogicalKeys ?? []) {
    unresolvedLogicalKeys.add(key);
  }

  const redisPendingLogicalKeys = new Set(
    input.pending
      .map(({ job }) => logicalKeyOf(job))
      .filter((key): key is string => key !== null),
  );
  const additionalPending = (input.additionalPending ?? []).filter(
    ({ logicalKey }) => !redisPendingLogicalKeys.has(logicalKey),
  );
  for (const { logicalKey } of additionalPending) {
    unresolvedLogicalKeys.add(logicalKey);
  }

  const ages = [
    ...input.pending.map((job) => Math.max(0, input.nowMs - eligibleTime(job))),
    ...additionalPending.map(({ eligibleAtMs }) =>
      Math.max(0, input.nowMs - eligibleAtMs),
    ),
  ];
  return {
    failedRecent24h: recentFailed.length,
    unresolvedRecent: unresolvedWithoutLogicalKey + unresolvedLogicalKeys.size,
    stale: ages.filter((age) => age > QUEUE_STALE_MS).length,
    oldestAgeMs: ages.length > 0 ? Math.max(...ages) : null,
  };
}

export interface PerQueueHealth extends QueueJobAnalysis {
  queue: string;
  ok: boolean;
  waiting: number;
  paused: number;
  active: number;
  delayed: number;
  prioritized: number;
  failedRetained: number;
  /** EmailOutbox FAILED aggiornati nelle ultime 24h. Zero per le altre code. */
  failedOutboxRecent: number;
}

export interface QueueHealth {
  ok: boolean;
  waiting: number;
  paused: number;
  active: number;
  delayed: number;
  prioritized: number;
  failedRetained: number;
  failedRecent24h: number;
  unresolvedRecent: number;
  failedOutboxRecent: number;
  stale: number;
  oldestAgeMs: number | null;
  queues: PerQueueHealth[];
  error?: string;
}

function emailOutboxIdOf(job: JobLike): string | null {
  const envelope = job.data;
  if (!envelope || typeof envelope !== "object") return null;
  const payload = (envelope as { data?: unknown }).data;
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { emailOutboxId?: unknown }).emailOutboxId;
  return typeof id === "string" ? id : null;
}

async function terminalEmailLogicalKeys(failed: JobLike[]): Promise<Set<string>> {
  const ids = [...new Set(failed.map(emailOutboxIdOf).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Set();
  const rows = await db.emailOutbox.findMany({
    where: { id: { in: ids }, status: { in: ["SENT", "DISMISSED"] } },
    select: { id: true },
  });
  return new Set(rows.map((row) => `email-outbox:${row.id}`));
}

async function inspectQueue(queueName: string, nowMs: number): Promise<PerQueueHealth> {
  const queue = getQueue(queueName);
  const counts = await queue.getJobCounts(
    "waiting",
    "paused",
    "active",
    "delayed",
    "prioritized",
    "failed",
    "completed",
  );
  const failedRetained = counts.failed ?? 0;
  const completedRetained = counts.completed ?? 0;
  const [
    failed,
    completed,
    waiting,
    active,
    delayed,
    prioritized,
    recentFailedOutbox,
    overdueOutbox,
  ] = await Promise.all([
      failedRetained > 0
        // Piu' recenti per primi: se la retention supera il cap dobbiamo
        // comunque vedere tutti i failure delle ultime 24 ore.
        ? queue.getJobs(["failed"], 0, Math.min(failedRetained, 5_000) - 1, false)
        : Promise.resolve([] as Job[]),
      completedRetained > 0
        // Le convergenze piu' recenti sono quelle che risolvono un failure.
        ? queue.getJobs(
            ["completed"],
            0,
            Math.min(completedRetained, JOB_COMPLETED_RETENTION_COUNT) - 1,
            false,
          )
        : Promise.resolve([] as Job[]),
      (counts.waiting ?? 0) + (counts.paused ?? 0) > 0
        // BullMQ espande `waiting` anche alla lista `paused`. Senza usare il
        // count combinato, una coda globalmente sospesa con waiting=0
        // resterebbe invisibile al controllo di anzianita'.
        ? queue.getJobs(["waiting"], 0, 999, true)
        : Promise.resolve([] as Job[]),
      (counts.active ?? 0) > 0
        ? queue.getJobs(["active"], 0, 999, true)
        : Promise.resolve([] as Job[]),
      (counts.delayed ?? 0) > 0
        ? queue.getJobs(["delayed"], 0, 999, true)
        : Promise.resolve([] as Job[]),
      (counts.prioritized ?? 0) > 0
        ? queue.getJobs(["prioritized"], 0, 999, true)
        : Promise.resolve([] as Job[]),
      queueName === QUEUE_NAMES.EMAIL_TRANSACTIONAL
        ? db.emailOutbox.findMany({
            where: {
              status: "FAILED",
              updatedAt: { gte: new Date(nowMs - QUEUE_FAILURE_RECENT_MS) },
            },
            select: { id: true },
          })
        : Promise.resolve([] as Array<{ id: string }>),
      queueName === QUEUE_NAMES.EMAIL_TRANSACTIONAL
        ? db.emailOutbox.findMany({
            where: {
              status: { in: ["PENDING", "SENDING"] },
              nextAttemptAt: { lte: new Date(nowMs - QUEUE_STALE_MS) },
            },
            select: { id: true, nextAttemptAt: true },
          })
        : Promise.resolve([] as Array<{ id: string; nextAttemptAt: Date }>),
    ]);
  const terminalLogicalKeys =
    queueName === QUEUE_NAMES.EMAIL_TRANSACTIONAL
      ? await terminalEmailLogicalKeys(failed)
      : undefined;
  const analysis = analyzeQueueJobs({
    failed,
    completed,
    pending: [
      ...waiting.map((job) => ({ job, state: "waiting" as const })),
      ...active.map((job) => ({ job, state: "active" as const })),
      ...delayed.map((job) => ({ job, state: "delayed" as const })),
      ...prioritized.map((job) => ({ job, state: "prioritized" as const })),
    ],
    terminalLogicalKeys,
    additionalUnresolvedLogicalKeys: new Set(
      recentFailedOutbox.map((row) => `email-outbox:${row.id}`),
    ),
    additionalPending: overdueOutbox.map((row) => ({
      logicalKey: `email-outbox:${row.id}`,
      eligibleAtMs: row.nextAttemptAt.getTime(),
    })),
    nowMs,
  });
  return {
    queue: queueName,
    ok: analysis.unresolvedRecent === 0 && analysis.stale === 0,
    waiting: counts.waiting ?? 0,
    paused: counts.paused ?? 0,
    active: counts.active ?? 0,
    delayed: counts.delayed ?? 0,
    prioritized: counts.prioritized ?? 0,
    failedRetained,
    failedOutboxRecent: recentFailedOutbox.length,
    ...analysis,
  };
}

export async function checkQueueHealth(now = new Date()): Promise<QueueHealth> {
  try {
    const queues = await Promise.all(
      getActiveQueueNames().map((queueName) => inspectQueue(queueName, now.getTime())),
    );
    const oldest = queues
      .map((queue) => queue.oldestAgeMs)
      .filter((age): age is number => age !== null);
    return {
      ok: queues.every((queue) => queue.ok),
      waiting: queues.reduce((sum, queue) => sum + queue.waiting, 0),
      paused: queues.reduce((sum, queue) => sum + queue.paused, 0),
      active: queues.reduce((sum, queue) => sum + queue.active, 0),
      delayed: queues.reduce((sum, queue) => sum + queue.delayed, 0),
      prioritized: queues.reduce((sum, queue) => sum + queue.prioritized, 0),
      failedRetained: queues.reduce((sum, queue) => sum + queue.failedRetained, 0),
      failedRecent24h: queues.reduce((sum, queue) => sum + queue.failedRecent24h, 0),
      unresolvedRecent: queues.reduce((sum, queue) => sum + queue.unresolvedRecent, 0),
      failedOutboxRecent: queues.reduce((sum, queue) => sum + queue.failedOutboxRecent, 0),
      stale: queues.reduce((sum, queue) => sum + queue.stale, 0),
      oldestAgeMs: oldest.length > 0 ? Math.max(...oldest) : null,
      queues,
    };
  } catch (err) {
    return {
      ok: false,
      waiting: 0,
      paused: 0,
      active: 0,
      delayed: 0,
      prioritized: 0,
      failedRetained: 0,
      failedRecent24h: 0,
      unresolvedRecent: 0,
      failedOutboxRecent: 0,
      stale: 0,
      oldestAgeMs: null,
      queues: [],
      error: (err as Error).message,
    };
  }
}

export function isChannelHealthEnabled(channel: string): boolean {
  if (channel === "BOKUN") return Boolean(env.BOKUN_ACCESS_KEY && env.BOKUN_SECRET_KEY);
  if (channel === "BOATAROUND") {
    return Boolean(
      env.BOATAROUND_SYNC_ENABLED &&
        env.BOATAROUND_API_TOKEN &&
        env.BOATAROUND_WEBHOOK_SECRET,
    );
  }
  return true;
}
