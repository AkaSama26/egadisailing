#!/usr/bin/env bash
# Hash every browser-visible input baked into the Next.js production bundle.
set -euo pipefail

ENV_FILE="${1:-}"
KEYS=(
  APP_URL
  SERVER_ACTIONS_ALLOWED_ORIGINS
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  NEXT_PUBLIC_TURNSTILE_SITE_KEY
  NEXT_PUBLIC_ASSET_CDN_URL
  NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL
  NEXT_PUBLIC_GTM_ID
  NEXT_PUBLIC_GA_MEASUREMENT_ID
  NEXT_PUBLIC_GOOGLE_ADS_ID
  NEXT_PUBLIC_META_PIXEL_ID
  NEXT_PUBLIC_BING_UET_TAG_ID
  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  NEXT_PUBLIC_BING_SITE_VERIFICATION
  NEXT_PUBLIC_META_DOMAIN_VERIFICATION
)

env_file_value() {
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

{
  for key in "${KEYS[@]}"; do
    if [[ -n "$ENV_FILE" ]]; then
      value="$(env_file_value "$key")"
    else
      value="$(printenv "$key" 2>/dev/null || true)"
    fi
    printf '%s=%s\n' "$key" "$value"
  done
} | sha256sum | awk '{print $1}'
