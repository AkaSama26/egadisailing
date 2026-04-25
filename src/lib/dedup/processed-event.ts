import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Tabelle Prisma supportate per dedup (ProcessedXEvent family).
 * Each table has uniform shape: { eventId/messageHash @id, processedAt }.
 */
export type DedupTable =
  | "ProcessedStripeEvent"
  | "ProcessedBokunEvent"
  | "ProcessedBoataroundEvent"
  | "ProcessedCharterEmail";

interface DedupTableConfig {
  /** Field name che funge da @id sulla tabella (eventId per Stripe/Bokun/Boataround, messageHash per CharterEmail). */
  idField: "eventId" | "messageHash";
  /** Prisma model accessor (camelCase). */
  modelAccessor:
    | "processedStripeEvent"
    | "processedBokunEvent"
    | "processedBoataroundEvent"
    | "processedCharterEmail";
}

const TABLE_CONFIG: Record<DedupTable, DedupTableConfig> = {
  ProcessedStripeEvent: { idField: "eventId", modelAccessor: "processedStripeEvent" },
  ProcessedBokunEvent: { idField: "eventId", modelAccessor: "processedBokunEvent" },
  ProcessedBoataroundEvent: { idField: "eventId", modelAccessor: "processedBoataroundEvent" },
  ProcessedCharterEmail: { idField: "messageHash", modelAccessor: "processedCharterEmail" },
};

interface DedupModel {
  findUnique: (args: { where: Record<string, string>; select?: Record<string, true> }) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  deleteMany: (args: { where: { processedAt: { lt: Date } } }) => Promise<{ count: number }>;
}

function getModel(table: DedupTable): DedupModel {
  const accessor = TABLE_CONFIG[table].modelAccessor;
  // Cast intentional: dynamic Prisma client lookup. Each accessor is a valid
  // Prisma delegate; the union result narrows to the shape we actually use.
  return (db as unknown as Record<string, DedupModel>)[accessor];
}

export interface DedupResult<T> {
  /** True se l'evento e' gia' stato processato (handler skippato). */
  skipped: boolean;
  /** Output dell'handler — undefined se skipped. */
  data?: T;
}

/**
 * Idempotency wrapper per webhook/email events. Pattern:
 *   1. findUnique({where: {idField: eventId}}) → if exists, skip handler.
 *   2. Run handler.
 *   3. create({data: {idField, ...extra}}) — P2002 race tolerated.
 *
 * NB: Stripe/Bokun/Boataround use `eventId`, CharterEmail uses `messageHash`.
 * Helper risolve il fieldname per tabella.
 *
 * Marker viene scritto ALLA FINE (post-handler), pattern aligned con
 * `webhook-handler.ts` dopo R28-CRIT-2: marker INSERT-first faceva
 * perdere booking se import falliva tra check e insert.
 */
export async function withDedupedEvent<T>(
  table: DedupTable,
  eventId: string,
  extraData: Record<string, unknown>,
  handler: () => Promise<T>,
): Promise<DedupResult<T>> {
  const config = TABLE_CONFIG[table];
  const model = getModel(table);

  // 1. Pre-check
  const existing = await model.findUnique({
    where: { [config.idField]: eventId },
    select: { [config.idField]: true },
  });
  if (existing) {
    logger.info(
      { table, eventId },
      "withDedupedEvent: skipped (already processed)",
    );
    return { skipped: true };
  }

  // 2. Run handler (caller's import logic)
  const result = await handler();

  // 3. Mark processed (P2002 race-tolerant)
  try {
    await model.create({
      data: {
        [config.idField]: eventId,
        ...extraData,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Another process raced with us — both processed once, marker exists. Safe.
      logger.info(
        { table, eventId },
        "withDedupedEvent: marker created by concurrent process",
      );
    } else {
      throw err;
    }
  }

  return { skipped: false, data: result };
}

/**
 * Retention helper — usato dal cron retention/route.ts per eliminare
 * marker piu' vecchi di N giorni. Replaces 4 verbatim deleteMany calls.
 */
export async function pruneProcessedEvents(
  table: DedupTable,
  retentionDays: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const model = getModel(table);
  const result = await model.deleteMany({
    where: { processedAt: { lt: cutoff } },
  });
  logger.info(
    { table, retentionDays, deletedCount: result.count },
    "pruneProcessedEvents: retention sweep completed",
  );
  return result.count;
}
