#!/bin/sh
# PostgreSQL backup: restricted local dump plus an encrypted Restic snapshot.
# The Restic repository must be initialized explicitly by an operator.
set -eu

umask 077

BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
RESTIC_KEEP_DAILY=${RESTIC_KEEP_DAILY:-7}
RESTIC_KEEP_WEEKLY=${RESTIC_KEEP_WEEKLY:-4}
RESTIC_KEEP_MONTHLY=${RESTIC_KEEP_MONTHLY:-12}
LOCK_FILE="${BACKUP_DIR}/.backup.lock"

is_positive_integer() {
  case "$1" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$1" -ge 1 ]
}

if [ -z "${POSTGRES_USER:-}" ]; then
  echo "[backup] ERROR: POSTGRES_USER is required" >&2
  exit 1
fi
if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "[backup] ERROR: POSTGRES_PASSWORD is required" >&2
  exit 1
fi
if [ -z "${POSTGRES_DB:-}" ]; then
  echo "[backup] ERROR: POSTGRES_DB is required" >&2
  exit 1
fi
case "$POSTGRES_DB" in
  *[!A-Za-z0-9_-]*)
    echo "[backup] ERROR: POSTGRES_DB contains unsafe filename characters" >&2
    exit 1
    ;;
esac
for RETENTION_VALUE in \
  "$BACKUP_RETENTION_DAYS" \
  "$RESTIC_KEEP_DAILY" \
  "$RESTIC_KEEP_WEEKLY" \
  "$RESTIC_KEEP_MONTHLY"; do
  if ! is_positive_integer "$RETENTION_VALUE"; then
    echo "[backup] ERROR: retention values must be positive integers" >&2
    exit 1
  fi
done

TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
BACKUP_FILE="${BACKUP_DIR}/pgdump-${POSTGRES_DB}-${TIMESTAMP}.sql.gz"
TMP_FILE="${BACKUP_FILE}.tmp"
PLAIN_TMP="${BACKUP_DIR}/.pgdump-${POSTGRES_DB}-${TIMESTAMP}.sql.tmp"

mkdir -p "$BACKUP_DIR"
if ! command -v flock >/dev/null 2>&1; then
  echo "[backup] ERROR: flock (util-linux) is required" >&2
  exit 1
fi
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[backup] ERROR: another backup is already running" >&2
  exit 75
fi

cleanup() {
  rm -f "$TMP_FILE" "$PLAIN_TMP"
}
trap cleanup EXIT INT TERM

echo "[backup] starting pg_dump for ${POSTGRES_DB} at ${TIMESTAMP}"
export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump \
  --host=postgres \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --no-acl \
  --file="$PLAIN_TMP"

# Non usare `pg_dump | gzip`: POSIX sh non garantisce pipefail e un pg_dump
# fallito potrebbe essere mascherato dal successo di gzip.
gzip -6 -c "$PLAIN_TMP" > "$TMP_FILE"
rm -f "$PLAIN_TMP"

gzip -t "$TMP_FILE"
mv "$TMP_FILE" "$BACKUP_FILE"
SIZE=$(stat -c %s "$BACKUP_FILE")
echo "[backup] local dump verified: ${BACKUP_FILE} (${SIZE} bytes)"

if [ -n "${RESTIC_REPOSITORY:-}" ] || [ -n "${RESTIC_PASSWORD:-}" ]; then
  if [ -z "${RESTIC_REPOSITORY:-}" ] || [ -z "${RESTIC_PASSWORD:-}" ]; then
    echo "[backup] ERROR: RESTIC_REPOSITORY and RESTIC_PASSWORD must be set together" >&2
    exit 1
  fi
  if ! command -v restic >/dev/null 2>&1; then
    echo "[backup] ERROR: restic is not installed in the backup container" >&2
    exit 1
  fi

  # Fails closed on a missing repository, wrong password or unreachable
  # backend. Initialization is a separate, deliberate runbook step.
  restic cat config >/dev/null
  restic backup "$BACKUP_FILE" \
    --host egadisailing-production \
    --tag postgres \
    --tag production
  echo "[backup] encrypted offsite snapshot completed"

  # Object-store pruning is intentionally at most daily, while snapshot
  # creation remains every 15 minutes.
  PRUNE_MARKER="${BACKUP_DIR}/.restic-pruned-$(date -u +%Y-%m-%d)"
  if [ ! -e "$PRUNE_MARKER" ]; then
    # Ogni dump ha un nome timestampato: il group-by Restic predefinito
    # (host,paths) creerebbe un gruppo per snapshot e non eliminerebbe nulla.
    # Raggruppiamo quindi per host+tag e proviamo la policy prima del prune.
    restic forget \
      --host egadisailing-production \
      --tag postgres \
      --group-by host,tags \
      --keep-daily "$RESTIC_KEEP_DAILY" \
      --keep-weekly "$RESTIC_KEEP_WEEKLY" \
      --keep-monthly "$RESTIC_KEEP_MONTHLY" \
      --dry-run
    restic forget \
      --host egadisailing-production \
      --tag postgres \
      --group-by host,tags \
      --keep-daily "$RESTIC_KEEP_DAILY" \
      --keep-weekly "$RESTIC_KEEP_WEEKLY" \
      --keep-monthly "$RESTIC_KEEP_MONTHLY" \
      --prune
    : > "$PRUNE_MARKER"
    find "$BACKUP_DIR" -maxdepth 1 -type f -name '.restic-pruned-*' -mtime +14 -delete
    echo "[backup] Restic retention applied (${RESTIC_KEEP_DAILY} daily, ${RESTIC_KEEP_WEEKLY} weekly, ${RESTIC_KEEP_MONTHLY} monthly)"
  fi
else
  echo "[backup] WARNING: Restic is not configured; only the local copy exists" >&2
fi

if ! date -u -d "1 day ago" +%s >/dev/null 2>&1; then
  echo "[backup] ERROR: GNU date (coreutils) is required" >&2
  exit 1
fi

CUTOFF_EPOCH=$(date -u -d "${BACKUP_RETENTION_DAYS} days ago" +%s)
PRUNED=0
for FILE in "${BACKUP_DIR}"/pgdump-"${POSTGRES_DB}"-*.sql.gz; do
  [ -e "$FILE" ] || continue
  FILE_EPOCH=$(stat -c %Y "$FILE")
  if [ "$FILE_EPOCH" -lt "$CUTOFF_EPOCH" ]; then
    rm -f "$FILE"
    PRUNED=$((PRUNED + 1))
  fi
done

echo "[backup] local retention completed: ${PRUNED} file(s) removed"
SUCCESS_TMP="${BACKUP_DIR}/.last-success-epoch.tmp"
date -u +%s > "$SUCCESS_TMP"
mv "$SUCCESS_TMP" "${BACKUP_DIR}/.last-success-epoch"
echo "[backup] done"
