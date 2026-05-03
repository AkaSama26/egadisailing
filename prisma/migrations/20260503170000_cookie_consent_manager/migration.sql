-- Cookie consent manager: proof log for cookie/tracker preferences.
-- Separate from booking ConsentRecord (privacy/T&C acceptance).

CREATE TABLE "CookieConsentEvent" (
    "id" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "acceptType" TEXT NOT NULL,
    "acceptedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "rejectedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "changedCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "acceptedServices" JSONB NOT NULL,
    "rejectedServices" JSONB NOT NULL,
    "cookieRevision" INTEGER NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "configHash" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourcePath" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CookieConsentEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CookieConsentPolicySnapshot" (
    "id" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "configHash" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "services" JSONB NOT NULL,
    "translations" JSONB NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CookieConsentPolicySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CookieConsentEvent_consentId_createdAt_idx" ON "CookieConsentEvent"("consentId", "createdAt");
CREATE INDEX "CookieConsentEvent_action_createdAt_idx" ON "CookieConsentEvent"("action", "createdAt");
CREATE INDEX "CookieConsentEvent_policyVersion_idx" ON "CookieConsentEvent"("policyVersion");
CREATE INDEX "CookieConsentEvent_createdAt_idx" ON "CookieConsentEvent"("createdAt");

CREATE UNIQUE INDEX "CookieConsentPolicySnapshot_policyVersion_key" ON "CookieConsentPolicySnapshot"("policyVersion");
CREATE INDEX "CookieConsentPolicySnapshot_createdAt_idx" ON "CookieConsentPolicySnapshot"("createdAt");
