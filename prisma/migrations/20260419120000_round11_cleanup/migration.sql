-- Round 11 cleanup: drop dead models + enum values mai usati.

-- 1. WeatherGuaranteeApplication (zero app-code reference)
DROP TABLE IF EXISTS "WeatherGuaranteeApplication";
DROP TYPE IF EXISTS "WeatherGuaranteeType";

-- 2. CrewAvailability (feature mai esposta)
DROP TABLE IF EXISTS "CrewAvailability";
DROP TYPE IF EXISTS "CrewAvailabilityStatus";

-- 3. SyncQueue (sostituito da BullMQ, Plan 1/Round 2)
DROP TABLE IF EXISTS "SyncQueue";
DROP TYPE IF EXISTS "SyncStatus";

-- 4. PaymentMethod pruning: rimuovere POS e STRIPE_LINK mai usati.
-- Usiamo ALTER TYPE per rimuovere value (Postgres 14+): dobbiamo ricreare
-- l'enum perche' ALTER TYPE non supporta DROP VALUE direttamente.
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'CASH', 'BANK_TRANSFER', 'EXTERNAL');
ALTER TABLE "Payment" ALTER COLUMN "method" TYPE "PaymentMethod" USING "method"::text::"PaymentMethod";
DROP TYPE "PaymentMethod_old";
