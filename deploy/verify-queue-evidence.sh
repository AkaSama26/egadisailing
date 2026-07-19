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

for command_name in awk dd jq mktemp mv openssl realpath sha256sum stat; do
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
[[ "$EXPECTED_TOTAL" =~ ^[0-9]+$ ]] \
  || fail "invalid expected total"
[[ "$EXPECTED_PRICING" =~ ^[0-9]+$ && "$EXPECTED_EMAIL" =~ ^[0-9]+$ ]] \
  || fail "invalid queue counts"
EXPECTED_SUM=$((10#$EXPECTED_PRICING + 10#$EXPECTED_EMAIL))
[[ "$EXPECTED_TOTAL" -eq "$EXPECTED_SUM" ]] \
  || fail "expected total does not equal pricing plus transactional counts"
[[ "$PBKDF2_ITERATIONS" =~ ^[0-9]+$ && "$PBKDF2_ITERATIONS" -ge 200000 ]] \
  || fail "PBKDF2 iterations must be at least 200000"

ACTUAL_SHA256="$(sha256sum "$EXPORT_PATH" | awk '{print $1}')"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || fail "encrypted export checksum mismatch"
[[ "$(dd if="$EXPORT_PATH" bs=8 count=1 2>/dev/null)" == "Salted__" ]] \
  || fail "export does not have an OpenSSL salted envelope"

# Decrypt only as a stream and project a payload-free, canonical identity
# manifest. The full job bodies never touch disk. Exact IDs bind the later
# purge to the evidence actually archived, so a same-count job substitution
# cannot cause a new job to be deleted.
MANIFEST_PATH="${MARKER_FILE}.job-ids.json"
[[ ! -e "$MANIFEST_PATH" || ( -f "$MANIFEST_PATH" && ! -L "$MANIFEST_PATH" ) ]] \
  || fail "$MANIFEST_PATH must be absent or a regular, non-symlink file"
MANIFEST_BUILD="$(mktemp "${MANIFEST_PATH}.build.XXXXXX")"
MANIFEST_TMP="$(mktemp "${MANIFEST_PATH}.tmp.XXXXXX")"
chmod 600 "$MANIFEST_BUILD" "$MANIFEST_TMP"
cleanup_manifest_tmp() {
  rm -f "$MANIFEST_BUILD" "$MANIFEST_TMP"
}
trap cleanup_manifest_tmp EXIT INT TERM

openssl enc -d -aes-256-cbc -pbkdf2 -iter "$PBKDF2_ITERATIONS" \
  -pass "file:$KEY_PATH" -in "$EXPORT_PATH" \
  | jq -ceS \
      --arg source_sha256 "$EXPECTED_SHA256" \
      --argjson total "$EXPECTED_TOTAL" \
      --argjson pricing "$EXPECTED_PRICING" \
      --argjson email "$EXPECTED_EMAIL" '
        def valid_id:
          type == "string" and
          length >= 1 and length <= 512 and
          (explode | all(. >= 33 and . <= 126));
        def queue_ids($name):
          if (.queues[$name] | type) != "array" then
            error("missing queue array: " + $name)
          else
            [.queues[$name][] | .id |
              if valid_id then . else error("invalid job ID in " + $name) end]
          end;

        if (.queues | type) != "object" or
           ([.queues[] | if type == "array" then length else error("invalid queue archive") end] | add) != $total
        then error("queue archive total mismatch") else . end
        | queue_ids("email.transactional") as $email_ids
        | queue_ids("sync.pricing.bokun") as $pricing_ids
        | if ($email_ids | length) != $email or
             ($pricing_ids | length) != $pricing or
             ($email_ids | unique | length) != ($email_ids | length) or
             ($pricing_ids | unique | length) != ($pricing_ids | length)
          then error("queue count mismatch or duplicate job ID") else . end
        | {
            format: "egadisailing-queue-id-manifest-v1",
            sourceExportSha256: $source_sha256,
            queues: {
              "email.transactional": ($email_ids | sort),
              "sync.pricing.bokun": ($pricing_ids | sort)
            }
          }
      ' > "$MANIFEST_BUILD" \
  || fail "encrypted export cannot be decrypted or does not contain the exact unique job IDs"

EMAIL_IDS_SHA256="$(jq -cj '.queues["email.transactional"]' "$MANIFEST_BUILD" | sha256sum | awk '{print $1}')"
PRICING_IDS_SHA256="$(jq -cj '.queues["sync.pricing.bokun"]' "$MANIFEST_BUILD" | sha256sum | awk '{print $1}')"
jq -cSe \
  --arg email_sha256 "$EMAIL_IDS_SHA256" \
  --arg pricing_sha256 "$PRICING_IDS_SHA256" '
    . + {
      queueDigests: {
        "email.transactional": $email_sha256,
        "sync.pricing.bokun": $pricing_sha256
      }
    }
  ' "$MANIFEST_BUILD" > "$MANIFEST_TMP" \
  || fail "could not finalize canonical queue identity manifest"

chmod 600 "$MANIFEST_TMP"
mv -f "$MANIFEST_TMP" "$MANIFEST_PATH"
chmod 600 "$MANIFEST_PATH"
assert_private_file "$MANIFEST_PATH"
MANIFEST_SHA256="$(sha256sum "$MANIFEST_PATH" | awk '{print $1}')"
rm -f "$MANIFEST_BUILD"
trap - EXIT INT TERM

echo "[queue-evidence] verified encrypted export: total=$EXPECTED_TOTAL pricing=$EXPECTED_PRICING email=$EXPECTED_EMAIL"
echo "HISTORICAL_QUEUE_EVIDENCE_MANIFEST=$MANIFEST_PATH"
echo "HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256=$MANIFEST_SHA256"
