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
ARG APP_LOCALES_DEFAULT=it
ARG NEXTAUTH_URL=http://localhost:3000
ARG SERVER_ACTIONS_ALLOWED_ORIGINS=egadisailing.com,www.egadisailing.com
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ARG NEXT_PUBLIC_ASSET_CDN_URL=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ARG NEXT_PUBLIC_GOOGLE_ADS_ID=
ARG NEXT_PUBLIC_META_PIXEL_ID=
ARG NEXT_PUBLIC_BING_UET_TAG_ID=
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
ARG NEXT_PUBLIC_BING_SITE_VERIFICATION=
ARG NEXT_PUBLIC_META_DOMAIN_VERIFICATION=
ARG FEATURE_OVERRIDE_ENABLED=false
ARG FEATURE_OVERRIDE_OTA_ENABLED=false
ARG OVERRIDE_CANCELLATION_RATE_SOFT_WARN=0.03
ARG OVERRIDE_CANCELLATION_RATE_HARD_BLOCK=0.05
ENV NODE_ENV=production
ENV NEXT_PHASE=phase-production-build
ENV DATABASE_URL=postgresql://egadisailing:build-placeholder@postgres:5432/egadisailing
ENV REDIS_URL=redis://:build-placeholder@redis:6379
ENV NEXTAUTH_SECRET=build-placeholder-nextauth-secret-000000000000000000
ENV APP_URL=$APP_URL
ENV APP_LOCALES_DEFAULT=$APP_LOCALES_DEFAULT
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV SERVER_ACTIONS_ALLOWED_ORIGINS=$SERVER_ACTIONS_ALLOWED_ORIGINS
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_ASSET_CDN_URL=$NEXT_PUBLIC_ASSET_CDN_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GOOGLE_ADS_ID=$NEXT_PUBLIC_GOOGLE_ADS_ID
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_BING_UET_TAG_ID=$NEXT_PUBLIC_BING_UET_TAG_ID
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_BING_SITE_VERIFICATION=$NEXT_PUBLIC_BING_SITE_VERIFICATION
ENV NEXT_PUBLIC_META_DOMAIN_VERIFICATION=$NEXT_PUBLIC_META_DOMAIN_VERIFICATION
ENV FEATURE_OVERRIDE_ENABLED=$FEATURE_OVERRIDE_ENABLED
ENV FEATURE_OVERRIDE_OTA_ENABLED=$FEATURE_OVERRIDE_OTA_ENABLED
ENV OVERRIDE_CANCELLATION_RATE_SOFT_WARN=$OVERRIDE_CANCELLATION_RATE_SOFT_WARN
ENV OVERRIDE_CANCELLATION_RATE_HARD_BLOCK=$OVERRIDE_CANCELLATION_RATE_HARD_BLOCK
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
RUN mkdir -p /app/.next/cache \
  && chown -R nextjs:nodejs /app/.next
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
