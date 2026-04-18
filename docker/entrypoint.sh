#!/bin/sh
set -e

# Entrypoint del container app: esegue `prisma migrate deploy` prima di avviare
# il server Next. Se la migration fallisce, fallisce il container — meglio
# fail-fast che avviare con schema incompatibile.
#
# Idempotent: se non ci sono migration pending, Prisma stampa un noop.

echo "[entrypoint] running prisma migrate deploy"
npx --no-install prisma migrate deploy

echo "[entrypoint] starting app"
exec "$@"
