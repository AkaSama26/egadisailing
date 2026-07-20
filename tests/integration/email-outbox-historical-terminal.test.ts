import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { closeTestDb, resetTestDb, setupTestDb } from "../helpers/test-db";

let db: Awaited<ReturnType<typeof setupTestDb>>;

const EMAIL_QUEUE = "email.transactional";
const PRICING_QUEUE = "sync.pricing.bokun";
const ROLLBACK_REASON =
  "Automatic rollback safety: delivery outcome is ambiguous; verify Brevo";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isolatedRedisUrl(): string {
  const configured = process.env.TEST_REDIS_URL ?? process.env.REDIS_URL;
  if (!configured) throw new Error("REDIS_URL is required for cutover integration test");
  const url = new URL(configured);
  // BullMQ non espone un prefix al cutover script: il DB Redis 15 mantiene il
  // test distruttivo completamente separato dalle code locali applicative.
  url.pathname = "/15";
  return url.toString();
}

async function runCutover(env: NodeJS.ProcessEnv): Promise<{
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(process.cwd(), "deploy/dismiss-historical-emails.mjs"), "apply"],
      {
        cwd: process.cwd(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    const timeout = setTimeout(() => child.kill("SIGKILL"), 20_000);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolveRun({ code, signal, stdout, stderr });
    });
  });
}

async function runQueueContain(env: NodeJS.ProcessEnv): Promise<{
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(
      process.execPath,
      [resolve(process.cwd(), "deploy/queue-cutover-control.cjs"), "contain"],
      {
        cwd: process.cwd(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    const timeout = setTimeout(() => child.kill("SIGKILL"), 20_000);
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      resolveRun({ code, signal, stdout, stderr });
    });
  });
}

beforeAll(async () => {
  db = await setupTestDb();
});

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

describe("historical EmailOutbox terminal tombstone", () => {
  it("contiene atomicamente le code e rende sticky il lavoro active osservato", async () => {
    const redisUrl = isolatedRedisUrl();
    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 5_000,
      retryStrategy: () => null,
    });
    redis.on("error", () => undefined);
    const emailQueue = new Queue(EMAIL_QUEUE, { connection: redis });
    const pricingQueue = new Queue(PRICING_QUEUE, { connection: redis });

    try {
      await redis.ping();
      await redis.flushdb();
      const appendFsyncBefore = await redis.config("GET", "appendfsync");
      const noAppendFsyncOnRewriteBefore = await redis.config(
        "GET",
        "no-appendfsync-on-rewrite",
      );

      await emailQueue.add(
        "email.transactional.send",
        { data: { emailOutboxId: "waiting-outbox" } },
        { jobId: "waiting-email-1" },
      );
      await redis.lpush(emailQueue.toKey("active"), "synthetic-active-email-1");

      const result = await runQueueContain({
        ...process.env,
        REDIS_URL: redisUrl,
      });

      expect(
        result.code,
        result.stderr || result.stdout || result.signal || "contain exited without details",
      ).toBe(4);

      const attestation = JSON.parse(result.stdout.trim()) as {
        activeObserved?: boolean;
        aofBoundary?: string;
        noAppendFsyncOnRewrite?: string;
        aofLastWriteStatus?: string;
        queuesRemainPaused?: boolean;
        queues?: Record<string, { active?: number; paused?: boolean }>;
      };
      expect(attestation.activeObserved).toBe(true);
      expect(attestation.aofBoundary).toBe("appendfsync-always");
      expect(attestation.noAppendFsyncOnRewrite).toBe("no");
      expect(attestation.aofLastWriteStatus).toBe("ok");
      expect(attestation.queuesRemainPaused).toBe(true);
      expect(attestation.queues?.[EMAIL_QUEUE]).toMatchObject({
        active: 1,
        paused: true,
      });
      expect(attestation.queues?.[PRICING_QUEUE]).toMatchObject({
        active: 0,
        paused: true,
      });

      expect(await emailQueue.isPaused()).toBe(true);
      expect(await pricingQueue.isPaused()).toBe(true);
      expect(await redis.llen(emailQueue.toKey("wait"))).toBe(0);
      expect(await redis.lrange(emailQueue.toKey("paused"), 0, -1)).toContain(
        "waiting-email-1",
      );

      // Simula il completamento/rimozione dell'active dopo che il processo host
      // e' morto: l'osservazione deve restare sticky nel medesimo Redis EVAL.
      await redis.lrem(
        emailQueue.toKey("active"),
        0,
        "synthetic-active-email-1",
      );
      const recovered = await runQueueContain({
        ...process.env,
        REDIS_URL: redisUrl,
      });
      expect(recovered.code, recovered.stderr || recovered.stdout).toBe(4);
      expect(JSON.parse(recovered.stdout.trim())).toMatchObject({
        activeObserved: true,
        currentActiveTotal: 0,
        queuesRemainPaused: true,
        aofBoundary: "appendfsync-always",
      });
      expect(await redis.config("GET", "appendfsync")).toEqual(
        appendFsyncBefore,
      );
      expect(await redis.config("GET", "no-appendfsync-on-rewrite")).toEqual(
        noAppendFsyncOnRewriteBefore,
      );
    } finally {
      await redis.flushdb().catch(() => undefined);
      await emailQueue.close().catch(() => undefined);
      await pricingQueue.close().catch(() => undefined);
      if (redis.status === "ready") {
        await redis.quit().catch(() => redis.disconnect());
      } else {
        redis.disconnect();
      }
    }
  });

  it("vieta di riattivare una email storica anche cancellando nota e tombstone", async () => {
    const historicalDismissedAt = new Date("2026-07-19T12:00:00.000Z");
    const row = await db.emailOutbox.create({
      data: {
        templateKey: "booking-confirmation",
        recipientEmail: "historical@example.invalid",
        subject: "Comunicazione storica",
        htmlContent: "<p>archiviata</p>",
        payload: {},
        idempotencyKey: "historical-terminal-integration",
        status: "DISMISSED",
        resolvedAt: historicalDismissedAt,
        resolutionReason:
          "Historical cutover: archived; owner decision: never send",
        historicalDismissedAt,
      },
    });

    await expect(
      db.$executeRaw`
        UPDATE "EmailOutbox"
           SET "status" = 'PENDING',
               "resolutionReason" = NULL,
               "historicalDismissedAt" = NULL
         WHERE "id" = ${row.id}
      `,
    ).rejects.toThrow(/historical EmailOutbox rows are immutable and terminal/);

    const unchanged = await db.emailOutbox.findUniqueOrThrow({
      where: { id: row.id },
      select: { status: true, historicalDismissedAt: true },
    });
    expect(unchanged).toEqual({
      status: "DISMISSED",
      historicalDismissedAt,
    });

    await expect(
      db.emailOutbox.delete({ where: { id: row.id } }),
    ).rejects.toThrow(/historical EmailOutbox rows cannot be deleted/);
    await expect(
      db.emailOutbox.create({
        data: {
          templateKey: "booking-confirmation",
          recipientEmail: "duplicate-historical@example.invalid",
          subject: "Duplicato vietato",
          htmlContent: "<p>non inviare</p>",
          payload: {},
          idempotencyKey: "historical-terminal-integration",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("non interferisce con le normali transizioni delle email future", async () => {
    const row = await db.emailOutbox.create({
      data: {
        templateKey: "booking-confirmation",
        recipientEmail: "future@example.invalid",
        subject: "Comunicazione futura",
        htmlContent: "<p>futura</p>",
        payload: {},
        idempotencyKey: "future-email-integration",
      },
    });

    const updated = await db.emailOutbox.update({
      where: { id: row.id },
      data: { status: "FAILED", lastError: "provider unavailable" },
      select: { status: true, historicalDismissedAt: true },
    });
    expect(updated).toEqual({ status: "FAILED", historicalDismissedAt: null });
    await expect(db.emailOutbox.delete({ where: { id: row.id } })).resolves.toMatchObject({
      id: row.id,
    });
  });

  it("tombstona una quarantena rollback pre-cutoff e preserva job non archiviati", async () => {
    const historical = await db.emailOutbox.create({
      data: {
        templateKey: "booking-confirmation",
        recipientEmail: "old-rollback@example.invalid",
        subject: "Quarantena rollback storica",
        htmlContent: "<p>non inviare</p>",
        payload: {},
        idempotencyKey: "historical-rollback-dismissed-integration",
        status: "DISMISSED",
        resolvedAt: new Date("2026-07-18T12:00:00.000Z"),
        resolutionReason: ROLLBACK_REASON,
        createdAt: new Date("2026-07-18T12:00:00.000Z"),
      },
    });
    const future = await db.emailOutbox.create({
      data: {
        templateKey: "booking-confirmation",
        recipientEmail: "future-after-cutoff@example.invalid",
        subject: "Comunicazione successiva al cutoff",
        htmlContent: "<p>preservare</p>",
        payload: {},
        idempotencyKey: "future-after-historical-cutoff-integration",
        status: "PENDING",
        createdAt: new Date("2026-07-19T01:00:00.000Z"),
      },
    });

    const redisUrl = isolatedRedisUrl();
    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 5_000,
      retryStrategy: () => null,
    });
    redis.on("error", () => undefined);
    const emailQueue = new Queue(EMAIL_QUEUE, { connection: redis });
    const pricingQueue = new Queue(PRICING_QUEUE, { connection: redis });
    const tempDir = await mkdtemp(join(tmpdir(), "egadisailing-cutover-test-"));
    const manifestPath = join(tempDir, "queue-id-manifest.json");

    try {
      await redis.ping();
      await redis.flushdb();

      await emailQueue.add(
        "email.transactional.send",
        { data: { emailOutboxId: historical.id } },
        { jobId: "archived-email-1" },
      );
      await emailQueue.add(
        "email.transactional.send",
        { data: { emailOutboxId: future.id } },
        { jobId: "fresh-email-1" },
      );
      await pricingQueue.add(
        "bokun.pricing.sync",
        { logicalKey: "historical-pricing" },
        { jobId: "archived-pricing-1" },
      );

      const emailEvidenceIds = ["archived-email-1"];
      const pricingEvidenceIds = ["archived-pricing-1"];
      const manifest = `${JSON.stringify({
        format: "egadisailing-queue-id-manifest-v1",
        queueDigests: {
          [EMAIL_QUEUE]: sha256(JSON.stringify(emailEvidenceIds)),
          [PRICING_QUEUE]: sha256(JSON.stringify(pricingEvidenceIds)),
        },
        queues: {
          [EMAIL_QUEUE]: emailEvidenceIds,
          [PRICING_QUEUE]: pricingEvidenceIds,
        },
        sourceExportSha256: sha256("test-source-export"),
      })}\n`;
      await writeFile(manifestPath, manifest, { mode: 0o600 });

      const result = await runCutover({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: redisUrl,
        HISTORICAL_EMAIL_FORCE_NEW_CUTOVER: "true",
        HISTORICAL_EMAIL_CUTOFF: "2026-07-19T00:00:00.000Z",
        HISTORICAL_QUEUE_EXPECTED_EMAIL: "1",
        HISTORICAL_QUEUE_EXPECTED_PRICING: "1",
        HISTORICAL_QUEUE_EVIDENCE_MANIFEST: manifestPath,
        HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256: sha256(manifest),
      });

      expect(
        result.code,
        result.stderr || result.stdout || result.signal || "cutover exited without details",
      ).toBe(0);

      const tombstoned = await db.emailOutbox.findUniqueOrThrow({
        where: { id: historical.id },
        select: {
          status: true,
          historicalDismissedAt: true,
        },
      });
      expect(tombstoned.status).toBe("DISMISSED");
      expect(tombstoned.historicalDismissedAt).toBeInstanceOf(Date);

      // E' lo stesso predicato usato dall'azione server di replacement: una
      // riga storica tombstonata non puo' piu' entrare in quel percorso.
      const replacementCandidate = await db.emailOutbox.findFirst({
        where: {
          id: historical.id,
          status: "DISMISSED",
          historicalDismissedAt: null,
          resolutionReason: { startsWith: "Automatic rollback safety:" },
        },
        select: { id: true },
      });
      expect(replacementCandidate).toBeNull();

      const futureAfterCutoff = await db.emailOutbox.findUniqueOrThrow({
        where: { id: future.id },
        select: { status: true, historicalDismissedAt: true },
      });
      expect(futureAfterCutoff).toEqual({
        status: "PENDING",
        historicalDismissedAt: null,
      });

      expect(await emailQueue.getJob("archived-email-1")).toBeUndefined();
      expect(await pricingQueue.getJob("archived-pricing-1")).toBeUndefined();
      expect(await emailQueue.getJob("fresh-email-1")).toBeDefined();
      expect(await emailQueue.isPaused()).toBe(false);
      expect(await pricingQueue.isPaused()).toBe(true);
    } finally {
      await redis.flushdb().catch(() => undefined);
      await emailQueue.close().catch(() => undefined);
      await pricingQueue.close().catch(() => undefined);
      if (redis.status === "ready") {
        await redis.quit().catch(() => redis.disconnect());
      } else {
        redis.disconnect();
      }
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
