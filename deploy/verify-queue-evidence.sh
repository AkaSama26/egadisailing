#!/usr/bin/env bash
# Fail-closed proof that legacy BullMQ history was exported and encrypted
# before a release can start retention-aware workers.
set -euo pipefail

SCRIPT_PATH="${BASH_SOURCE[0]:-$0}"
ROOT_DIR="$(cd "$(dirname "$SCRIPT_PATH")/.." && pwd)"

fail() {
  echo "[queue-evidence] ERROR: $*" >&2
  exit 1
}

[[ $# -eq 1 ]] || fail "usage: deploy/verify-queue-evidence.sh <marker-file>"
MARKER_FILE="$1"
[[ "$MARKER_FILE" = /* ]] || fail "marker path must be absolute"
[[ -f "$MARKER_FILE" && ! -L "$MARKER_FILE" ]] \
  || fail "marker must be a regular, non-symlink file"

for command_name in awk dd jq openssl realpath sha256sum stat; do
  command -v "$command_name" >/dev/null 2>&1 || fail "missing command: $command_name"
done

assert_private_file() {
  local path="$1"
  [[ -f "$path" && ! -L "$path" ]] || fail "$path must be a regular, non-symlink file"
  [[ "$(stat -c '%a' "$path")" == "600" ]] || fail "$path must have mode 0600"
  [[ "$(stat -c '%U' "$path")" == "$(id -un)" ]] \
    || fail "$path must be owned by $(id -un)"
}

marker_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$MARKER_FILE"
}

assert_private_file "$MARKER_FILE"
[[ "$(marker_value FORMAT)" == "egadisailing-queue-evidence-v1" ]] \
  || fail "unsupported marker format"

EXPORT_PATH="$(realpath -e "$(marker_value EXPORT_PATH)")"
KEY_PATH="$(realpath -e "$(marker_value KEY_PATH)")"
EXPECTED_SHA256="$(marker_value EXPORT_SHA256)"
EXPECTED_TOTAL="$(marker_value EXPECTED_TOTAL)"
EXPECTED_PRICING="$(marker_value EXPECTED_PRICING_BOKUN)"
EXPECTED_EMAIL="$(marker_value EXPECTED_TRANSACTIONAL)"
PBKDF2_ITERATIONS="$(marker_value PBKDF2_ITERATIONS)"

[[ "$EXPORT_PATH" != "$ROOT_DIR"/* && "$KEY_PATH" != "$ROOT_DIR"/* ]] \
  || fail "evidence and key must stay outside the production checkout"
assert_private_file "$EXPORT_PATH"
assert_private_file "$KEY_PATH"
[[ "$EXPECTED_SHA256" =~ ^[0-9a-f]{64}$ ]] || fail "invalid export checksum"
[[ "$EXPECTED_TOTAL" =~ ^[0-9]+$ && "$EXPECTED_TOTAL" -gt 0 ]] \
  || fail "invalid expected total"
[[ "$EXPECTED_PRICING" =~ ^[0-9]+$ && "$EXPECTED_EMAIL" =~ ^[0-9]+$ ]] \
  || fail "invalid queue counts"
[[ "$PBKDF2_ITERATIONS" =~ ^[0-9]+$ && "$PBKDF2_ITERATIONS" -ge 200000 ]] \
  || fail "PBKDF2 iterations must be at least 200000"

ACTUAL_SHA256="$(sha256sum "$EXPORT_PATH" | awk '{print $1}')"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || fail "encrypted export checksum mismatch"
[[ "$(dd if="$EXPORT_PATH" bs=8 count=1 2>/dev/null)" == "Salted__" ]] \
  || fail "export does not have an OpenSSL salted envelope"

# Decrypt only as a stream and validate the archived counts. No plaintext
# file is created and no job payload is printed.
openssl enc -d -aes-256-cbc -pbkdf2 -iter "$PBKDF2_ITERATIONS" \
  -pass "file:$KEY_PATH" -in "$EXPORT_PATH" \
  | jq -e \
      --argjson total "$EXPECTED_TOTAL" \
      --argjson pricing "$EXPECTED_PRICING" \
      --argjson email "$EXPECTED_EMAIL" '
        (.queues | type == "object") and
        ([.queues[] | length] | add == $total) and
        (.queues["sync.pricing.bokun"] | length == $pricing) and
        (.queues["email.transactional"] | length == $email)
      ' >/dev/null \
  || fail "encrypted export cannot be decrypted or does not match marker counts"

echo "[queue-evidence] verified encrypted export: total=$EXPECTED_TOTAL pricing=$EXPECTED_PRICING email=$EXPECTED_EMAIL"
