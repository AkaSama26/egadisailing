import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!redisUrl) throw new Error("REDIS_URL is required");

const reason =
  "Automatic rollback safety: delivery outcome is ambiguous; verify Brevo before creating any replacement message";
const client = new Client({ connectionString: databaseUrl });
const redis = new IORedis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  connectTimeout: 5_000,
  retryStrategy: () => null,
});
// L'errore viene gestito dal connect/ping awaitato; il listener evita che
// ioredis lo stampi anche come evento globale non gestito.
redis.on("error", () => undefined);
let pricingQueue;
let transactionStarted = false;
let barrierError;

try {
  // Il container legacy ignora BOKUN_PRICING_SYNC_ENABLED. La pausa Queue e'
  // persistente in Redis e deve riuscire prima di qualunque rollback: cosi' il
  // vecchio worker non puo' consumare job pricing sull'endpoint non approvato.
  await redis.connect();
  await redis.ping();
  pricingQueue = new Queue("sync.pricing.bokun", { connection: redis });
  await pricingQueue.pause();
  if (!(await pricingQueue.isPaused())) {
    throw new Error("Bokun pricing queue did not enter the paused state");
  }

  await client.connect();
  await client.query("BEGIN");
  transactionStarted = true;
  // Serialize this transition against another deploy/rollback invocation even
  // if an operator bypassed the filesystem deployment lock.
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17017, 1]);
  const dismissed = await client.query(
    `UPDATE "EmailOutbox"
       SET "status" = 'DISMISSED',
           "resolvedAt" = NOW(),
           "resolvedByUserId" = NULL,
           "resolutionReason" = $1,
           "lastError" = $1,
           "nextAttemptAt" = NOW(),
           "updatedAt" = NOW()
     WHERE "status" IN ('PENDING', 'SENDING', 'FAILED')
       AND (
         "status" IN ('SENDING', 'FAILED')
         OR "attempts" > 0
         OR "deliveryStartedAt" IS NOT NULL
       )
     RETURNING "id"`,
    [reason],
  );

  for (const row of dismissed.rows) {
    await client.query(
      `INSERT INTO "AuditLog"
         ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
       VALUES ($1, NULL, 'EMAIL_OUTBOX_ROLLBACK_DISMISS', 'EmailOutbox', $2,
               $3::jsonb, $4::jsonb, NOW())`,
      [
        randomUUID(),
        row.id,
        JSON.stringify({ deliveryOutcome: "ambiguous" }),
        JSON.stringify({ status: "DISMISSED", automated: true, reason }),
      ],
    );
  }
  await client.query("COMMIT");
  transactionStarted = false;
  process.stdout.write(
    `${JSON.stringify({
      bokunPricingQueuePaused: true,
      dismissedAmbiguousEmailOutbox: dismissed.rowCount ?? 0,
    })}\n`,
  );
} catch (error) {
  if (transactionStarted) {
    await client.query("ROLLBACK").catch(() => undefined);
  }
  barrierError = error;
} finally {
  await client.end().catch(() => undefined);
  await pricingQueue?.close().catch(() => undefined);
  if (redis.status === "ready") {
    await redis.quit().catch(() => redis.disconnect());
  } else {
    redis.disconnect();
  }
}

if (barrierError) {
  const message =
    barrierError instanceof Error ? barrierError.message : String(barrierError);
  process.stderr.write(`rollback safety barrier failed: ${message}\n`);
  process.exitCode = 1;
}
