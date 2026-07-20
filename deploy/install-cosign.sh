#!/usr/bin/env bash
# One-time VPS installation of the checksum-pinned verifier used by release.sh.
set -euo pipefail

COSIGN_VERSION="3.0.6"
COSIGN_SHA256="c956e5dfcac53d52bcf058360d579472f0c1d2d9b69f55209e256fe7783f4c74"

[[ "$(uname -m)" == "x86_64" ]] || {
  echo "[cosign] unsupported architecture: $(uname -m)" >&2
  exit 1
}
for command_name in curl install sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "[cosign] missing command: $command_name" >&2
    exit 1
  }
done

TEMP_DIR="$(mktemp -d)"
BINARY="$TEMP_DIR/cosign"
cleanup() {
  rm -f "$BINARY"
  rmdir "$TEMP_DIR" 2>/dev/null || true
}
trap cleanup EXIT

curl --proto '=https' --tlsv1.2 --fail --location \
  --output "$BINARY" \
  "https://github.com/sigstore/cosign/releases/download/v${COSIGN_VERSION}/cosign-linux-amd64"
echo "${COSIGN_SHA256}  ${BINARY}" | sha256sum --check --strict
chmod 0755 "$BINARY"
sudo install -o root -g root -m 0755 "$BINARY" /usr/local/bin/cosign
/usr/local/bin/cosign version
