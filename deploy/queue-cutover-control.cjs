"use strict";

const crypto = require("node:crypto");
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const MODE = process.argv[2] || "status";
const EMAIL_QUEUE = "email.transactional";
const PRICING_QUEUE = "sync.pricing.bokun";
const QUEUE_NAMES = [EMAIL_QUEUE, PRICING_QUEUE];
const ACTIVE_OBSERVED_KEY =
  "egadisailing:ops:historical-cutover:active-observed";
const JOB_TYPES = [
  "waiting",
  "paused",
  "delayed",
  "prioritized",
  "waiting-children",
  "completed",
  "failed",
];

const redisUrl = process.env.REDIS_URL;
const databaseUrl = process.env.DATABASE_URL;
const requireManifest = process.env.QUEUE_CUTOVER_REQUIRE_MANIFEST === "true";

const ATOMIC_CONTAIN_LUA = `
local function pauseAndSnapshot(waitKey, pausedKey, metaKey, activeKey, markerKey, eventsKey)
  local integrity = 1
  if redis.call("EXISTS", waitKey) == 1 then
    if redis.call("EXISTS", pausedKey) == 1 then
      -- Both lists existing is not a normal BullMQ state. The meta flag still
      -- blocks new claims, but do not overwrite either list.
      integrity = 0
    else
      redis.call("RENAME", waitKey, pausedKey)
    end
  end
  local changed = redis.call("HSET", metaKey, "paused", 1)
  redis.call("DEL", markerKey)
  if changed == 1 then
    redis.call("XADD", eventsKey, "*", "event", "paused")
  end
  return { integrity, redis.call("LLEN", activeKey) }
end

local email = pauseAndSnapshot(KEYS[1], KEYS[2], KEYS[3], KEYS[4], KEYS[5], KEYS[6])
local pricing = pauseAndSnapshot(KEYS[7], KEYS[8], KEYS[9], KEYS[10], KEYS[11], KEYS[12])
if email[2] + pricing[2] > 0 then
  redis.call(
    "HSET",
    KEYS[13],
    "activeObserved", "1",
    "emailActive", tostring(email[2]),
    "pricingActive", tostring(pricing[2]),
    "observedAt", ARGV[1]
  )
end
local stickyActive = redis.call("HGET", KEYS[13], "activeObserved")
return {
  email[1] * pricing[1],
  email[2],
  pricing[2],
  stickyActive == "1" and 1 or 0
}
`;

function writeJson(value, stream = process.stdout) {
  stream.write(`${JSON.stringify(value)}\n`);
}

function fail(message, code = 1, details = undefined) {
  writeJson(
    {
      ok: false,
      mode: MODE,
      error: message,
      ...(details ? { details } : {}),
    },
    process.stderr,
  );
  process.exitCode = code;
}

function sha256Ids(ids) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify([...ids].sort()))
    .digest("hex");
}

async function redisConfigValue(redis, name) {
  const result = await redis.config("GET", name);
  if (!Array.isArray(result)) return undefined;
  for (let index = 0; index + 1 < result.length; index += 2) {
    if (String(result[index]).toLowerCase() === name.toLowerCase()) {
      return String(result[index + 1]).toLowerCase();
    }
  }
  return undefined;
}

function redisInfoValue(info, name) {
  for (const line of String(info).split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0 && line.slice(0, separator) === name) {
      return line.slice(separator + 1).trim().toLowerCase();
    }
  }
  return undefined;
}

async function attestSynchronousAof(redis) {
  const [appendFsync, noAppendFsyncOnRewrite, persistenceInfo] =
    await Promise.all([
      redisConfigValue(redis, "appendfsync"),
      redisConfigValue(redis, "no-appendfsync-on-rewrite"),
      redis.info("persistence"),
    ]);
  if (appendFsync !== "always" || noAppendFsyncOnRewrite !== "no") {
    throw new Error("Redis synchronous AOF policy could not be attested");
  }
  if (
    redisInfoValue(persistenceInfo, "aof_enabled") !== "1" ||
    redisInfoValue(persistenceInfo, "aof_last_write_status") !== "ok"
  ) {
    throw new Error("Redis AOF persistence health could not be attested");
  }
}

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("exact-ID queue manifest is required on stdin");
  return JSON.parse(raw);
}

async function containLegacyQueues() {
  if (!redisUrl) throw new Error("REDIS_URL is required");

  const redisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  };
  const emailRedis = new IORedis(redisUrl, redisOptions);
  const pricingRedis = new IORedis(redisUrl, redisOptions);
  emailRedis.on("error", () => undefined);
  pricingRedis.on("error", () => undefined);
  const emailQueue = new Queue(EMAIL_QUEUE, { connection: emailRedis });
  const pricingQueue = new Queue(PRICING_QUEUE, { connection: pricingRedis });
  let originalAppendFsync;
  let originalNoAppendFsyncOnRewrite;
  let aofBoundaryArmed = false;

  try {
    await Promise.all([
      emailQueue.waitUntilReady(),
      pricingQueue.waitUntilReady(),
    ]);
    await Promise.all([emailRedis.ping(), pricingRedis.ping()]);

    const appendOnly = await redisConfigValue(emailRedis, "appendonly");
    originalAppendFsync = await redisConfigValue(emailRedis, "appendfsync");
    originalNoAppendFsyncOnRewrite = await redisConfigValue(
      emailRedis,
      "no-appendfsync-on-rewrite",
    );
    if (appendOnly !== "yes") {
      throw new Error("Redis appendonly=yes is required for containment");
    }
    if (!new Set(["always", "everysec", "no"]).has(originalAppendFsync)) {
      throw new Error("Redis appendfsync could not be attested");
    }
    if (!new Set(["yes", "no"]).has(originalNoAppendFsyncOnRewrite)) {
      throw new Error(
        "Redis no-appendfsync-on-rewrite could not be attested",
      );
    }
    await emailRedis.config("SET", "no-appendfsync-on-rewrite", "no");
    await emailRedis.config("SET", "appendfsync", "always");
    await attestSynchronousAof(emailRedis);
    aofBoundaryArmed = true;

    // Pause both queues and snapshot both active lists in one Redis Lua
    // execution. No worker completion/move-to-finished command can interleave
    // between the pause boundary and the sticky active observation.
    const keys = [emailQueue, pricingQueue].flatMap((queue) =>
      ["wait", "paused", "meta", "active", "marker", "events"].map((key) =>
        queue.toKey(key),
      ),
    );
    keys.push(ACTIVE_OBSERVED_KEY);
    const atomicResult = await emailRedis.eval(
      ATOMIC_CONTAIN_LUA,
      keys.length,
      ...keys,
      new Date().toISOString(),
    );
    await attestSynchronousAof(emailRedis);
    if (!Array.isArray(atomicResult) || atomicResult.length !== 4) {
      throw new Error("atomic containment returned an invalid result");
    }
    const integrity = Number(atomicResult[0]) === 1;
    const emailActive = Number(atomicResult[1]);
    const pricingActive = Number(atomicResult[2]);
    const activeObserved = Number(atomicResult[3]) === 1;
    if (
      !Number.isSafeInteger(emailActive) || emailActive < 0 ||
      !Number.isSafeInteger(pricingActive) || pricingActive < 0
    ) {
      throw new Error("atomic containment returned invalid active counts");
    }
    const [emailPaused, pricingPaused] = await Promise.all([
      emailQueue.isPaused(),
      pricingQueue.isPaused(),
    ]);
    const allPaused = emailPaused && pricingPaused;
    const activeTotal = emailActive + pricingActive;
    if (!allPaused || !integrity) {
      const result = {
        ok: false,
        mode: MODE,
        error: !integrity
          ? "legacy queue list integrity is ambiguous"
          : "both legacy queues must be globally paused",
        activeObserved,
        currentActiveTotal: activeTotal,
        aofBoundary: "appendfsync-always",
        noAppendFsyncOnRewrite: "no",
        aofLastWriteStatus: "ok",
        queuesRemainPaused: allPaused,
        queues: {
          [EMAIL_QUEUE]: { paused: emailPaused, active: emailActive },
          [PRICING_QUEUE]: { paused: pricingPaused, active: pricingActive },
        },
      };
      writeJson(result);
      writeJson(result, process.stderr);
      process.exitCode = activeObserved ? 4 : 2;
      return;
    }
    if (activeObserved) {
      const result = {
        ok: false,
        mode: MODE,
        error: "active provider work observed at the containment boundary",
        activeObserved: true,
        currentActiveTotal: activeTotal,
        aofBoundary: "appendfsync-always",
        noAppendFsyncOnRewrite: "no",
        aofLastWriteStatus: "ok",
        queuesRemainPaused: true,
        queues: {
          [EMAIL_QUEUE]: { paused: true, active: emailActive },
          [PRICING_QUEUE]: { paused: true, active: pricingActive },
        },
      };
      // stdout is redirected to a durable host-side attestation file by the
      // release orchestrator. This preserves the sticky active observation
      // even if the host process dies before it can update its main journal.
      writeJson(result);
      writeJson(result, process.stderr);
      process.exitCode = 4;
      return;
    }

    writeJson({
      ok: true,
      mode: MODE,
      allPaused: true,
      activeTotal: 0,
      activeObserved: false,
      aofBoundary: "appendfsync-always",
      noAppendFsyncOnRewrite: "no",
      aofLastWriteStatus: "ok",
    });
  } finally {
    if (
      aofBoundaryArmed &&
      originalAppendFsync &&
      originalAppendFsync !== "always" &&
      emailRedis.status === "ready"
    ) {
      try {
        await emailRedis.config("SET", "appendfsync", originalAppendFsync);
      } catch (error) {
        writeJson(
          {
            ok: false,
            mode: MODE,
            warning: "Redis appendfsync remains on the safer always setting",
            error: error instanceof Error ? error.message : String(error),
          },
          process.stderr,
        );
      }
    }
    if (
      aofBoundaryArmed &&
      originalNoAppendFsyncOnRewrite &&
      originalNoAppendFsyncOnRewrite !== "no" &&
      emailRedis.status === "ready"
    ) {
      try {
        await emailRedis.config(
          "SET",
          "no-appendfsync-on-rewrite",
          originalNoAppendFsyncOnRewrite,
        );
      } catch (error) {
        writeJson(
          {
            ok: false,
            mode: MODE,
            warning:
              "Redis no-appendfsync-on-rewrite remains on the safer no setting",
            error: error instanceof Error ? error.message : String(error),
          },
          process.stderr,
        );
      }
    }
    await emailQueue.close().catch(() => undefined);
    await pricingQueue.close().catch(() => undefined);
    if (emailRedis.status === "ready") {
      await emailRedis.quit().catch(() => emailRedis.disconnect());
    } else {
      emailRedis.disconnect();
    }
    if (pricingRedis.status === "ready") {
      await pricingRedis.quit().catch(() => pricingRedis.disconnect());
    } else {
      pricingRedis.disconnect();
    }
  }
}

async function acknowledgeActiveObservation() {
  if (!redisUrl) throw new Error("REDIS_URL is required");
  if (process.env.QUEUE_CUTOVER_ACK_ACTIVE !== "true") {
    throw new Error("QUEUE_CUTOVER_ACK_ACTIVE=true is required");
  }
  const redis = new IORedis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  });
  redis.on("error", () => undefined);
  try {
    await redis.connect();
    const removed = await redis.del(ACTIVE_OBSERVED_KEY);
    writeJson({
      ok: true,
      mode: MODE,
      activeObservationAcknowledged: true,
      markerRemoved: removed === 1,
    });
  } finally {
    if (redis.status === "ready") {
      await redis.quit().catch(() => redis.disconnect());
    } else {
      redis.disconnect();
    }
  }
}

function manifestIds(manifest, queueName) {
  if (manifest?.format !== "egadisailing-queue-id-manifest-v1") {
    throw new Error(
      "manifest format must be egadisailing-queue-id-manifest-v1",
    );
  }
  const entries = manifest?.queues?.[queueName];
  if (!Array.isArray(entries)) {
    throw new Error(`manifest queue ${queueName} must be an array`);
  }
  const ids = entries.map((entry, index) => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new Error(
        `manifest queue ${queueName} entry ${index} must be a non-empty job-id string`,
      );
    }
    return entry;
  });
  const canonical = [...ids].sort();
  if (ids.some((id, index) => id !== canonical[index])) {
    throw new Error(`manifest queue ${queueName} must be sorted by job id`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`manifest queue ${queueName} contains duplicate job ids`);
  }
  return ids;
}

async function queueSnapshot(queue) {
  const [paused, active, jobs, schedulers, repeatables] = await Promise.all([
    queue.isPaused(),
    queue.getActiveCount(),
    queue.getJobs(JOB_TYPES, 0, -1, true),
    queue.getJobSchedulersCount(),
    queue.getRepeatableJobs(0, -1, true),
  ]);
  const ids = jobs.map((job) => String(job.id));
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${queue.name} returned duplicate job ids across states`);
  }
  return {
    paused,
    active,
    jobs: ids.length,
    schedulers,
    repeatables: repeatables.length,
    ids,
    idSha256: sha256Ids(ids),
  };
}

async function canonicalDatabaseCutoff(client) {
  const result = await client.query(
    `SELECT clock_timestamp() AS "cutoff"`,
  );
  const cutoff = result.rows[0]?.cutoff;
  if (!(cutoff instanceof Date) || !Number.isFinite(cutoff.getTime())) {
    throw new Error("PostgreSQL did not return a canonical cutoff timestamp");
  }
  return cutoff.toISOString();
}

async function main() {
  if (MODE === "contain") {
    await containLegacyQueues();
    return;
  }
  if (MODE === "acknowledge-active") {
    await acknowledgeActiveObservation();
    return;
  }
  if (!redisUrl) throw new Error("REDIS_URL is required");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!new Set(["freeze", "assert-frozen", "status"]).has(MODE)) {
    throw new Error(
      "usage: node queue-cutover-control.cjs <contain|freeze|assert-frozen|status|acknowledge-active>",
    );
  }
  if (
    process.env.QUEUE_CUTOVER_REQUIRE_MANIFEST !== undefined &&
    !new Set(["true", "false"]).has(
      process.env.QUEUE_CUTOVER_REQUIRE_MANIFEST,
    )
  ) {
    throw new Error("QUEUE_CUTOVER_REQUIRE_MANIFEST must be exactly true or false");
  }

  const redisOptions = {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  };
  const emailRedis = new IORedis(redisUrl, redisOptions);
  const pricingRedis = new IORedis(redisUrl, redisOptions);
  emailRedis.on("error", () => undefined);
  pricingRedis.on("error", () => undefined);
  const emailQueue = new Queue(EMAIL_QUEUE, { connection: emailRedis });
  const pricingQueue = new Queue(PRICING_QUEUE, { connection: pricingRedis });
  const queues = new Map([
    [EMAIL_QUEUE, emailQueue],
    [PRICING_QUEUE, pricingQueue],
  ]);
  const { Client } = require("pg");
  const client = new Client({ connectionString: databaseUrl });

  try {
    await Promise.all([
      emailQueue.waitUntilReady(),
      pricingQueue.waitUntilReady(),
      client.connect(),
    ]);
    await Promise.all([emailRedis.ping(), pricingRedis.ping()]);

    if (MODE === "freeze") {
      // Global pause is durable Redis state. Do not wait for active jobs: an
      // historical provider call must not be allowed extra time to complete.
      await Promise.all([emailQueue.pause(), pricingQueue.pause()]);
    }

    const snapshots = Object.fromEntries(
      await Promise.all(
        QUEUE_NAMES.map(async (name) => [name, await queueSnapshot(queues.get(name))]),
      ),
    );
    const allPaused = QUEUE_NAMES.every((name) => snapshots[name].paused);
    const activeTotal = QUEUE_NAMES.reduce(
      (sum, name) => sum + snapshots[name].active,
      0,
    );

    if (
      (MODE === "freeze" || MODE === "assert-frozen") &&
      !allPaused
    ) {
      fail("both queues must be globally paused", 2, {
        queues: Object.fromEntries(
          QUEUE_NAMES.map((name) => [name, { paused: snapshots[name].paused }]),
        ),
      });
      return;
    }
    if (
      (MODE === "freeze" || MODE === "assert-frozen") &&
      activeTotal !== 0
    ) {
      // Exit 4 means the global pause succeeded but active work existed at the
      // instant of attestation. The caller must stop the producer/worker and
      // call assert-frozen again; it must never resume either queue here.
      fail("active jobs exist after the global pause", 4, {
        queues: Object.fromEntries(
          QUEUE_NAMES.map((name) => [name, { active: snapshots[name].active }]),
        ),
        queuesRemainPaused: allPaused,
      });
      return;
    }

    let manifest = null;
    if (requireManifest) {
      const parsed = await readStdinJson();
      manifest = {};
      for (const name of QUEUE_NAMES) {
        if (
          snapshots[name].schedulers !== 0 ||
          snapshots[name].repeatables !== 0
        ) {
          fail(
            "live queue has unarchived schedulers or repeatables",
            5,
            {
              queue: name,
              schedulers: snapshots[name].schedulers,
              repeatables: snapshots[name].repeatables,
              queuesRemainPaused: allPaused,
            },
          );
          return;
        }
        const expectedIds = manifestIds(parsed, name);
        const actualIds = snapshots[name].ids;
        const expectedDigest = sha256Ids(expectedIds);
        const actualDigest = snapshots[name].idSha256;
        if (
          expectedIds.length !== actualIds.length ||
          expectedDigest !== actualDigest
        ) {
          fail("live queue IDs do not match the encrypted evidence manifest", 5, {
            queue: name,
            expected: expectedIds.length,
            actual: actualIds.length,
            expectedIdSha256: expectedDigest,
            actualIdSha256: actualDigest,
            queuesRemainPaused: allPaused,
          });
          return;
        }
        manifest[name] = {
          verified: true,
          count: expectedIds.length,
          idSha256: expectedDigest,
        };
      }
    }

    // Capture this only after queue pause, active=0 and optional exact-ID
    // verification. A second invocation after the app stop supplies the
    // authoritative pre-cutover boundary without a producer race.
    const cutoff = await canonicalDatabaseCutoff(client);
    writeJson({
      ok: true,
      mode: MODE,
      cutoff,
      allPaused,
      activeTotal,
      manifestRequired: requireManifest,
      manifest,
      queues: Object.fromEntries(
        QUEUE_NAMES.map((name) => [
          name,
          {
            paused: snapshots[name].paused,
            active: snapshots[name].active,
            jobs: snapshots[name].jobs,
            schedulers: snapshots[name].schedulers,
            repeatables: snapshots[name].repeatables,
            idSha256: snapshots[name].idSha256,
          },
        ]),
      ),
    });
  } finally {
    await client.end().catch(() => undefined);
    await emailQueue.close().catch(() => undefined);
    await pricingQueue.close().catch(() => undefined);
    if (emailRedis.status === "ready") {
      await emailRedis.quit().catch(() => emailRedis.disconnect());
    } else {
      emailRedis.disconnect();
    }
    if (pricingRedis.status === "ready") {
      await pricingRedis.quit().catch(() => pricingRedis.disconnect());
    } else {
      pricingRedis.disconnect();
    }
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
