#!/usr/bin/env bash
# Restore the latest encrypted offsite snapshot into an isolated temporary DB.
set -euo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
RESTORE_MARKER="$STATE_DIR/last-restore-drill.env"
RESTORE_LOCK="$STATE_DIR/restore-drill.lock"
BACKUP_CONTAINER="egadisailing-backup"
POSTGRES_CONTAINER="egadisailing-postgres"
RESTORE_ROOT="/backups/restore-drill"
DRILL_DB="egadisailing_restore_drill_$(date -u +%Y%m%d%H%M%S)"
POSTGRES_USER=""
SNAPSHOT_ID=""

[[ $# -eq 0 ]] || { echo "usage: deploy/restore-drill.sh" >&2; exit 1; }
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
  docker exec "$BACKUP_CONTAINER" rm -rf "$RESTORE_ROOT" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

POSTGRES_USER="$(docker exec "$POSTGRES_CONTAINER" sh -c 'printf %s "$POSTGRES_USER"')"
[[ -n "$POSTGRES_USER" ]] || { echo "[restore-drill] missing PostgreSQL user" >&2; exit 1; }

SNAPSHOT_ID="$(
  docker exec "$BACKUP_CONTAINER" sh -c \
    'restic snapshots --host egadisailing-production --tag postgres --latest 1 --json | jq -er ".[0].id"'
)"
[[ "$SNAPSHOT_ID" =~ ^[0-9a-f]{64}$ ]] \
  || { echo "[restore-drill] invalid latest Restic snapshot id" >&2; exit 1; }

echo "[restore-drill] downloading encrypted Restic snapshot $SNAPSHOT_ID"
docker exec "$BACKUP_CONTAINER" rm -rf "$RESTORE_ROOT"
docker exec "$BACKUP_CONTAINER" mkdir -p "$RESTORE_ROOT"
docker exec "$BACKUP_CONTAINER" restic restore "$SNAPSHOT_ID" \
  --target "$RESTORE_ROOT"

RESTORED_DUMP="$(docker exec "$BACKUP_CONTAINER" find "$RESTORE_ROOT" -type f -name 'pgdump-*.sql.gz' -print | sort | tail -n 1)"
[[ -n "$RESTORED_DUMP" ]] || { echo "[restore-drill] snapshot contains no PostgreSQL dump" >&2; exit 1; }
docker exec "$BACKUP_CONTAINER" gzip -t "$RESTORED_DUMP"

echo "[restore-drill] restoring into isolated database $DRILL_DB"
docker exec "$POSTGRES_CONTAINER" createdb -U "$POSTGRES_USER" "$DRILL_DB"
docker exec "$BACKUP_CONTAINER" gzip -dc "$RESTORED_DUMP" \
  | docker exec -i "$POSTGRES_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$DRILL_DB" >/dev/null

MIGRATION_COUNT="$(docker exec "$POSTGRES_CONTAINER" psql -At -U "$POSTGRES_USER" -d "$DRILL_DB" -c 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;')"
TABLE_COUNT="$(docker exec "$POSTGRES_CONTAINER" psql -At -U "$POSTGRES_USER" -d "$DRILL_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")"
[[ "$MIGRATION_COUNT" =~ ^[1-9][0-9]*$ ]] || { echo "[restore-drill] no completed Prisma migration found" >&2; exit 1; }
[[ "$TABLE_COUNT" =~ ^[1-9][0-9]*$ ]] || { echo "[restore-drill] no public tables found" >&2; exit 1; }

MARKER_TMP="${RESTORE_MARKER}.tmp"
{
  printf 'RESTIC_SNAPSHOT_ID=%s\n' "$SNAPSHOT_ID"
  printf 'COMPLETED_AT_UTC=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'TABLE_COUNT=%s\n' "$TABLE_COUNT"
  printf 'MIGRATION_COUNT=%s\n' "$MIGRATION_COUNT"
} > "$MARKER_TMP"
chmod 600 "$MARKER_TMP"
mv "$MARKER_TMP" "$RESTORE_MARKER"

echo "[restore-drill] PASS: $TABLE_COUNT tables, $MIGRATION_COUNT completed migrations"
echo "[restore-drill] evidence written to $RESTORE_MARKER"
echo "[restore-drill] temporary database will now be removed"
