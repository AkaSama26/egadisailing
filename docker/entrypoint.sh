#!/bin/sh
set -e

# Entrypoint del container app: esegue `prisma migrate deploy` prima di avviare
# il server Next. Se la migration fallisce, fallisce il container — meglio
# fail-fast che avviare con schema incompatibile.
#
# Idempotent: se non ci sono migration pending, Prisma stampa un noop.
#
# R26-P3 dry-run: invocazione diretta via node invece di `npx --no-install prisma`.
# npx in ambiente standalone Next (user non-root) cerca di scrivere cache
# a /root/.npm → permesso negato. Path corretto dopo il fix Dockerfile di
# installare prisma come package vero (non cherry-pick).

echo "[entrypoint] running prisma migrate deploy"
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] starting app"
exec "$@"
