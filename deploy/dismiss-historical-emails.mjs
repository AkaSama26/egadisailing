import { createHash, randomUUID } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import pg from "pg";

const { Client } = pg;

const MODE = process.argv[2];
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

const EMAIL_QUEUE = "email.transactional";
const PRICING_QUEUE = "sync.pricing.bokun";
const REASON =
  "Historical cutover: archived; owner decision: never send";
const CUTOVER_ENTITY = "DeploymentCutover";
const CUTOVER_ENTITY_ID = "historical-email-v1";
const DB_MARKER_ID = "ops:historical-email-cutover:v1:db";
const PURGE_AUDIT_ID = "ops:historical-email-cutover:v1:queue-purge";
const COMPLETE_MARKER_ID = "ops:historical-email-cutover:v1:complete";
const MARKER_IDS = [DB_MARKER_ID, PURGE_AUDIT_ID, COMPLETE_MARKER_ID];
function output(value) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function idsDigest(ids) {
  return createHash("sha256").update(JSON.stringify(ids)).digest("hex");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function expectedQueueCount(name) {
  const value = process.env[name];
  if (!value || !/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer greater than or equal to zero`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${name} exceeds the safe integer range`);
  }
  return parsed;
}

function loadEvidenceManifest() {
  const path = process.env.HISTORICAL_QUEUE_EVIDENCE_MANIFEST;
  if (!path) {
    throw new Error("HISTORICAL_QUEUE_EVIDENCE_MANIFEST is required for apply mode");
  }
  const expectedManifestSha256 =
    process.env.HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256;
  if (!/^[0-9a-f]{64}$/.test(expectedManifestSha256 ?? "")) {
    throw new Error(
      "HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256 must be a lowercase SHA-256 digest",
    );
  }
  const file = lstatSync(path);
  if (!file.isFile() || file.isSymbolicLink()) {
    throw new Error("historical queue evidence manifest must be a regular file");
  }
  const raw = readFileSync(path, "utf8");
  const actualManifestSha256 = sha256(raw);
  if (actualManifestSha256 !== expectedManifestSha256) {
    throw new Error("historical queue evidence manifest checksum mismatch");
  }
  const manifest = JSON.parse(raw);
  if (
    manifest?.format !== "egadisailing-queue-id-manifest-v1" ||
    manifest.queues === null ||
    typeof manifest.queues !== "object" ||
    Array.isArray(manifest.queues) ||
    manifest.queueDigests === null ||
    typeof manifest.queueDigests !== "object" ||
    Array.isArray(manifest.queueDigests) ||
    !/^[0-9a-f]{64}$/.test(manifest.sourceExportSha256 ?? "")
  ) {
    throw new Error("invalid historical queue evidence manifest");
  }
  const canonical = `${JSON.stringify(canonicalize(manifest))}\n`;
  if (raw !== canonical) {
    throw new Error("historical queue evidence manifest is not canonical JSON");
  }

  const result = {};
  for (const queueName of [EMAIL_QUEUE, PRICING_QUEUE]) {
    const ids = manifest.queues[queueName];
    const declaredDigest = manifest.queueDigests[queueName];
    if (
      !Array.isArray(ids) ||
      ids.some(
        (id) =>
          typeof id !== "string" ||
          !/^[\x21-\x7e]{1,512}$/.test(id),
      ) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error(`invalid or duplicate job IDs for ${queueName}`);
    }
    const sorted = [...ids].sort();
    if (sorted.some((id, index) => id !== ids[index])) {
      throw new Error(`${queueName} evidence IDs are not canonically sorted`);
    }
    const digest = idsDigest(sorted);
    if (!/^[0-9a-f]{64}$/.test(declaredDigest ?? "") || digest !== declaredDigest) {
      throw new Error(`${queueName} evidence identity digest mismatch`);
    }
    result[queueName] = { ids: sorted, digest };
  }
  return {
    format: manifest.format,
    manifestSha256: actualManifestSha256,
    sourceExportSha256: manifest.sourceExportSha256,
    email: result[EMAIL_QUEUE],
    pricing: result[PRICING_QUEUE],
  };
}

function requestedCutoff() {
  const value = process.env.HISTORICAL_EMAIL_CUTOFF;
  if (!value) {
    throw new Error("HISTORICAL_EMAIL_CUTOFF is required for apply mode");
  }
  const cutoff = new Date(value);
  if (!Number.isFinite(cutoff.getTime()) || cutoff.toISOString() !== value) {
    throw new Error("HISTORICAL_EMAIL_CUTOFF must be a canonical ISO timestamp");
  }
  return cutoff;
}

function forceNewCutover() {
  const value = process.env.HISTORICAL_EMAIL_FORCE_NEW_CUTOVER;
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;
  throw new Error(
    "HISTORICAL_EMAIL_FORCE_NEW_CUTOVER must be exactly true or false",
  );
}

function markerPayload(marker, expectedAction) {
  if (
    marker.action !== expectedAction ||
    marker.entity !== CUTOVER_ENTITY ||
    marker.entityId !== CUTOVER_ENTITY_ID ||
    marker.after === null ||
    typeof marker.after !== "object" ||
    Array.isArray(marker.after)
  ) {
    throw new Error(`invalid persistent cutover marker ${marker.id}`);
  }
  return marker.after;
}

function parseCutoff(marker) {
  const payload = markerPayload(
    marker,
    "HISTORICAL_EMAIL_CUTOVER_DB_COMPLETE",
  );
  if (typeof payload.cutoff !== "string") {
    throw new Error(`cutoff missing from ${DB_MARKER_ID}`);
  }
  const cutoff = new Date(payload.cutoff);
  if (
    !Number.isFinite(cutoff.getTime()) ||
    cutoff.toISOString() !== payload.cutoff ||
    payload.reason !== REASON
  ) {
    throw new Error(`invalid cutoff payload in ${DB_MARKER_ID}`);
  }
  if (payload.tombstone !== "EmailOutbox.historicalDismissedAt") {
    throw new Error(`historical tombstone missing from ${DB_MARKER_ID}`);
  }
  return cutoff;
}

function parseGeneration(marker) {
  const payload = markerPayload(
    marker,
    "HISTORICAL_EMAIL_CUTOVER_DB_COMPLETE",
  );
  if (
    typeof payload.generation !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payload.generation,
    )
  ) {
    throw new Error(`invalid generation in ${DB_MARKER_ID}`);
  }
  return payload.generation;
}

function parseEvidenceDescriptor(payload, label) {
  const evidence = payload.evidence;
  const email = payload.queues?.[EMAIL_QUEUE];
  const pricing = payload.queues?.[PRICING_QUEUE];
  if (
    evidence?.format !== "egadisailing-queue-id-manifest-v1" ||
    !/^[0-9a-f]{64}$/.test(evidence.manifestSha256 ?? "") ||
    !/^[0-9a-f]{64}$/.test(evidence.sourceExportSha256 ?? "") ||
    !Number.isSafeInteger(email?.expected) ||
    email.expected < 0 ||
    !/^[0-9a-f]{64}$/.test(email.idDigest ?? "") ||
    !Number.isSafeInteger(pricing?.expected) ||
    pricing.expected < 0 ||
    !/^[0-9a-f]{64}$/.test(pricing.idDigest ?? "")
  ) {
    throw new Error(`invalid queue identity evidence in ${label}`);
  }
  return {
    format: evidence.format,
    manifestSha256: evidence.manifestSha256,
    sourceExportSha256: evidence.sourceExportSha256,
    email: { expected: email.expected, digest: email.idDigest },
    pricing: { expected: pricing.expected, digest: pricing.idDigest },
  };
}

function assertManifestMatchesDescriptor(manifest, descriptor, label) {
  if (
    descriptor.format !== manifest.format ||
    descriptor.manifestSha256 !== manifest.manifestSha256 ||
    descriptor.sourceExportSha256 !== manifest.sourceExportSha256 ||
    descriptor.email.expected !== manifest.email.ids.length ||
    descriptor.email.digest !== manifest.email.digest ||
    descriptor.pricing.expected !== manifest.pricing.ids.length ||
    descriptor.pricing.digest !== manifest.pricing.digest
  ) {
    throw new Error(`${label} does not match the verified queue identity manifest`);
  }
}

async function loadMarkers(client) {
  const result = await client.query(
    `SELECT "id", "action", "entity", "entityId", "before", "after", "timestamp"
       FROM "AuditLog"
      WHERE "id" = ANY($1::text[])`,
    [MARKER_IDS],
  );
  return new Map(result.rows.map((row) => [row.id, row]));
}

async function countUnsafe(client, cutoff) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS "count"
       FROM "EmailOutbox"
      WHERE "createdAt" <= ($1::timestamptz AT TIME ZONE 'UTC')
        AND (
          "status" IN ('PENDING', 'SENDING', 'FAILED')
          OR (
            "status" = 'DISMISSED'
            AND "historicalDismissedAt" IS NULL
          )
          OR (
            "historicalDismissedAt" IS NOT NULL
            AND "status" <> 'DISMISSED'
          )
        )`,
    [cutoff.toISOString()],
  );
  return result.rows[0].count;
}

async function inspectCutover(client) {
  const markers = await loadMarkers(client);
  const dbMarker = markers.get(DB_MARKER_ID);
  const purgeAudit = markers.get(PURGE_AUDIT_ID);
  const completeMarker = markers.get(COMPLETE_MARKER_ID);

  if (!dbMarker) {
    if (purgeAudit || completeMarker) {
      throw new Error("queue/complete marker exists without the DB marker");
    }
    return { code: 3, state: "required", historicalUnsafe: null };
  }

  const cutoff = parseCutoff(dbMarker);
  const generation = parseGeneration(dbMarker);
  const historicalUnsafe = await countUnsafe(client, cutoff);

  if (!completeMarker) {
    if (purgeAudit) {
      const started = markerPayload(
        purgeAudit,
        "HISTORICAL_QUEUE_PURGE_STARTED",
      );
      const descriptor = parseEvidenceDescriptor(started, "queue purge intent");
      if (
        started.cutoff !== cutoff.toISOString() ||
        started.generation !== generation
      ) {
        throw new Error("queue purge intent disagrees with the DB marker");
      }
      return {
        code: 3,
        state: "queue-purge-started",
        cutoff: cutoff.toISOString(),
        generation,
        historicalUnsafe,
        expected: {
          email: descriptor.email.expected,
          pricing: descriptor.pricing.expected,
        },
        manifestSha256: descriptor.manifestSha256,
      };
    }
    return {
      code: 3,
      state: "incomplete",
      cutoff: cutoff.toISOString(),
      generation,
      historicalUnsafe,
    };
  }

  if (!purgeAudit) {
    throw new Error("complete marker exists without the queue purge audit");
  }
  const purgePayload = markerPayload(
    purgeAudit,
    "HISTORICAL_QUEUE_PURGE_COMPLETE",
  );
  const completePayload = markerPayload(
    completeMarker,
    "HISTORICAL_EMAIL_CUTOVER_COMPLETE",
  );
  const purgeEvidence = parseEvidenceDescriptor(
    purgePayload,
    "completed queue purge",
  );
  const completeEvidence = parseEvidenceDescriptor(
    completePayload,
    "completed historical cutover",
  );
  const emailPurge = purgePayload.queues?.[EMAIL_QUEUE];
  const pricingPurge = purgePayload.queues?.[PRICING_QUEUE];
  if (
    purgePayload.cutoff !== cutoff.toISOString() ||
    purgePayload.generation !== generation ||
    !Number.isSafeInteger(emailPurge?.expected) ||
    emailPurge.expected !== emailPurge.removed ||
    emailPurge.resumed !== true ||
    !Number.isSafeInteger(pricingPurge?.expected) ||
    pricingPurge.expected !== pricingPurge.removed ||
    pricingPurge.paused !== true ||
    purgeEvidence.manifestSha256 !== completeEvidence.manifestSha256 ||
    purgeEvidence.sourceExportSha256 !== completeEvidence.sourceExportSha256 ||
    purgeEvidence.email.expected !== completeEvidence.email.expected ||
    purgeEvidence.email.digest !== completeEvidence.email.digest ||
    purgeEvidence.pricing.expected !== completeEvidence.pricing.expected ||
    purgeEvidence.pricing.digest !== completeEvidence.pricing.digest ||
    completePayload.cutoff !== cutoff.toISOString() ||
    completePayload.generation !== generation ||
    completePayload.reason !== REASON ||
    completePayload.historicalTombstoneApplied !== true ||
    completePayload.emailQueueResumed !== true ||
    completePayload.pricingQueuePaused !== true
  ) {
    throw new Error("persistent cutover markers disagree");
  }
  if (historicalUnsafe !== 0) {
    throw new Error(
      `complete marker exists but ${historicalUnsafe} historical email row(s) are unsafe`,
    );
  }
  return {
    code: 0,
    state: "complete",
    cutoff: cutoff.toISOString(),
    generation,
    historicalUnsafe,
  };
}

async function applyDatabasePhase(client, forceFresh, requestedEmailCutoff) {
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17017, 2]);

    const markers = await loadMarkers(client);
    let generation = forceFresh ? randomUUID() : undefined;
    let supersededAuditId = null;
    if (forceFresh) {
      const priorDbMarker = markers.get(DB_MARKER_ID);
      if (
        priorDbMarker &&
        requestedEmailCutoff.getTime() <= parseCutoff(priorDbMarker).getTime()
      ) {
        throw new Error(
          "forced historical cutoff must be newer than the superseded cutoff",
        );
      }
      supersededAuditId = randomUUID();
      const fixedMarkers = [...markers.values()]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((marker) => ({
          id: marker.id,
          action: marker.action,
          entity: marker.entity,
          entityId: marker.entityId,
          before: marker.before,
          after: marker.after,
          timestamp: marker.timestamp.toISOString(),
        }));
      await client.query(
        `INSERT INTO "AuditLog"
           ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
         VALUES ($1, NULL, 'HISTORICAL_EMAIL_CUTOVER_SUPERSEDED', $2, $3,
                 $4::jsonb, $5::jsonb, NOW())`,
        [
          supersededAuditId,
          CUTOVER_ENTITY,
          CUTOVER_ENTITY_ID,
          JSON.stringify({ snapshotVersion: 1, fixedMarkers }),
          JSON.stringify({
            state: "SUPERSEDED",
            reason:
              "Persisted unsafe legacy source requires a fresh historical cutoff",
            supersededByGeneration: generation,
          }),
        ],
      );
      await client.query(
        `DELETE FROM "AuditLog"
          WHERE "id" = ANY($1::text[])`,
        [MARKER_IDS],
      );
      const fixedRemaining = await client.query(
        `SELECT COUNT(*)::int AS "count"
           FROM "AuditLog"
          WHERE "id" = ANY($1::text[])`,
        [MARKER_IDS],
      );
      if (fixedRemaining.rows[0].count !== 0) {
        throw new Error("superseded fixed markers were not removed atomically");
      }
    } else {
      if (markers.has(COMPLETE_MARKER_ID)) {
        throw new Error("cutover is already complete");
      }
      const existingPurge = markers.get(PURGE_AUDIT_ID);
      if (
        existingPurge &&
        existingPurge.action !== "HISTORICAL_QUEUE_PURGE_STARTED"
      ) {
        throw new Error("invalid queue purge marker without a complete marker");
      }
    }

    const existingDbMarker = forceFresh ? undefined : markers.get(DB_MARKER_ID);
    let cutoff;
    if (existingDbMarker) {
      cutoff = parseCutoff(existingDbMarker);
      if (cutoff.toISOString() !== requestedEmailCutoff.toISOString()) {
        throw new Error(
          "HISTORICAL_EMAIL_CUTOFF disagrees with the persistent DB marker",
        );
      }
      generation = parseGeneration(existingDbMarker);
    } else {
      const clock = await client.query(`SELECT clock_timestamp() AS "now"`);
      if (requestedEmailCutoff.getTime() > clock.rows[0].now.getTime()) {
        throw new Error("HISTORICAL_EMAIL_CUTOFF is ahead of the database clock");
      }
      cutoff = requestedEmailCutoff;
      generation ??= randomUUID();
    }

    const historicalCandidates = await client.query(
      `SELECT "id", "status", "attempts", "deliveryStartedAt",
              "resolutionReason", "resolvedAt"
         FROM "EmailOutbox"
        WHERE "createdAt" <= ($1::timestamptz AT TIME ZONE 'UTC')
          AND (
            "status" IN ('PENDING', 'SENDING', 'FAILED')
            OR (
              "status" = 'DISMISSED'
              AND "historicalDismissedAt" IS NULL
            )
          )
        ORDER BY "createdAt", "id"
        FOR UPDATE`,
      [cutoff.toISOString()],
    );
    const nonTerminal = historicalCandidates.rows.filter(
      (row) => row.status !== "DISMISSED",
    );
    const alreadyDismissed = historicalCandidates.rows.filter(
      (row) => row.status === "DISMISSED",
    );

    if (nonTerminal.length > 0) {
      const ids = nonTerminal.map((row) => row.id);
      const dismissed = await client.query(
        `UPDATE "EmailOutbox"
            SET "status" = 'DISMISSED',
                "resolvedAt" = NOW(),
                "resolvedByUserId" = NULL,
                "resolutionReason" = $1,
                "lastError" = $1,
                "historicalDismissedAt" = NOW(),
                "nextAttemptAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = ANY($2::text[])
            AND "status" IN ('PENDING', 'SENDING', 'FAILED')
        RETURNING "id", "historicalDismissedAt"`,
        [REASON, ids],
      );
      if (dismissed.rowCount !== nonTerminal.length) {
        throw new Error("historical email dismissal count changed while locked");
      }
      const tombstones = new Map(
        dismissed.rows.map((row) => [row.id, row.historicalDismissedAt]),
      );

      for (const row of nonTerminal) {
        await client.query(
          `INSERT INTO "AuditLog"
             ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
           VALUES ($1, NULL, 'EMAIL_OUTBOX_HISTORICAL_DISMISS', 'EmailOutbox', $2,
                   $3::jsonb, $4::jsonb, NOW())`,
          [
            randomUUID(),
            row.id,
            JSON.stringify({
              status: row.status,
              attempts: row.attempts,
              deliveryStartedAt: row.deliveryStartedAt,
            }),
            JSON.stringify({
              status: "DISMISSED",
              reason: REASON,
              cutoff: cutoff.toISOString(),
              historicalDismissedAt: tombstones.get(row.id),
            }),
          ],
        );
      }
    }

    if (alreadyDismissed.length > 0) {
      const ids = alreadyDismissed.map((row) => row.id);
      const sealed = await client.query(
        `UPDATE "EmailOutbox"
            SET "historicalDismissedAt" = NOW(),
                "updatedAt" = NOW()
          WHERE "id" = ANY($1::text[])
            AND "status" = 'DISMISSED'
            AND "historicalDismissedAt" IS NULL
        RETURNING "id", "historicalDismissedAt"`,
        [ids],
      );
      if (sealed.rowCount !== alreadyDismissed.length) {
        throw new Error("historical dismissed-email seal count changed while locked");
      }
      const tombstones = new Map(
        sealed.rows.map((row) => [row.id, row.historicalDismissedAt]),
      );
      for (const row of alreadyDismissed) {
        await client.query(
          `INSERT INTO "AuditLog"
             ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
           VALUES ($1, NULL, 'EMAIL_OUTBOX_HISTORICAL_SEAL', 'EmailOutbox', $2,
                   $3::jsonb, $4::jsonb, NOW())`,
          [
            randomUUID(),
            row.id,
            JSON.stringify({
              status: row.status,
              alreadyDismissed: true,
              resolutionReasonPreserved: true,
              resolvedAt: row.resolvedAt,
            }),
            JSON.stringify({
              status: "DISMISSED",
              resolutionReasonPreserved: true,
              cutoff: cutoff.toISOString(),
              historicalDismissedAt: tombstones.get(row.id),
            }),
          ],
        );
      }
    }

    const remaining = await countUnsafe(client, cutoff);
    if (remaining !== 0) {
      throw new Error(`${remaining} historical email row(s) remain unsafe`);
    }

    if (!existingDbMarker) {
      await client.query(
        `INSERT INTO "AuditLog"
           ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
         VALUES ($1, NULL, 'HISTORICAL_EMAIL_CUTOVER_DB_COMPLETE', $2, $3,
                 NULL, $4::jsonb, NOW())`,
        [
          DB_MARKER_ID,
          CUTOVER_ENTITY,
          CUTOVER_ENTITY_ID,
          JSON.stringify({
            cutoff: cutoff.toISOString(),
            generation,
            reason: REASON,
            tombstone: "EmailOutbox.historicalDismissedAt",
            forceFresh,
            supersededAuditId,
            dismissed: nonTerminal.length,
            sealedDismissed: alreadyDismissed.length,
            historicalUnsafe: 0,
          }),
        ],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return {
      cutoff,
      generation,
      dismissed: nonTerminal.length,
      sealedDismissed: alreadyDismissed.length,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  }
}

async function ensurePurgeIntent(
  client,
  cutoff,
  generation,
  manifest,
  current,
) {
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17017, 2]);

    const markers = await loadMarkers(client);
    const dbMarker = markers.get(DB_MARKER_ID);
    if (
      !dbMarker ||
      parseCutoff(dbMarker).toISOString() !== cutoff.toISOString() ||
      parseGeneration(dbMarker) !== generation ||
      markers.has(COMPLETE_MARKER_ID)
    ) {
      throw new Error("DB marker changed before queue purge intent");
    }
    if ((await countUnsafe(client, cutoff)) !== 0) {
      throw new Error("historical email rows became unsafe before queue purge");
    }

    const purgeMarker = markers.get(PURGE_AUDIT_ID);
    let resumed = false;
    if (purgeMarker) {
      const started = markerPayload(
        purgeMarker,
        "HISTORICAL_QUEUE_PURGE_STARTED",
      );
      const descriptor = parseEvidenceDescriptor(started, "queue purge intent");
      assertManifestMatchesDescriptor(manifest, descriptor, "queue purge intent");
      if (
        started.cutoff !== cutoff.toISOString() ||
        started.generation !== generation
      ) {
        throw new Error(
          "queue purge intent does not match this generation/evidence snapshot",
        );
      }
      if (
        current.email < 0 ||
        current.email > manifest.email.ids.length ||
        current.pricing < 0 ||
        current.pricing > manifest.pricing.ids.length
      ) {
        throw new Error(
          `partial queue purge is inconsistent: ${EMAIL_QUEUE}=${current.email}, ${PRICING_QUEUE}=${current.pricing}`,
        );
      }
      resumed = true;
    } else {
      if (
        current.email !== manifest.email.ids.length ||
        current.pricing !== manifest.pricing.ids.length
      ) {
        throw new Error(
          `exact queue evidence mismatch: ${EMAIL_QUEUE} archived=${manifest.email.ids.length} present=${current.email}; ${PRICING_QUEUE} archived=${manifest.pricing.ids.length} present=${current.pricing}; freeze and create new encrypted evidence`,
        );
      }
      await client.query(
        `INSERT INTO "AuditLog"
           ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
         VALUES ($1, NULL, 'HISTORICAL_QUEUE_PURGE_STARTED', $2, $3,
                 NULL, $4::jsonb, NOW())`,
        [
          PURGE_AUDIT_ID,
          CUTOVER_ENTITY,
          CUTOVER_ENTITY_ID,
          JSON.stringify({
            cutoff: cutoff.toISOString(),
            generation,
            evidence: {
              format: manifest.format,
              manifestSha256: manifest.manifestSha256,
              sourceExportSha256: manifest.sourceExportSha256,
            },
            queues: {
              [EMAIL_QUEUE]: {
                expected: manifest.email.ids.length,
                idDigest: manifest.email.digest,
              },
              [PRICING_QUEUE]: {
                expected: manifest.pricing.ids.length,
                idDigest: manifest.pricing.digest,
              },
            },
            encryptedEvidenceVerifiedBeforeRelease: true,
          }),
        ],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;
    return { resumed };
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  }
}

async function presentEvidenceJobIds(queue, ids) {
  const present = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const jobs = await Promise.all(batch.map((id) => queue.getJob(id)));
    for (let index = 0; index < batch.length; index += 1) {
      const job = jobs[index];
      if (!job) continue;
      if (String(job.id) !== batch[index]) {
        throw new Error(`${queue.name} returned a job with the wrong identity`);
      }
      present.push(batch[index]);
    }
  }
  return present;
}

async function removeEvidenceJobs(queue, ids) {
  const present = await presentEvidenceJobIds(queue, ids);
  for (const id of present) {
    const job = await queue.getJob(id);
    if (!job) continue;
    await job.remove({ removeChildren: false });
  }
  const remaining = await presentEvidenceJobIds(queue, ids);
  if (remaining.length !== 0) {
    throw new Error(
      `${queue.name} selective purge left ${remaining.length} archived job ID(s)`,
    );
  }
  return present.length;
}

async function purgeHistoricalQueues(
  client,
  cutoff,
  generation,
  manifest,
) {
  if (!REDIS_URL) throw new Error("REDIS_URL is required for apply mode");

  const redis = new IORedis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    connectTimeout: 5_000,
    retryStrategy: () => null,
  });
  redis.on("error", () => undefined);
  let emailQueue;
  let pricingQueue;
  let finalQueueStatesApplied = false;

  try {
    await redis.connect();
    await redis.ping();
    emailQueue = new Queue(EMAIL_QUEUE, { connection: redis });
    pricingQueue = new Queue(PRICING_QUEUE, { connection: redis });

    await Promise.all([emailQueue.pause(), pricingQueue.pause()]);
    if (!(await emailQueue.isPaused()) || !(await pricingQueue.isPaused())) {
      throw new Error("email and pricing queues did not both enter paused state");
    }

    const [emailActive, pricingActive] = await Promise.all([
      emailQueue.getActiveCount(),
      pricingQueue.getActiveCount(),
    ]);
    if (emailActive !== 0 || pricingActive !== 0) {
      throw new Error(
        `active jobs prevent cutover: ${EMAIL_QUEUE}=${emailActive}, ${PRICING_QUEUE}=${pricingActive}`,
      );
    }

    const [emailPresent, pricingPresent, emailSchedulers, pricingSchedulers] =
      await Promise.all([
        presentEvidenceJobIds(emailQueue, manifest.email.ids),
        presentEvidenceJobIds(pricingQueue, manifest.pricing.ids),
        Promise.all([
          emailQueue.getJobSchedulersCount(),
          emailQueue.getRepeatableJobs(0, -1, true),
        ]),
        Promise.all([
          pricingQueue.getJobSchedulersCount(),
          pricingQueue.getRepeatableJobs(0, -1, true),
        ]),
      ]);
    if (
      emailSchedulers[0] !== 0 ||
      emailSchedulers[1].length !== 0 ||
      pricingSchedulers[0] !== 0 ||
      pricingSchedulers[1].length !== 0
    ) {
      throw new Error(
        "unarchived queue schedulers/repeatables are present; create new encrypted evidence",
      );
    }

    const current = {
      email: emailPresent.length,
      pricing: pricingPresent.length,
    };
    const intent = await ensurePurgeIntent(
      client,
      cutoff,
      generation,
      manifest,
      current,
    );

    const [emailRemovedThisRun, pricingRemovedThisRun] = await Promise.all([
      removeEvidenceJobs(emailQueue, manifest.email.ids),
      removeEvidenceJobs(pricingQueue, manifest.pricing.ids),
    ]);

    // Only IDs cryptographically bound to the encrypted evidence were
    // removed. Any post-freeze/future job remains untouched. Restore only the
    // required operational states: email enabled, unapproved pricing paused.
    await Promise.all([emailQueue.resume(), pricingQueue.pause()]);
    if (await emailQueue.isPaused()) {
      throw new Error(`${EMAIL_QUEUE} did not resume after purge`);
    }
    if (!(await pricingQueue.isPaused())) {
      throw new Error(`${PRICING_QUEUE} must remain paused`);
    }
    finalQueueStatesApplied = true;

    return {
      intentResumed: intent.resumed,
      evidence: {
        format: manifest.format,
        manifestSha256: manifest.manifestSha256,
        sourceExportSha256: manifest.sourceExportSha256,
      },
      emailExpected: manifest.email.ids.length,
      emailDigest: manifest.email.digest,
      emailRemoved: manifest.email.ids.length,
      emailRemovedThisRun,
      pricingExpected: manifest.pricing.ids.length,
      pricingDigest: manifest.pricing.digest,
      pricingRemoved: manifest.pricing.ids.length,
      pricingRemovedThisRun,
    };
  } finally {
    if (!finalQueueStatesApplied) {
      // Fail closed: no producer/consumer may reopen either queue before the
      // persistent COMPLETE marker. The release/recovery state machine owns
      // the later decision to resume transactional email.
      await emailQueue?.pause().catch(() => undefined);
      await pricingQueue?.pause().catch(() => undefined);
    }
    await emailQueue?.close().catch(() => undefined);
    await pricingQueue?.close().catch(() => undefined);
    if (redis.status === "ready") {
      await redis.quit().catch(() => redis.disconnect());
    } else {
      redis.disconnect();
    }
  }
}

async function finalizeCutover(client, cutoff, generation, purgeResult) {
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17017, 2]);

    const markers = await loadMarkers(client);
    const dbMarker = markers.get(DB_MARKER_ID);
    if (
      !dbMarker ||
      parseCutoff(dbMarker).toISOString() !== cutoff.toISOString() ||
      parseGeneration(dbMarker) !== generation
    ) {
      throw new Error("DB cutover marker changed before finalization");
    }
    const purgeMarker = markers.get(PURGE_AUDIT_ID);
    if (!purgeMarker || markers.has(COMPLETE_MARKER_ID)) {
      throw new Error("queue purge intent is missing or cutover is already complete");
    }
    const started = markerPayload(
      purgeMarker,
      "HISTORICAL_QUEUE_PURGE_STARTED",
    );
    const startedEvidence = parseEvidenceDescriptor(
      started,
      "queue purge intent before finalization",
    );
    if (
      started.cutoff !== cutoff.toISOString() ||
      started.generation !== generation ||
      started.queues?.[EMAIL_QUEUE]?.expected !== purgeResult.emailExpected ||
      startedEvidence.email.digest !== purgeResult.emailDigest ||
      started.queues?.[PRICING_QUEUE]?.expected !==
        purgeResult.pricingExpected ||
      startedEvidence.pricing.digest !== purgeResult.pricingDigest ||
      startedEvidence.manifestSha256 !==
        purgeResult.evidence.manifestSha256 ||
      startedEvidence.sourceExportSha256 !==
        purgeResult.evidence.sourceExportSha256
    ) {
      throw new Error("queue purge intent changed before finalization");
    }
    const remaining = await countUnsafe(client, cutoff);
    if (remaining !== 0) {
      throw new Error(`${remaining} historical email row(s) became unsafe`);
    }

    const summary = {
      cutoff: cutoff.toISOString(),
      generation,
      evidence: purgeResult.evidence,
      queues: {
        [EMAIL_QUEUE]: {
          expected: purgeResult.emailExpected,
          idDigest: purgeResult.emailDigest,
          removed: purgeResult.emailRemoved,
          removedThisRun: purgeResult.emailRemovedThisRun,
          resumed: true,
        },
        [PRICING_QUEUE]: {
          expected: purgeResult.pricingExpected,
          idDigest: purgeResult.pricingDigest,
          removed: purgeResult.pricingRemoved,
          removedThisRun: purgeResult.pricingRemovedThisRun,
          paused: true,
        },
      },
      intentResumed: purgeResult.intentResumed,
      startedAt: purgeMarker.timestamp.toISOString(),
      completedAt: new Date().toISOString(),
      encryptedEvidenceVerifiedBeforeRelease: true,
    };
    const purgeCompleted = await client.query(
      `UPDATE "AuditLog"
          SET "action" = 'HISTORICAL_QUEUE_PURGE_COMPLETE',
              "after" = $1::jsonb
        WHERE "id" = $2
          AND "action" = 'HISTORICAL_QUEUE_PURGE_STARTED'`,
      [JSON.stringify(summary), PURGE_AUDIT_ID],
    );
    if (purgeCompleted.rowCount !== 1) {
      throw new Error("queue purge intent could not transition to complete");
    }
    await client.query(
      `INSERT INTO "AuditLog"
         ("id", "userId", "action", "entity", "entityId", "before", "after", "timestamp")
       VALUES ($1, NULL, 'HISTORICAL_EMAIL_CUTOVER_COMPLETE', $2, $3,
               NULL, $4::jsonb, NOW())`,
      [
        COMPLETE_MARKER_ID,
        CUTOVER_ENTITY,
        CUTOVER_ENTITY_ID,
        JSON.stringify({
          cutoff: cutoff.toISOString(),
          generation,
          reason: REASON,
          evidence: purgeResult.evidence,
          queues: {
            [EMAIL_QUEUE]: {
              expected: purgeResult.emailExpected,
              idDigest: purgeResult.emailDigest,
            },
            [PRICING_QUEUE]: {
              expected: purgeResult.pricingExpected,
              idDigest: purgeResult.pricingDigest,
            },
          },
          historicalUnsafe: 0,
          historicalTombstoneApplied: true,
          emailQueueResumed: true,
          pricingQueuePaused: true,
        }),
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    throw error;
  }
}

async function main() {
  if (MODE !== "check" && MODE !== "apply") {
    process.stderr.write(
      "usage: node deploy/dismiss-historical-emails.mjs <check|apply>\n",
    );
    return 1;
  }
  if (!DATABASE_URL) {
    process.stderr.write("historical email cutover: DATABASE_URL is required\n");
    return 1;
  }

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    const forceFresh = forceNewCutover();
    const initial = forceFresh
      ? {
          code: 3,
          state: "forced-fresh-cutover",
          fixedMarkersPresent: (await loadMarkers(client)).size,
        }
      : await inspectCutover(client);
    if (MODE === "check") {
      output(initial);
      return initial.code;
    }

    const expectedCounts = {
      email: expectedQueueCount("HISTORICAL_QUEUE_EXPECTED_EMAIL"),
      pricing: expectedQueueCount("HISTORICAL_QUEUE_EXPECTED_PRICING"),
    };
    const manifest = loadEvidenceManifest();
    if (
      manifest.email.ids.length !== expectedCounts.email ||
      manifest.pricing.ids.length !== expectedCounts.pricing
    ) {
      throw new Error(
        "verified queue identity manifest does not match the release evidence counts",
      );
    }
    const cutoff = requestedCutoff();
    if (initial.code === 0) {
      if (initial.cutoff !== cutoff.toISOString()) {
        throw new Error(
          "HISTORICAL_EMAIL_CUTOFF disagrees with the completed cutover",
        );
      }
      const completeMarker = (await loadMarkers(client)).get(COMPLETE_MARKER_ID);
      if (!completeMarker) {
        throw new Error("completed cutover marker disappeared during validation");
      }
      const completePayload = markerPayload(
        completeMarker,
        "HISTORICAL_EMAIL_CUTOVER_COMPLETE",
      );
      const descriptor = parseEvidenceDescriptor(
        completePayload,
        "completed historical cutover",
      );
      assertManifestMatchesDescriptor(
        manifest,
        descriptor,
        "completed historical cutover",
      );
      output(initial);
      return 0;
    }

    // The release orchestrator must stop the legacy application before apply.
    // Redis active-count assertions make a violation fail closed.
    const dbResult = await applyDatabasePhase(client, forceFresh, cutoff);
    const purgeResult = await purgeHistoricalQueues(
      client,
      dbResult.cutoff,
      dbResult.generation,
      manifest,
    );
    await finalizeCutover(
      client,
      dbResult.cutoff,
      dbResult.generation,
      purgeResult,
    );
    const complete = await inspectCutover(client);
    if (complete.code !== 0) {
      throw new Error("post-cutover verification did not reach complete state");
    }
    output({
      ...complete,
      dismissed: dbResult.dismissed,
      sealedDismissed: dbResult.sealedDismissed,
      removed: purgeResult,
    });
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`historical email cutover failed: ${message}\n`);
    return 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

process.exitCode = await main();
