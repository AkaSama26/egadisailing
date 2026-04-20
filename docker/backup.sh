#!/bin/sh
# pg_dump sidecar backup script — runs daily via crond.
# Uploads to S3-compatible bucket with retention pruning.
set -eu

TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
BACKUP_FILE="/tmp/pgdump-${POSTGRES_DB}-${TIMESTAMP}.sql.gz"
S3_KEY="pgdump/${POSTGRES_DB}/${TIMESTAMP}.sql.gz"

echo "[backup] starting pg_dump ${POSTGRES_DB} at ${TIMESTAMP}"

export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump \
  --host=postgres \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --no-acl \
  | gzip -9 > "$BACKUP_FILE"

SIZE=$(stat -c %s "$BACKUP_FILE")
echo "[backup] dump completed: ${SIZE} bytes → ${S3_KEY}"

# S3-compatible upload via aws-cli (works with AWS S3, Backblaze B2, Wasabi).
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

rm -f "$BACKUP_FILE"

# Retention: delete objects older than BACKUP_RETENTION_DAYS.
# NOTA: il pruning remoto con aws-cli e' best-effort. Configurare bucket
# lifecycle policy S3-side per affidabilita' (es. Glacier transition).
CUTOFF_EPOCH=$(date -u -d "${BACKUP_RETENTION_DAYS} days ago" +%s 2>/dev/null || \
               date -u -v-${BACKUP_RETENTION_DAYS}d +%s)

echo "[backup] pruning objects older than ${BACKUP_RETENTION_DAYS}d (cutoff epoch ${CUTOFF_EPOCH})"
aws s3 ls $ENDPOINT_ARG "s3://${BACKUP_S3_BUCKET}/pgdump/${POSTGRES_DB}/" | \
while read -r line; do
  OBJ_DATE=$(echo "$line" | awk '{print $1" "$2}')
  OBJ_EPOCH=$(date -u -d "$OBJ_DATE" +%s 2>/dev/null || echo 0)
  OBJ_KEY=$(echo "$line" | awk '{print $4}')
  if [ "$OBJ_EPOCH" -lt "$CUTOFF_EPOCH" ] && [ -n "$OBJ_KEY" ]; then
    echo "[backup] pruning $OBJ_KEY"
    aws s3 rm $ENDPOINT_ARG "s3://${BACKUP_S3_BUCKET}/pgdump/${POSTGRES_DB}/${OBJ_KEY}"
  fi
done

echo "[backup] done"
