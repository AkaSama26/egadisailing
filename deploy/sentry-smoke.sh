#!/usr/bin/env bash
# Send one tagged event from the exact immutable release image.
# Usage: deploy/sentry-smoke.sh <40-char-sha>
set -euo pipefail

umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
IMAGE_REPOSITORY="ghcr.io/akasama26/egadisailing"

fail() {
  echo "[sentry-smoke] ERROR: $*" >&2
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

[[ $# -eq 1 ]] || fail "usage: deploy/sentry-smoke.sh <40-char-sha>"
release_sha="${1,,}"
[[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || fail "release must be a full SHA"
[[ -f "$ENV_FILE" ]] || fail "missing $ENV_FILE"
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" ]] || fail "$ENV_FILE must be mode 0600"

sentry_dsn="$(dotenv_value SENTRY_DSN)"
sentry_environment="$(dotenv_value SENTRY_ENVIRONMENT)"
[[ -n "$sentry_dsn" && "$sentry_dsn" != *$'\n'* ]] || fail "invalid SENTRY_DSN"
[[ "$sentry_environment" != *$'\n'* ]] || fail "invalid SENTRY_ENVIRONMENT"

image_tag="${IMAGE_REPOSITORY}:${release_sha}"
docker pull "$image_tag"
revision="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image_tag")"
[[ "${revision,,}" == "$release_sha" ]] || fail "OCI revision does not match $release_sha"

runtime_env="$(mktemp "${TMPDIR:-/tmp}/egadisailing-sentry.XXXXXX")"
trap 'rm -f "$runtime_env"' EXIT
printf 'SENTRY_DSN=%s\nSENTRY_ENVIRONMENT=%s\n' \
  "$sentry_dsn" "${sentry_environment:-production}" > "$runtime_env"
chmod 600 "$runtime_env"

docker run --rm \
  --env-file "$runtime_env" \
  --volume "$ROOT_DIR/deploy/sentry-test-event.mjs:/app/sentry-test-event.mjs:ro" \
  --entrypoint /nodejs/bin/node \
  "$image_tag" \
  /app/sentry-test-event.mjs

echo "[sentry-smoke] confirm the event in Sentry, then set:"
echo "SENTRY_TEST_EVENT_CONFIRMED_SHA=$release_sha"
