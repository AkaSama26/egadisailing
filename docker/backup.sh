#!/bin/sh
# pg_dump sidecar backup script.
# Primary target: local VPS filesystem (/backups) with 3-day retention.
# Optional target: S3-compatible bucket if BACKUP_S3_* env vars are set.
set -eu

BACKUP_DIR=${BACKUP_DIR:-/backups}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-3}
TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
BACKUP_FILE="${BACKUP_DIR}/pgdump-${POSTGRES_DB}-${TIMESTAMP}.sql.gz"
TMP_FILE="${BACKUP_FILE}.tmp"
S3_KEY="pgdump/${POSTGRES_DB}/${TIMESTAMP}.sql.gz"

cleanup_tmp() {
  rm -f "$TMP_FILE"
}
trap cleanup_tmp EXIT INT TERM

mkdir -p "$BACKUP_DIR"

echo "[backup] starting local pg_dump ${POSTGRES_DB} at ${TIMESTAMP}"

export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump \
  --host=postgres \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --no-acl \
  | gzip -6 > "$TMP_FILE"

mv "$TMP_FILE" "$BACKUP_FILE"

SIZE=$(stat -c %s "$BACKUP_FILE")
echo "[backup] local dump completed: ${BACKUP_FILE} (${SIZE} bytes)"

if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ -n "${BACKUP_S3_KEY:-}" ] && [ -n "${BACKUP_S3_SECRET:-}" ]; then
  export AWS_ACCESS_KEY_ID="$BACKUP_S3_KEY"
  export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET"

  if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
    ENDPOINT_ARG="--endpoint-url=$BACKUP_S3_ENDPOINT"
  else
    ENDPOINT_ARG=""
  fi

  aws s3 cp \
    $ENDPOINT_ARG \
    "$BACKUP_FILE" \
    "s3://${BACKUP_S3_BUCKET}/${S3_KEY}"

  echo "[backup] uploaded to s3://${BACKUP_S3_BUCKET}/${S3_KEY}"
else
  echo "[backup] S3 env not configured; keeping local backup only"
fi

if ! date -u -d "1 day ago" +%s >/dev/null 2>&1; then
  echo "[backup] ERROR: GNU date (coreutils) required but not found in PATH" >&2
  exit 1
fi

CUTOFF_EPOCH=$(date -u -d "${BACKUP_RETENTION_DAYS} days ago" +%s)
PRUNED=0

echo "[backup] pruning local dumps older than ${BACKUP_RETENTION_DAYS}d"
for FILE in "${BACKUP_DIR}"/pgdump-"${POSTGRES_DB}"-*.sql.gz; do
  [ -e "$FILE" ] || continue
  FILE_EPOCH=$(stat -c %Y "$FILE")
  if [ "$FILE_EPOCH" -lt "$CUTOFF_EPOCH" ]; then
    rm -f "$FILE"
    PRUNED=$((PRUNED + 1))
    echo "[backup] pruned local dump: $FILE"
  fi
done

echo "[backup] local pruning completed: ${PRUNED} file(s) removed"
echo "[backup] done"
