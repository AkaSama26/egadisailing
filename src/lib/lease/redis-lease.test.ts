import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
  eval: vi.fn().mockResolvedValue(1),
  warn: vi.fn(),
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => ({ set: mocks.set, eval: mocks.eval }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: mocks.warn },
}));

import { renewLease, tryAcquireLease } from "./redis-lease";

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("tryAcquireLease timeout compensation", () => {
  it("accoda una release token-checked dopo un timeout fail-closed", async () => {
    vi.useFakeTimers();
    mocks.set.mockReturnValueOnce(new Promise(() => undefined));

    const acquire = tryAcquireLease("queue:test:key", 600, { failOpen: false });
    await vi.advanceTimersByTimeAsync(2_001);

    await expect(acquire).resolves.toBeNull();
    expect(mocks.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("GET", KEYS[1])'),
      1,
      "lease:queue:test:key",
      expect.any(String),
    );
  });

  it("compensa anche un errore ambiguo del SET fail-closed", async () => {
    mocks.set.mockRejectedValueOnce(new Error("connection reset after write"));

    await expect(
      tryAcquireLease("queue:test:key", 600, { failOpen: false }),
    ).resolves.toBeNull();

    expect(mocks.eval).toHaveBeenCalledOnce();
  });
});

describe("renewLease", () => {
  it("estende il TTL soltanto col token proprietario", async () => {
    mocks.eval.mockResolvedValueOnce(1);

    await expect(
      renewLease({ name: "queue:test:key", token: "owner" }, 600),
    ).resolves.toBe(true);

    expect(mocks.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("EXPIRE", KEYS[1], ARGV[2])'),
      1,
      "lease:queue:test:key",
      "owner",
      600,
    );
  });

  it("fallisce chiuso se il token non e' piu' proprietario", async () => {
    mocks.eval.mockResolvedValueOnce(0);

    await expect(
      renewLease({ name: "queue:test:key", token: "old-owner" }, 600),
    ).resolves.toBe(false);
  });
});
