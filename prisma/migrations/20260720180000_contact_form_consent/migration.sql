-- GDPR art. 7: evidence of the mandatory Privacy Policy and Terms acceptance
-- collected with every distinct contact request.
CREATE TABLE "ContactConsentRecord" (
  "id" TEXT NOT NULL,
  "submissionKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "privacyAccepted" BOOLEAN NOT NULL,
  "termsAccepted" BOOLEAN NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,

  CONSTRAINT "ContactConsentRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContactConsentRecord_required_acceptance_check"
    CHECK ("privacyAccepted" = TRUE AND "termsAccepted" = TRUE)
);

CREATE UNIQUE INDEX "ContactConsentRecord_submissionKey_key"
  ON "ContactConsentRecord"("submissionKey");
CREATE INDEX "ContactConsentRecord_email_idx"
  ON "ContactConsentRecord"("email");
CREATE INDEX "ContactConsentRecord_policyVersion_idx"
  ON "ContactConsentRecord"("policyVersion");
CREATE INDEX "ContactConsentRecord_acceptedAt_idx"
  ON "ContactConsentRecord"("acceptedAt");
