#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Compatibilita' con il vecchio comando npm: ogni deploy passa comunque dal
# solo percorso digest-only, con backup/restore, migration e health gate.
exec "$ROOT_DIR/deploy/release.sh" "$@"
