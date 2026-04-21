-- R28-CRIT-6: unique constraint su BokunPriceSync(bokunExperienceId, date).
--
-- Prima: ogni retry worker / duplicate enqueue pricing.bokun.sync creava
-- una nuova row → audit fiscale duplication (N rows per stesso
-- (experienceId, date)). Ora il worker fa upsert idempotent.
--
-- Dedup pre-existing duplicates: mantieni la row piu' recente per
-- ogni coppia (bokunExperienceId, date).

DELETE FROM "BokunPriceSync" a
USING "BokunPriceSync" b
WHERE a."bokunExperienceId" = b."bokunExperienceId"
  AND a.date = b.date
  AND a."createdAt" < b."createdAt";

-- Il vecchio @@index([bokunExperienceId, date]) resta implicito via unique.
-- Prisma genera automatico lo stesso index name vs quello generato dall'index:
-- per evitare drift, usiamo lo stesso nome che Prisma genererebbe.
CREATE UNIQUE INDEX "BokunPriceSync_bokunExperienceId_date_key"
  ON "BokunPriceSync"("bokunExperienceId", "date");

-- Drop vecchio non-unique index (rimpiazzato dall'unique sopra).
DROP INDEX IF EXISTS "BokunPriceSync_bokunExperienceId_date_idx";
