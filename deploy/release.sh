#!/usr/bin/env bash
# Deploy one immutable GHCR release. Usage: deploy/release.sh <40-char-sha>
set -euo pipefail

umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"
IMAGE_REPOSITORY="ghcr.io/akasama26/egadisailing"
COSIGN_CERTIFICATE_IDENTITY="https://github.com/AkaSama26/egadisailing/.github/workflows/release-image.yml@refs/heads/main"
COSIGN_OIDC_ISSUER="https://token.actions.githubusercontent.com"
STATE_DIR="$ROOT_DIR/.deploy"
DEPLOY_LOCK="$STATE_DIR/deploy.lock"
CURRENT_STATE="$STATE_DIR/current-release.env"
PREVIOUS_STATE="$STATE_DIR/previous-release.env"
CURRENT_STATE_TMP="${CURRENT_STATE}.tmp"
PREVIOUS_STATE_TMP="${PREVIOUS_STATE}.tmp"
CANDIDATE_STATE="$STATE_DIR/candidate-release.env"
ROLLBACK_STATE="$STATE_DIR/rollback-candidate.env"
IN_PROGRESS_STATE="$STATE_DIR/release-in-progress.env"
ROLLBACK_SWAP_STATE="$STATE_DIR/rollback-swap.env"
ENV_FILE="$ROOT_DIR/.env"
APP_CONTAINER="egadisailing-app"
BACKUP_CONTAINER="egadisailing-backup"
DEPLOY_LOCK_ACQUIRED=false
TEMP_STATE_OWNED=false
CUTOVER_STARTED=false

fail() {
  echo "[deploy] ERROR: $*" >&2
  exit 1
}

dotenv_value() {
  local key="$1"
  awk -v key="$key" '
    $0 ~ "^[[:space:]]*(export[[:space:]]+)?" key "=" {
      sub("^[[:space:]]*(export[[:space:]]+)?" key "=", "")
      sub("[[:space:]]+#.*$", "")
      gsub(/^\047|\047$/, "")
      gsub(/^\042|\042$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

compose_with_state() {
  local state_file="$1"
  shift
  local state_image state_release
  state_image="$(state_value "$state_file" APP_IMAGE)"
  state_release="$(state_value "$state_file" RELEASE_SHA)"
  [[ -n "$state_image" && "$state_image" != *[[:space:]]* ]] \
    || fail "invalid APP_IMAGE in $state_file"
  [[ "$state_release" =~ ^[0-9a-f]{40}$ ]] \
    || fail "invalid RELEASE_SHA in $state_file"

  # Shell variables have higher Compose precedence than --env-file. Bind the
  # identity explicitly from the audited state so an exported APP_IMAGE or
  # RELEASE_SHA cannot substitute a different artifact.
  local -a clean_env=(-i "PATH=$PATH" "HOME=${HOME:-/root}")
  local docker_key
  for docker_key in DOCKER_CONFIG DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH XDG_RUNTIME_DIR; do
    if [[ -n "${!docker_key:-}" ]]; then
      clean_env+=("$docker_key=${!docker_key}")
    fi
  done
  env "${clean_env[@]}" APP_IMAGE="$state_image" RELEASE_SHA="$state_release" docker compose \
    --project-name egadisailing \
    --env-file "$ENV_FILE" \
    --env-file "$state_file" \
    -f "$COMPOSE_FILE" \
    "$@"
}

write_state() {
  local target="$1"
  local image="$2"
  local release="$3"
  local email_rollback_safe="${4:-true}"
  [[ "$email_rollback_safe" == "true" || "$email_rollback_safe" == "false" ]] \
    || fail "invalid EMAIL_OUTBOX_ROLLBACK_SAFE value"
  {
    printf 'APP_IMAGE=%s\n' "$image"
    printf 'RELEASE_SHA=%s\n' "$release"
    printf 'EMAIL_OUTBOX_ROLLBACK_SAFE=%s\n' "$email_rollback_safe"
  } > "$target"
  chmod 600 "$target"
}

state_value() {
  local state_file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$state_file"
}

container_env_value() {
  local name="$1"
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$APP_CONTAINER" \
    | awk -F= -v key="$name" '$1 == key { sub(/^[^=]*=/, ""); print; exit }'
}

container_matches_image() {
  local expected_ref="$1"
  local expected_id actual_id
  expected_id="$(docker image inspect --format '{{.Id}}' "$expected_ref" 2>/dev/null || true)"
  actual_id="$(docker inspect --format '{{.Image}}' "$APP_CONTAINER" 2>/dev/null || true)"
  [[ -n "$expected_id" && "$actual_id" == "$expected_id" ]]
}

wait_for_backup_ready() {
  local attempt
  for attempt in $(seq 1 150); do
    if docker exec "$BACKUP_CONTAINER" sh -c \
      'command -v pg_dump >/dev/null && command -v restic >/dev/null && command -v flock >/dev/null && flock -n /backups/.backup.lock true' \
      >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

wait_for_release() {
  local expected_sha="$1"
  local expected_image="$2"
  local app_url ops_secret response attempt
  app_url="$(dotenv_value APP_URL)"
  ops_secret="$(dotenv_value OPS_HEALTH_SECRET)"
  [[ -n "$app_url" && -n "$ops_secret" ]] || return 1

  for attempt in $(seq 1 60); do
    if container_matches_image "$expected_image" \
      && [[ "$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$APP_CONTAINER" 2>/dev/null || true)" == "healthy" ]]; then
      response="$(curl --connect-timeout 5 --max-time 15 -fsS "$app_url/api/health" 2>/dev/null || true)"
      if [[ -n "$response" ]] && grep -Fq "$expected_sha" <<< "$response"; then
        if curl --connect-timeout 5 --max-time 30 -fsS \
          -H "Authorization: Bearer $ops_secret" \
          "$app_url/api/health?deep=1" >/dev/null; then
          return 0
        fi
      fi
    fi
    sleep 5
  done
  return 1
}

rollback_after_failure() {
  echo "[deploy] release failed health verification; restoring the previous image" >&2
  echo "[deploy] database migrations are intentionally NOT rolled back" >&2
  if [[ ! -f "$ROLLBACK_STATE" ]]; then
    echo "[deploy] no rollback state is available" >&2
    return 1
  fi
  if [[ "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" != "true" ]]; then
    echo "[deploy] legacy rollback: stopping candidate before resolving ambiguous email claims" >&2
    compose_with_state "$CANDIDATE_STATE" stop app || return 1
    compose_with_state "$CANDIDATE_STATE" run --rm --no-deps \
      --entrypoint /nodejs/bin/node app \
      /app/deploy/prepare-email-rollback.mjs || return 1
  fi
  compose_with_state "$ROLLBACK_STATE" up -d --no-build app || return 1
  local app_url attempt expected_release expected_image
  expected_release="$(state_value "$ROLLBACK_STATE" RELEASE_SHA)"
  expected_image="$(state_value "$ROLLBACK_STATE" APP_IMAGE)"
  if [[ "$expected_release" =~ ^[0-9a-f]{40}$ \
    && "$expected_release" != "0000000000000000000000000000000000000000" ]]; then
    if wait_for_release "$expected_release" "$expected_image"; then
      cp "$ROLLBACK_STATE" "$CURRENT_STATE" || return 1
      chmod 600 "$CURRENT_STATE" || return 1
      echo "[deploy] previous immutable release restored and deep-health verified" >&2
      return 0
    fi
    echo "[deploy] rollback release failed deep/release verification" >&2
    return 1
  fi

  # Una sola eccezione per il primo rollback verso l'immagine legacy, che non
  # espone ancora release SHA/deep health nel nuovo formato.
  app_url="$(dotenv_value APP_URL)"
  for attempt in $(seq 1 60); do
    if container_matches_image "$expected_image" \
      && curl --connect-timeout 5 --max-time 15 -fsS "$app_url/api/health" >/dev/null 2>&1; then
      cp "$ROLLBACK_STATE" "$CURRENT_STATE" || return 1
      chmod 600 "$CURRENT_STATE" || return 1
      echo "[deploy] WARNING: legacy image restored with shallow-only verification" >&2
      echo "[deploy] verify DB/Redis and booking smoke manually" >&2
      return 0
    fi
    sleep 5
  done
  echo "[deploy] rollback container did not become healthy" >&2
  return 1
}

deploy_exit_guard() {
  local status="$?"
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$CUTOVER_STARTED" == "true" \
    && -f "$IN_PROGRESS_STATE" ]]; then
    echo "[deploy] interrupted after application cutover; attempting verified rollback" >&2
    if rollback_after_failure; then
      rm -f "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
        "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP"
    else
      echo "[deploy] CRITICAL: rollback failed; state journal preserved in $STATE_DIR" >&2
    fi
  elif [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$TEMP_STATE_OWNED" == "true" ]]; then
    # Prima del cutover l'app live non e' cambiata: gli state temporanei non
    # hanno valore di recovery e possono essere rimossi in sicurezza.
    rm -f "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
      "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP"
  fi
  exit "$status"
}

trap deploy_exit_guard EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -eq 1 ]] || fail "usage: deploy/release.sh <40-char-sha>"
RELEASE_SHA="${1,,}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "release must be a full 40-character Git SHA"

for command_name in git docker curl awk cosign grep flock; do
  command -v "$command_name" >/dev/null 2>&1 || fail "missing command: $command_name"
done
[[ -f "$ENV_FILE" ]] || fail "missing $ENV_FILE"
[[ -f "$COMPOSE_FILE" ]] || fail "missing $COMPOSE_FILE"
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] \
  || fail "$ENV_FILE must have mode 0600"
[[ "$(stat -c '%U' "$ENV_FILE")" == "$(id -un)" ]] \
  || fail "$ENV_FILE must be owned by the deploying user"

cd "$ROOT_DIR"
[[ -z "$(git status --porcelain --untracked-files=all)" ]] || fail "checkout is not clean"
[[ "$(git branch --show-current)" == "main" ]] \
  || fail "production checkout must be on main"
for forbidden_path in \
  private \
  outreach-data \
  contact-ledgers \
  scripts/send-partner-emails.mjs \
  docs/partner-email-send-log.json; do
  [[ ! -e "$ROOT_DIR/$forbidden_path" ]] \
    || fail "$forbidden_path must be archived outside the production checkout"
done
[[ "$(git rev-parse HEAD)" == "$RELEASE_SHA" ]] || fail "checkout HEAD does not equal requested release"
echo "[deploy] refreshing the authoritative origin/main reference"
git fetch --prune origin main
[[ "$(git rev-parse origin/main)" == "$RELEASE_SHA" ]] \
  || fail "requested release is not the current origin/main tip"

for required_env in \
  OPS_HEALTH_SECRET \
  SENTRY_DSN \
  RESTIC_REPOSITORY \
  RESTIC_PASSWORD \
  BOKUN_VENDOR_ID \
  BOKUN_ACCESS_KEY \
  BOKUN_SECRET_KEY \
  BOKUN_WEBHOOK_SECRET \
  QUEUE_HISTORY_EXPORT_MARKER; do
  [[ -n "$(dotenv_value "$required_env")" ]] || fail "$required_env must be configured in .env"
done
[[ "$(dotenv_value BOKUN_API_URL)" != *bokuntest* ]] \
  || fail "BOKUN_API_URL must not use the Bokun test host in production"
[[ "$(dotenv_value SENTRY_TEST_EVENT_CONFIRMED_SHA)" == "$RELEASE_SHA" ]] \
  || fail "Sentry test event is not confirmed for this exact release SHA"
[[ "$(dotenv_value TELEGRAM_EXPOSED_TOKEN_REVOKED_CONFIRMED)" == "true" ]] \
  || fail "BotFather revocation of the exposed Telegram token is not confirmed"
[[ "$(dotenv_value BOKUN_PRICING_SYNC_ENABLED)" == "false" ]] \
  || fail "BOKUN_PRICING_SYNC_ENABLED must remain explicitly false until vendor canary approval"

echo "[deploy] verifying encrypted legacy queue evidence"
bash "$ROOT_DIR/deploy/verify-queue-evidence.sh" \
  "$(dotenv_value QUEUE_HISTORY_EXPORT_MARKER)"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 9>"$DEPLOY_LOCK"
flock -n 9 || fail "another release or rollback is already running"
DEPLOY_LOCK_ACQUIRED=true
[[ ! -e "$ROLLBACK_SWAP_STATE" ]] \
  || fail "interrupted rollback journal exists at $ROLLBACK_SWAP_STATE; recover that rollback before releasing"
for stale_state in \
  "$IN_PROGRESS_STATE" \
  "$CANDIDATE_STATE" \
  "$ROLLBACK_STATE" \
  "$CURRENT_STATE_TMP" \
  "$PREVIOUS_STATE_TMP"; do
  [[ ! -e "$stale_state" ]] \
    || fail "interrupted release state exists at $stale_state; reconcile it before retrying"
done

IMAGE_TAG="${IMAGE_REPOSITORY}:${RELEASE_SHA}"
echo "[deploy] pulling $IMAGE_TAG"
docker pull "$IMAGE_TAG"

IMAGE_DIGEST="$(
  docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$IMAGE_TAG" \
    | awk -v prefix="${IMAGE_REPOSITORY}@sha256:" 'index($0, prefix) == 1 { print; exit }'
)"
IMAGE_DIGEST_HEX="${IMAGE_DIGEST#"${IMAGE_REPOSITORY}@sha256:"}"
[[ "$IMAGE_DIGEST" == "${IMAGE_REPOSITORY}@sha256:${IMAGE_DIGEST_HEX}" \
  && "$IMAGE_DIGEST_HEX" =~ ^[0-9a-f]{64}$ ]] \
    || fail "could not resolve an immutable digest for $IMAGE_TAG"

IMAGE_REVISION="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE_TAG")"
[[ "${IMAGE_REVISION,,}" == "$RELEASE_SHA" ]] \
  || fail "image OCI revision label does not equal $RELEASE_SHA"
EXPECTED_PUBLIC_CONFIG_SHA="$(bash "$ROOT_DIR/scripts/public-build-config-hash.sh" "$ENV_FILE")"
IMAGE_PUBLIC_CONFIG_SHA="$(docker image inspect --format '{{index .Config.Labels "com.egadisailing.public-config-sha256"}}' "$IMAGE_TAG")"
[[ "$EXPECTED_PUBLIC_CONFIG_SHA" =~ ^[0-9a-f]{64}$ \
  && "$IMAGE_PUBLIC_CONFIG_SHA" == "$EXPECTED_PUBLIC_CONFIG_SHA" ]] \
  || fail "image public build configuration does not match the production env"

echo "[deploy] verifying keyless signature for the immutable digest"
cosign verify \
  --certificate-identity "$COSIGN_CERTIFICATE_IDENTITY" \
  --certificate-oidc-issuer "$COSIGN_OIDC_ISSUER" \
  "$IMAGE_DIGEST" >/dev/null \
  || fail "image digest is not signed by the protected release workflow"
TEMP_STATE_OWNED=true
write_state "$CANDIDATE_STATE" "$IMAGE_DIGEST" "$RELEASE_SHA" true

docker inspect "$APP_CONTAINER" >/dev/null 2>&1 \
  || fail "no running production app found; initial provisioning requires the runbook"
if [[ -f "$CURRENT_STATE" ]] \
  && [[ "$(state_value "$CURRENT_STATE" APP_IMAGE)" =~ ^[^[:space:]]+@sha256:[0-9a-f]{64}$ ]] \
  && [[ "$(state_value "$CURRENT_STATE" RELEASE_SHA)" =~ ^[0-9a-f]{40}$ ]]; then
  # Dal secondo deploy in poi il rollback usa esattamente il digest GHCR
  # persistito, non il config image ID locale del container.
  cp "$CURRENT_STATE" "$ROLLBACK_STATE"
  chmod 600 "$ROLLBACK_STATE"
else
  # Bootstrap dal vecchio container costruito sul checkout: non esiste un
  # RepoDigest affidabile. Lo conserviamo per il solo primo rollback e lo
  # sostituiamo con digest GHCR al deploy successivo.
  PREVIOUS_IMAGE="$(docker inspect --format '{{.Image}}' "$APP_CONTAINER")"
  PREVIOUS_RELEASE="$(container_env_value GIT_SHA)"
  if [[ ! "$PREVIOUS_RELEASE" =~ ^[0-9a-fA-F]{40}$ ]]; then
    PREVIOUS_RELEASE="0000000000000000000000000000000000000000"
  fi
  write_state "$ROLLBACK_STATE" "$PREVIOUS_IMAGE" "${PREVIOUS_RELEASE,,}" false
fi

echo "[deploy] ensuring backup sidecar is ready"
compose_with_state "$CANDIDATE_STATE" up -d --no-build postgres backup
wait_for_backup_ready || fail "backup sidecar did not become ready"
echo "[deploy] forcing encrypted pre-migration backup"
docker exec "$BACKUP_CONTAINER" /backup.sh

echo "[deploy] proving the latest offsite snapshot can be restored"
"$ROOT_DIR/deploy/restore-drill.sh"

echo "[deploy] applying forward-only Prisma migrations"
compose_with_state "$CANDIDATE_STATE" run --rm --no-deps \
  --entrypoint /nodejs/bin/node app \
  ./node_modules/prisma/build/index.js migrate deploy

echo "[deploy] starting immutable application image"
cp "$CANDIDATE_STATE" "$IN_PROGRESS_STATE"
chmod 600 "$IN_PROGRESS_STATE"
CUTOVER_STARTED=true
compose_with_state "$CANDIDATE_STATE" up -d --no-build app \
  || fail "container startup failed"

wait_for_release "$RELEASE_SHA" "$IMAGE_DIGEST" \
  || fail "shallow/deep/release health gate failed"

cp "$ROLLBACK_STATE" "$PREVIOUS_STATE_TMP"
cp "$CANDIDATE_STATE" "$CURRENT_STATE_TMP"
chmod 600 "$PREVIOUS_STATE_TMP" "$CURRENT_STATE_TMP"
mv "$PREVIOUS_STATE_TMP" "$PREVIOUS_STATE"
mv "$CURRENT_STATE_TMP" "$CURRENT_STATE"
rm -f "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE"

echo "[deploy] release healthy; purging Cloudflare cache"
clean_cf_env=(-i "PATH=$PATH" "HOME=${HOME:-/root}")
for cf_env_key in XDG_RUNTIME_DIR; do
  if [[ -n "${!cf_env_key:-}" ]]; then
    clean_cf_env+=("$cf_env_key=${!cf_env_key}")
  fi
done
if ! env "${clean_cf_env[@]}" "$ROOT_DIR/scripts/cloudflare-purge-cache.sh"; then
  echo "[deploy] WARNING: release is healthy but Cloudflare purge failed; retry it manually" >&2
fi

echo "[deploy] deployed $RELEASE_SHA as $IMAGE_DIGEST"
echo "[deploy] previous image retained; do not prune it before the rollback window ends"
