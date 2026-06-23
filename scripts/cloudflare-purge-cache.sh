#!/usr/bin/env bash
set -euo pipefail

API_ENDPOINT="https://api.cloudflare.com/client/v4"
DEFAULT_LOCALES=(it en de fr es)

usage() {
  cat <<'EOF'
Usage:
  scripts/cloudflare-purge-cache.sh [--dry-run]
  scripts/cloudflare-purge-cache.sh --prefixes "egadisailing.com/it,egadisailing.com/en"
  scripts/cloudflare-purge-cache.sh --files "https://egadisailing.com/it,https://egadisailing.com/sitemap.xml"
  scripts/cloudflare-purge-cache.sh --everything

Environment:
  CLOUDFLARE_ZONE_ID                 Required unless --dry-run
  CLOUDFLARE_CACHE_PURGE_TOKEN       Preferred token, Zone > Cache Purge > Purge
  CLOUDFLARE_API_TOKEN               Fallback token if purge token is not set
  CLOUDFLARE_PURGE_PREFIXES          Optional comma-separated prefixes
  CLOUDFLARE_PURGE_FILES             Optional comma-separated file URLs
  APP_URL                            Defaults to https://egadisailing.com
EOF
}

arg_has() {
  local needle="$1"
  shift
  for arg in "$@"; do
    [[ "$arg" == "$needle" ]] && return 0
  done
  return 1
}

arg_value() {
  local needle="$1"
  shift
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == "$needle" ]]; then
      shift
      [[ $# -gt 0 ]] && printf '%s' "$1"
      return 0
    fi
    shift
  done
  return 0
}

read_env_file_value() {
  local key="$1"
  local env_file=".env"
  [[ -f "$env_file" ]] || return 0
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); gsub(/^"|"$/, ""); print; exit }' "$env_file"
}

env_value() {
  local key="$1"
  local current="${!key-}"
  if [[ -n "$current" ]]; then
    printf '%s' "$current"
    return 0
  fi
  read_env_file_value "$key"
}

json_escape() {
  sed 's/\\/\\\\/g; s/"/\\"/g'
}

json_array_from_csv() {
  local csv="$1"
  local output="["
  local first=1
  local item escaped
  IFS=',' read -ra values <<< "$csv"
  for item in "${values[@]}"; do
    item="$(printf '%s' "$item" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    [[ -z "$item" ]] && continue
    escaped="$(printf '%s' "$item" | json_escape)"
    if [[ $first -eq 0 ]]; then
      output+=","
    fi
    output+="\"$escaped\""
    first=0
  done
  output+="]"
  printf '%s' "$output"
}

hostname_from_app_url() {
  local app_url
  app_url="$(env_value APP_URL)"
  app_url="${app_url:-https://egadisailing.com}"
  app_url="${app_url#http://}"
  app_url="${app_url#https://}"
  app_url="${app_url%%/*}"
  app_url="${app_url%%:*}"
  printf '%s' "${app_url:-egadisailing.com}"
}

normalize_prefix_csv() {
  local csv="$1"
  local output=""
  local item normalized
  IFS=',' read -ra values <<< "$csv"
  for item in "${values[@]}"; do
    item="$(printf '%s' "$item" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; s:/*$::')"
    [[ -z "$item" ]] && continue
    normalized="${item#http://}"
    normalized="${normalized#https://}"
    output+="${output:+,}$normalized"
  done
  printf '%s' "$output"
}

default_prefix_csv() {
  local host
  host="$(hostname_from_app_url)"
  local output=""
  local locale
  for locale in "${DEFAULT_LOCALES[@]}"; do
    output+="${output:+,}$host/$locale"
  done
  output+=",$host/sitemap.xml,$host/robots.txt"
  printf '%s' "$output"
}

if arg_has "--help" "$@" || arg_has "-h" "$@"; then
  usage
  exit 0
fi

dry_run=0
arg_has "--dry-run" "$@" && dry_run=1

if arg_has "--everything" "$@"; then
  body='{"purge_everything":true}'
  mode="purge_everything"
  count=1
else
  files="$(arg_value "--files" "$@")"
  files="${files:-$(env_value CLOUDFLARE_PURGE_FILES)}"
  if [[ -n "$files" ]]; then
    body="{\"files\":$(json_array_from_csv "$files") }"
    mode="files"
    count=$(awk -F, '{ print NF }' <<< "$files")
  else
    prefixes="$(arg_value "--prefixes" "$@")"
    prefixes="${prefixes:-$(env_value CLOUDFLARE_PURGE_PREFIXES)}"
    prefixes="${prefixes:-$(default_prefix_csv)}"
    prefixes="$(normalize_prefix_csv "$prefixes")"
    body="{\"prefixes\":$(json_array_from_csv "$prefixes") }"
    mode="prefixes"
    count=$(awk -F, '{ print NF }' <<< "$prefixes")
  fi
fi

if [[ "$dry_run" == "1" ]]; then
  echo "[cloudflare:purge] dry run"
  echo "$body"
  exit 0
fi

zone_id="$(env_value CLOUDFLARE_ZONE_ID)"
token="$(env_value CLOUDFLARE_CACHE_PURGE_TOKEN)"
token="${token:-$(env_value CLOUDFLARE_API_TOKEN)}"

if [[ -z "$zone_id" ]]; then
  echo "[cloudflare:purge] Missing CLOUDFLARE_ZONE_ID" >&2
  exit 1
fi

if [[ -z "$token" ]]; then
  echo "[cloudflare:purge] Missing CLOUDFLARE_CACHE_PURGE_TOKEN. Create a token with Zone > Cache Purge > Purge." >&2
  exit 1
fi

response="$(curl -fsS \
  -X POST "$API_ENDPOINT/zones/$zone_id/purge_cache" \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  --data "$body")"

if ! printf '%s' "$response" | tr -d '[:space:]' | grep -q '"success":true'; then
  echo "[cloudflare:purge] Cloudflare purge failed" >&2
  echo "$response" >&2
  exit 1
fi

echo "[cloudflare:purge] success ($mode, $count operation$([[ "$count" == "1" ]] || printf 's'))"
