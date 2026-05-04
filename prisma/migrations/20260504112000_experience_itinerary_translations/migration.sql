-- Normalize experience itineraries so supported locales can grow without
-- adding one column per language.
CREATE TABLE "ExperienceItineraryStepTranslation" (
  "stepId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "time" TEXT,
  "title" TEXT,
  "location" TEXT,
  "text" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExperienceItineraryStepTranslation_pkey" PRIMARY KEY ("stepId", "locale")
);

CREATE INDEX "ExperienceItineraryStepTranslation_locale_idx"
  ON "ExperienceItineraryStepTranslation"("locale");

ALTER TABLE "ExperienceItineraryStepTranslation"
  ADD CONSTRAINT "ExperienceItineraryStepTranslation_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "ExperienceItineraryStep"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ExperienceItineraryStepTranslation" (
  "stepId",
  "locale",
  "time",
  "title",
  "location",
  "text",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'it',
  "timeIt",
  "titleIt",
  "locationIt",
  "textIt",
  "createdAt",
  "updatedAt"
FROM "ExperienceItineraryStep";

INSERT INTO "ExperienceItineraryStepTranslation" (
  "stepId",
  "locale",
  "time",
  "title",
  "location",
  "text",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  'en',
  NULLIF("timeEn", ''),
  NULLIF("titleEn", ''),
  NULLIF("locationEn", ''),
  NULLIF("textEn", ''),
  "createdAt",
  "updatedAt"
FROM "ExperienceItineraryStep"
WHERE NULLIF("timeEn", '') IS NOT NULL
   OR NULLIF("titleEn", '') IS NOT NULL
   OR NULLIF("locationEn", '') IS NOT NULL
   OR NULLIF("textEn", '') IS NOT NULL;

ALTER TABLE "ExperienceItineraryStep"
  DROP COLUMN "timeIt",
  DROP COLUMN "timeEn",
  DROP COLUMN "titleIt",
  DROP COLUMN "titleEn",
  DROP COLUMN "locationIt",
  DROP COLUMN "locationEn",
  DROP COLUMN "textIt",
  DROP COLUMN "textEn";
