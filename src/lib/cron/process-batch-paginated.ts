import { logger } from "@/lib/logger";
import { MAX_BATCHES } from "@/lib/timing";

export interface ProcessBatchPaginatedConfig<TItem, TCursor = unknown> {
  /** Cursor opaque (id, page number, starting_after) — passato a fetch. */
  initialCursor?: TCursor;
  /** Fetch one batch given cursor. Return [] when exhausted. */
  fetchBatch: (
    cursor: TCursor | undefined,
    batchSize: number,
  ) => Promise<{
    items: TItem[];
    nextCursor: TCursor | undefined;
  }>;
  /** Process one item. Return processing result for stats. */
  processItem: (item: TItem) => Promise<void>;
  /** Items per batch. Default 50. */
  batchSize?: number;
  /** Max batches before warning + stop. Default MAX_BATCHES.STANDARD. */
  maxBatches?: number;
  /** Soft-timeout: handler-supplied predicate. Returning true breaks loop. */
  shouldStop?: () => boolean;
  /** Logger label per context. */
  label: string;
}

export interface ProcessBatchPaginatedResult {
  processedCount: number;
  batchCount: number;
  hitMaxBatches: boolean;
  hitTimeout: boolean;
}

/**
 * Cursor-paginated batch loop for cron handlers. Replaces inline pagination
 * + maxBatches break + shouldStop check duplicated across pending-gc,
 * bokun-reconciliation, stripe-reconciliation, retention.
 *
 * NB: caller deve guidare il cursore (returna `nextCursor` da `fetchBatch`).
 * Loop break condition: items.length === 0 OR items.length < batchSize.
 */
export async function processBatchPaginated<TItem, TCursor = unknown>(
  config: ProcessBatchPaginatedConfig<TItem, TCursor>,
): Promise<ProcessBatchPaginatedResult> {
  const batchSize = config.batchSize ?? 50;
  const maxBatches = config.maxBatches ?? MAX_BATCHES.STANDARD;
  let cursor = config.initialCursor;
  let processedCount = 0;
  let batchCount = 0;
  let hitMaxBatches = false;
  let hitTimeout = false;

  while (batchCount < maxBatches) {
    if (config.shouldStop?.()) {
      hitTimeout = true;
      break;
    }
    const { items, nextCursor } = await config.fetchBatch(cursor, batchSize);
    if (items.length === 0) break;
    for (const item of items) {
      if (config.shouldStop?.()) {
        hitTimeout = true;
        break;
      }
      await config.processItem(item);
      processedCount++;
    }
    if (hitTimeout) break;
    cursor = nextCursor;
    batchCount++;
    if (items.length < batchSize) break; // exhausted
  }

  if (batchCount >= maxBatches) {
    hitMaxBatches = true;
    logger.warn(
      { label: config.label, processedCount, batchCount, maxBatches },
      "processBatchPaginated: hit max batches",
    );
  }

  return { processedCount, batchCount, hitMaxBatches, hitTimeout };
}
