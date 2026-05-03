# Stage 1: Dependencies
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM node:24-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
ARG APP_URL=http://localhost:3000
ARG NEXTAUTH_URL=http://localhost:3000
ARG SERVER_ACTIONS_ALLOWED_ORIGINS=egadisailing.com,www.egadisailing.com
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ARG NEXT_PUBLIC_ASSET_CDN_URL=
ENV NODE_ENV=production
ENV NEXT_PHASE=phase-production-build
ENV DATABASE_URL=postgresql://egadisailing:build-placeholder@postgres:5432/egadisailing
ENV REDIS_URL=redis://:build-placeholder@redis:6379
ENV NEXTAUTH_SECRET=build-placeholder-nextauth-secret-000000000000000000
ENV APP_URL=$APP_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV SERVER_ACTIONS_ALLOWED_ORIGINS=$SERVER_ACTIONS_ALLOWED_ORIGINS
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_ASSET_CDN_URL=$NEXT_PUBLIC_ASSET_CDN_URL
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
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

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
