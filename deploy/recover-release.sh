#!/usr/bin/env bash
# Fail-safe recovery for a hard-crashed immutable release.
# It restores the recorded rollback image with both queues held paused.
# Usage: bash deploy/recover-release.sh <status|rollback|abort-pre-cutover>
set -euo pipefail

umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.deploy"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"
DEPLOY_LOCK="$STATE_DIR/deploy.lock"
CURRENT_STATE="$STATE_DIR/current-release.env"
PREVIOUS_STATE="$STATE_DIR/previous-release.env"
PREVIOUS_STATE_TMP="${PREVIOUS_STATE}.tmp"
CANDIDATE_STATE="$STATE_DIR/candidate-release.env"
CANDIDATE_STATE_TMP="${CANDIDATE_STATE}.tmp"
ROLLBACK_STATE="$STATE_DIR/rollback-candidate.env"
ROLLBACK_STATE_TMP="${ROLLBACK_STATE}.tmp"
IN_PROGRESS_STATE="$STATE_DIR/release-in-progress.env"
IN_PROGRESS_STATE_TMP="${IN_PROGRESS_STATE}.tmp"
PROMOTION_STATE="$STATE_DIR/release-commit.env"
PROMOTION_STATE_TMP="${PROMOTION_STATE}.tmp"
EMAIL_CUTOVER_FLAG="$STATE_DIR/historical-email-cutover.in-progress"
EMAIL_CUTOVER_FLAG_TMP="${EMAIL_CUTOVER_FLAG}.tmp"
EMAIL_HOLD_STATE="$STATE_DIR/historical-email-hold.env"
EMAIL_HOLD_STATE_TMP="${EMAIL_HOLD_STATE}.tmp"
CONTAINMENT_RESULT="$STATE_DIR/historical-containment-result.json"
CONTAINMENT_RESULT_TMP="${CONTAINMENT_RESULT}.tmp"
CURRENT_STATE_TMP="${CURRENT_STATE}.tmp"
QUEUE_CONTROL="$ROOT_DIR/deploy/queue-cutover-control.cjs"
APP_CONTAINER="egadisailing-app"
ROLLBACK_SWAP_STATE="$STATE_DIR/rollback-swap.env"
ROLLBACK_SWAP_STATE_TMP="${ROLLBACK_SWAP_STATE}.tmp"
ROLLBACK_TARGET_STATE="$STATE_DIR/rollback-target.env"
ROLLBACK_TARGET_STATE_TMP="${ROLLBACK_TARGET_STATE}.tmp"
ROLLBACK_MANUAL_STATE="$STATE_DIR/rollback-email-barrier.env"
ROLLBACK_MANUAL_STATE_TMP="${ROLLBACK_MANUAL_STATE}.tmp"

MODE="${1:-}"
JOURNAL_PHASE="UNKNOWN"
JOURNAL_MANIFEST=""
JOURNAL_MANIFEST_SHA256=""
JOURNAL_ACTIVE_OBSERVED=false
ACTIVE_RECONCILIATION_PREACK=false
LAST_QUEUE_OUTPUT=""
LAST_QUEUE_STATUS=0
RECOVERY_QUIESCE_STARTED=false
RECOVERY_QUIESCE_ID=""

fail() {
  echo "[release-recovery] ERROR: $*" >&2
  exit 1
}

publish_private_state() {
  local tmp="$1"
  local target="$2"
  chmod 600 "$tmp" || return 1
  sync -f "$tmp" || return 1
  mv "$tmp" "$target" || return 1
  sync -f "$target" || return 1
  sync -f "$STATE_DIR" || return 1
}

info() {
  echo "[release-recovery] $*" >&2
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

state_value() {
  local file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$file"
}

validate_state_file() {
  local file="$1"
  local image release rollback_safe
  [[ -f "$file" && ! -L "$file" ]] || fail "$file must be a regular state file"
  image="$(state_value "$file" APP_IMAGE)"
  release="$(state_value "$file" RELEASE_SHA)"
  rollback_safe="$(state_value "$file" EMAIL_OUTBOX_ROLLBACK_SAFE)"
  [[ -n "$image" && "$image" != *[[:space:]]* ]] \
    || fail "invalid APP_IMAGE in $file"
  [[ "$release" =~ ^[0-9a-f]{40}$ ]] \
    || fail "invalid RELEASE_SHA in $file"
  [[ "$rollback_safe" == "true" || "$rollback_safe" == "false" ]] \
    || fail "invalid EMAIL_OUTBOX_ROLLBACK_SAFE in $file"
}

write_state_file() {
  local file="$1"
  local image="$2"
  local release="$3"
  local rollback_safe="$4"
  local tmp="${file}.tmp"
  [[ -n "$image" && "$image" != *[[:space:]]* ]] || fail "invalid state image"
  [[ "$release" =~ ^[0-9a-f]{40}$ ]] || fail "invalid state release"
  [[ "$rollback_safe" == "true" || "$rollback_safe" == "false" ]] \
    || fail "invalid rollback safety state"
  [[ ! -L "$file" && ! -L "$tmp" ]] || fail "state paths must not be symbolic links"
  {
    printf 'APP_IMAGE=%s\n' "$image"
    printf 'RELEASE_SHA=%s\n' "$release"
    printf 'EMAIL_OUTBOX_ROLLBACK_SAFE=%s\n' "$rollback_safe"
  } > "$tmp" || return 1
  publish_private_state "$tmp" "$file" || return 1
}

load_journal_metadata() {
  local result_file
  if [[ ! -f "$EMAIL_CUTOVER_FLAG" || -L "$EMAIL_CUTOVER_FLAG" ]]; then
    return
  fi
  JOURNAL_PHASE="$(state_value "$EMAIL_CUTOVER_FLAG" STATE)"
  JOURNAL_MANIFEST="$(state_value "$EMAIL_CUTOVER_FLAG" EVIDENCE_MANIFEST)"
  JOURNAL_MANIFEST_SHA256="$(state_value "$EMAIL_CUTOVER_FLAG" EVIDENCE_MANIFEST_SHA256)"
  JOURNAL_ACTIVE_OBSERVED="$(state_value "$EMAIL_CUTOVER_FLAG" ACTIVE_OBSERVED)"
  [[ "$JOURNAL_ACTIVE_OBSERVED" == "true" ]] || JOURNAL_ACTIVE_OBSERVED=false
  for result_file in "$CONTAINMENT_RESULT" "$CONTAINMENT_RESULT_TMP"; do
    if [[ -f "$result_file" && ! -L "$result_file" ]] \
      && jq -e '.activeObserved == true' "$result_file" >/dev/null 2>&1; then
      JOURNAL_ACTIVE_OBSERVED=true
    fi
  done
}

write_active_reconciliation_journal() {
  local release_sha="0000000000000000000000000000000000000000"
  local existing_manifest="$JOURNAL_MANIFEST"
  local existing_manifest_sha="$JOURNAL_MANIFEST_SHA256"
  local existing_cutoff=""
  if [[ -f "$CANDIDATE_STATE" ]]; then
    release_sha="$(state_value "$CANDIDATE_STATE" RELEASE_SHA)"
  elif [[ -f "$ROLLBACK_STATE" ]]; then
    release_sha="$(state_value "$ROLLBACK_STATE" RELEASE_SHA)"
  fi
  if [[ -f "$EMAIL_CUTOVER_FLAG" ]]; then
    [[ -n "$existing_manifest" ]] \
      || existing_manifest="$(state_value "$EMAIL_CUTOVER_FLAG" EVIDENCE_MANIFEST)"
    [[ -n "$existing_manifest_sha" ]] \
      || existing_manifest_sha="$(state_value "$EMAIL_CUTOVER_FLAG" EVIDENCE_MANIFEST_SHA256)"
    existing_cutoff="$(state_value "$EMAIL_CUTOVER_FLAG" CUTOFF)"
  fi
  {
    printf 'RELEASE_SHA=%s\n' "$release_sha"
    printf 'STATE=ACTIVE_RECONCILIATION_REQUIRED\n'
    printf 'FORCE_NEW_CUTOVER=true\n'
    printf 'ACTIVE_OBSERVED=true\n'
    printf 'LIVE_CONTAINER_ID=\n'
    printf 'CONTAINMENT_RESULT=%s\n' "$CONTAINMENT_RESULT"
    printf 'EXPECTED_TRANSACTIONAL=\n'
    printf 'EXPECTED_PRICING_BOKUN=\n'
    printf 'EVIDENCE_MANIFEST=%s\n' "$existing_manifest"
    printf 'EVIDENCE_MANIFEST_SHA256=%s\n' "$existing_manifest_sha"
    printf 'CUTOFF=%s\n' "$existing_cutoff"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$EMAIL_CUTOVER_FLAG_TMP" || return 1
  publish_private_state "$EMAIL_CUTOVER_FLAG_TMP" "$EMAIL_CUTOVER_FLAG" \
    || return 1
  JOURNAL_PHASE="ACTIVE_RECONCILIATION_REQUIRED"
  JOURNAL_ACTIVE_OBSERVED=true
}

compose_with_state() {
  local state_file="$1"
  shift
  local state_image state_release
  state_image="$(state_value "$state_file" APP_IMAGE)"
  state_release="$(state_value "$state_file" RELEASE_SHA)"
  local -a clean_env=(-i "PATH=$PATH" "HOME=${HOME:-/root}")
  local docker_key
  for docker_key in DOCKER_CONFIG DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH XDG_RUNTIME_DIR; do
    if [[ -n "${!docker_key:-}" ]]; then
      clean_env+=("$docker_key=${!docker_key}")
    fi
  done
  env "${clean_env[@]}" \
    APP_IMAGE="$state_image" \
    RELEASE_SHA="$state_release" \
    docker compose \
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
  actual_id="$(docker inspect --format '{{.Image}}' "$APP_CONTAINER" 2>/dev/null || true)"
  [[ -n "$expected_id" && "$actual_id" == "$expected_id" ]]
}

container_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "$APP_CONTAINER" 2>/dev/null || true)" == "true" ]]
}

run_queue_control() {
  local state_file="$1"
  local command="$2"
  local node_binary ack_active=false
  if [[ "$(state_value "$state_file" EMAIL_OUTBOX_ROLLBACK_SAFE)" == "true" ]]; then
    node_binary="/nodejs/bin/node"
  else
    node_binary="/usr/local/bin/node"
  fi
  [[ "$command" == "acknowledge-active" ]] && ack_active=true
  LAST_QUEUE_OUTPUT=""
  LAST_QUEUE_STATUS=0
  if LAST_QUEUE_OUTPUT="$(
    compose_with_state "$state_file" run --rm --no-deps -T --pull never \
      --volume "$QUEUE_CONTROL:/app/queue-cutover-control.cjs:ro" \
      -e QUEUE_CUTOVER_REQUIRE_MANIFEST=false \
      -e "QUEUE_CUTOVER_ACK_ACTIVE=$ack_active" \
      --entrypoint "$node_binary" app \
      /app/queue-cutover-control.cjs "$command" </dev/null
  )"; then
    LAST_QUEUE_STATUS=0
  else
    LAST_QUEUE_STATUS="$?"
  fi
  [[ -z "$LAST_QUEUE_OUTPUT" ]] || printf '%s\n' "$LAST_QUEUE_OUTPUT"
  return "$LAST_QUEUE_STATUS"
}

quiesce_app_without_drain() {
  local expected_id="${1:-}"
  local listed_ids current_id running paused restart_policy
  local post_id post_running post_paused post_restart_policy
  if ! listed_ids="$(
    docker ps -aq --filter "name=^/${APP_CONTAINER}$"
  )"; then
    return 1
  fi
  # Recovery may legitimately begin after Compose already removed the app.
  # A successful empty inventory is evidence; an inspect error is not.
  [[ -n "$listed_ids" ]] || return 0
  [[ "$listed_ids" != *$'\n'* ]] || return 1
  current_id="$(docker inspect --format '{{.Id}}' "$listed_ids")" \
    || return 1
  [[ "$current_id" =~ ^[0-9a-f]{64}$ ]] || return 1
  [[ -z "$expected_id" || "$current_id" == "$expected_id" ]] || return 1
  docker update --restart=no "$current_id" >/dev/null || return 1
  sync || return 1
  restart_policy="$(
    docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$current_id"
  )" || return 1
  [[ "$restart_policy" == "no" ]] || return 1
  running="$(docker inspect --format '{{.State.Running}}' "$current_id")" \
    || return 1
  paused="$(docker inspect --format '{{.State.Paused}}' "$current_id")" \
    || return 1
  [[ "$running" == "true" || "$running" == "false" ]] || return 1
  [[ "$paused" == "true" || "$paused" == "false" ]] || return 1
  if [[ "$running" == "true" && "$paused" == "false" ]]; then
    docker pause "$current_id" >/dev/null || return 1
  fi
  post_id="$(docker inspect --format '{{.Id}}' "$APP_CONTAINER")" \
    || return 1
  post_running="$(docker inspect --format '{{.State.Running}}' "$APP_CONTAINER")" \
    || return 1
  post_paused="$(docker inspect --format '{{.State.Paused}}' "$APP_CONTAINER")" \
    || return 1
  post_restart_policy="$(
    docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$APP_CONTAINER"
  )" || return 1
  [[ "$post_id" == "$current_id" \
    && "$post_restart_policy" == "no" \
    && ( "$post_running" == "false" \
      || ( "$post_running" == "true" && "$post_paused" == "true" ) ) ]]
}

force_kill_app_without_drain() {
  local expected_id="${1:-}"
  local listed_ids current_id restart_policy remaining_ids
  if ! listed_ids="$(
    docker ps -aq --filter "name=^/${APP_CONTAINER}$"
  )"; then
    return 1
  fi
  [[ -n "$listed_ids" ]] || return 0
  [[ "$listed_ids" != *$'\n'* ]] || return 1
  current_id="$(docker inspect --format '{{.Id}}' "$listed_ids")" \
    || return 1
  [[ "$current_id" =~ ^[0-9a-f]{64}$ ]] || return 1
  [[ -z "$expected_id" || "$current_id" == "$expected_id" ]] || return 1
  docker update --restart=no "$current_id" >/dev/null || return 1
  sync || return 1
  restart_policy="$(
    docker inspect --format '{{.HostConfig.RestartPolicy.Name}}' "$current_id"
  )" || return 1
  [[ "$restart_policy" == "no" ]] || return 1
  docker rm --force "$current_id" >/dev/null || return 1
  remaining_ids="$(
    docker ps -aq --filter "name=^/${APP_CONTAINER}$"
  )" || return 1
  [[ -z "$remaining_ids" ]]
}

quiesce_or_force_remove() {
  local listed_ids expected_id
  listed_ids="$(docker ps -aq --filter "name=^/${APP_CONTAINER}$")" \
    || return 1
  [[ -n "$listed_ids" ]] || return 0
  [[ "$listed_ids" != *$'\n'* ]] || return 1
  expected_id="$(docker inspect --format '{{.Id}}' "$listed_ids")" \
    || return 1
  [[ "$expected_id" =~ ^[0-9a-f]{64}$ ]] || return 1

  RECOVERY_QUIESCE_ID="$expected_id"
  RECOVERY_QUIESCE_STARTED=true
  if quiesce_app_without_drain "$expected_id"; then
    return 0
  fi

  info "freeze attestation failed; force-removing the exact app container"
  force_kill_app_without_drain "$expected_id" \
    || { info "CRITICAL: failed to freeze or remove exact app container $expected_id"; return 1; }
  info "exact app container removed after freeze failure"
}

recovery_exit_guard() {
  local status="$?"
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 && "$RECOVERY_QUIESCE_STARTED" == "true" ]]; then
    if force_kill_app_without_drain "$RECOVERY_QUIESCE_ID"; then
      info "exact app container is absent after interrupted recovery"
    else
      info "CRITICAL: could not attest removal of exact app container $RECOVERY_QUIESCE_ID"
    fi
  fi
  exit "$status"
}

trap recovery_exit_guard EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

wait_for_site() {
  local state_file="$1"
  local expected_sha expected_image app_url response attempt
  expected_sha="$(state_value "$state_file" RELEASE_SHA)"
  expected_image="$(state_value "$state_file" APP_IMAGE)"
  app_url="$(dotenv_value APP_URL)"
  [[ -n "$app_url" ]] || return 1
  for attempt in $(seq 1 60); do
    response="$(curl --connect-timeout 5 --max-time 15 -fsS "$app_url/api/health" 2>/dev/null || true)"
    if container_matches_image "$expected_image" && [[ -n "$response" ]]; then
      if [[ "$expected_sha" == "0000000000000000000000000000000000000000" ]] \
        || grep -Fq "$expected_sha" <<<"$response"; then
        return 0
      fi
    fi
    sleep 5
  done
  return 1
}

promotion_value() {
  state_value "$PROMOTION_STATE" "$1"
}

ensure_state_identity() {
  local file="$1"
  local image="$2"
  local release="$3"
  local rollback_safe="$4"
  if [[ -f "$file" ]]; then
    validate_state_file "$file" || return 1
    [[ "$(state_value "$file" APP_IMAGE)" == "$image" \
      && "$(state_value "$file" RELEASE_SHA)" == "$release" \
      && "$(state_value "$file" EMAIL_OUTBOX_ROLLBACK_SAFE)" == "$rollback_safe" ]] \
      || fail "$file disagrees with the terminal release journal"
  else
    write_state_file "$file" "$image" "$release" "$rollback_safe" \
      || return 1
  fi
}

materialize_promotion_states() {
  [[ -f "$PROMOTION_STATE" && ! -L "$PROMOTION_STATE" ]] \
    || fail "release commit journal must be a regular file"
  [[ "$(promotion_value FORMAT)" == "egadisailing-release-commit-v1" ]] \
    || fail "unsupported release commit journal format"
  local phase candidate_image candidate_sha rollback_image rollback_sha rollback_safe
  phase="$(promotion_value STATE)"
  [[ "$phase" == "PROMOTING" || "$phase" == "COMMITTED" ]] \
    || fail "invalid release commit phase $phase"
  candidate_image="$(promotion_value CANDIDATE_IMAGE)"
  candidate_sha="$(promotion_value CANDIDATE_SHA)"
  rollback_image="$(promotion_value ROLLBACK_IMAGE)"
  rollback_sha="$(promotion_value ROLLBACK_SHA)"
  rollback_safe="$(promotion_value ROLLBACK_EMAIL_SAFE)"
  ensure_state_identity "$CANDIDATE_STATE" \
    "$candidate_image" "$candidate_sha" true || return 1
  ensure_state_identity "$ROLLBACK_STATE" \
    "$rollback_image" "$rollback_sha" "$rollback_safe" || return 1
}

recover_committed_promotion() {
  materialize_promotion_states || return 1
  [[ "$(promotion_value STATE)" == "COMMITTED" ]] \
    || return 1

  # COMMITTED is the atomic decision point. Recreate both authoritative views,
  # start/verify the committed image if needed, and only then remove journals.
  write_state_file "$CURRENT_STATE" \
    "$(state_value "$CANDIDATE_STATE" APP_IMAGE)" \
    "$(state_value "$CANDIDATE_STATE" RELEASE_SHA)" true || return 1
  write_state_file "$PREVIOUS_STATE" \
    "$(state_value "$ROLLBACK_STATE" APP_IMAGE)" \
    "$(state_value "$ROLLBACK_STATE" RELEASE_SHA)" \
    "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" || return 1
  compose_with_state "$CANDIDATE_STATE" up -d --no-build --force-recreate app \
    || fail "committed candidate image could not be restored"
  wait_for_site "$CANDIDATE_STATE" \
    || fail "committed candidate image did not pass recovery health verification"

  if [[ -z "$JOURNAL_MANIFEST" ]]; then
    JOURNAL_MANIFEST="$(promotion_value EVIDENCE_MANIFEST)"
    JOURNAL_MANIFEST_SHA256="$(promotion_value EVIDENCE_MANIFEST_SHA256)"
  fi
  rm -f "$EMAIL_HOLD_STATE" || return 1
  cleanup_journals_after_health || return 1
  info "committed release promotion finalized idempotently"
}

write_email_hold() {
  local reason="$1"
  local active_zero="$2"
  local tmp="$EMAIL_HOLD_STATE_TMP"
  {
    printf 'STATE=PAUSED_FAIL_CLOSED\n'
    printf 'RELEASE_SHA=%s\n' "$(state_value "$ROLLBACK_STATE" RELEASE_SHA)"
    printf 'SOURCE_PHASE=%s\n' "$JOURNAL_PHASE"
    printf 'REASON=%s\n' "$reason"
    printf 'EMAIL_QUEUE_PAUSED=true\n'
    printf 'PRICING_QUEUE_PAUSED=true\n'
    printf 'ACTIVE_ZERO_ATTESTED=%s\n' "$active_zero"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } >"$tmp" || return 1
  publish_private_state "$tmp" "$EMAIL_HOLD_STATE" || return 1
}

promote_rollback() {
  write_state_file "$CURRENT_STATE" \
    "$(state_value "$ROLLBACK_STATE" APP_IMAGE)" \
    "$(state_value "$ROLLBACK_STATE" RELEASE_SHA)" \
    "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
}

remove_manifest_if_verified() {
  local resolved
  [[ -n "$JOURNAL_MANIFEST" \
    && "$JOURNAL_MANIFEST" = /* \
    && -f "$JOURNAL_MANIFEST" \
    && ! -L "$JOURNAL_MANIFEST" \
    && "$JOURNAL_MANIFEST_SHA256" =~ ^[0-9a-f]{64}$ ]] || return 0
  resolved="$(realpath -e "$JOURNAL_MANIFEST")" || return 0
  [[ "$resolved" != "$ROOT_DIR"/* \
    && "$(stat -c '%a' "$resolved")" == "600" \
    && "$(stat -c '%U' "$resolved")" == "$(id -un)" \
    && "$(sha256sum "$resolved" | awk '{print $1}')" == "$JOURNAL_MANIFEST_SHA256" ]] \
    || return 0
  rm -f -- "$resolved" || return 1
}

cleanup_journals_after_health() {
  remove_manifest_if_verified || return 1
  rm -f \
    "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
    "$IN_PROGRESS_STATE_TMP" \
    "$CANDIDATE_STATE_TMP" "$ROLLBACK_STATE_TMP" \
    "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP" \
    "$EMAIL_CUTOVER_FLAG_TMP" "$PROMOTION_STATE_TMP" \
    "$CONTAINMENT_RESULT" "$CONTAINMENT_RESULT_TMP" "$EMAIL_HOLD_STATE_TMP" \
    || return 1
  sync -f "$STATE_DIR" || return 1
  # Remove the historical and promotion anchors only after every derived-file
  # deletion is durable. The promotion decision is always the final anchor.
  rm -f "$EMAIL_CUTOVER_FLAG" || return 1
  sync -f "$STATE_DIR" || return 1
  rm -f "$PROMOTION_STATE" || return 1
  sync -f "$STATE_DIR" || return 1
}

already_recovered() {
  [[ -f "$CURRENT_STATE" \
    && ! -e "$CANDIDATE_STATE" && ! -e "$ROLLBACK_STATE" \
    && ! -e "$IN_PROGRESS_STATE" && ! -e "$EMAIL_CUTOVER_FLAG" \
    && ! -e "$IN_PROGRESS_STATE_TMP" \
    && ! -e "$CANDIDATE_STATE_TMP" && ! -e "$ROLLBACK_STATE_TMP" \
    && ! -e "$CURRENT_STATE_TMP" && ! -e "$PREVIOUS_STATE_TMP" \
    && ! -e "$PROMOTION_STATE" && ! -e "$PROMOTION_STATE_TMP" \
    && ! -e "$CONTAINMENT_RESULT" && ! -e "$CONTAINMENT_RESULT_TMP" \
    && ! -e "$EMAIL_HOLD_STATE_TMP" ]] \
    || return 1
  validate_state_file "$CURRENT_STATE"
  container_running || return 1
  container_matches_image "$(state_value "$CURRENT_STATE" APP_IMAGE)" || return 1
  wait_for_site "$CURRENT_STATE" || return 1
  if [[ -f "$EMAIL_HOLD_STATE" ]]; then
    info "rollback recovery was already committed; queues remain held paused"
  else
    info "no interrupted release remains; the recorded current image is healthy"
  fi
}

recover_without_cutover_journal() {
  local rollback_safe
  rollback_safe="$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"

  if [[ "$rollback_safe" == "false" ]]; then
    [[ "$MODE" == "abort-pre-cutover" ]] \
      || fail "the unsafe bootstrap has not started its queue journal; use abort-pre-cutover"
    container_running \
      || fail "pre-journal bootstrap abort requires the original rollback container to still be running"
    container_matches_image "$(state_value "$ROLLBACK_STATE" APP_IMAGE)" \
      || fail "running container is not the recorded pre-journal rollback image"
    wait_for_site "$ROLLBACK_STATE" \
      || fail "recorded pre-journal rollback image did not pass image/release/shallow health verification"

    # No durable cutover journal means the global queue freeze never began.
    # Do not pause, resume or otherwise mutate either queue in this window.
    promote_rollback
    cleanup_journals_after_health
    info "pre-journal bootstrap state aborted; live queues were not changed"
    return
  fi

  # Normal immutable releases do not create the one-time historical cutover
  # flag. They are rollback-safe and must not inherit an email hold merely
  # because the process died after writing release-in-progress.env.
  compose_with_state "$CANDIDATE_STATE" stop app \
    || fail "candidate stop failed during rollback-safe recovery"
  compose_with_state "$ROLLBACK_STATE" up -d --no-build --force-recreate app \
    || fail "rollback-safe image failed to start"
  wait_for_site "$ROLLBACK_STATE" \
    || fail "rollback-safe image did not pass image/release/shallow health verification"
  promote_rollback
  cleanup_journals_after_health
  info "rollback-safe release restored; no queue pause or historical-email hold was created"
}

recover_partial_pre_journal() {
  [[ "$MODE" == "abort-pre-cutover" ]] \
    || fail "partial pre-cutover preparation requires abort-pre-cutover"
  local live_state="" app_url listed_ids

  # The legacy bootstrap disables restart and freezes the exact app before it
  # publishes CONTAINMENT_INTENT. A crash in that tiny pre-journal window leaves
  # only rollback-candidate.env plus a stopped/paused/absent original container.
  # The freeze may have interrupted an in-flight provider call, so establish the
  # same durable Redis boundary before removing/recreating the legacy process.
  if [[ -f "$ROLLBACK_STATE" \
    && "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" == "false" ]]; then
    validate_state_file "$ROLLBACK_STATE"
    listed_ids="$(docker ps -aq --filter "name=^/${APP_CONTAINER}$")" \
      || fail "Docker inventory failed during pre-journal recovery"
    if [[ -n "$listed_ids" ]]; then
      [[ "$listed_ids" != *$'\n'* ]] \
        || fail "multiple app containers match the production name"
      container_matches_image "$(state_value "$ROLLBACK_STATE" APP_IMAGE)" \
        || fail "pre-journal app does not match the recorded legacy image"
    fi
    compose_with_state "$ROLLBACK_STATE" up -d --no-build postgres redis pgbouncer \
      || fail "pre-journal recovery infrastructure failed to start"
    restore_site_with_hold \
      "abort-pre-cutover recovery from the fail-closed pre-journal freeze"
    return
  fi

  if [[ -f "$CURRENT_STATE" ]]; then
    validate_state_file "$CURRENT_STATE"
    if container_running \
      && container_matches_image "$(state_value "$CURRENT_STATE" APP_IMAGE)" \
      && wait_for_site "$CURRENT_STATE"; then
      live_state="$CURRENT_STATE"
    fi
  fi
  if [[ -z "$live_state" && -f "$ROLLBACK_STATE" ]]; then
    validate_state_file "$ROLLBACK_STATE"
    if container_running \
      && container_matches_image "$(state_value "$ROLLBACK_STATE" APP_IMAGE)" \
      && wait_for_site "$ROLLBACK_STATE"; then
      live_state="$ROLLBACK_STATE"
      promote_rollback
    fi
  fi
  if [[ -z "$live_state" && -f "$CANDIDATE_STATE" ]]; then
    validate_state_file "$CANDIDATE_STATE"
    app_url="$(dotenv_value APP_URL)"
    if container_running \
      && ! container_matches_image "$(state_value "$CANDIDATE_STATE" APP_IMAGE)" \
      && [[ -n "$app_url" ]] \
      && curl --connect-timeout 5 --max-time 15 -fsS \
        "$app_url/api/health" >/dev/null; then
      # Candidate-only means the process died before it captured the rollback
      # identity; no application mutation had yet occurred.
      live_state="untracked-pre-bootstrap"
    fi
  fi
  if [[ -z "$live_state" \
    && ! -f "$CANDIDATE_STATE" && ! -f "$ROLLBACK_STATE" \
    && ( -e "$IN_PROGRESS_STATE_TMP" \
      || -e "$CANDIDATE_STATE_TMP" || -e "$ROLLBACK_STATE_TMP" \
      || -e "$CURRENT_STATE_TMP" || -e "$PREVIOUS_STATE_TMP" ) ]]; then
    app_url="$(dotenv_value APP_URL)"
    if container_running && [[ -n "$app_url" ]] \
      && curl --connect-timeout 5 --max-time 15 -fsS \
        "$app_url/api/health" >/dev/null; then
      # Atomic state writes publish with rename. A lone .tmp proves the crash
      # preceded publication and therefore preceded every app/queue mutation.
      live_state="unpublished-preparation"
    fi
  fi
  [[ -n "$live_state" ]] \
    || fail "could not prove that partial preparation left the original live image untouched"

  cleanup_journals_after_health
  info "partial pre-cutover preparation removed after live-image verification"
}

restore_site_with_hold() {
  local reason="$1"
  local queue_status=0 active_zero=true queue_state="$ROLLBACK_STATE"
  [[ -f "$CANDIDATE_STATE" ]] && queue_state="$CANDIDATE_STATE"

  info "freezing the current app with restart disabled"
  quiesce_or_force_remove \
    || fail "application could not be frozen fail-closed before queue containment"
  info "globally pausing transactional email and Bokun pricing"
  run_queue_control "$queue_state" contain || queue_status="$?"
  # Never let SIGTERM drain an already-active provider request. Once recovery
  # starts, the named app container is killed immediately before any decision
  # to restart a site.
  force_kill_app_without_drain "$RECOVERY_QUIESCE_ID" \
    || fail "application could not be force-stopped during historical recovery"
  RECOVERY_QUIESCE_STARTED=false
  RECOVERY_QUIESCE_ID=""
  if [[ "$queue_status" == "4" ]]; then
    jq -e '.activeObserved == true and .queuesRemainPaused == true and .aofBoundary == "appendfsync-always" and .noAppendFsyncOnRewrite == "no" and .aofLastWriteStatus == "ok"' \
      <<< "$LAST_QUEUE_OUTPUT" >/dev/null \
      || fail "active work was observed without an intact global queue pause; site remains stopped"
    JOURNAL_ACTIVE_OBSERVED=true
    active_zero=false
    if [[ "$MODE" != "abort-pre-cutover" \
      || "$ACTIVE_RECONCILIATION_PREACK" != "true" ]]; then
      write_active_reconciliation_journal
      write_email_hold \
        "active provider work was observed in Redis; reconcile Brevo/Bokun before abort-pre-cutover" \
        false
      fail "active provider work was observed; site remains stopped pending explicit reconciliation"
    fi
  elif [[ "$queue_status" != "0" ]]; then
    fail "could not attest both global queue pauses (exit $queue_status); site remains stopped"
  elif ! jq -e '.ok == true and .allPaused == true and .activeTotal == 0 and .aofBoundary == "appendfsync-always" and .noAppendFsyncOnRewrite == "no" and .aofLastWriteStatus == "ok"' \
    <<< "$LAST_QUEUE_OUTPUT" >/dev/null; then
    fail "queue containment returned an invalid success attestation; site remains stopped"
  fi
  if [[ "$JOURNAL_ACTIVE_OBSERVED" == "true" ]]; then
    active_zero=false
  fi

  compose_with_state "$ROLLBACK_STATE" up -d --no-build --force-recreate app \
    || fail "rollback image failed to start"
  wait_for_site "$ROLLBACK_STATE" \
    || fail "rollback site did not pass image/release/shallow health verification"

  # State/hold become authoritative only after the site health gate. Until
  # cleanup completes, rerunning this command repeats the same safe transition.
  promote_rollback
  write_email_hold "$reason" "$active_zero"
  if [[ "$MODE" == "abort-pre-cutover" \
    && "$ACTIVE_RECONCILIATION_PREACK" == "true" ]]; then
    run_queue_control "$queue_state" acknowledge-active \
      || fail "the reconciled active-work marker could not be acknowledged"
    jq -e '.ok == true and .activeObservationAcknowledged == true' \
      <<< "$LAST_QUEUE_OUTPUT" >/dev/null \
      || fail "active-work acknowledgement returned an invalid attestation"
  fi
  cleanup_journals_after_health
  info "site restored; both queues remain paused under $EMAIL_HOLD_STATE"
  info "create a fresh encrypted queue export before running release.sh again"
}

status_report() {
  local file state_for_queue=""
  printf '{"journals":{'
  local first=true
  for file in \
    "$CURRENT_STATE" "$PREVIOUS_STATE" "$CANDIDATE_STATE" \
    "$ROLLBACK_STATE" "$IN_PROGRESS_STATE" "$EMAIL_CUTOVER_FLAG" \
    "$IN_PROGRESS_STATE_TMP" \
    "$PROMOTION_STATE" "$CANDIDATE_STATE_TMP" "$ROLLBACK_STATE_TMP" \
    "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP" "$CONTAINMENT_RESULT" \
    "$CONTAINMENT_RESULT_TMP" "$EMAIL_HOLD_STATE" "$EMAIL_HOLD_STATE_TMP" \
    "$ROLLBACK_SWAP_STATE" "$ROLLBACK_SWAP_STATE_TMP" \
    "$ROLLBACK_TARGET_STATE" "$ROLLBACK_TARGET_STATE_TMP" \
    "$ROLLBACK_MANUAL_STATE" "$ROLLBACK_MANUAL_STATE_TMP"; do
    if [[ "$first" == "true" ]]; then first=false; else printf ','; fi
    printf '"%s":%s' "$(basename "$file")" "$([[ -f "$file" ]] && printf true || printf false)"
  done
  printf '},"container":{"exists":%s,"running":%s}}\n' \
    "$([[ -n "$(docker inspect "$APP_CONTAINER" 2>/dev/null || true)" ]] && printf true || printf false)" \
    "$(container_running && printf true || printf false)"
  if [[ -f "$EMAIL_CUTOVER_FLAG" ]]; then
    printf '{"cutover":{"phase":"%s","activeObserved":%s,"cutoff":"%s","updatedAt":"%s"}}\n' \
      "$(state_value "$EMAIL_CUTOVER_FLAG" STATE)" \
      "$([[ "$(state_value "$EMAIL_CUTOVER_FLAG" ACTIVE_OBSERVED)" == "true" ]] && printf true || printf false)" \
      "$(state_value "$EMAIL_CUTOVER_FLAG" CUTOFF)" \
      "$(state_value "$EMAIL_CUTOVER_FLAG" UPDATED_AT)"
  fi
  if [[ -f "$CANDIDATE_STATE" ]]; then
    state_for_queue="$CANDIDATE_STATE"
  elif [[ -f "$ROLLBACK_STATE" ]]; then
    state_for_queue="$ROLLBACK_STATE"
  elif [[ -f "$CURRENT_STATE" ]]; then
    state_for_queue="$CURRENT_STATE"
  fi
  if [[ -n "$state_for_queue" ]]; then
    validate_state_file "$state_for_queue"
    run_queue_control "$state_for_queue" status || true
  fi
}

[[ "$MODE" == "status" || "$MODE" == "rollback" \
  || "$MODE" == "abort-pre-cutover" ]] \
  || fail "usage: bash deploy/recover-release.sh <status|rollback|abort-pre-cutover>"

for command_name in awk curl date docker flock grep jq realpath sha256sum stat sync; do
  command -v "$command_name" >/dev/null 2>&1 \
    || fail "missing command: $command_name"
done
[[ -f "$ENV_FILE" && -f "$COMPOSE_FILE" && -f "$QUEUE_CONTROL" ]] \
  || fail "production env, Compose file or queue helper is missing"
[[ ! -L "$EMAIL_HOLD_STATE" && ! -L "$EMAIL_HOLD_STATE_TMP" ]] \
  || fail "historical email hold path must not be a symbolic link"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 9>"$DEPLOY_LOCK"
flock -n 9 || fail "another release, rollback or recovery is already running"

if [[ "$MODE" == "status" ]]; then
  status_report
  exit 0
fi
[[ ! -L "$EMAIL_CUTOVER_FLAG" && ! -L "$EMAIL_CUTOVER_FLAG_TMP" ]] \
  || fail "cutover journal paths must not be symbolic links"
for manual_rollback_state in \
  "$ROLLBACK_SWAP_STATE" "$ROLLBACK_SWAP_STATE_TMP" \
  "$ROLLBACK_TARGET_STATE" "$ROLLBACK_TARGET_STATE_TMP" \
  "$ROLLBACK_MANUAL_STATE" "$ROLLBACK_MANUAL_STATE_TMP"; do
  [[ ! -e "$manual_rollback_state" ]] \
    || fail "manual rollback journal exists at $manual_rollback_state; run deploy/rollback.sh"
done
if already_recovered; then
  exit 0
fi

if [[ -f "$EMAIL_CUTOVER_FLAG" ]]; then
  load_journal_metadata
  ACTIVE_RECONCILIATION_PREACK="$JOURNAL_ACTIVE_OBSERVED"
fi

if [[ -f "$PROMOTION_STATE" ]]; then
  materialize_promotion_states
  if [[ "$(promotion_value STATE)" == "COMMITTED" ]]; then
    recover_committed_promotion
    exit 0
  fi
  # PROMOTING has no commit decision: reconstruct both identities and take the
  # conservative rollback path below.
fi

if [[ ! -f "$EMAIL_CUTOVER_FLAG" && ! -f "$IN_PROGRESS_STATE" \
  && ! -f "$PROMOTION_STATE" \
  && ( -e "$CANDIDATE_STATE" || -e "$ROLLBACK_STATE" \
    || -e "$CANDIDATE_STATE_TMP" || -e "$ROLLBACK_STATE_TMP" \
    || -e "$IN_PROGRESS_STATE_TMP" \
    || -e "$CURRENT_STATE_TMP" || -e "$PREVIOUS_STATE_TMP" \
    || -e "$CONTAINMENT_RESULT" || -e "$CONTAINMENT_RESULT_TMP" ) ]]; then
  recover_partial_pre_journal
  exit 0
fi

if [[ ! -f "$CANDIDATE_STATE" && -f "$IN_PROGRESS_STATE" ]]; then
  validate_state_file "$IN_PROGRESS_STATE"
  write_state_file "$CANDIDATE_STATE" \
    "$(state_value "$IN_PROGRESS_STATE" APP_IMAGE)" \
    "$(state_value "$IN_PROGRESS_STATE" RELEASE_SHA)" \
    "$(state_value "$IN_PROGRESS_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
fi
[[ -f "$ROLLBACK_STATE" ]] \
  || fail "rollback identity is missing; inspect status before changing state"
validate_state_file "$ROLLBACK_STATE"
if [[ -f "$CANDIDATE_STATE" ]]; then
  validate_state_file "$CANDIDATE_STATE"
  compose_with_state "$CANDIDATE_STATE" up -d --no-build postgres redis pgbouncer
else
  compose_with_state "$ROLLBACK_STATE" up -d --no-build postgres redis pgbouncer
fi

if [[ ! -f "$EMAIL_CUTOVER_FLAG" ]]; then
  [[ -f "$CANDIDATE_STATE" ]] \
    || fail "rollback-safe recovery is missing its candidate identity"
  recover_without_cutover_journal
  exit 0
fi

if [[ "$MODE" == "abort-pre-cutover" ]]; then
  [[ "$JOURNAL_PHASE" =~ ^(CONTAINMENT_INTENT|LEGACY_KILLED|ACTIVE_RECONCILIATION_REQUIRED|SNAPSHOT_VERIFIED|BARRIER_APPLYING)$ ]] \
    || fail "abort-pre-cutover is not valid in phase $JOURNAL_PHASE; use rollback"
fi
if [[ "$JOURNAL_ACTIVE_OBSERVED" == "true" \
  && "$MODE" != "abort-pre-cutover" ]]; then
  quiesce_or_force_remove \
    || fail "application could not be frozen while active provider work is held"
  if [[ -f "$CANDIDATE_STATE" ]]; then
    run_queue_control "$CANDIDATE_STATE" contain || true
  else
    run_queue_control "$ROLLBACK_STATE" contain || true
  fi
  force_kill_app_without_drain "$RECOVERY_QUIESCE_ID" \
    || fail "application stop could not be attested while active work is held"
  RECOVERY_QUIESCE_STARTED=false
  RECOVERY_QUIESCE_ID=""
  fail "active provider work was observed; reconcile Brevo/Bokun, then use abort-pre-cutover (historical email remains non-sendable)"
fi

restore_site_with_hold \
  "$MODE recovery from interrupted historical cutover phase $JOURNAL_PHASE"
