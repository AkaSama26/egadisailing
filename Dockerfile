# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

# Build toolchain: the digest resolves the official multi-arch Node 24.18.0
# Bookworm image. It bundles npm 11.16.0 and OpenSSL 3, so Prisma resolves the
# same engine target as the Debian 13 runtime without a mutable apt step.
ARG BUILD_IMAGE=node:24.18.0-bookworm@sha256:5711a0d445a1af54af9589066c646df387d1831a608226f4cd694fc59e745059

# Shell-less production runtime. The native Node executable is 24.18.0 and the
# pinned multi-arch image currently scans with zero HIGH/CRITICAL findings.
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot@sha256:af85d11ce7ef10172855a6e3649e3e8125b1b9e3ca41849ec2918036f05cb212

# Stage 1: Build dependencies
FROM ${BUILD_IMAGE} AS deps
WORKDIR /app
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Runtime dependencies. Prisma remains a production dependency because
# the release script runs its CLI from this immutable image before cutover.
FROM ${BUILD_IMAGE} AS prod-deps
WORKDIR /app
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  && test -x node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x \
  && npm cache clean --force

# Stage 3: Build
FROM ${BUILD_IMAGE} AS builder
WORKDIR /app
ARG APP_URL=https://egadisailing.com
ARG APP_LOCALES_DEFAULT=it
ARG NEXTAUTH_URL=https://egadisailing.com
ARG NEXT_DEPLOYMENT_ID=
ARG DEPLOYMENT_VERSION=
ARG SENTRY_RELEASE=
ARG GIT_SHA=
ARG SERVER_ACTIONS_ALLOWED_ORIGINS=egadisailing.com,www.egadisailing.com
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
ARG NEXT_PUBLIC_ASSET_CDN_URL=
ARG NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL=
ARG NEXT_PUBLIC_GTM_ID=
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
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV SENTRY_RELEASE=$SENTRY_RELEASE
ENV GIT_SHA=$GIT_SHA
ENV SERVER_ACTIONS_ALLOWED_ORIGINS=$SERVER_ACTIONS_ALLOWED_ORIGINS
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_ASSET_CDN_URL=$NEXT_PUBLIC_ASSET_CDN_URL
ENV NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL=$NEXT_PUBLIC_HOME_TOUR_EGADI_VIDEO_URL
ENV NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID
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
RUN npm run db:generate
RUN npm run build
RUN mkdir -p /app/.next/cache

# Stage 4: Production
FROM ${RUNTIME_IMAGE} AS runner
WORKDIR /app
ARG GIT_SHA=unknown
ARG NEXT_DEPLOYMENT_ID=unknown
ARG DEPLOYMENT_VERSION=unknown
ARG SENTRY_RELEASE=unknown
ARG PUBLIC_CONFIG_SHA256=unknown
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV HOME=/tmp
ENV GIT_SHA=$GIT_SHA
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
ENV DEPLOYMENT_VERSION=$DEPLOYMENT_VERSION
ENV SENTRY_RELEASE=$SENTRY_RELEASE

LABEL org.opencontainers.image.source="https://github.com/AkaSama26/egadisailing" \
      org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.version=$DEPLOYMENT_VERSION \
      org.opencontainers.image.base.name="gcr.io/distroless/nodejs24-debian13:nonroot" \
      com.egadisailing.public-config-sha256=$PUBLIC_CONFIG_SHA256

# Distroless has no shell, package manager or mutable install step. UID/GID
# 1001 intentionally matches the existing production next_cache volume created
# by the previous non-root image, avoiding any permission mutation at cutover.
# Application code/dependencies remain root-owned and read-only to uid 1001.
# Only the cache path is writable by the runtime process.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder --chown=1001:1001 /app/.next/cache ./.next/cache
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/deploy/dismiss-historical-emails.mjs ./deploy/dismiss-historical-emails.mjs
COPY --from=builder /app/deploy/prepare-email-rollback.mjs ./deploy/prepare-email-rollback.mjs
COPY --from=builder /app/deploy/queue-cutover-control.cjs ./deploy/queue-cutover-control.cjs

# The standalone output contains the application trace. Merge the immutable
# production dependency tree so the Prisma CLI and its transitive dependencies
# are available without mutating package.json or the lockfile in this stage.
COPY --from=prod-deps /app/node_modules ./node_modules

USER 1001:1001

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

ENTRYPOINT ["/nodejs/bin/node"]
CMD ["server.js"]
