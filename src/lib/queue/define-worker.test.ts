import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processor: vi.fn(),
  registerWorker: vi.fn(),
  tryAcquireLease: vi.fn(),
  renewLease: vi.fn(),
  releaseLease: vi.fn(),
}));

vi.mock("@/lib/queue", () => ({
  createWorker: vi.fn(
    (
      _queue: string,
      processor: (job: unknown) => Promise<void>,
    ) => {
      mocks.processor.mockImplementation(processor);
      return { name: _queue };
    },
  ),
  registerWorker: mocks.registerWorker,
}));
vi.mock("@/lib/lease/redis-lease", () => ({
  tryAcquireLease: mocks.tryAcquireLease,
  renewLease: mocks.renewLease,
  releaseLease: mocks.releaseLease,
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({ warn: vi.fn() }),
  },
}));

import { defineWorker } from "./define-worker";

interface TestData {
  value: number;
}

interface TestJob {
  type: "test.run";
  data: TestData;
}

function queuedJob(logicalKey?: string) {
  return {
    id: "exec-1",
    name: "test.run",
    data: {
      type: "test.run",
      ...(logicalKey ? { logicalKey } : {}),
      data: { value: 42 },
    },
  };
}

describe("defineWorker logical-key lease", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tryAcquireLease.mockResolvedValue({ name: "lease", token: "owner" });
    mocks.renewLease.mockResolvedValue(true);
    mocks.releaseLease.mockResolvedValue(undefined);
  });

  it("acquisisce e rilascia un lease fail-closed prima dell'handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      serializeByLogicalKey: { ttlSeconds: 90 },
      handler,
    });

    await mocks.processor(queuedJob("entity:42"));

    expect(mocks.tryAcquireLease).toHaveBeenCalledWith(
      "queue:test.queue:entity:42",
      90,
      { failOpen: false },
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mocks.releaseLease).toHaveBeenCalledOnce();
  });

  it("non esegue l'handler se il logical key e' gia' in uso", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    mocks.tryAcquireLease.mockResolvedValueOnce(null);
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      serializeByLogicalKey: {},
      handler,
    });

    await expect(mocks.processor(queuedJob("entity:42"))).rejects.toMatchObject({
      code: "LOGICAL_JOB_LEASE_BUSY",
    });
    expect(handler).not.toHaveBeenCalled();
    expect(mocks.releaseLease).not.toHaveBeenCalled();
  });

  it("rinnova il lease durante un handler lungo", async () => {
    vi.useFakeTimers();
    let finishHandler!: () => void;
    const handler = vi.fn(
      () => new Promise<void>((resolve) => {
        finishHandler = resolve;
      }),
    );
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      serializeByLogicalKey: { ttlSeconds: 9 },
      handler,
    });

    const processing = mocks.processor(queuedJob("entity:42"));
    await vi.advanceTimersByTimeAsync(3_001);
    expect(mocks.renewLease).toHaveBeenCalledWith(
      { name: "lease", token: "owner" },
      9,
    );

    finishHandler();
    await processing;
    expect(mocks.releaseLease).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("marca fallito il job se perde ownership durante l'esecuzione", async () => {
    vi.useFakeTimers();
    mocks.renewLease.mockResolvedValueOnce(false);
    let finishHandler!: () => void;
    const handler = vi.fn(
      () => new Promise<void>((resolve) => {
        finishHandler = resolve;
      }),
    );
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      serializeByLogicalKey: { ttlSeconds: 9 },
      handler,
    });

    const processing = mocks.processor(queuedJob("entity:42"));
    await vi.advanceTimersByTimeAsync(3_001);
    finishHandler();

    await expect(processing).rejects.toMatchObject({
      code: "LOGICAL_JOB_LEASE_LOST",
    });
    expect(mocks.releaseLease).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("rifiuta i job legacy senza logicalKey", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      serializeByLogicalKey: {},
      handler,
    });

    await expect(mocks.processor(queuedJob())).rejects.toMatchObject({
      code: "LOGICAL_JOB_KEY_MISSING",
    });
    expect(mocks.tryAcquireLease).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("deriva il logical key da un job availability del producer legacy", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    defineWorker<
      {
        type: "availability.update";
        data: { boatId: string; date: string; targetChannel: string };
      },
      { boatId: string; date: string; targetChannel: string }
    >({
      queue: "sync.avail.bokun",
      jobName: "availability.update",
      serializeByLogicalKey: {},
      handler,
    });

    const legacyJob = {
      id: "availability-boat-1-2026-08-01-BOKUN",
      name: "availability.update",
      data: {
        type: "availability.update",
        data: { boatId: "boat-1", date: "2026-08-01", targetChannel: "BOKUN" },
      },
    };
    await mocks.processor(legacyJob);

    expect(mocks.tryAcquireLease).toHaveBeenCalledWith(
      "queue:sync.avail.bokun:availability:boat-1:2026-08-01:BOKUN",
      600,
      { failOpen: false },
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mocks.releaseLease).toHaveBeenCalledOnce();
  });

  it("fallisce visibilmente se la configurazione del canale manca", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    defineWorker<TestJob, TestData>({
      queue: "test.queue",
      jobName: "test.run",
      configCheck: () => false,
      handler,
    });

    await expect(mocks.processor(queuedJob("entity:42"))).rejects.toMatchObject({
      code: "CHANNEL_NOT_CONFIGURED",
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
