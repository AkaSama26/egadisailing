import IORedis from "ioredis";

const redisUrl = process.env.TEST_REDIS_URL ?? process.env.REDIS_URL;

if (process.env.NODE_ENV !== "test") {
  throw new Error("Refusing to configure Redis outside NODE_ENV=test");
}
if (!redisUrl) {
  throw new Error("REDIS_URL is required");
}

const redis = new IORedis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  connectTimeout: 5_000,
  retryStrategy: () => null,
});
redis.on("error", () => undefined);

function configValue(result, name) {
  if (!Array.isArray(result)) return undefined;
  for (let index = 0; index + 1 < result.length; index += 2) {
    if (String(result[index]).toLowerCase() === name.toLowerCase()) {
      return String(result[index + 1]).toLowerCase();
    }
  }
  return undefined;
}

function infoValue(info, name) {
  for (const line of String(info).split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0 && line.slice(0, separator) === name) {
      return line.slice(separator + 1).trim().toLowerCase();
    }
  }
  return undefined;
}

async function attestDurability() {
  const [appendOnly, appendFsync, noAppendFsyncOnRewrite, maxmemoryPolicy, info] =
    await Promise.all([
      redis.config("GET", "appendonly"),
      redis.config("GET", "appendfsync"),
      redis.config("GET", "no-appendfsync-on-rewrite"),
      redis.config("GET", "maxmemory-policy"),
      redis.info("persistence"),
    ]);

  return (
    configValue(appendOnly, "appendonly") === "yes" &&
    configValue(appendFsync, "appendfsync") === "always" &&
    configValue(noAppendFsyncOnRewrite, "no-appendfsync-on-rewrite") ===
      "no" &&
    configValue(maxmemoryPolicy, "maxmemory-policy") === "noeviction" &&
    infoValue(info, "aof_enabled") === "1" &&
    infoValue(info, "aof_last_write_status") === "ok"
  );
}

async function waitForDurability() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await attestDurability()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Redis durability could not be attested within 15 seconds");
}

try {
  await redis.connect();
  await redis.config("SET", "no-appendfsync-on-rewrite", "no");
  await redis.config("SET", "appendfsync", "always");
  await redis.config("SET", "maxmemory-policy", "noeviction");
  await redis.config("SET", "appendonly", "yes");
  await waitForDurability();
  process.stdout.write("Redis test durability attested\n");
} finally {
  if (redis.status === "ready") {
    await redis.quit().catch(() => redis.disconnect());
  } else {
    redis.disconnect();
  }
}
