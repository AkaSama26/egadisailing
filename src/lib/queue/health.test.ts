import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  outboxFindMany: vi.fn(),
  getJobCounts: vi.fn(),
  getJobs: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { emailOutbox: { findMany: mocks.outboxFindMany } },
}));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/queue", () => ({
  JOB_COMPLETED_RETENTION_COUNT: 5_000,
  QUEUE_NAMES: { EMAIL_TRANSACTIONAL: "email.transactional" },
  getActiveQueueNames: () => ["email.transactional"],
  getQueue: () => ({
    getJobCounts: mocks.getJobCounts,
    getJobs: mocks.getJobs,
  }),
}));
import {
  analyzeQueueJobs,
  checkQueueHealth,
  QUEUE_FAILURE_RECENT_MS,
  QUEUE_STALE_MS,
} from "./health";

const NOW = Date.UTC(2026, 6, 19, 12, 0, 0);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getJobCounts.mockResolvedValue({
    waiting: 0,
    paused: 0,
    active: 0,
    delayed: 0,
    prioritized: 0,
    failed: 0,
    completed: 0,
  });
  mocks.getJobs.mockResolvedValue([]);
  mocks.outboxFindMany.mockResolvedValue([]);
});

function job(input: {
  logicalKey?: string;
  ageMs: number;
  delayMs?: number;
  finished?: boolean;
}) {
  return {
    timestamp: NOW - input.ageMs,
    ...(input.delayMs === undefined ? {} : { delay: input.delayMs }),
    ...(input.finished ? { finishedOn: NOW - input.ageMs } : {}),
    data: input.logicalKey ? { logicalKey: input.logicalKey } : {},
  };
}

function pending(
  state: "waiting" | "active" | "delayed" | "prioritized",
  input: Parameters<typeof job>[0],
) {
  return { state, job: job(input) };
}

describe("analyzeQueueJobs", () => {
  it("non degrada per failed storico trattenuto", () => {
    const result = analyzeQueueJobs({
      failed: [job({ logicalKey: "old", ageMs: QUEUE_FAILURE_RECENT_MS + 1 })],
      completed: [],
      pending: [],
      nowMs: NOW,
    });
    expect(result).toEqual({
      failedRecent24h: 0,
      unresolvedRecent: 0,
      stale: 0,
      oldestAgeMs: null,
    });
  });

  it("considera risolto un failure seguito da completed sul logical key", () => {
    const result = analyzeQueueJobs({
      failed: [job({ logicalKey: "cell:1", ageMs: 60_000, finished: true })],
      completed: [job({ logicalKey: "cell:1", ageMs: 30_000, finished: true })],
      pending: [],
      nowMs: NOW,
    });
    expect(result.failedRecent24h).toBe(1);
    expect(result.unresolvedRecent).toBe(0);
  });

  it("mantiene irrisolto un failure recente senza convergenza successiva", () => {
    const result = analyzeQueueJobs({
      failed: [job({ logicalKey: "cell:1", ageMs: 30_000, finished: true })],
      completed: [job({ logicalKey: "cell:1", ageMs: 60_000, finished: true })],
      pending: [],
      nowMs: NOW,
    });
    expect(result.unresolvedRecent).toBe(1);
  });

  it("un outbox terminale risolve l'artefatto BullMQ", () => {
    const result = analyzeQueueJobs({
      failed: [job({ logicalKey: "email-outbox:e1", ageMs: 30_000, finished: true })],
      completed: [],
      pending: [],
      terminalLogicalKeys: new Set(["email-outbox:e1"]),
      nowMs: NOW,
    });
    expect(result.unresolvedRecent).toBe(0);
  });

  it("non duplica un FAILED outbox gia' rappresentato dal job BullMQ", () => {
    const result = analyzeQueueJobs({
      failed: [job({ logicalKey: "email-outbox:e1", ageMs: 30_000, finished: true })],
      completed: [],
      pending: [],
      additionalUnresolvedLogicalKeys: new Set(["email-outbox:e1"]),
      nowMs: NOW,
    });
    expect(result.unresolvedRecent).toBe(1);
  });

  it("segnala waiting/active oltre 15 minuti come stale", () => {
    const result = analyzeQueueJobs({
      failed: [],
      completed: [],
      pending: [
        pending("waiting", { ageMs: QUEUE_STALE_MS + 1 }),
        pending("active", { ageMs: QUEUE_STALE_MS - 1 }),
      ],
      nowMs: NOW,
    });
    expect(result.stale).toBe(1);
    expect(result.oldestAgeMs).toBe(QUEUE_STALE_MS + 1);
  });

  it("segnala anche un job prioritized oltre 15 minuti", () => {
    const result = analyzeQueueJobs({
      failed: [],
      completed: [],
      pending: [pending("prioritized", { ageMs: QUEUE_STALE_MS + 1 })],
      nowMs: NOW,
    });

    expect(result.stale).toBe(1);
    expect(result.oldestAgeMs).toBe(QUEUE_STALE_MS + 1);
  });

  it("non considera stale un delayed non ancora eleggibile ma segnala quello scaduto", () => {
    const result = analyzeQueueJobs({
      failed: [],
      completed: [],
      pending: [
        pending("delayed", {
          ageMs: 60 * 60 * 1000,
          delayMs: 2 * 60 * 60 * 1000,
        }),
        pending("delayed", {
          ageMs: 60 * 60 * 1000,
          delayMs: 30 * 60 * 1000,
        }),
      ],
      nowMs: NOW,
    });

    expect(result.stale).toBe(1);
    expect(result.oldestAgeMs).toBe(30 * 60 * 1000);
  });

  it("degrada per un outbox DB overdue senza job Redis", async () => {
    mocks.outboxFindMany.mockImplementation(async (query) => {
      const status = query?.where?.status;
      return typeof status === "object" && "in" in status
        ? [{ id: "e-orphan", nextAttemptAt: new Date(NOW - QUEUE_STALE_MS - 1) }]
        : [];
    });

    const result = await checkQueueHealth(new Date(NOW));

    expect(result.ok).toBe(false);
    expect(result.stale).toBe(1);
    expect(result.unresolvedRecent).toBe(1);
    expect(result.oldestAgeMs).toBe(QUEUE_STALE_MS + 1);
  });

  it("calcola il backoff retry delayed da processedOn invece dal primo timestamp", () => {
    const result = analyzeQueueJobs({
      failed: [],
      completed: [],
      pending: [
        {
          state: "delayed",
          job: {
            timestamp: NOW - 6 * 60 * 60 * 1000,
            processedOn: NOW - 5 * 60 * 1000,
            delay: 30 * 60 * 1000,
          },
        },
      ],
      nowMs: NOW,
    });

    expect(result.stale).toBe(0);
    expect(result.oldestAgeMs).toBe(0);
  });
});

describe("checkQueueHealth email outbox", () => {
  it("degrada quando esiste un EmailOutbox FAILED recente anche senza job Redis", async () => {
    mocks.outboxFindMany.mockResolvedValueOnce([{ id: "e-failed" }]);

    const result = await checkQueueHealth(new Date(NOW));

    expect(result.ok).toBe(false);
    expect(result.failedOutboxRecent).toBe(1);
    expect(result.unresolvedRecent).toBe(1);
    expect(result.queues).toEqual([
      expect.objectContaining({
        queue: "email.transactional",
        ok: false,
        failedRetained: 0,
        failedOutboxRecent: 1,
        unresolvedRecent: 1,
      }),
    ]);
    expect(mocks.outboxFindMany).toHaveBeenCalledWith({
      where: {
        status: "FAILED",
        updatedAt: { gte: new Date(NOW - QUEUE_FAILURE_RECENT_MS) },
      },
      select: { id: true },
    });
  });

  it("resta healthy quando non ci sono FAILED recenti", async () => {
    const result = await checkQueueHealth(new Date(NOW));

    expect(result.ok).toBe(true);
    expect(result.failedOutboxRecent).toBe(0);
    expect(result.unresolvedRecent).toBe(0);
  });

  it("degrada per un job vecchio nella lista paused anche con waiting zero", async () => {
    mocks.getJobCounts.mockResolvedValueOnce({
      waiting: 0,
      paused: 1,
      active: 0,
      delayed: 0,
      prioritized: 0,
      failed: 0,
      completed: 0,
    });
    mocks.getJobs.mockResolvedValueOnce([
      job({ logicalKey: "email-outbox:paused", ageMs: QUEUE_STALE_MS + 1 }),
    ]);

    const result = await checkQueueHealth(new Date(NOW));

    expect(result).toMatchObject({ ok: false, paused: 1, stale: 1 });
    expect(result.queues[0]).toMatchObject({
      ok: false,
      waiting: 0,
      paused: 1,
      stale: 1,
    });
    expect(mocks.getJobs).toHaveBeenCalledWith(["waiting"], 0, 999, true);
  });
});
