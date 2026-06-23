#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.prod.yml up -d --build app

if command -v curl >/dev/null 2>&1; then
  echo "[deploy] health check"
  curl -fsS https://egadisailing.com/api/health || true
  echo
fi

docker compose -f docker-compose.prod.yml logs app --tail 30

./scripts/cloudflare-purge-cache.sh
