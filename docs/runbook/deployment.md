# Deployment runbook

Production deploys are image-only. CI publishes a private immutable image as
`ghcr.io/akasama26/egadisailing:<full-sha>`; the VPS resolves that tag to a
digest and never builds from its checkout.

The canonical build toolchain is Node 24.18.0 / npm 11.16.0. Dependency and
scanner exceptions are tracked in
[`dependency-risk-register.md`](dependency-risk-register.md); every release
must keep the HIGH/CRITICAL count at zero.

## Production topology

```text
Internet / Cloudflare
        |
central nginx-proxy (TLS and virtual hosts)
        |
egadisailing-app (immutable GHCR digest)
        +-- PgBouncer -- PostgreSQL 16
        +-- Redis 7 (AOF, noeviction)

egadisailing-backup
        +-- local pg_dump (7 days)
        +-- optional encrypted Restic replica (7 daily / 4 weekly / 12 monthly)
```

`docker-compose.vps.yml` is the production source of truth. The shared
`proxy` network and central Nginx already exist on the VPS. Do not start a
second reverse proxy and do not use `docker compose build` in production.

## Release invariants

- **No-go:** the owner must confirm the exposed Telegram token was revoked in
  BotFather. Removing it from `.env` and Git history baselines is not revocation.
- The argument to `deploy/release.sh` is exactly a 40-character commit SHA.
- VPS checkout must be clean, at that SHA, and the SHA must belong to
  `origin/main`.
- The GHCR image must expose the same value in the OCI label
  `org.opencontainers.image.revision`.
- The exact digest must carry a valid Sigstore keyless signature whose
  certificate identity is the protected `release-image.yml` workflow on
  `refs/heads/main`. A package-write credential alone cannot make a replacement
  digest deployable.
- Compose runs the digest, not a mutable tag.
- `GIT_SHA`, `NEXT_DEPLOYMENT_ID` and `DEPLOYMENT_VERSION` all receive the
  same full SHA. `SENTRY_RELEASE` is also populated for compatibility, but
  Sentry stays disabled while `SENTRY_DSN` is empty.
- A fresh local PostgreSQL dump and a successful isolated restore drill are
  mandatory before migrations. An offsite replica is recommended, not a
  release gate.
- The 1,132 legacy BullMQ jobs must already be present in the encrypted queue
  evidence archive. `QUEUE_HISTORY_EXPORT_MARKER` points to a private marker;
  the release decrypts the archive only as a stream and verifies its checksum
  and the 1,070 pricing + 62 transactional counts before workers start.
- The 62 archived transactional jobs are historical evidence only. They and
  the corresponding stale outbox records are marked `DISMISSED`; none is
  replayed or replaced, including the dated May and August cases.
- Migrations are forward-only and additive. Rollback switches only the image;
  it never runs a down migration.
- Before the first modern image starts, every historical pre-cutoff
  `PENDING`/`SENDING`/`FAILED` outbox receives the immutable
  `historicalDismissedAt` tombstone and becomes `DISMISSED`. No replacement
  action exists for those historical records, even if Brevo shows no prior
  delivery.
- The cutover globally pauses both `email.transactional` and
  `sync.pricing.bokun` under the deploy lock before evidence decryption,
  `git fetch`, image pull, signature checks or any other slow/network work.
  A read-only helper from the requested commit is mounted into the exact local
  legacy image with `--pull never`.
- The historical stop is a direct `SIGKILL`, never a graceful SIGTERM/drain.
  `active > 0` is recorded durably and stops the workflow with the site down,
  both queues paused and external Brevo/Bokun reconciliation required. That
  reconciliation can only establish what happened; it never authorizes a
  historical retry or replacement. With `active = 0`, a post-stop invocation
  must match the exact sorted job-ID manifest and capture the canonical
  PostgreSQL cutoff used by the tombstone transaction.
- A later rollback to the retained legacy image is a separate policy. Before
  switching, the new worker is stopped and only future claims with an
  ambiguous delivery outcome (`SENDING`, `FAILED`, attempts already made or a
  delivery timestamp) are quarantined. A never-attempted future `PENDING`
  record is not mislabeled as historical. The barrier also keeps
  `sync.pricing.bokun` paused because the legacy image predates
  `BOKUN_PRICING_SYNC_ENABLED`.

## One-time VPS preparation

The containment archive uses a separate 0600 key and marker, all outside the
checkout. For the captured 19 July evidence the marker shape is:

```text
FORMAT=egadisailing-queue-evidence-v1
EXPORT_PATH=/home/ubuntu/ops-snapshots/egadisailing-20260719T100924Z/queue-failures.json.enc
KEY_PATH=/home/ubuntu/.ops/keys/queue-evidence-20260719.key
EXPORT_SHA256=8c854c0c3ab44f4d2c6e7720374e170fbede3ba4c5a7ce7195ba6ba9bbe973ea
EXPECTED_TOTAL=1132
EXPECTED_PRICING_BOKUN=1070
EXPECTED_TRANSACTIONAL=62
PBKDF2_ITERATIONS=200000
```

Store it as a non-symlink 0600 file owned by the deployment user, set its
absolute path in `.env` as `QUEUE_HISTORY_EXPORT_MARKER`, then run
`deploy/verify-queue-evidence.sh "$QUEUE_HISTORY_EXPORT_MARKER"`. The verifier
never writes or prints plaintext job payloads. A failed marker, checksum,
decryption or count is a deployment blocker.

Install Docker Compose v2 and authenticate to private GHCR with a GitHub token
limited to `read:packages`:

```bash
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u AkaSama26 --password-stdin
docker network inspect proxy >/dev/null
./deploy/install-cosign.sh
```

The repository checkout contains code only. Before cleaning a legacy dirty
checkout, preserve operator data outside the repository in a root-only
directory: record the running image ID/digest, `docker compose config`, a
binary Git diff, checksums and an archive of `private/`, contact ledgers and
outreach scripts. Restore tracked files individually; never use `git clean` or
`git reset --hard` for this transition.

Production secrets stay in `.env` with mode `0600`. At minimum configure the
existing application values plus:

```dotenv
OPS_HEALTH_SECRET=<independent random secret>
BOKUN_PRICING_SYNC_ENABLED=false

# Explicitly disabled; not a release requirement.
SENTRY_DSN=

# Optional S3-compatible Restic replica (Backblaze B2 is supported).
# Leave all of these empty to use only normal local PostgreSQL dumps.
RESTIC_REPOSITORY=s3:https://s3.eu-central-003.backblazeb2.com/egadisailing-prod-backups/restic
RESTIC_PASSWORD=<long independent encryption password>
AWS_ACCESS_KEY_ID=<bucket-scoped key id>
AWS_SECRET_ACCESS_KEY=<bucket-scoped application key>
AWS_DEFAULT_REGION=eu-central-003
```

Compose keeps normal local dumps for 7 days. If Restic is configured, its
retention is 7 daily, 4 weekly and 12 monthly snapshots; these values are not
overridden by the deploy shell.

For the native B2 backend, use
`RESTIC_REPOSITORY=b2:<bucket>:<prefix>` with `B2_ACCOUNT_ID` and
`B2_ACCOUNT_KEY`. Grant the key access only to the backup bucket. Store the
Restic password in the password manager separately from the bucket key.

If offsite replication is desired, initialize a new Restic repository once.
This optional command does not build the app:

```bash
APP_IMAGE=alpine:3.20 \
RELEASE_SHA=0000000000000000000000000000000000000000 \
docker compose --env-file .env -f docker-compose.vps.yml run --rm --no-deps \
  --entrypoint sh backup -c 'apk add --no-cache restic && restic init'
```

Run a first backup and restore drill before any application migration:

```bash
# Bootstrap only database/backup infrastructure before the first release
# state exists. The placeholder image is never used because app is not a
# target of this command.
APP_IMAGE=alpine:3.20 \
RELEASE_SHA=0000000000000000000000000000000000000000 \
docker compose --env-file .env -f docker-compose.vps.yml \
  up -d --no-build postgres backup
docker exec egadisailing-backup /backup.sh
./deploy/restore-drill.sh
```

The drill verifies the latest local dump, restores into a
uniquely named `egadisailing_restore_drill_*` database, checks tables and
Prisma migrations, and removes only that temporary database.

## Deploy a release

Deploy only after required GitHub checks, vulnerability scans and image
publication are green:

```bash
cd /home/ubuntu/www/egadisailing
git fetch --prune origin
git checkout main
git merge --ff-only origin/main
RELEASE_SHA="$(git rev-parse HEAD)"
./deploy/release.sh "$RELEASE_SHA"
```

The helper performs, in order:

1. clean-tree, `HEAD`, `origin/main` and full-SHA checks;
2. GHCR pull, digest resolution, OCI revision and public-config verification;
3. on the one-time legacy cutover, durable global pause of email/pricing and
   immediate non-draining legacy kill, before any evidence/network work;
4. encrypted exact-ID evidence verification, post-stop `active = 0`, exact-ID
   assertion and canonical DB cutoff;
5. verified local pre-migration PostgreSQL backup while the legacy worker is
   already stopped;
6. restore of that latest local dump into an isolated temporary database,
   with gzip/table/migration checks and an evidence marker;
7. explicit `prisma migrate deploy` in the candidate image;
8. historical outbox tombstones and selective purge of archived job IDs;
9. `docker compose up -d --no-build app`;
10. container image-ID, public shallow, authenticated deep and release-SHA gates;
11. atomic `COMMITTED` journal, promotion of `.deploy/current-release.env`,
   retention of the prior image,
   then Cloudflare cache purge.

The first legacy cutover therefore has a deliberate maintenance window from
the legacy stop in step 3 through candidate startup in step 9. This is the
safety boundary that prevents the old worker from consuming historical mail
during backup, restore drill or migrations. Later immutable releases keep the
current app online through those preparation phases.

Use the release-aware wrapper for later Compose operations:

```bash
./deploy/compose.sh ps
./deploy/compose.sh logs --tail 100 app
./deploy/compose.sh config --images
```

Do not manually edit `.deploy/current-release.env`. It contains no secrets,
but it is mode `0600`, ignored by Git and is the authoritative deployed
digest.

## Interrupted release recovery

`release.sh` journals every post-freeze transition under `.deploy/`. After a
host reboot, Docker daemon restart or uncatchable `SIGKILL`, do not delete
those files and do not manually resume either BullMQ queue. Inspect the state:

```bash
bash deploy/recover-release.sh status
```

The recovery command takes the same deployment lock as release/rollback. Its
available modes are:

```bash
# Read-only journal, container and queue status.
bash deploy/recover-release.sh status

# Restore and health-check the recorded rollback image.
bash deploy/recover-release.sh rollback

# Abort the bootstrap window before its first durable cutover journal. This
# also accepts the documented early historical-cutover phases.
bash deploy/recover-release.sh abort-pre-cutover
```

If a historical-cutover journal exists, `rollback` and the accepted early
`abort-pre-cutover` phases first disable container restart, freeze the app,
switch Redis AOF to `appendfsync=always` for the atomic queue boundary, and
force-remove the app without draining provider jobs. They restore the site only after the queue
pause is attested, verify the recorded image
and shallow/release health, write
`.deploy/historical-email-hold.env`, and only then remove the release
journals. Both queues remain paused. Create a fresh encrypted exact-ID queue
export and run the normal `deploy/release.sh <full-sha>` flow again; there is
no recovery command that sends or resumes historical email.

If containment reports an active job, the synchronously-fsynced Redis marker plus the durable
`activeObserved=true` result survive a helper, shell or host crash, including a
crash between the Redis boundary and the host-side result file. The app is killed immediately and automatic
recovery does not restart it. Inspect Brevo/Bokun and the outbox; only after
that reconciliation may an operator run `abort-pre-cutover`, which restores
the site with both queues still paused, writes an explicit hold and acknowledges
the sticky Redis observation. This acknowledgement is not available through a
normal rollback. Historical
email remains permanently non-sendable in every outcome.

The production Redis service also starts with `appendonly=yes` and
`appendfsync=always`. The containment helper refuses to establish a successful
boundary if AOF is disabled or immediate fsync cannot be attested. Before the
first EVAL, the exact legacy container is already frozen with restart disabled;
a power loss therefore cannot restart a worker against a lost pause marker.

There are two no-journal cases. During the first bootstrap, the app may already
be frozen with restart disabled just before `CONTAINMENT_INTENT`; explicit
`abort-pre-cutover` therefore establishes the same fsynced queue boundary and
restores the recorded legacy image with both queues paused under an email hold.
If it discovers active work for the first time, it persists
`ACTIVE_RECONCILIATION_REQUIRED` and stops; the operator must reconcile before
running the explicit abort a second time. On later rollback-safe releases,
recovery stops any candidate and restores the recorded release without creating
an email hold. In both cases it updates only
`current-release.env`: an existing `previous-release.env` is deliberately
preserved so a later `rollback.sh` can never select the failed candidate.

Never recover by running `docker compose up app` directly, deleting
`.deploy/*`, or calling BullMQ `resume`: each bypasses either the immutable
image journal or the historical-email safety proof.

## Health and observability gates

```bash
curl -fsS https://egadisailing.com/api/health
curl -fsS -H "Authorization: Bearer $OPS_HEALTH_SECRET" \
  'https://egadisailing.com/api/health?deep=1'
```

Both must be 200 and the response must report the deployed SHA. Operational
visibility comes from the authenticated deep healthcheck, container logs and
an external uptime monitor. Sentry is disabled and is not a release gate.

The following remain deliberately disabled in Compose until a separate
reviewed activation:

- Telegram credentials are blanked;
- Boataround credentials and URL are blanked;
- IMAP credentials and host are blanked;
- Bokun booking/webhook integration remains enabled when its credentials are
  present. Production requires `BOKUN_VENDOR_ID`, `BOKUN_ACCESS_KEY`,
  `BOKUN_SECRET_KEY`, `BOKUN_WEBHOOK_SECRET` and a non-test API host; missing
  configuration fails the release instead of silently completing sync jobs;
- Bokun pricing remains off with `BOKUN_PRICING_SYNC_ENABLED=false` until the
  supported endpoint, scope, currency/unit semantics and read-back are
  confirmed by Bokun and a future-date canary succeeds.

## Rollback

For an unhealthy deployment, `release.sh` automatically restores the actual
image that was running before the attempt. For a later regression:

```bash
./deploy/rollback.sh
```

This swaps current and previous application images. Immutable releases must
match the recorded image ID and release SHA and pass shallow plus authenticated
deep health; only the one-time legacy fallback can use shallow health alone.
It does not revert the Git checkout and never rolls back PostgreSQL. Keep all
migrations expand/contract-compatible with both retained images. Preserve at
least two known-good images through the rollback window; do not run broad
Docker image-prune commands.

For the first rollback only, the retained dirty-build image predates provider
idempotency. The rollback journal records
`EMAIL_OUTBOX_ROLLBACK_SAFE=false`; the script stops the new worker and runs
the transactional dismissal barrier before that legacy process can start.
Only future records whose provider outcome is ambiguous are dismissed:
`SENDING`, `FAILED`, or rows with a prior attempt/delivery timestamp. A future
`PENDING` row never attempted remains eligible. This rollback quarantine is
distinct from the immutable historical cutover tombstone. After an operator
verifies in Brevo that no delivery occurred, the admin can create one
idempotent replacement for this future-only rollback case.
The barrier also requires Redis and verifies that `sync.pricing.bokun` is globally
paused; rollback aborts if either protection cannot be established. A future
pricing canary must resume that queue explicitly through reviewed BullMQ
tooling only after the vendor contract and read-back gate have passed.

Every manual rollback owns `.deploy/rollback-email-barrier.env`; despite the
legacy filename it is a two-identity, fsynced transaction journal. Before its
`COMMITTED` phase, rerunning `deploy/rollback.sh` restores the newer image. At
or after `COMMITTED`, rerunning it converges on the health-verified rollback
target and can never reverse that decision. Derived swap/target files are
removed before this terminal journal.

For an unsafe legacy target, the same journal also tracks the future-only email
quarantine. If the shell or host dies after the email queue is paused, rerunning
`deploy/rollback.sh` completes the idempotent DB barrier and verifies
`email.transactional` resumed before restoring the newer image. If that cannot
be proven, the newer app remains stopped and
`.deploy/historical-email-hold.env` records the queue state as `UNKNOWN`; a
global pause can therefore never remain invisible. A pre-existing historical
hold blocks manual rollback entirely: complete a fresh immutable release
cutover instead.

Do not edit, retry, clone or enqueue a historical `DISMISSED` row. This policy
also covers the 14 August case: it is archived without any send approval or
replacement path. The future-only rollback recovery described above cannot
select a row with `historicalDismissedAt` set.

After the rollback window, remove only the captured legacy dirty-build image:

```bash
LEGACY_IMAGE_ID=<sha256:image-id-recorded-in-the-containment-snapshot>
[[ "$LEGACY_IMAGE_ID" =~ ^sha256:[0-9a-f]{64}$ ]]
test -z "$(docker ps -aq --filter ancestor="$LEGACY_IMAGE_ID")"
docker image rm "$LEGACY_IMAGE_ID"
```

Do not use `docker system prune` or touch volumes/backups. BuildKit does not
offer a reliable project-ID filter for cache produced by the old default
builder: remove a cache only if its dedicated builder/cache ID was captured in
the containment evidence; otherwise leave it until an operator-reviewed,
host-wide maintenance window.

## Backup operations

The backup sidecar creates and gzip-verifies a normal PostgreSQL dump every 15
minutes, stored under `backups/postgres/` with mode-restricted files and a
7-day local retention. The restore drill always uses this local dump.

```bash
./deploy/compose.sh logs --tail 100 backup
./deploy/restore-drill.sh
```

Perform the restore drill monthly and before risky data/deploy work. Alert if
there is no successful local dump within 30 minutes. Restic remains an
optional extra copy: when configured, also monitor `restic snapshots` and
`restic check`. Leaving its variables empty is supported and is not a release
gate. Once an operator explicitly configures Restic, a replication failure
fails that backup run until the configuration is repaired or deliberately
removed. A copy outside the VPS is still recommended for host failure.
