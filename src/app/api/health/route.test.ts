import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
  channelFindMany: vi.fn().mockResolvedValue([]),
  redisPing: vi.fn().mockResolvedValue("PONG"),
  checkQueueHealth: vi.fn().mockResolvedValue({
    ok: false,
    waiting: 0,
    paused: 0,
    active: 0,
    delayed: 0,
    prioritized: 0,
    failedRetained: 0,
    failedRecent24h: 0,
    unresolvedRecent: 1,
    failedOutboxRecent: 1,
    stale: 0,
    oldestAgeMs: null,
    queues: [
      {
        queue: "email.transactional",
        ok: false,
        waiting: 0,
        paused: 0,
        active: 0,
        delayed: 0,
        prioritized: 0,
        failedRetained: 0,
        failedRecent24h: 0,
        unresolvedRecent: 1,
        failedOutboxRecent: 1,
        stale: 0,
        oldestAgeMs: null,
      },
    ],
  }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mocks.queryRaw,
    channelSyncStatus: { findMany: mocks.channelFindMany },
  },
}));
vi.mock("@/lib/env", () => ({
  env: {
    OPS_HEALTH_SECRET: "ops-health-secret-at-least-32-characters",
    GIT_SHA: "a".repeat(40),
  },
}));
vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => ({ ping: mocks.redisPing }),
}));
vi.mock("@/lib/queue/health", () => ({
  checkQueueHealth: mocks.checkQueueHealth,
  isChannelHealthEnabled: () => true,
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    child: () => ({ error: vi.fn() }),
  },
}));

import { HEALTH_DEPENDENCY_TIMEOUT_MS } from "./health-config";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryRaw.mockResolvedValue([{ ok: 1 }]);
  mocks.channelFindMany.mockResolvedValue([]);
  mocks.redisPing.mockResolvedValue("PONG");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/health deep", () => {
  it("ritorna 503 quando un EmailOutbox FAILED recente e' irrisolto", async () => {
    const response = await GET(
      new Request("https://egadisailing.com/api/health?deep=1", {
        headers: {
          authorization: "Bearer ops-health-secret-at-least-32-characters",
        },
      }),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      status: "degraded",
      release: "a".repeat(40),
      checks: {
        queue: {
          ok: false,
          unresolvedRecent: 1,
          failedOutboxRecent: 1,
        },
      },
    });
  });

  it("ritorna 503 entro il timeout quando Redis non risponde", async () => {
    vi.useFakeTimers();
    mocks.redisPing.mockReturnValueOnce(new Promise(() => undefined));

    const responsePromise = GET(
      new Request("https://egadisailing.com/api/health?deep=1", {
        headers: {
          authorization: "Bearer ops-health-secret-at-least-32-characters",
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(HEALTH_DEPENDENCY_TIMEOUT_MS + 1);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.checks.redis).toMatchObject({ ok: false });
    expect(body.checks.redis.error).toContain("timed out");
    expect(mocks.checkQueueHealth).not.toHaveBeenCalled();
  });
});
