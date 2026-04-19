import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Integration test DB: Postgres reale via Docker (docker compose up -d
 * postgres) su database separato `egadisailing_test`. Rationale:
 * - `pglite` aveva adapter incompatibility con @prisma/adapter-pg.
 * - Postgres reale supporta advisory-lock, btree_gist, full-text, CITEXT
 *   → piu' fedele al comportamento prod.
 *
 * Setup (una volta):
 *   docker compose exec postgres psql -U egadisailing -d postgres \
 *     -c "CREATE DATABASE egadisailing_test;"
 *   DATABASE_URL="postgresql://.../egadisailing_test" npx prisma migrate deploy
 *
 * TEST_DATABASE_URL derivata da DATABASE_URL (.env) sostituendo il nome DB
 * a `egadisailing_test`. Override via env `TEST_DATABASE_URL` se serve.
 */

let prisma: PrismaClient | null = null;

function getTestDbUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const main = process.env.DATABASE_URL;
  if (!main) {
    throw new Error("DATABASE_URL non settato — serve .env per derivare TEST_DATABASE_URL");
  }
  return main.replace(/\/[^/?]+(\?|$)/, "/egadisailing_test$1");
}

export async function setupTestDb(): Promise<PrismaClient> {
  if (prisma) return prisma;

  const url = getTestDbUrl();
  process.env.DATABASE_URL = url;
  const pool = new Pool({ connectionString: url, max: 5 });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return prisma;
}

export async function resetTestDb(): Promise<void> {
  if (!prisma) return;
  // TRUNCATE tutte le tabelle user (skip _prisma_migrations).
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      tbl text;
    BEGIN
      FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
      LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl);
      END LOOP;
    END $$;
  `);
}

export async function closeTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
