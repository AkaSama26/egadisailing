#!/usr/bin/env bash
# Roll back only the application image. Database migrations stay applied.
set -euo pipefail

umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
DEPLOY_LOCK="$STATE_DIR/deploy.lock"
CURRENT_STATE="$STATE_DIR/current-release.env"
PREVIOUS_STATE="$STATE_DIR/previous-release.env"
SWAP_STATE="$STATE_DIR/rollback-swap.env"
RELEASE_IN_PROGRESS_STATE="$STATE_DIR/release-in-progress.env"
RELEASE_CANDIDATE_STATE="$STATE_DIR/candidate-release.env"
RELEASE_ROLLBACK_STATE="$STATE_DIR/rollback-candidate.env"
RELEASE_CURRENT_TMP="$STATE_DIR/current-release.env.tmp"
RELEASE_PREVIOUS_TMP="$STATE_DIR/previous-release.env.tmp"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"
ROLLBACK_ATTEMPT_ACTIVE=false

dotenv_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^\047|\047$|^\042|\042$/, ""); print; exit }' "$ENV_FILE"
}

state_value() {
  local file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$file"
}

compose_with_state() {
  local state_file="$1"
  shift
  local state_image state_release
  state_image="$(state_value "$state_file" APP_IMAGE)"
  state_release="$(state_value "$state_file" RELEASE_SHA)"
  [[ -n "$state_image" && "$state_image" != *[[:space:]]* ]] \
    || { echo "[rollback] invalid APP_IMAGE in $state_file" >&2; return 1; }
  [[ "$state_release" =~ ^[0-9a-f]{40}$ ]] \
    || { echo "[rollback] invalid RELEASE_SHA in $state_file" >&2; return 1; }
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

container_matches_image() {
  local expected_ref="$1"
  local expected_id actual_id
  expected_id="$(docker image inspect --format '{{.Id}}' "$expected_ref" 2>/dev/null || true)"
  actual_id="$(docker inspect --format '{{.Image}}' egadisailing-app 2>/dev/null || true)"
  [[ -n "$expected_id" && "$actual_id" == "$expected_id" ]]
}

wait_for_state() {
  local state_file="$1"
  local expected_sha expected_image app_url ops_secret response attempt
  expected_sha="$(state_value "$state_file" RELEASE_SHA)"
  expected_image="$(state_value "$state_file" APP_IMAGE)"
  app_url="$(dotenv_value APP_URL)"
  ops_secret="$(dotenv_value OPS_HEALTH_SECRET)"

  for attempt in $(seq 1 60); do
    response="$(curl --connect-timeout 5 --max-time 15 -fsS "$app_url/api/health" 2>/dev/null || true)"
    if [[ "$expected_sha" =~ ^[0-9a-f]{40}$ \
      && "$expected_sha" != "0000000000000000000000000000000000000000" ]]; then
      if container_matches_image "$expected_image" \
        && [[ -n "$ops_secret" && "$response" == *"$expected_sha"* ]] \
        && curl --connect-timeout 5 --max-time 30 -fsS \
          -H "Authorization: Bearer $ops_secret" \
          "$app_url/api/health?deep=1" >/dev/null 2>&1; then
        return 0
      fi
    elif container_matches_image "$expected_image" && [[ -n "$response" ]]; then
      echo "[rollback] WARNING: validating the one-time legacy rollback shallow-only" >&2
      return 0
    fi
    sleep 5
  done
  return 1
}

restore_newer_image() {
  echo "[rollback] restoring the newer image" >&2
  if compose_with_state "$SWAP_STATE" up -d --no-build app \
    && wait_for_state "$SWAP_STATE"; then
    cp "$SWAP_STATE" "$CURRENT_STATE" || return 1
    chmod 600 "$CURRENT_STATE" || return 1
    rm -f "$SWAP_STATE" || return 1
    echo "[rollback] newer image restored and health-verified" >&2
    return 0
  fi
  echo "[rollback] CRITICAL: failed to restore and verify the newer image" >&2
  return 1
}

rollback_exit_guard() {
  local status="$?"
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 && "$ROLLBACK_ATTEMPT_ACTIVE" == "true" && -f "$SWAP_STATE" ]]; then
    echo "[rollback] interrupted before commit; attempting to restore the newer release" >&2
    restore_newer_image || true
  fi
  exit "$status"
}

trap rollback_exit_guard EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -eq 0 ]] || { echo "usage: deploy/rollback.sh" >&2; exit 1; }
[[ -f "$CURRENT_STATE" && -f "$PREVIOUS_STATE" ]] \
  || { echo "[rollback] current/previous release state is missing" >&2; exit 1; }

cd "$ROOT_DIR"
[[ -z "$(git status --porcelain --untracked-files=all)" ]] \
  || { echo "[rollback] checkout is not clean" >&2; exit 1; }
command -v flock >/dev/null 2>&1 \
  || { echo "[rollback] missing command: flock" >&2; exit 1; }
exec 9>"$DEPLOY_LOCK"
flock -n 9 || { echo "[rollback] another release or rollback is already running" >&2; exit 1; }

for release_state in \
  "$RELEASE_IN_PROGRESS_STATE" \
  "$RELEASE_CANDIDATE_STATE" \
  "$RELEASE_ROLLBACK_STATE" \
  "$RELEASE_CURRENT_TMP" \
  "$RELEASE_PREVIOUS_TMP"; do
  if [[ -e "$release_state" ]]; then
    echo "[rollback] interrupted release journal exists at $release_state" >&2
    echo "[rollback] reconcile the release workflow before starting a rollback" >&2
    exit 1
  fi
done

if [[ -f "$SWAP_STATE" ]]; then
  echo "[rollback] recovering an interrupted rollback before accepting a new one" >&2
  restore_newer_image \
    || { echo "[rollback] state journal preserved for manual recovery" >&2; exit 1; }
  echo "[rollback] interrupted rollback recovered; rerun the command to start a new rollback" >&2
  exit 1
fi

cp "$CURRENT_STATE" "$SWAP_STATE"
ROLLBACK_ATTEMPT_ACTIVE=true
if [[ "$(state_value "$PREVIOUS_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" != "true" ]]; then
  echo "[rollback] legacy target: stopping current app and dismissing ambiguous email claims" >&2
  compose_with_state "$CURRENT_STATE" stop app
  compose_with_state "$CURRENT_STATE" run --rm --no-deps \
    --entrypoint /nodejs/bin/node app \
    /app/deploy/prepare-email-rollback.mjs
fi
if ! compose_with_state "$PREVIOUS_STATE" up -d --no-build app; then
  echo "[rollback] previous image failed to start" >&2
  exit 1
fi

if wait_for_state "$PREVIOUS_STATE"; then
  cp "$PREVIOUS_STATE" "$CURRENT_STATE"
  mv "$SWAP_STATE" "$PREVIOUS_STATE"
  chmod 600 "$CURRENT_STATE" "$PREVIOUS_STATE"
  echo "[rollback] previous application image passed its rollback health gate"
  echo "[rollback] no database down migration was executed"
  exit 0
fi

echo "[rollback] previous image failed deep/release health; restoring the newer image" >&2
exit 1
