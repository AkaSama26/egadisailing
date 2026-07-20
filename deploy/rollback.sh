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
SWAP_STATE_TMP="${SWAP_STATE}.tmp"
TARGET_STATE="$STATE_DIR/rollback-target.env"
TARGET_STATE_TMP="${TARGET_STATE}.tmp"
EMAIL_BARRIER_STATE="$STATE_DIR/rollback-email-barrier.env"
EMAIL_BARRIER_STATE_TMP="${EMAIL_BARRIER_STATE}.tmp"
EMAIL_HOLD_STATE="$STATE_DIR/historical-email-hold.env"
EMAIL_HOLD_STATE_TMP="${EMAIL_HOLD_STATE}.tmp"
RELEASE_IN_PROGRESS_STATE="$STATE_DIR/release-in-progress.env"
RELEASE_IN_PROGRESS_TMP="${RELEASE_IN_PROGRESS_STATE}.tmp"
RELEASE_CANDIDATE_STATE="$STATE_DIR/candidate-release.env"
RELEASE_ROLLBACK_STATE="$STATE_DIR/rollback-candidate.env"
RELEASE_CURRENT_TMP="$STATE_DIR/current-release.env.tmp"
RELEASE_PREVIOUS_TMP="$STATE_DIR/previous-release.env.tmp"
RELEASE_CANDIDATE_TMP="$STATE_DIR/candidate-release.env.tmp"
RELEASE_ROLLBACK_TMP="$STATE_DIR/rollback-candidate.env.tmp"
RELEASE_CUTOVER_STATE="$STATE_DIR/historical-email-cutover.in-progress"
RELEASE_CUTOVER_TMP="${RELEASE_CUTOVER_STATE}.tmp"
RELEASE_COMMIT_STATE="$STATE_DIR/release-commit.env"
RELEASE_COMMIT_TMP="${RELEASE_COMMIT_STATE}.tmp"
ENV_FILE="$ROOT_DIR/.env"
COMPOSE_FILE="$ROOT_DIR/docker-compose.vps.yml"
ROLLBACK_ATTEMPT_ACTIVE=false

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
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^\047|\047$|^\042|\042$/, ""); print; exit }' "$ENV_FILE"
}

state_value() {
  local file="$1"
  local key="$2"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$file"
}

validate_state_file() {
  local file="$1"
  local image release rollback_safe
  [[ -f "$file" && ! -L "$file" ]] || return 1
  image="$(state_value "$file" APP_IMAGE)"
  release="$(state_value "$file" RELEASE_SHA)"
  rollback_safe="$(state_value "$file" EMAIL_OUTBOX_ROLLBACK_SAFE)"
  [[ -n "$image" && "$image" != *[[:space:]]* \
    && "$release" =~ ^[0-9a-f]{40}$ \
    && ( "$rollback_safe" == "true" || "$rollback_safe" == "false" ) ]]
}

write_rollback_journal() {
  local phase="$1"
  validate_state_file "$SWAP_STATE" \
    || { echo "[rollback] invalid newer snapshot" >&2; return 1; }
  validate_state_file "$TARGET_STATE" \
    || { echo "[rollback] invalid target snapshot" >&2; return 1; }
  {
    printf 'FORMAT=egadisailing-rollback-journal-v2\n'
    printf 'STATE=%s\n' "$phase"
    printf 'NEWER_IMAGE=%s\n' "$(state_value "$SWAP_STATE" APP_IMAGE)"
    printf 'NEWER_SHA=%s\n' "$(state_value "$SWAP_STATE" RELEASE_SHA)"
    printf 'NEWER_EMAIL_SAFE=%s\n' "$(state_value "$SWAP_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
    printf 'TARGET_IMAGE=%s\n' "$(state_value "$TARGET_STATE" APP_IMAGE)"
    printf 'TARGET_SHA=%s\n' "$(state_value "$TARGET_STATE" RELEASE_SHA)"
    printf 'TARGET_EMAIL_SAFE=%s\n' "$(state_value "$TARGET_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$EMAIL_BARRIER_STATE_TMP" || return 1
  publish_private_state "$EMAIL_BARRIER_STATE_TMP" "$EMAIL_BARRIER_STATE" \
    || return 1
}

write_email_hold() {
  local reason="$1"
  local tmp="$EMAIL_HOLD_STATE_TMP"
  {
    printf 'STATE=QUEUE_STATE_UNVERIFIED\n'
    printf 'SOURCE=MANUAL_ROLLBACK\n'
    printf 'EMAIL_QUEUE_STATE=UNKNOWN\n'
    printf 'PRICING_QUEUE_STATE=UNKNOWN\n'
    printf 'REASON=%s\n' "$reason"
    printf 'UPDATED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } > "$tmp" || return 1
  publish_private_state "$tmp" "$EMAIL_HOLD_STATE" || return 1
}

write_state_values() {
  local target="$1"
  local image="$2"
  local release="$3"
  local rollback_safe="$4"
  local tmp="${target}.tmp"
  [[ -n "$image" && "$image" != *[[:space:]]* \
    && "$release" =~ ^[0-9a-f]{40}$ \
    && ( "$rollback_safe" == "true" || "$rollback_safe" == "false" ) ]] \
    || { echo "[rollback] invalid state identity for $target" >&2; return 1; }
  [[ ! -L "$target" && ! -L "$tmp" ]] \
    || { echo "[rollback] state path must not be a symbolic link: $target" >&2; return 1; }
  {
    printf 'APP_IMAGE=%s\n' "$image"
    printf 'RELEASE_SHA=%s\n' "$release"
    printf 'EMAIL_OUTBOX_ROLLBACK_SAFE=%s\n' "$rollback_safe"
  } > "$tmp" || return 1
  publish_private_state "$tmp" "$target" || return 1
}

write_state_from() {
  local source="$1"
  local target="$2"
  validate_state_file "$source" \
    || { echo "[rollback] invalid source state: $source" >&2; return 1; }
  write_state_values "$target" \
    "$(state_value "$source" APP_IMAGE)" \
    "$(state_value "$source" RELEASE_SHA)" \
    "$(state_value "$source" EMAIL_OUTBOX_ROLLBACK_SAFE)"
}

ensure_snapshot_from_journal() {
  local target="$1"
  local prefix="$2"
  local image release rollback_safe
  image="$(state_value "$EMAIL_BARRIER_STATE" "${prefix}_IMAGE")"
  release="$(state_value "$EMAIL_BARRIER_STATE" "${prefix}_SHA")"
  rollback_safe="$(state_value "$EMAIL_BARRIER_STATE" "${prefix}_EMAIL_SAFE")"
  if [[ -f "$target" ]]; then
    validate_state_file "$target" \
      && [[ "$(state_value "$target" APP_IMAGE)" == "$image" \
        && "$(state_value "$target" RELEASE_SHA)" == "$release" \
        && "$(state_value "$target" EMAIL_OUTBOX_ROLLBACK_SAFE)" == "$rollback_safe" ]] \
      || { echo "[rollback] $target disagrees with rollback journal" >&2; return 1; }
  else
    write_state_values "$target" "$image" "$release" "$rollback_safe"
  fi
}

materialize_rollback_snapshots() {
  [[ -f "$EMAIL_BARRIER_STATE" && ! -L "$EMAIL_BARRIER_STATE" ]] \
    || { echo "[rollback] rollback journal is missing or invalid" >&2; return 1; }
  [[ "$(state_value "$EMAIL_BARRIER_STATE" FORMAT)" == \
      "egadisailing-rollback-journal-v2" ]] \
    || { echo "[rollback] unsupported rollback journal format" >&2; return 1; }
  ensure_snapshot_from_journal "$SWAP_STATE" NEWER || return 1
  ensure_snapshot_from_journal "$TARGET_STATE" TARGET || return 1
}

remove_rollback_journals() {
  # The terminal journal is the last file removed. If power is lost during
  # cleanup, its two immutable identities can recreate every derived snapshot.
  rm -f "$SWAP_STATE_TMP" "$SWAP_STATE" \
    "$TARGET_STATE_TMP" "$TARGET_STATE" || return 1
  sync -f "$STATE_DIR" || return 1
  rm -f "$EMAIL_BARRIER_STATE_TMP" "$EMAIL_BARRIER_STATE" || return 1
  sync -f "$STATE_DIR" || return 1
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
  local phase="" target_email_safe="true"
  echo "[rollback] restoring the newer image before the rollback commit point" >&2
  if [[ -f "$EMAIL_BARRIER_STATE" ]]; then
    materialize_rollback_snapshots || return 1
    phase="$(state_value "$EMAIL_BARRIER_STATE" STATE)"
    [[ "$phase" != "COMMITTED" ]] \
      || { echo "[rollback] committed rollback cannot be reverted automatically" >&2; return 1; }
    target_email_safe="$(state_value "$TARGET_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)"
  fi
  validate_state_file "$SWAP_STATE" \
    || { echo "[rollback] newer release identity is unavailable" >&2; return 1; }

  # Once STOP_INTENT is durable, the current process may have been stopped or
  # the unsafe legacy target may have run. Resolve any ambiguous future-email
  # claims idempotently before allowing the newer worker to resume.
  if [[ "$target_email_safe" != "true" \
    && -n "$phase" && "$phase" != "PREPARED" ]]; then
    echo "[rollback] completing interrupted email barrier before restoring newer image" >&2
    compose_with_state "$SWAP_STATE" stop app || true
    if ! compose_with_state "$SWAP_STATE" run --rm --no-deps -T \
      --entrypoint /nodejs/bin/node app \
      /app/deploy/prepare-email-rollback.mjs; then
      write_email_hold \
        "manual rollback email barrier could not be finalized; queue state requires recovery" \
        || return 1
      echo "[rollback] CRITICAL: email queue state is held explicitly; newer app was not restarted" >&2
      return 1
    fi
    write_rollback_journal "EMAIL_RESUMED_FOR_NEWER" || return 1
    rm -f "$EMAIL_HOLD_STATE" || return 1
    sync -f "$STATE_DIR" || return 1
  fi
  if compose_with_state "$SWAP_STATE" up -d --no-build --force-recreate app \
    && wait_for_state "$SWAP_STATE"; then
    write_state_from "$SWAP_STATE" "$CURRENT_STATE" || return 1
    if [[ -f "$TARGET_STATE" ]]; then
      write_state_from "$TARGET_STATE" "$PREVIOUS_STATE" || return 1
    fi
    remove_rollback_journals || return 1
    echo "[rollback] newer image restored and health-verified" >&2
    return 0
  fi
  echo "[rollback] CRITICAL: failed to restore and verify the newer image" >&2
  return 1
}

finalize_committed_rollback() {
  materialize_rollback_snapshots || return 1
  [[ "$(state_value "$EMAIL_BARRIER_STATE" STATE)" == "COMMITTED" ]] \
    || { echo "[rollback] terminal rollback journal is not committed" >&2; return 1; }

  # COMMITTED is irreversible for the orchestrator. Converge on the target even
  # if the process died while publishing current/previous or deleting snapshots.
  if ! container_matches_image "$(state_value "$TARGET_STATE" APP_IMAGE)" \
    || ! wait_for_state "$TARGET_STATE"; then
    compose_with_state "$TARGET_STATE" up -d --no-build --force-recreate app \
      || return 1
    wait_for_state "$TARGET_STATE" || return 1
  fi
  write_state_from "$TARGET_STATE" "$CURRENT_STATE" || return 1
  write_state_from "$SWAP_STATE" "$PREVIOUS_STATE" || return 1
  rm -f "$EMAIL_HOLD_STATE" || return 1
  sync -f "$STATE_DIR" || return 1
  remove_rollback_journals || return 1
  ROLLBACK_ATTEMPT_ACTIVE=false
  echo "[rollback] committed rollback finalized idempotently" >&2
}

rollback_exit_guard() {
  local status="$?"
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 && "$ROLLBACK_ATTEMPT_ACTIVE" == "true" \
    && ( -f "$SWAP_STATE" || -f "$EMAIL_BARRIER_STATE" ) ]]; then
    if [[ -f "$EMAIL_BARRIER_STATE" \
      && "$(state_value "$EMAIL_BARRIER_STATE" STATE)" == "COMMITTED" ]]; then
      echo "[rollback] interrupted after commit; converging on the rollback target" >&2
      finalize_committed_rollback || true
    else
      echo "[rollback] interrupted before commit; attempting to restore the newer release" >&2
      restore_newer_image || true
    fi
  fi
  exit "$status"
}

trap rollback_exit_guard EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -eq 0 ]] || { echo "usage: deploy/rollback.sh" >&2; exit 1; }

cd "$ROOT_DIR"
[[ -z "$(git status --porcelain --untracked-files=all)" ]] \
  || { echo "[rollback] checkout is not clean" >&2; exit 1; }
for command_name in awk chmod cp curl date docker flock mv rm seq sync; do
  command -v "$command_name" >/dev/null 2>&1 \
    || { echo "[rollback] missing command: $command_name" >&2; exit 1; }
done
mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 9>"$DEPLOY_LOCK"
flock -n 9 || { echo "[rollback] another release or rollback is already running" >&2; exit 1; }
[[ ! -L "$SWAP_STATE" && ! -L "$SWAP_STATE_TMP" \
  && ! -L "$TARGET_STATE" && ! -L "$TARGET_STATE_TMP" \
  && ! -L "$EMAIL_BARRIER_STATE" && ! -L "$EMAIL_BARRIER_STATE_TMP" \
  && ! -L "$EMAIL_HOLD_STATE" && ! -L "$EMAIL_HOLD_STATE_TMP" ]] \
  || { echo "[rollback] rollback journal paths must not be symbolic links" >&2; exit 1; }

for release_state in \
  "$RELEASE_IN_PROGRESS_STATE" \
  "$RELEASE_IN_PROGRESS_TMP" \
  "$RELEASE_CANDIDATE_STATE" \
  "$RELEASE_ROLLBACK_STATE" \
  "$RELEASE_CANDIDATE_TMP" \
  "$RELEASE_ROLLBACK_TMP" \
  "$RELEASE_CURRENT_TMP" \
  "$RELEASE_PREVIOUS_TMP" \
  "$RELEASE_CUTOVER_STATE" \
  "$RELEASE_CUTOVER_TMP" \
  "$RELEASE_COMMIT_STATE" \
  "$RELEASE_COMMIT_TMP"; do
  if [[ -e "$release_state" ]]; then
    echo "[rollback] interrupted release journal exists at $release_state" >&2
    echo "[rollback] run deploy/recover-release.sh status and follow the recovery runbook" >&2
    exit 1
  fi
done

if [[ -f "$EMAIL_BARRIER_STATE" ]]; then
  ROLLBACK_ATTEMPT_ACTIVE=true
  materialize_rollback_snapshots \
    || { echo "[rollback] rollback journal cannot be reconstructed" >&2; exit 1; }
  if [[ "$(state_value "$EMAIL_BARRIER_STATE" STATE)" == "COMMITTED" ]]; then
    echo "[rollback] finalizing the already-committed rollback" >&2
    finalize_committed_rollback \
      || { echo "[rollback] committed journal preserved for recovery" >&2; exit 1; }
    exit 0
  fi
  echo "[rollback] aborting an interrupted pre-commit rollback" >&2
  restore_newer_image \
    || { echo "[rollback] state journal preserved for manual recovery" >&2; exit 1; }
  ROLLBACK_ATTEMPT_ACTIVE=false
  echo "[rollback] interrupted rollback recovered; rerun the command to start a new rollback" >&2
  exit 1
fi

if [[ -f "$SWAP_STATE" ]]; then
  ROLLBACK_ATTEMPT_ACTIVE=true
  echo "[rollback] recovering an interrupted rollback before accepting a new one" >&2
  restore_newer_image \
    || { echo "[rollback] state journal preserved for manual recovery" >&2; exit 1; }
  ROLLBACK_ATTEMPT_ACTIVE=false
  echo "[rollback] interrupted rollback recovered; rerun the command to start a new rollback" >&2
  exit 1
fi

if [[ -f "$TARGET_STATE" ]]; then
  echo "[rollback] removing an unpublished target snapshot" >&2
  rm -f "$TARGET_STATE_TMP" "$TARGET_STATE"
  sync -f "$STATE_DIR"
fi

[[ ! -f "$EMAIL_HOLD_STATE" ]] \
  || { echo "[rollback] historical email hold is active; complete a fresh release cutover instead of manual rollback" >&2; exit 1; }

[[ -f "$CURRENT_STATE" && -f "$PREVIOUS_STATE" ]] \
  || { echo "[rollback] current/previous release state is missing" >&2; exit 1; }
validate_state_file "$CURRENT_STATE" && validate_state_file "$PREVIOUS_STATE" \
  || { echo "[rollback] current/previous release state is invalid" >&2; exit 1; }

write_state_from "$CURRENT_STATE" "$SWAP_STATE"
ROLLBACK_ATTEMPT_ACTIVE=true
write_state_from "$PREVIOUS_STATE" "$TARGET_STATE"
write_rollback_journal "PREPARED"
if [[ "$(state_value "$TARGET_STATE" EMAIL_OUTBOX_ROLLBACK_SAFE)" != "true" ]]; then
  echo "[rollback] legacy target: stopping current app and dismissing ambiguous email claims" >&2
  write_rollback_journal "STOP_INTENT"
  compose_with_state "$CURRENT_STATE" stop app
  write_rollback_journal "CURRENT_STOPPED"
  compose_with_state "$CURRENT_STATE" run --rm --no-deps -T \
    --entrypoint /nodejs/bin/node app \
    /app/deploy/prepare-email-rollback.mjs
  write_rollback_journal "EMAIL_RESUMED"
  rm -f "$EMAIL_HOLD_STATE"
  sync -f "$STATE_DIR"
fi
write_rollback_journal "TARGET_STARTING"
if ! compose_with_state "$TARGET_STATE" up -d --no-build --force-recreate app; then
  echo "[rollback] previous image failed to start" >&2
  exit 1
fi

if wait_for_state "$TARGET_STATE"; then
  # This fsynced journal is the one-way decision point. Any interruption after
  # it converges on TARGET; any interruption before it restores NEWER.
  write_rollback_journal "COMMITTED"
  finalize_committed_rollback
  echo "[rollback] previous application image passed its rollback health gate"
  echo "[rollback] no database down migration was executed"
  exit 0
fi

echo "[rollback] previous image failed deep/release health; restoring the newer image" >&2
exit 1
