#!/usr/bin/env bash
# Build the production image with one canonical set of release/public inputs.
# Usage: bash scripts/build-production-image.sh <image-ref> [buildx output flags]
set -euo pipefail

[[ $# -ge 1 ]] || { echo "usage: $0 <image-ref> [buildx flags]" >&2; exit 1; }
IMAGE_REF="$1"
shift

# The release identity, Dockerfile, target, platform and base-image arguments
# are intentionally not caller-overridable. Only the output/attestation knobs
# used by CI are accepted after the image reference.
BUILD_OUTPUT_ARGS=()
output_mode=""
metadata_seen=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --load|--push)
      [[ -z "$output_mode" ]] \
        || { echo "only one of --load/--push may be specified" >&2; exit 2; }
      output_mode="$1"
      BUILD_OUTPUT_ARGS+=("$1")
      shift
      ;;
    --metadata-file)
      [[ "$metadata_seen" == "false" && $# -ge 2 && -n "$2" ]] \
        || { echo "--metadata-file requires one value and may appear once" >&2; exit 2; }
      metadata_seen=true
      BUILD_OUTPUT_ARGS+=("$1" "$2")
      shift 2
      ;;
    --metadata-file=*)
      [[ "$metadata_seen" == "false" && -n "${1#*=}" ]] \
        || { echo "--metadata-file requires one value and may appear once" >&2; exit 2; }
      metadata_seen=true
      BUILD_OUTPUT_ARGS+=("$1")
      shift
      ;;
    --provenance=mode=max|--sbom=true)
      BUILD_OUTPUT_ARGS+=("$1")
      shift
      ;;
    *)
      echo "unsupported buildx argument: $1" >&2
      exit 2
      ;;
  esac
done

RELEASE_SHA="${GIT_SHA:?GIT_SHA full release SHA required}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] \
  || { echo "GIT_SHA must be a lowercase 40-character SHA" >&2; exit 1; }

APP_URL="${APP_URL:?APP_URL required}"
NEXTAUTH_URL="${NEXTAUTH_URL:-$APP_URL}"
SERVER_ACTIONS_ALLOWED_ORIGINS="${SERVER_ACTIONS_ALLOWED_ORIGINS:?required}"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:?required}"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY:?required}"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY NEXT_PUBLIC_TURNSTILE_SITE_KEY

PUBLIC_CONFIG_SHA256="$(bash scripts/public-build-config-hash.sh)"
[[ "$PUBLIC_CONFIG_SHA256" =~ ^[0-9a-f]{64}$ ]] \
  || { echo "could not derive public build configuration hash" >&2; exit 1; }

docker buildx build \
  --platform linux/amd64 \
  --tag "$IMAGE_REF" \
  --build-arg "APP_URL=$APP_URL" \
  --build-arg "NEXTAUTH_URL=$NEXTAUTH_URL" \
  --build-arg "SERVER_ACTIONS_ALLOWED_ORIGINS=$SERVER_ACTIONS_ALLOWED_ORIGINS" \
  --build-arg "GIT_SHA=$RELEASE_SHA" \
  --build-arg "NEXT_DEPLOYMENT_ID=$RELEASE_SHA" \
  --build-arg "DEPLOYMENT_VERSION=$RELEASE_SHA" \
  --build-arg "SENTRY_RELEASE=$RELEASE_SHA" \
  --build-arg "PUBLIC_CONFIG_SHA256=$PUBLIC_CONFIG_SHA256" \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  --build-arg "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY" \
  --build-arg "NEXT_PUBLIC_ASSET_CDN_URL=${NEXT_PUBLIC_ASSET_CDN_URL:-}" \
  --build-arg "NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL=${NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL:-}" \
  --build-arg "NEXT_PUBLIC_GTM_ID=${NEXT_PUBLIC_GTM_ID:-}" \
  --build-arg "NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID:-}" \
  --build-arg "NEXT_PUBLIC_GOOGLE_ADS_ID=${NEXT_PUBLIC_GOOGLE_ADS_ID:-}" \
  --build-arg "NEXT_PUBLIC_META_PIXEL_ID=${NEXT_PUBLIC_META_PIXEL_ID:-}" \
  --build-arg "NEXT_PUBLIC_BING_UET_TAG_ID=${NEXT_PUBLIC_BING_UET_TAG_ID:-}" \
  --build-arg "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=${NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION:-}" \
  --build-arg "NEXT_PUBLIC_BING_SITE_VERIFICATION=${NEXT_PUBLIC_BING_SITE_VERIFICATION:-}" \
  --build-arg "NEXT_PUBLIC_META_DOMAIN_VERIFICATION=${NEXT_PUBLIC_META_DOMAIN_VERIFICATION:-}" \
  "${BUILD_OUTPUT_ARGS[@]}" \
  .
