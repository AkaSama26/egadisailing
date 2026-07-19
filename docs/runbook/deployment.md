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
        +-- encrypted Restic repository (7 daily / 4 weekly / 12 monthly)
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
- `GIT_SHA`, `NEXT_DEPLOYMENT_ID`, `DEPLOYMENT_VERSION` and `SENTRY_RELEASE`
  all receive the same full SHA.
- A verified offsite backup is mandatory before migrations.
- The 1,132 legacy BullMQ jobs must already be present in the encrypted queue
  evidence archive. `QUEUE_HISTORY_EXPORT_MARKER` points to a private marker;
  the release decrypts the archive only as a stream and verifies its checksum
  and the 1,070 pricing + 62 transactional counts before workers start.
- Migrations are forward-only and additive. Rollback switches only the image;
  it never runs a down migration.
- The one-time legacy rollback is marked as not email-idempotency-safe. Before
  switching to it, the current worker is stopped and any PENDING/SENDING/FAILED
  outbox with a started delivery is atomically changed to `DISMISSED` with an
  audit entry. It is never resent automatically; Brevo must be checked before
  an operator creates the single idempotent replacement from
  `/admin/sync-log#email-quarantena-rollback`, recording the verification
  reason in the audit trail. The same fail-closed barrier
  persistently pauses `sync.pricing.bokun` in Redis before the legacy worker
  starts, because that image predates `BOKUN_PRICING_SYNC_ENABLED`.

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
SENTRY_DSN=<production Sentry DSN>
SENTRY_ENVIRONMENT=production
# Written only after the exact-image smoke event is visible in Sentry.
SENTRY_TEST_EVENT_CONFIRMED_SHA=
BOKUN_PRICING_SYNC_ENABLED=false

# S3-compatible Restic example (Backblaze B2 S3 endpoint is supported)
RESTIC_REPOSITORY=s3:https://s3.eu-central-003.backblazeb2.com/egadisailing-prod-backups/restic
RESTIC_PASSWORD=<long independent encryption password>
AWS_ACCESS_KEY_ID=<bucket-scoped key id>
AWS_SECRET_ACCESS_KEY=<bucket-scoped application key>
AWS_DEFAULT_REGION=eu-central-003
```

Compose fissa la policy a 7 giorni locali e 7 snapshot giornalieri, 4
settimanali, 12 mensili; non è sovrascrivibile dalla shell di deploy.

For the native B2 backend, use
`RESTIC_REPOSITORY=b2:<bucket>:<prefix>` with `B2_ACCOUNT_ID` and
`B2_ACCOUNT_KEY`. Grant the key access only to the backup bucket. Store the
Restic password in the password manager separately from the bucket key.

Initialize a new repository once. This command installs Restic only in the
one-off container; it does not build the app:

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

The drill restores the latest offsite snapshot, verifies gzip, restores into a
uniquely named `egadisailing_restore_drill_*` database, checks tables and
Prisma migrations, and removes only that temporary database.

## Deploy a release

Deploy only after required GitHub checks, vulnerability scans and image
publication are green. Before cutover, send a test event from the exact image,
open the returned event ID in Sentry and verify both `release` and
`environment`. Then record the confirmation in `.env`:

```bash
cd /home/ubuntu/www/egadisailing
RELEASE_SHA=<full-sha-published-by-release-workflow>
./deploy/sentry-smoke.sh "$RELEASE_SHA"
# Only after the event is visible with the expected release/environment:
# SENTRY_TEST_EVENT_CONFIRMED_SHA=<same-full-sha>
```

The deploy is fail-closed when that confirmation does not exactly match its
argument. Continue with the release only after this gate:

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
3. encrypted pre-migration backup;
4. restore of that latest Restic snapshot into an isolated temporary database,
   with gzip/table/migration checks and an evidence marker;
5. explicit `prisma migrate deploy` in the candidate image;
6. `docker compose up -d --no-build app`;
7. container image-ID, public shallow, authenticated deep and release-SHA gates;
8. promotion of `.deploy/current-release.env`, retention of the prior image,
   then Cloudflare cache purge.

Use the release-aware wrapper for later Compose operations:

```bash
./deploy/compose.sh ps
./deploy/compose.sh logs --tail 100 app
./deploy/compose.sh config --images
```

Do not manually edit `.deploy/current-release.env`. It contains no secrets,
but it is mode `0600`, ignored by Git and is the authoritative deployed
digest.

## Health and observability gates

```bash
curl -fsS https://egadisailing.com/api/health
curl -fsS -H "Authorization: Bearer $OPS_HEALTH_SECRET" \
  'https://egadisailing.com/api/health?deep=1'
```

Both must be 200 and the response must report the deployed SHA. Sentry is a
release gate, not an optional production integration: `sentry-smoke.sh` sends
the event from the immutable candidate, and `release.sh` requires the exact
confirmed SHA before changing the live container.

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
Every legacy `SENDING`/`FAILED`, every row with attempts already started and
every row with a delivery timestamp is dismissed; only a never-attempted
`PENDING` row remains eligible. The
barrier also requires Redis and verifies that `sync.pricing.bokun` is globally
paused; rollback aborts if either protection cannot be established. A future
pricing canary must resume that queue explicitly through reviewed BullMQ
tooling only after the vendor contract and read-back gate have passed.

If Brevo proves that one quarantined message was not delivered, return to a
modern release and use the dedicated **Email in quarantena da rollback**
control. Never edit the `DISMISSED` row or enqueue it directly: the control
clones it under a deterministic replacement key, so repeated submissions
cannot create multiple messages. If Brevo shows a prior delivery, leave the
row `DISMISSED`.

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

The backup sidecar creates a verified local dump every 15 minutes and sends
each dump to the encrypted Restic repository. Restic pruning runs at most once
per UTC day and keeps 7 daily, 4 weekly and 12 monthly snapshots.

```bash
./deploy/compose.sh logs --tail 100 backup
docker exec egadisailing-backup restic snapshots --host egadisailing-production --tag postgres
docker exec egadisailing-backup restic check
./deploy/restore-drill.sh
```

Perform the restore drill monthly and before risky data/deploy work. Alert if
there is no successful offsite snapshot within 30 minutes. A local dump alone
does not satisfy the release gate.

## Canonical `.it` redirect

The `.com` domain is canonical. Do not advertise or serve duplicate content
from the `.it` domain.

1. Point apex and `www` DNS records for the alternate domain to the central
   Nginx proxy (or its Cloudflare zone) with a low TTL.
2. Wait for both names to resolve to the intended proxy.
3. Issue a certificate covering apex and `www`; install it as
   `/opt/nginx/ssl/egadisailing.it.pem` and `.key`, mode-restricted.
4. Only after the certificate files exist, install
   `deploy/nginx/egadisailing-it-redirect.conf` in `/opt/nginx/conf.d/`.
5. Validate `nginx -t`, reload, then test HTTP and HTTPS for both names with a
   path and query string. All four variants must return 301 to
   `https://egadisailing.com$request_uri`.

Installing the HTTPS server block before its certificate exists will prevent
Nginx from reloading. The repository configuration is therefore a gated
artifact and must not be copied live prematurely.
