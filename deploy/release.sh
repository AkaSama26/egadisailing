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
CANDIDATE_STATE_TMP="${CANDIDATE_STATE}.tmp"
ROLLBACK_STATE="$STATE_DIR/rollback-candidate.env"
ROLLBACK_STATE_TMP="${ROLLBACK_STATE}.tmp"
IN_PROGRESS_STATE="$STATE_DIR/release-in-progress.env"
IN_PROGRESS_STATE_TMP="${IN_PROGRESS_STATE}.tmp"
PROMOTION_STATE="$STATE_DIR/release-commit.env"
PROMOTION_STATE_TMP="${PROMOTION_STATE}.tmp"
ROLLBACK_SWAP_STATE="$STATE_DIR/rollback-swap.env"
ROLLBACK_SWAP_STATE_TMP="${ROLLBACK_SWAP_STATE}.tmp"
ROLLBACK_TARGET_STATE="$STATE_DIR/rollback-target.env"
ROLLBACK_TARGET_STATE_TMP="${ROLLBACK_TARGET_STATE}.tmp"
ROLLBACK_EMAIL_BARRIER_STATE="$STATE_DIR/rollback-email-barrier.env"
ROLLBACK_EMAIL_BARRIER_STATE_TMP="${ROLLBACK_EMAIL_BARRIER_STATE}.tmp"
EMAIL_CUTOVER_FLAG="$STATE_DIR/historical-email-cutover.in-progress"
EMAIL_CUTOVER_FLAG_TMP="${EMAIL_CUTOVER_FLAG}.tmp"
EMAIL_HOLD_STATE="$STATE_DIR/historical-email-hold.env"
EMAIL_HOLD_STATE_TMP="${EMAIL_HOLD_STATE}.tmp"
CONTAINMENT_RESULT="$STATE_DIR/historical-containment-result.json"
CONTAINMENT_RESULT_TMP="${CONTAINMENT_RESULT}.tmp"
ENV_FILE="$ROOT_DIR/.env"
APP_CONTAINER="egadisailing-app"
BACKUP_CONTAINER="egadisailing-backup"
QUEUE_CONTROL_HELPER="$ROOT_DIR/deploy/queue-cutover-control.cjs"
DEPLOY_LOCK_ACQUIRED=false
TEMP_STATE_OWNED=false
CUTOVER_STARTED=false
QUEUE_EVIDENCE_MANIFEST=""
QUEUE_EVIDENCE_MANIFEST_SHA256=""
QUEUE_MANIFEST_OWNED=false
HISTORICAL_EMAIL_CUTOFF=""
HISTORICAL_EMAIL_FORCE_NEW_CUTOVER=false
HISTORICAL_QUEUE_EXPECTED_EMAIL=""
HISTORICAL_QUEUE_EXPECTED_PRICING=""
HISTORICAL_ACTIVE_OBSERVED=false
HISTORICAL_LIVE_CONTAINER_ID=""
LEGACY_QUIESCE_STARTED=false

fail() {
  echo "[deploy] ERROR: $*" >&2
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
  local tmp="${target}.tmp"
  [[ "$email_rollback_safe" == "true" || "$email_rollback_safe" == "false" ]] \
    || fail "invalid EMAIL_OUTBOX_ROLLBACK_SAFE value"
  [[ ! -L "$target" && ! -L "$tmp" ]] \
    || fail "release state paths must not be symbolic links"
  {
    printf 'APP_IMAGE=%s\n' "$image"
    printf 'RELEASE_SHA=%s\n' "$release"
    printf 'EMAIL_OUTBOX_ROLLBACK_SAFE=%s\n' "$email_rollback_safe"
  } > "$tmp" || return 1
  publish_private_state "$tmp" "$target" || return 1
}

state_value() {
  local state_file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$state_file"
}

write_email_cutover_journal() {
  local phase="$1"
  local cutoff="${2:-}"
  {
    printf 'RELEASE_SHA=%s\n' "$RELEASE_SHA"
    printf 'STATE=%s\n' "$phase"
    printf 'FORCE_NEW_CUTOVER=%s\n' "$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER"
    printf 'ACTIVE_OBSERVED=%s\n' "$HISTORICAL_ACTIVE_OBSERVED"
    printf 'LIVE_CONTAINER_ID=%s\n' "$HISTORICAL_LIVE_CONTAINER_ID"
    printf 'CONTAINMENT_RESULT=%s\n' "$CONTAINMENT_RESULT"
    printf 'EXPECTED_TRANSACTIONAL=%s\n' "$HISTORICAL_QUEUE_EXPECTED_EMAIL"
    printf 'EXPECTED_PRICING_BOKUN=%s\n' "$HISTORICAL_QUEUE_EXPECTED_PRICING"
    printf 'EVIDENCE_MANIFEST=%s\n' "$QUEUE_EVIDENCE_MANIFEST"
    printf 'EVIDENCE_MANIFEST_SHA256=%s\n' "$QUEUE_EVIDENCE_MANIFEST_SHA256"
    printf 'CUTOFF=%s\n' "$cutoff"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$EMAIL_CUTOVER_FLAG_TMP" || return 1
  publish_private_state "$EMAIL_CUTOVER_FLAG_TMP" "$EMAIL_CUTOVER_FLAG" \
    || return 1
}

write_promotion_journal() {
  local phase="$1"
  {
    printf 'FORMAT=egadisailing-release-commit-v1\n'
    printf 'STATE=%s\n' "$phase"
    printf 'CANDIDATE_IMAGE=%s\n' "$(state_value "$CANDIDATE_STATE" APP_IMAGE)"
    printf 'CANDIDATE_SHA=%s\n' "$(state_value "$CANDIDATE_STATE" RELEASE_SHA)"
    printf 'ROLLBACK_IMAGE=%s\n' "$(state_value "$ROLLBACK_STATE" APP_IMAGE)"
    printf 'ROLLBACK_SHA=%s\n' "$(state_value "$ROLLBACK_STATE" RELEASE_SHA)"
    printf 'ROLLBACK_EMAIL_SAFE=%s\n' "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
    printf 'EVIDENCE_MANIFEST=%s\n' "$QUEUE_EVIDENCE_MANIFEST"
    printf 'EVIDENCE_MANIFEST_SHA256=%s\n' "$QUEUE_EVIDENCE_MANIFEST_SHA256"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$PROMOTION_STATE_TMP" || return 1
  publish_private_state "$PROMOTION_STATE_TMP" "$PROMOTION_STATE" || return 1
}

write_email_hold_state() {
  local reason="$1"
  local tmp="$EMAIL_HOLD_STATE_TMP"
  {
    printf 'STATE=PAUSED_FAIL_CLOSED\n'
    printf 'RELEASE_SHA=%s\n' "${RELEASE_SHA:-unknown}"
    printf 'REASON=%s\n' "$reason"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$tmp" || return 1
  publish_private_state "$tmp" "$EMAIL_HOLD_STATE" || return 1
}

cleanup_queue_manifest() {
  if [[ "$QUEUE_MANIFEST_OWNED" == "true" && -n "$QUEUE_EVIDENCE_MANIFEST" ]]; then
    rm -f -- "$QUEUE_EVIDENCE_MANIFEST" || return 1
    QUEUE_MANIFEST_OWNED=false
  fi
}

run_host_queue_control() {
  local state_file="$1"
  local mode="$2"
  local require_manifest="${3:-false}"
  local manifest_path="${4:-}"
  local node_binary
  if [[ "$(state_value "$state_file" EMAIL_OUTBOX_ROLLBACK_SAFE)" == "true" ]]; then
    node_binary="/nodejs/bin/node"
  else
    node_binary="/usr/local/bin/node"
  fi
  local -a args=(
    run --rm --no-deps -T --pull never
    --volume "$QUEUE_CONTROL_HELPER:/app/queue-cutover-control.cjs:ro"
    -e "QUEUE_CUTOVER_REQUIRE_MANIFEST=$require_manifest"
    --entrypoint "$node_binary"
    app /app/queue-cutover-control.cjs "$mode"
  )
  if [[ -n "$manifest_path" ]]; then
    compose_with_state "$state_file" "${args[@]}" < "$manifest_path"
  else
    compose_with_state "$state_file" "${args[@]}" </dev/null
  fi
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
  if [[ -z "$listed_ids" ]]; then
    [[ -z "$expected_id" ]]
    return
  fi
  [[ "$listed_ids" != *$'\n'* ]] || return 1
  current_id="$(docker inspect --format '{{.Id}}' "$listed_ids")" \
    || return 1
  [[ "$current_id" =~ ^[0-9a-f]{64}$ ]] || return 1
  [[ -z "$expected_id" || "$current_id" == "$expected_id" ]] || return 1
  docker update --restart=no "$current_id" >/dev/null || return 1
  # Persist Docker's fail-closed restart metadata before freezing the process.
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
  # Force-removal uses SIGKILL and also works for a cgroup-frozen container;
  # no application code gets an opportunity to drain provider work.
  docker rm --force "$current_id" >/dev/null || return 1
  remaining_ids="$(
    docker ps -aq --filter "name=^/${APP_CONTAINER}$"
  )" || return 1
  [[ -z "$remaining_ids" ]]
}

quiesce_or_force_remove() {
  local expected_id="${1:-}"
  local listed_ids
  if [[ -z "$expected_id" ]]; then
    listed_ids="$(docker ps -aq --filter "name=^/${APP_CONTAINER}$")" \
      || return 1
    [[ -n "$listed_ids" ]] || return 0
    [[ "$listed_ids" != *$'\n'* ]] || return 1
    expected_id="$(docker inspect --format '{{.Id}}' "$listed_ids")" \
      || return 1
    [[ "$expected_id" =~ ^[0-9a-f]{64}$ ]] || return 1
  fi

  HISTORICAL_LIVE_CONTAINER_ID="$expected_id"
  LEGACY_QUIESCE_STARTED=true
  if quiesce_app_without_drain "$expected_id"; then
    return 0
  fi

  echo "[deploy] WARNING: freeze attestation failed; force-removing the exact app container" >&2
  force_kill_app_without_drain "$expected_id" \
    || { echo "[deploy] CRITICAL: failed to freeze or remove exact app container $expected_id" >&2; return 1; }
  echo "[deploy] exact app container removed after freeze failure" >&2
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
      'command -v pg_dump >/dev/null && command -v gzip >/dev/null && command -v sha256sum >/dev/null && command -v stat >/dev/null && command -v flock >/dev/null && test -d /backups && test ! -L /backups && test ! -L /backups/.backup.lock && flock -n /backups/.backup.lock true' \
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
  echo "[deploy] release failed after cutover began; restoring the previous image" >&2
  echo "[deploy] database migrations are intentionally NOT rolled back" >&2
  local keep_historical_email_paused=false
  local cutover_phase=""
  if [[ ! -f "$ROLLBACK_STATE" ]]; then
    echo "[deploy] no rollback state is available" >&2
    return 1
  fi
  if [[ "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" != "true" ]]; then
    if [[ -f "$EMAIL_CUTOVER_FLAG" ]]; then
      cutover_phase="$(state_value "$EMAIL_CUTOVER_FLAG" STATE)"
    fi
    if [[ -n "$cutover_phase" \
      && "$cutover_phase" != "BARRIER_COMPLETE" \
      && "$cutover_phase" != "CANDIDATE_STARTING" ]]; then
      # Prima del marker completo il vecchio worker non deve mai essere
      # riabilitato: riportiamo online il sito legacy, ma lasciamo entrambe le
      # code globalmente paused finche' un nuovo cutover non riesce.
      echo "[deploy] incomplete historical barrier: restoring legacy app with email held paused" >&2
      local queue_control_state="$ROLLBACK_STATE"
      local freeze_status=0
      [[ -f "$CANDIDATE_STATE" ]] && queue_control_state="$CANDIDATE_STATE"
      quiesce_or_force_remove \
        || { echo "[deploy] CRITICAL: app could not be frozen fail-closed" >&2; return 1; }
      if run_host_queue_control "$queue_control_state" contain false; then
        freeze_status=0
      else
        freeze_status="$?"
      fi
      if [[ "$freeze_status" != "0" && "$freeze_status" != "4" ]]; then
        echo "[deploy] CRITICAL: queue pause could not be attested; legacy site stays down" >&2
        force_kill_app_without_drain "$HISTORICAL_LIVE_CONTAINER_ID" \
          || echo "[deploy] CRITICAL: application stop could not be attested" >&2
        return 1
      fi
      if [[ "$freeze_status" == "4" ]]; then
        HISTORICAL_ACTIVE_OBSERVED=true
        write_email_cutover_journal "ACTIVE_RECONCILIATION_REQUIRED" \
          "${HISTORICAL_EMAIL_CUTOFF:-}" || return 1
        write_email_hold_state \
          "active provider work observed; external reconciliation required before recovery" \
          || return 1
        force_kill_app_without_drain "$HISTORICAL_LIVE_CONTAINER_ID" \
          || echo "[deploy] CRITICAL: application stop could not be attested" >&2
        echo "[deploy] CRITICAL: active provider work observed; site remains stopped and queues remain paused" >&2
        return 1
      fi
      force_kill_app_without_drain "$HISTORICAL_LIVE_CONTAINER_ID" || return 1
      keep_historical_email_paused=true
    else
      echo "[deploy] legacy rollback: stopping candidate before resolving ambiguous email claims" >&2
      compose_with_state "$CANDIDATE_STATE" stop app || return 1
      compose_with_state "$CANDIDATE_STATE" run --rm --no-deps \
        --entrypoint /nodejs/bin/node app \
        /app/deploy/prepare-email-rollback.mjs || return 1
    fi
  fi
  compose_with_state "$ROLLBACK_STATE" up -d --no-build --force-recreate app || return 1
  local app_url attempt expected_release expected_image
  expected_release="$(state_value "$ROLLBACK_STATE" RELEASE_SHA)"
  expected_image="$(state_value "$ROLLBACK_STATE" APP_IMAGE)"
  if [[ "$expected_release" =~ ^[0-9a-f]{40}$ \
    && "$expected_release" != "0000000000000000000000000000000000000000" ]]; then
    if wait_for_release "$expected_release" "$expected_image"; then
      write_state "$CURRENT_STATE" "$expected_image" "$expected_release" \
        "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" \
        || return 1
      if [[ "$keep_historical_email_paused" == "true" ]]; then
        write_email_hold_state "historical cutover aborted before its terminal marker" \
          || return 1
        echo "[deploy] WARNING: transactional email remains globally paused; rerun the cutover after reconciling evidence" >&2
      fi
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
      write_state "$CURRENT_STATE" "$expected_image" "$expected_release" \
        "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" \
        || return 1
      if [[ "$keep_historical_email_paused" == "true" ]]; then
        write_email_hold_state "historical cutover aborted before its terminal marker" \
          || return 1
        echo "[deploy] WARNING: transactional email remains globally paused; rerun the cutover after reconciling evidence" >&2
      fi
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
  if [[ "$status" -ne 0 && -f "$PROMOTION_STATE" \
    && "$(state_value "$PROMOTION_STATE" STATE)" == "COMMITTED" ]]; then
    echo "[deploy] release commit is durable; preserving journals for idempotent completion" >&2
    echo "[deploy] run deploy/recover-release.sh rollback to converge on the committed candidate" >&2
  elif [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$CUTOVER_STARTED" == "true" \
    && -f "$ROLLBACK_STATE" \
    && ( -f "$IN_PROGRESS_STATE" || -f "$EMAIL_CUTOVER_FLAG" ) ]]; then
    echo "[deploy] interrupted after application cutover; attempting verified rollback" >&2
    if rollback_after_failure; then
      rm -f "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
        "$IN_PROGRESS_STATE_TMP" \
        "$CANDIDATE_STATE_TMP" "$ROLLBACK_STATE_TMP" \
        "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP" "$EMAIL_CUTOVER_FLAG" \
        "$EMAIL_CUTOVER_FLAG_TMP" "$PROMOTION_STATE" "$PROMOTION_STATE_TMP" \
        "$CONTAINMENT_RESULT" "$CONTAINMENT_RESULT_TMP" "$EMAIL_HOLD_STATE_TMP"
      cleanup_queue_manifest
      sync -f "$STATE_DIR"
    else
      echo "[deploy] CRITICAL: rollback failed; state journal preserved in $STATE_DIR" >&2
      echo "[deploy] run deploy/recover-release.sh rollback after correcting the reported cause" >&2
    fi
  elif [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$LEGACY_QUIESCE_STARTED" == "true" ]]; then
    echo "[deploy] legacy app quiesce began before journal publication; preserving rollback state fail-closed" >&2
    if force_kill_app_without_drain "$HISTORICAL_LIVE_CONTAINER_ID"; then
      echo "[deploy] exact pre-journal app container is absent" >&2
    else
      echo "[deploy] CRITICAL: could not attest removal of exact app container $HISTORICAL_LIVE_CONTAINER_ID" >&2
    fi
    echo "[deploy] run deploy/recover-release.sh abort-pre-cutover" >&2
  elif [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$TEMP_STATE_OWNED" == "true" ]]; then
    # Prima del cutover l'app live non e' cambiata: gli state temporanei non
    # hanno valore di recovery e possono essere rimossi in sicurezza.
    rm -f "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
      "$IN_PROGRESS_STATE_TMP" \
      "$CANDIDATE_STATE_TMP" "$ROLLBACK_STATE_TMP" \
      "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP" "$EMAIL_CUTOVER_FLAG" \
      "$EMAIL_CUTOVER_FLAG_TMP" "$PROMOTION_STATE" "$PROMOTION_STATE_TMP" \
      "$CONTAINMENT_RESULT" "$CONTAINMENT_RESULT_TMP" "$EMAIL_HOLD_STATE_TMP"
    cleanup_queue_manifest
    sync -f "$STATE_DIR"
  elif [[ "$status" -ne 0 \
    && "$DEPLOY_LOCK_ACQUIRED" == "true" \
    && "$QUEUE_MANIFEST_OWNED" == "true" ]]; then
    cleanup_queue_manifest
  fi
  exit "$status"
}

trap deploy_exit_guard EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -eq 1 ]] || fail "usage: deploy/release.sh <40-char-sha>"
RELEASE_SHA="${1,,}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "release must be a full 40-character Git SHA"

for command_name in git docker curl awk cosign grep flock jq sha256sum stat date sync; do
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

for required_env in \
  OPS_HEALTH_SECRET \
  BOKUN_VENDOR_ID \
  BOKUN_ACCESS_KEY \
  BOKUN_SECRET_KEY \
  BOKUN_WEBHOOK_SECRET; do
  [[ -n "$(dotenv_value "$required_env")" ]] || fail "$required_env must be configured in .env"
done
RESTIC_REPOSITORY_VALUE="$(dotenv_value RESTIC_REPOSITORY)"
RESTIC_PASSWORD_VALUE="$(dotenv_value RESTIC_PASSWORD)"
if [[ -n "$RESTIC_REPOSITORY_VALUE" || -n "$RESTIC_PASSWORD_VALUE" ]]; then
  [[ -n "$RESTIC_REPOSITORY_VALUE" && -n "$RESTIC_PASSWORD_VALUE" ]] \
    || fail "RESTIC_REPOSITORY and RESTIC_PASSWORD must be configured together"
fi
[[ "$(dotenv_value BOKUN_API_URL)" != *bokuntest* ]] \
  || fail "BOKUN_API_URL must not use the Bokun test host in production"
[[ "$(dotenv_value TELEGRAM_EXPOSED_TOKEN_REVOKED_CONFIRMED)" == "true" ]] \
  || fail "BotFather revocation of the exposed Telegram token is not confirmed"
[[ "$(dotenv_value BOKUN_PRICING_SYNC_ENABLED)" == "false" ]] \
  || fail "BOKUN_PRICING_SYNC_ENABLED must remain explicitly false until vendor canary approval"

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 9>"$DEPLOY_LOCK"
flock -n 9 || fail "another release or rollback is already running"
DEPLOY_LOCK_ACQUIRED=true
for rollback_journal in \
  "$ROLLBACK_SWAP_STATE" "$ROLLBACK_SWAP_STATE_TMP" \
  "$ROLLBACK_TARGET_STATE" "$ROLLBACK_TARGET_STATE_TMP" \
  "$ROLLBACK_EMAIL_BARRIER_STATE" "$ROLLBACK_EMAIL_BARRIER_STATE_TMP"; do
  [[ ! -e "$rollback_journal" ]] \
    || fail "interrupted rollback journal exists at $rollback_journal; run deploy/rollback.sh to recover it"
done
for stale_state in \
  "$IN_PROGRESS_STATE" \
  "$IN_PROGRESS_STATE_TMP" \
  "$CANDIDATE_STATE" \
  "$ROLLBACK_STATE" \
  "$CANDIDATE_STATE_TMP" \
  "$ROLLBACK_STATE_TMP" \
  "$CURRENT_STATE_TMP" \
  "$PREVIOUS_STATE_TMP" \
  "$EMAIL_CUTOVER_FLAG" \
  "$EMAIL_CUTOVER_FLAG_TMP" \
  "$EMAIL_HOLD_STATE_TMP" \
  "$CONTAINMENT_RESULT" \
  "$CONTAINMENT_RESULT_TMP" \
  "$PROMOTION_STATE" \
  "$PROMOTION_STATE_TMP"; do
  [[ ! -e "$stale_state" ]] \
    || fail "interrupted release state exists at $stale_state; run deploy/recover-release.sh status and follow the recovery runbook"
done

# Capture the rollback identity before creating the candidate state. From this
# point a hard crash always leaves enough information to identify the live
# image, even during the one-time legacy bootstrap.
docker inspect "$APP_CONTAINER" >/dev/null 2>&1 \
  || fail "no running production app found; initial provisioning requires the runbook"
[[ "$(docker inspect --format '{{.State.Running}}' "$APP_CONTAINER")" == "true" ]] \
  || fail "production app container exists but is not running; recover it before release"
if [[ -f "$CURRENT_STATE" ]] \
  && [[ "$(state_value "$CURRENT_STATE" APP_IMAGE)" =~ ^[^[:space:]]+@sha256:[0-9a-f]{64}$ ]] \
  && [[ "$(state_value "$CURRENT_STATE" RELEASE_SHA)" =~ ^[0-9a-f]{40}$ ]]; then
  CURRENT_STATE_IMAGE="$(state_value "$CURRENT_STATE" APP_IMAGE)"
  CURRENT_STATE_RELEASE="$(state_value "$CURRENT_STATE" RELEASE_SHA)"
  RUNNING_RELEASE="$(container_env_value GIT_SHA)"
  [[ "$RUNNING_RELEASE" =~ ^[0-9a-fA-F]{40}$ ]] \
    || fail "running container has no valid GIT_SHA while current-release.env claims an immutable release"
  container_matches_image "$CURRENT_STATE_IMAGE" \
    || fail "running container image does not match current-release.env; reconcile state before deploy"
  [[ "${RUNNING_RELEASE,,}" == "$CURRENT_STATE_RELEASE" ]] \
    || fail "running container release does not match current-release.env; reconcile state before deploy"
  # Dal secondo deploy in poi il rollback usa esattamente il digest GHCR
  # persistito, non il config image ID locale del container.
  write_state "$ROLLBACK_STATE" "$CURRENT_STATE_IMAGE" \
    "$CURRENT_STATE_RELEASE" \
    "$(state_value "$CURRENT_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
else
  # Bootstrap dal vecchio container costruito sul checkout: non esiste un
  # RepoDigest affidabile. Lo conserviamo per il solo primo rollback e lo
  # sostituiamo con digest GHCR al deploy successivo.
  PREVIOUS_IMAGE="$(docker inspect --format '{{.Image}}' "$APP_CONTAINER")"
  # Anche se il vecchio container espone un GIT_SHA, non e' un artefatto
  # immutabile verificato e il suo healthcheck puo' non riportare la release.
  # Lo zero abilita esclusivamente il gate legacy shallow + image-ID del primo
  # rollback; dopo il primo deploy ogni stato usa full SHA e digest GHCR.
  write_state "$ROLLBACK_STATE" "$PREVIOUS_IMAGE" \
    "0000000000000000000000000000000000000000" false
fi
TEMP_STATE_OWNED=true

if [[ "$(state_value "$ROLLBACK_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" != "true" ]]; then
  # The currently-live legacy image may create outboxes after any previous
  # one-shot cutoff. The candidate must atomically supersede those markers and
  # capture a new cutoff only after this legacy producer has been stopped.
  HISTORICAL_EMAIL_FORCE_NEW_CUTOVER=true
fi

if [[ "$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER" == "true" ]]; then
  HISTORICAL_LIVE_CONTAINER_ID="$(
    docker inspect --format '{{.Id}}' "$APP_CONTAINER"
  )"
  [[ "$HISTORICAL_LIVE_CONTAINER_ID" =~ ^[0-9a-f]{64}$ ]] \
    || fail "legacy live container identity is invalid"
  [[ -f "$QUEUE_CONTROL_HELPER" && ! -L "$QUEUE_CONTROL_HELPER" ]] \
    || fail "trusted queue containment helper is missing"
  [[ "$(git hash-object "$QUEUE_CONTROL_HELPER")" == \
      "$(git rev-parse HEAD:deploy/queue-cutover-control.cjs)" ]] \
    || fail "queue containment helper does not match the requested commit"

  # Disable restart and freeze the exact legacy process before publishing the
  # containment intent. A host crash from this point is fail-closed even if the
  # Redis boundary has not executed yet.
  quiesce_or_force_remove "$HISTORICAL_LIVE_CONTAINER_ID" \
    || fail "legacy application could not be frozen with restart disabled"

  # No network, evidence decryption or image work may precede this boundary.
  # The helper is bind-mounted read-only into the exact already-local legacy
  # image; its contain mode depends only on Redis and stable BullMQ APIs.
  write_email_cutover_journal "CONTAINMENT_INTENT"
  CUTOVER_STARTED=true
  echo "[deploy] containing legacy email/pricing before all slow or network work"
  CONTAIN_STATUS=0
  if run_host_queue_control "$ROLLBACK_STATE" contain false \
    > "$CONTAINMENT_RESULT_TMP"; then
    CONTAIN_STATUS=0
  else
    CONTAIN_STATUS="$?"
  fi
  publish_private_state "$CONTAINMENT_RESULT_TMP" "$CONTAINMENT_RESULT"
  # Never SIGTERM/drain a historical provider job. Once containment intent is
  # durable, the exact live container is stopped immediately on every result.
  force_kill_app_without_drain "$HISTORICAL_LIVE_CONTAINER_ID" \
    || fail "legacy application could not be force-stopped at containment"
  if jq -e '.activeObserved == true' "$CONTAINMENT_RESULT" >/dev/null 2>&1; then
    jq -e '.queuesRemainPaused == true and .aofBoundary == "appendfsync-always" and .noAppendFsyncOnRewrite == "no" and .aofLastWriteStatus == "ok"' \
      "$CONTAINMENT_RESULT" >/dev/null \
      || fail "active work was observed without a durable synchronous-AOF queue pause"
    HISTORICAL_ACTIVE_OBSERVED=true
    write_email_cutover_journal "ACTIVE_RECONCILIATION_REQUIRED"
    write_email_hold_state \
      "active historical provider work observed; reconcile Brevo/Bokun, never resend"
    fail "active provider work observed; site remains stopped pending reconciliation (verify the durable queue-pause attestation)"
  fi
  if [[ "$CONTAIN_STATUS" == "4" ]]; then
    fail "containment returned active status without a durable active observation"
  fi
  [[ "$CONTAIN_STATUS" == "0" ]] \
    || fail "legacy queues could not be attested paused; site remains stopped"
  jq -e '.ok == true and .allPaused == true and .activeTotal == 0 and .aofBoundary == "appendfsync-always" and .noAppendFsyncOnRewrite == "no" and .aofLastWriteStatus == "ok"' \
    "$CONTAINMENT_RESULT" >/dev/null \
    || fail "legacy containment success result is invalid"
  write_email_cutover_journal "LEGACY_KILLED"

  QUEUE_EVIDENCE_MARKER="$(dotenv_value QUEUE_HISTORY_EXPORT_MARKER)"
  [[ -n "$QUEUE_EVIDENCE_MARKER" ]] \
    || fail "QUEUE_HISTORY_EXPORT_MARKER must be configured for the legacy cutover"
  echo "[deploy] verifying encrypted legacy queue evidence and exact job identities"
  QUEUE_EVIDENCE_RESULT="$(
    bash "$ROOT_DIR/deploy/verify-queue-evidence.sh" "$QUEUE_EVIDENCE_MARKER"
  )"
  printf '%s\n' "$QUEUE_EVIDENCE_RESULT"
  QUEUE_EVIDENCE_MANIFEST="$(
    awk -F= '$1 == "HISTORICAL_QUEUE_EVIDENCE_MANIFEST" { sub(/^[^=]*=/, ""); print; exit }' \
      <<< "$QUEUE_EVIDENCE_RESULT"
  )"
  QUEUE_EVIDENCE_MANIFEST_SHA256="$(
    awk -F= '$1 == "HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256" { sub(/^[^=]*=/, ""); print; exit }' \
      <<< "$QUEUE_EVIDENCE_RESULT"
  )"
  [[ "$QUEUE_EVIDENCE_MANIFEST" = /* \
    && -f "$QUEUE_EVIDENCE_MANIFEST" \
    && ! -L "$QUEUE_EVIDENCE_MANIFEST" ]] \
    || fail "queue verifier did not produce a regular absolute manifest"
  [[ "$(stat -c '%a' "$QUEUE_EVIDENCE_MANIFEST")" == "600" \
    && "$(stat -c '%U' "$QUEUE_EVIDENCE_MANIFEST")" == "$(id -un)" ]] \
    || fail "queue identity manifest must be private and owned by the deploying user"
  [[ "$QUEUE_EVIDENCE_MANIFEST_SHA256" =~ ^[0-9a-f]{64}$ \
    && "$(sha256sum "$QUEUE_EVIDENCE_MANIFEST" | awk '{print $1}')" == "$QUEUE_EVIDENCE_MANIFEST_SHA256" ]] \
    || fail "queue identity manifest checksum is invalid"
  QUEUE_MANIFEST_OWNED=true
  HISTORICAL_QUEUE_EXPECTED_EMAIL="$(
    awk -F= '$1 == "EXPECTED_TRANSACTIONAL" { sub(/^[^=]*=/, ""); print; exit }' \
      "$QUEUE_EVIDENCE_MARKER"
  )"
  HISTORICAL_QUEUE_EXPECTED_PRICING="$(
    awk -F= '$1 == "EXPECTED_PRICING_BOKUN" { sub(/^[^=]*=/, ""); print; exit }' \
      "$QUEUE_EVIDENCE_MARKER"
  )"
  [[ "$HISTORICAL_QUEUE_EXPECTED_EMAIL" =~ ^[0-9]+$ \
    && "$HISTORICAL_QUEUE_EXPECTED_PRICING" =~ ^[0-9]+$ ]] \
    || fail "verified queue marker does not expose valid expected counts"

  FINAL_FREEZE_RESULT="$(
    run_host_queue_control "$ROLLBACK_STATE" assert-frozen true \
      "$QUEUE_EVIDENCE_MANIFEST"
  )" || fail "post-stop exact-ID queue attestation failed"
  HISTORICAL_EMAIL_CUTOFF="$(
    jq -er '
      select(.ok == true and .allPaused == true and .activeTotal == 0 and .manifestRequired == true)
      | .cutoff
      | select(type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T"))
    ' <<< "$FINAL_FREEZE_RESULT"
  )" || fail "post-stop attestation did not return a canonical cutoff"
  [[ "$(date -u -d "$HISTORICAL_EMAIL_CUTOFF" +%Y-%m-%dT%H:%M:%S.%3NZ 2>/dev/null || true)" == "$HISTORICAL_EMAIL_CUTOFF" ]] \
    || fail "post-stop cutoff is not canonical UTC millisecond ISO"
  write_email_cutover_journal "SNAPSHOT_VERIFIED" "$HISTORICAL_EMAIL_CUTOFF"
fi

echo "[deploy] refreshing the authoritative origin/main reference"
git fetch --prune origin main
[[ "$(git rev-parse origin/main)" == "$RELEASE_SHA" ]] \
  || fail "requested release is not the current origin/main tip"

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
write_state "$CANDIDATE_STATE" "$IMAGE_DIGEST" "$RELEASE_SHA" true

echo "[deploy] ensuring backup sidecar is ready"
compose_with_state "$CANDIDATE_STATE" up -d --no-build postgres backup
wait_for_backup_ready || fail "backup sidecar did not become ready"
echo "[deploy] forcing verified pre-migration PostgreSQL backup"
BACKUP_STARTED_EPOCH="$(date -u +%s)"
docker exec "$BACKUP_CONTAINER" /backup.sh

echo "[deploy] proving the latest local PostgreSQL dump can be restored"
"$ROOT_DIR/deploy/restore-drill.sh" --not-before-epoch "$BACKUP_STARTED_EPOCH"

echo "[deploy] applying forward-only Prisma migrations"
compose_with_state "$CANDIDATE_STATE" run --rm --no-deps \
  --entrypoint /nodejs/bin/node app \
  ./node_modules/prisma/build/index.js migrate deploy

echo "[deploy] checking the one-shot historical email cutover barrier"
EMAIL_CUTOVER_CHECK_STATUS=0
if compose_with_state "$CANDIDATE_STATE" run --rm --no-deps \
  -e "HISTORICAL_EMAIL_FORCE_NEW_CUTOVER=$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER" \
  --entrypoint /nodejs/bin/node app \
  /app/deploy/dismiss-historical-emails.mjs check; then
  EMAIL_CUTOVER_CHECK_STATUS=0
else
  EMAIL_CUTOVER_CHECK_STATUS="$?"
fi

case "$EMAIL_CUTOVER_CHECK_STATUS" in
  0)
    [[ "$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER" != "true" ]] \
      || fail "forced legacy cutover unexpectedly reported complete"
    echo "[deploy] historical email cutover already complete"
    ;;
  3)
    [[ "$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER" == "true" \
      && -n "$HISTORICAL_EMAIL_CUTOFF" \
      && "$CUTOVER_STARTED" == "true" ]] \
      || fail "a new historical cutover was requested without the pre-backup freeze barrier"
    write_email_cutover_journal "BARRIER_APPLYING" "$HISTORICAL_EMAIL_CUTOFF"
    echo "[deploy] tombstoning pre-cutoff mail and removing only archived queue IDs"
    compose_with_state "$CANDIDATE_STATE" run --rm --no-deps -T \
      --user 0:0 \
      --volume "$QUEUE_EVIDENCE_MANIFEST:/app/.historical-queue-evidence.json:ro" \
      -e "HISTORICAL_QUEUE_EXPECTED_EMAIL=$HISTORICAL_QUEUE_EXPECTED_EMAIL" \
      -e "HISTORICAL_QUEUE_EXPECTED_PRICING=$HISTORICAL_QUEUE_EXPECTED_PRICING" \
      -e "HISTORICAL_QUEUE_EVIDENCE_MANIFEST=/app/.historical-queue-evidence.json" \
      -e "HISTORICAL_QUEUE_EVIDENCE_MANIFEST_SHA256=$QUEUE_EVIDENCE_MANIFEST_SHA256" \
      -e "HISTORICAL_EMAIL_CUTOFF=$HISTORICAL_EMAIL_CUTOFF" \
      -e "HISTORICAL_EMAIL_FORCE_NEW_CUTOVER=$HISTORICAL_EMAIL_FORCE_NEW_CUTOVER" \
      --entrypoint /nodejs/bin/node app \
      /app/deploy/dismiss-historical-emails.mjs apply \
      || fail "historical email cutover barrier failed"
    write_email_cutover_journal "BARRIER_COMPLETE" "$HISTORICAL_EMAIL_CUTOFF"
    ;;
  *)
    fail "historical email cutover check failed with exit $EMAIL_CUTOVER_CHECK_STATUS"
    ;;
esac

echo "[deploy] starting immutable application image"
if [[ ! -f "$IN_PROGRESS_STATE" ]]; then
  cp "$CANDIDATE_STATE" "$IN_PROGRESS_STATE_TMP"
  publish_private_state "$IN_PROGRESS_STATE_TMP" "$IN_PROGRESS_STATE"
fi
if [[ "$CUTOVER_STARTED" != "true" ]]; then
  CUTOVER_STARTED=true
else
  write_email_cutover_journal "CANDIDATE_STARTING" "$HISTORICAL_EMAIL_CUTOFF"
fi
compose_with_state "$CANDIDATE_STATE" up -d --no-build --force-recreate app \
  || fail "container startup failed"

wait_for_release "$RELEASE_SHA" "$IMAGE_DIGEST" \
  || fail "shallow/deep/release health gate failed"

write_promotion_journal "PROMOTING"
cp "$ROLLBACK_STATE" "$PREVIOUS_STATE_TMP"
cp "$CANDIDATE_STATE" "$CURRENT_STATE_TMP"
chmod 600 "$PREVIOUS_STATE_TMP" "$CURRENT_STATE_TMP"
publish_private_state "$PREVIOUS_STATE_TMP" "$PREVIOUS_STATE"
publish_private_state "$CURRENT_STATE_TMP" "$CURRENT_STATE"
write_promotion_journal "COMMITTED"
rm -f "$IN_PROGRESS_STATE" "$CANDIDATE_STATE" "$ROLLBACK_STATE" \
  "$IN_PROGRESS_STATE_TMP" \
  "$CANDIDATE_STATE_TMP" "$ROLLBACK_STATE_TMP" \
  "$CURRENT_STATE_TMP" "$PREVIOUS_STATE_TMP"
rm -f "$EMAIL_CUTOVER_FLAG" "$EMAIL_CUTOVER_FLAG_TMP" "$EMAIL_HOLD_STATE" \
  "$EMAIL_HOLD_STATE_TMP" "$CONTAINMENT_RESULT" "$CONTAINMENT_RESULT_TMP"
cleanup_queue_manifest
sync -f "$STATE_DIR"
# The commit journal is the crash-recovery anchor and is therefore removed
# only after every derived/transient state has been cleaned successfully.
rm -f "$PROMOTION_STATE_TMP" "$PROMOTION_STATE"
sync -f "$STATE_DIR"

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
