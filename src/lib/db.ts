import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // R23-L-CAPACITY: preferisci DATABASE_URL_POOLED se settato (PgBouncer
  // transaction-pool). Migrations/advisory-locks restano su DATABASE_URL
  // (session-pool richiesto — PgBouncer transaction-mode rompe
  // pg_advisory_xact_lock cross-statement). In prod il runtime usa il
  // pooler, i cron di migration usano il direct. Se il pooler non e'
  // configurato, fallback a direct DATABASE_URL.
  const runtimeUrl = env.DATABASE_URL_POOLED ?? env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: runtimeUrl,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    // Statement-level timeout: previene query runaway (deadlock, full scan
    // accidentali) da bloccare connessioni per minuti.
    statement_timeout: 15_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    // NODE_ENV reads via process.env directly: Next.js convention, env.NODE_ENV
    // would also work but the build-time bundler statically replaces process.env.NODE_ENV.
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
