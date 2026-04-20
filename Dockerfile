# Stage 1: Dependencies
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:24-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# R26-P3 dry-run fix: node:22-slim (Debian) invece di node:22-alpine
# per evitare lock file desync su optional deps musl-vs-glibc. Lo slim
# ha OpenSSL per Prisma + glibc matches dev host. Size ~180MB vs alpine
# 140MB — accettabile per semplicita' cross-platform dev/prod.
#
# Wget per healthcheck interno (docker-compose.prod.yml).
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Prisma CLI + transitive deps (R26-P3 dry-run fix):
# Standalone build traccia solo deps runtime importate. Prisma CLI ha
# deps transitive (`effect`, `@prisma/config`, etc.) non in standalone.
# Invece di cherry-pick specifici pacchetti (fragile), installiamo
# prisma + client come production-only in runner stage. Aggiunge ~40MB
# ma garantisce che prisma migrate deploy funzioni sempre.
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund prisma @prisma/client \
  && rm -rf ~/.npm

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
