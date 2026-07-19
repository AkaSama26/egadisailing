#!/usr/bin/env bash
# Restore the latest verified local PostgreSQL dump into an isolated temporary
# database. Restic replication, when configured, is deliberately not required
# for this pre-migration safety gate.
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
RESTORE_MARKER="$STATE_DIR/last-restore-drill.env"
RESTORE_LOCK="$STATE_DIR/restore-drill.lock"
BACKUP_CONTAINER="egadisailing-backup"
POSTGRES_CONTAINER="egadisailing-postgres"
DRILL_DB="egadisailing_restore_drill_$(date -u +%Y%m%d%H%M%S)"
POSTGRES_USER=""
POSTGRES_DB=""
BACKUP_FILE=""
BACKUP_ORIGINAL_NAME=""
BACKUP_TIMESTAMP_UTC=""
BACKUP_TIMESTAMP_EPOCH=""
BACKUP_MTIME_EPOCH=""
BACKUP_SIZE_BYTES=""
BACKUP_SHA256=""
NOT_BEFORE_EPOCH=""

if [[ $# -eq 0 ]]; then
  NOT_BEFORE_EPOCH="$(( $(date -u +%s) - 1800 ))"
elif [[ $# -eq 2 && "$1" == "--not-before-epoch" && "$2" =~ ^[0-9]{9,11}$ ]]; then
  NOT_BEFORE_EPOCH="$2"
else
  echo "usage: deploy/restore-drill.sh [--not-before-epoch <unix-epoch>]" >&2
  exit 1
fi
[[ "$DRILL_DB" =~ ^egadisailing_restore_drill_[0-9]{14}$ ]] \
  || { echo "[restore-drill] unsafe temporary database name" >&2; exit 1; }
command -v flock >/dev/null 2>&1 \
  || { echo "[restore-drill] missing command: flock" >&2; exit 1; }
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 8>"$RESTORE_LOCK"
flock -n 8 \
  || { echo "[restore-drill] another restore drill is already running" >&2; exit 1; }

cleanup() {
  if [[ -n "$POSTGRES_USER" ]]; then
    docker exec "$POSTGRES_CONTAINER" dropdb --if-exists -U "$POSTGRES_USER" "$DRILL_DB" >/dev/null 2>&1 || true
  fi
  if [[ -n "$BACKUP_FILE" ]]; then
    docker exec "$BACKUP_CONTAINER" rm -f "$BACKUP_FILE" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

POSTGRES_USER="$(docker exec "$POSTGRES_CONTAINER" sh -c 'printf %s "$POSTGRES_USER"')"
[[ "$POSTGRES_USER" =~ ^[A-Za-z0-9_-]+$ ]] \
  || { echo "[restore-drill] invalid PostgreSQL user" >&2; exit 1; }
POSTGRES_DB="$(docker exec "$BACKUP_CONTAINER" sh -c 'printf %s "$POSTGRES_DB"')"
[[ "$POSTGRES_DB" =~ ^[A-Za-z0-9_-]+$ ]] \
  || { echo "[restore-drill] invalid PostgreSQL database name" >&2; exit 1; }
POSTGRES_CONTAINER_DB="$(docker exec "$POSTGRES_CONTAINER" sh -c 'printf %s "$POSTGRES_DB"')"
[[ "$POSTGRES_CONTAINER_DB" == "$POSTGRES_DB" ]] \
  || { echo "[restore-drill] backup and PostgreSQL database names differ" >&2; exit 1; }

BACKUP_FILE="/backups/.restore-drill-${DRILL_DB}.sql.gz"
BACKUP_METADATA="$(
  docker exec "$BACKUP_CONTAINER" sh -c '
    set -eu
    db=$1
    not_before=$2
    staged=$3
    [ -d /backups ]
    [ ! -L /backups ]
    [ ! -L /backups/.backup.lock ]
    exec 9>/backups/.backup.lock
    flock -w 60 9
    latest=
    for candidate in /backups/pgdump-"$db"-*.sql.gz; do
      [ -f "$candidate" ] && [ ! -L "$candidate" ] || continue
      case "$candidate" in
        /backups/pgdump-"$db"-????-??-??T??????Z.sql.gz) latest=$candidate ;;
      esac
    done
    [ -n "$latest" ]
    mtime=$(stat -c %Y "$latest")
    now=$(date -u +%s)
    [ "$mtime" -ge "$not_before" ]
    [ "$mtime" -le "$((now + 300))" ]
    rm -f "$staged"
    ln "$latest" "$staged"
    printf "%s|%s\n" "${latest##*/}" "$mtime"
  ' -- "$POSTGRES_DB" "$NOT_BEFORE_EPOCH" "$BACKUP_FILE"
)" || { echo "[restore-drill] no fresh local dump found for $POSTGRES_DB" >&2; exit 1; }
IFS='|' read -r BACKUP_ORIGINAL_NAME BACKUP_MTIME_EPOCH <<< "$BACKUP_METADATA"
[[ "$BACKUP_ORIGINAL_NAME" =~ ^pgdump-${POSTGRES_DB}-[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{6}Z\.sql\.gz$ \
  && "$BACKUP_MTIME_EPOCH" =~ ^[0-9]{9,11}$ ]] \
  || { echo "[restore-drill] invalid local dump metadata" >&2; exit 1; }
BACKUP_TIMESTAMP_UTC="${BACKUP_ORIGINAL_NAME#"pgdump-${POSTGRES_DB}-"}"
BACKUP_TIMESTAMP_UTC="${BACKUP_TIMESTAMP_UTC%.sql.gz}"
BACKUP_TIMESTAMP_EPOCH="$(
  date -u -d \
    "${BACKUP_TIMESTAMP_UTC:0:10} ${BACKUP_TIMESTAMP_UTC:11:2}:${BACKUP_TIMESTAMP_UTC:13:2}:${BACKUP_TIMESTAMP_UTC:15:2}Z" \
    +%s 2>/dev/null
)" || { echo "[restore-drill] invalid dump timestamp" >&2; exit 1; }
NOW_EPOCH="$(date -u +%s)"
[[ "$BACKUP_TIMESTAMP_EPOCH" =~ ^[0-9]{9,11}$ \
  && "$(date -u -d "@$BACKUP_TIMESTAMP_EPOCH" +%Y-%m-%dT%H%M%SZ)" == "$BACKUP_TIMESTAMP_UTC" \
  && "$BACKUP_TIMESTAMP_EPOCH" -ge "$NOT_BEFORE_EPOCH" \
  && "$BACKUP_TIMESTAMP_EPOCH" -le "$((NOW_EPOCH + 300))" ]] \
  || { echo "[restore-drill] dump is stale, future-dated or has an invalid timestamp" >&2; exit 1; }
docker exec "$BACKUP_CONTAINER" gzip -t "$BACKUP_FILE"
BACKUP_SIZE_BYTES="$(docker exec "$BACKUP_CONTAINER" stat -c %s "$BACKUP_FILE")"
[[ "$BACKUP_SIZE_BYTES" =~ ^[1-9][0-9]*$ ]] \
  || { echo "[restore-drill] invalid local dump size" >&2; exit 1; }
BACKUP_SHA256="$(docker exec "$BACKUP_CONTAINER" sha256sum "$BACKUP_FILE" | awk '{print $1}')"
[[ "$BACKUP_SHA256" =~ ^[0-9a-f]{64}$ ]] \
  || { echo "[restore-drill] could not checksum local PostgreSQL dump" >&2; exit 1; }

echo "[restore-drill] verified local dump $BACKUP_ORIGINAL_NAME ($BACKUP_SHA256)"

echo "[restore-drill] restoring into isolated database $DRILL_DB"
docker exec "$POSTGRES_CONTAINER" createdb -U "$POSTGRES_USER" "$DRILL_DB"
docker exec "$BACKUP_CONTAINER" gzip -dc "$BACKUP_FILE" \
  | docker exec -i "$POSTGRES_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$DRILL_DB" >/dev/null

MIGRATION_COUNT="$(docker exec "$POSTGRES_CONTAINER" psql -At -U "$POSTGRES_USER" -d "$DRILL_DB" -c 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;')"
TABLE_COUNT="$(docker exec "$POSTGRES_CONTAINER" psql -At -U "$POSTGRES_USER" -d "$DRILL_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")"
[[ "$MIGRATION_COUNT" =~ ^[1-9][0-9]*$ ]] || { echo "[restore-drill] no completed Prisma migration found" >&2; exit 1; }
[[ "$TABLE_COUNT" =~ ^[1-9][0-9]*$ ]] || { echo "[restore-drill] no public tables found" >&2; exit 1; }

MARKER_TMP="${RESTORE_MARKER}.tmp"
{
  printf 'BACKUP_SOURCE=local\n'
  printf 'BACKUP_FILE=%s\n' "$BACKUP_ORIGINAL_NAME"
  printf 'BACKUP_TIMESTAMP_UTC=%s\n' "$BACKUP_TIMESTAMP_UTC"
  printf 'BACKUP_MTIME_EPOCH=%s\n' "$BACKUP_MTIME_EPOCH"
  printf 'BACKUP_SIZE_BYTES=%s\n' "$BACKUP_SIZE_BYTES"
  printf 'BACKUP_SHA256=%s\n' "$BACKUP_SHA256"
  printf 'RESTORE_REQUESTED_NOT_BEFORE_EPOCH=%s\n' "$NOT_BEFORE_EPOCH"
  printf 'COMPLETED_AT_UTC=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'TABLE_COUNT=%s\n' "$TABLE_COUNT"
  printf 'MIGRATION_COUNT=%s\n' "$MIGRATION_COUNT"
} > "$MARKER_TMP"
chmod 600 "$MARKER_TMP"
mv "$MARKER_TMP" "$RESTORE_MARKER"

echo "[restore-drill] PASS: $TABLE_COUNT tables, $MIGRATION_COUNT completed migrations"
echo "[restore-drill] evidence written to $RESTORE_MARKER"
echo "[restore-drill] temporary database will now be removed"
