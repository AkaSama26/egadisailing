#!/usr/bin/env bash
# Print `absent` or the immutable manifest digest for one GHCR tag.
# Every network/auth/schema error is fatal so release checks stay fail-closed.
set -euo pipefail

[[ $# -eq 2 ]] || { echo "usage: $0 <ghcr-image> <40-char-sha>" >&2; exit 2; }
IMAGE_NAME="$1"
RELEASE_SHA="$2"
GHCR_TOKEN="${GHCR_TOKEN:?GHCR_TOKEN required}"
[[ "$IMAGE_NAME" == ghcr.io/* && "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] \
  || { echo "invalid GHCR image or release SHA" >&2; exit 2; }

repository="${IMAGE_NAME#ghcr.io/}"
registry_token="$(
  curl --proto '=https' --tlsv1.2 --fail --silent --show-error \
    --user "${GITHUB_ACTOR:?GITHUB_ACTOR required}:${GHCR_TOKEN}" \
    --get 'https://ghcr.io/token' \
    --data-urlencode 'service=ghcr.io' \
    --data-urlencode "scope=repository:${repository}:pull" \
    | jq -er '.token'
)"

scratch_dir="${RUNNER_TEMP:-/tmp}"
response_file="$(mktemp "${scratch_dir%/}/egadisailing-ghcr-response.XXXXXX")"
headers_file="$(mktemp "${scratch_dir%/}/egadisailing-ghcr-headers.XXXXXX")"
trap 'rm -f "$response_file" "$headers_file"' EXIT

status="$(
  curl --proto '=https' --tlsv1.2 --silent --show-error \
    --dump-header "$headers_file" \
    --output "$response_file" --write-out '%{http_code}' \
    --header "Authorization: Bearer ${registry_token}" \
    --header 'Accept: application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json' \
    "https://ghcr.io/v2/${repository}/manifests/${RELEASE_SHA}"
)"

case "$status" in
  200)
    digest="$(awk 'tolower($1) == "docker-content-digest:" { gsub("\r", "", $2); print $2; exit }' "$headers_file")"
    [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] \
      || { echo "GHCR returned an invalid manifest digest" >&2; exit 1; }
    printf '%s\n' "$digest"
    ;;
  404)
    error_code="$(jq -r '.errors[0].code // empty' "$response_file" 2>/dev/null || true)"
    [[ "$error_code" == "MANIFEST_UNKNOWN" || "$error_code" == "NAME_UNKNOWN" ]] \
      || { echo "unexpected GHCR 404 response" >&2; exit 1; }
    printf 'absent\n'
    ;;
  *)
    echo "GHCR release-tag check failed with HTTP $status" >&2
    exit 1
    ;;
esac
