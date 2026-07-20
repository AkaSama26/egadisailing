import type { Worker, Job } from "bullmq";
import { createWorker, registerWorker, type WorkerOptions } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { releaseLease, renewLease, tryAcquireLease } from "@/lib/lease/redis-lease";

function requiredString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Compatibilita' rolling col producer precedente, che non includeva ancora
 * logicalKey. La chiave viene derivata solo da payload tipizzati e coincide
 * con quella dei producer nuovi; payload incompleti restano fail-closed. */
export function deriveLegacyLogicalKey(jobName: string, data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  if (jobName === "availability.update") {
    const boatId = requiredString(record, "boatId");
    const date = requiredString(record, "date");
    const targetChannel = requiredString(record, "targetChannel");
    return boatId && date && targetChannel
      ? `availability:${boatId}:${date}:${targetChannel}`
      : null;
  }
  if (jobName === "booking.webhook.process") {
    const provider = requiredString(record, "provider")?.toLowerCase();
    const bookingId = requiredString(record, "bookingId");
    return provider && bookingId ? `booking:${provider}:${bookingId}` : null;
  }
  if (jobName === "pricing.bokun.sync") {
    const serviceId = requiredString(record, "serviceId");
    const date = requiredString(record, "date");
    return serviceId && date ? `pricing:bokun:${serviceId}:${date}` : null;
  }
  if (jobName === "email.transactional.send") {
    const emailOutboxId = requiredString(record, "emailOutboxId");
    return emailOutboxId ? `email-outbox:${emailOutboxId}` : null;
  }
  return null;
}

export interface DefineWorkerConfig<TJob, TData> {
  /** Queue name (es. QUEUE_NAMES.AVAIL_BOKUN). */
  queue: string;
  /** Job name expected (es. "availability.update"). Skip + log warn se diverso. */
  jobName: string;
  /** Worker label per logger context. Default: queue. */
  label?: string;
  /** Pre-condition: configurazione canale presente (env vars). Fail se false. */
  configCheck?: () => boolean;
  /** Logger context da emettere su failure configCheck (es. {boatId, date}). */
  configCheckLogContext?: (data: TData) => Record<string, unknown>;
  /** Worker options BullMQ (concurrency, limiter, etc.). */
  workerOptions?: WorkerOptions;
  /** Serializza esecuzioni con lo stesso logicalKey tra replica/processi. */
  serializeByLogicalKey?: { ttlSeconds?: number };
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
      // 3. Optional configCheck. Mai completare silenziosamente: un canale
      // attivo senza credenziali deve lasciare un failure riconciliabile.
      if (config.configCheck && !config.configCheck()) {
        log.warn(
          {
            jobId: job.id,
            queue: config.queue,
            ...(config.configCheckLogContext ? config.configCheckLogContext(data) : {}),
          },
          "Channel not configured, failing job",
        );
        const err = new Error(`Channel not configured for queue ${config.queue}`) as Error & {
          code?: string;
        };
        err.code = "CHANNEL_NOT_CONFIGURED";
        throw err;
      }
      // 4. Il jobId e' unico per esecuzione; logicalKey e' stabile per la
      // stessa cella business. Il lease impedisce due side effect upstream
      // concorrenti, senza far rioccupare a un terminal job l'ID futuro.
      const explicitLogicalKey = (job.data as { logicalKey?: unknown }).logicalKey;
      const logicalKey =
        typeof explicitLogicalKey === "string"
          ? explicitLogicalKey
          : deriveLegacyLogicalKey(job.name, data);
      if (
        config.serializeByLogicalKey &&
        typeof explicitLogicalKey !== "string" &&
        logicalKey
      ) {
        log.warn(
          { jobId: job.id, queue: config.queue },
          "Derived logicalKey for rolling-compatible legacy job",
        );
      }
      if (config.serializeByLogicalKey && typeof logicalKey === "string") {
        const ttlSeconds = config.serializeByLogicalKey.ttlSeconds ?? 10 * 60;
        const lease = await tryAcquireLease(
          `queue:${config.queue}:${logicalKey}`,
          // Copre l'intero worst-case upstream (piu' servizi × retry HTTP).
          // Crash safety: TTL libera automaticamente entro 10 minuti.
          ttlSeconds,
          { failOpen: false },
        );
        if (!lease) {
          const err = new Error(`Logical job lease busy: ${logicalKey}`) as Error & {
            code?: string;
          };
          err.code = "LOGICAL_JOB_LEASE_BUSY";
          throw err;
        }
        // Alcuni job availability iterano piu' prodotti upstream. Rinnova il
        // token a un terzo del TTL: il limite resta crash-safe, ma un handler
        // sano non perde la serializzazione solo perche' supera 10 minuti.
        let renewalInFlight: Promise<void> | null = null;
        let leaseLost = false;
        const renewalTimer = setInterval(() => {
          if (renewalInFlight) return;
          renewalInFlight = renewLease(lease, ttlSeconds)
            .then((renewed) => {
              if (!renewed) {
                leaseLost = true;
                log.warn(
                  { jobId: job.id, queue: config.queue },
                  "Logical job lease ownership was lost",
                );
              }
            })
            .finally(() => {
              renewalInFlight = null;
            });
        }, Math.max(1_000, Math.floor((ttlSeconds * 1_000) / 3)));
        renewalTimer.unref?.();

        let handlerError: unknown;
        try {
          await config.handler(data, job);
        } catch (err) {
          handlerError = err;
        } finally {
          clearInterval(renewalTimer);
          await renewalInFlight;
          await releaseLease(lease);
        }
        if (handlerError !== undefined) throw handlerError;
        if (leaseLost) {
          const err = new Error(`Logical job lease lost: ${logicalKey}`) as Error & {
            code?: string;
          };
          err.code = "LOGICAL_JOB_LEASE_LOST";
          throw err;
        }
        return;
      }

      if (config.serializeByLogicalKey) {
        // Fail closed se neppure il payload legacy tipizzato consente una
        // derivazione univoca. Un producer nuovo che dimentica logicalKey non
        // deve produrre una side effect upstream concorrente.
        const err = new Error("Serialized job missing logicalKey") as Error & {
          code?: string;
        };
        err.code = "LOGICAL_JOB_KEY_MISSING";
        throw err;
      }
      await config.handler(data, job);
    },
    config.workerOptions,
  );

  if (config.autoRegister !== false) {
    registerWorker(worker);
  }
  return worker;
}
