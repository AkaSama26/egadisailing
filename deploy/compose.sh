#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"
RELEASE_STATE="$ROOT_DIR/.deploy/current-release.env"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "[compose] missing $ROOT_DIR/.env" >&2
  exit 1
fi
if [[ ! -f "$RELEASE_STATE" ]]; then
  echo "[compose] missing release state: $RELEASE_STATE" >&2
  exit 1
fi

state_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$RELEASE_STATE"
}

APP_IMAGE_FROM_STATE="$(state_value APP_IMAGE)"
RELEASE_SHA_FROM_STATE="$(state_value RELEASE_SHA)"
[[ -n "$APP_IMAGE_FROM_STATE" && "$APP_IMAGE_FROM_STATE" != *[[:space:]]* ]] \
  || { echo "[compose] invalid APP_IMAGE in $RELEASE_STATE" >&2; exit 1; }
[[ "$RELEASE_SHA_FROM_STATE" =~ ^[0-9a-f]{40}$ ]] \
  || { echo "[compose] invalid RELEASE_SHA in $RELEASE_STATE" >&2; exit 1; }

cd "$ROOT_DIR"
clean_env=(-i "PATH=$PATH" "HOME=${HOME:-/root}")
for docker_key in DOCKER_CONFIG DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH XDG_RUNTIME_DIR; do
  if [[ -n "${!docker_key:-}" ]]; then
    clean_env+=("$docker_key=${!docker_key}")
  fi
done
exec env "${clean_env[@]}" \
  APP_IMAGE="$APP_IMAGE_FROM_STATE" \
  RELEASE_SHA="$RELEASE_SHA_FROM_STATE" \
  docker compose \
  --project-name egadisailing \
  --env-file "$ROOT_DIR/.env" \
  --env-file "$RELEASE_STATE" \
  -f "$COMPOSE_FILE" \
  "$@"
