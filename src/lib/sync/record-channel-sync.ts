"use server";

import { db } from "@/lib/db";

export type SyncHealthStatus = "GREEN" | "YELLOW" | "RED";

export interface RecordChannelSyncInput {
  /** Canale (es. "BOKUN", "STRIPE_EVENTS_RECONCILIATION") */
  channel: string;
  /**
   * Timestamp ultimo run successful. Se omesso, su update NON viene toccato
   * (preserva il valore esistente — utile per RED catch dove il run e' fallito
   * e non vogliamo avanzare il cursore di riconciliazione). Su create iniziale
   * fallback a `new Date()`.
   */
  lastSyncAt?: Date;
  /** Health status post-run. */
  healthStatus: SyncHealthStatus;
  /** Eventuale errore (RED/YELLOW). null = success. */
  lastError?: string | null;
}

/**
 * Upsert atomic su `ChannelSyncStatus` post-run cron. Estrae pattern
 * duplicato across stripe-reconciliation + bokun-reconciliation
 * (success + MAX_PAGES + RED catch). Single source of truth per
 * health-monitoring channel.
 *
 * Comportamento `lastSyncAt`:
 *  - Fornito: update lastSyncAt sia su create che su update.
 *  - Omesso: su update NON tocca lastSyncAt; su create fallback a now.
 *    (Pattern RED catch: il run e' fallito quindi non vogliamo avanzare
 *    il cursore — preserviamo lastSyncAt precedente per il prossimo retry.)
 */
export async function recordChannelSync(input: RecordChannelSyncInput): Promise<void> {
  const updateData: {
    healthStatus: SyncHealthStatus;
    lastError: string | null;
    lastSyncAt?: Date;
  } = {
    healthStatus: input.healthStatus,
    lastError: input.lastError ?? null,
  };
  if (input.lastSyncAt !== undefined) {
    updateData.lastSyncAt = input.lastSyncAt;
  }
  await db.channelSyncStatus.upsert({
    where: { channel: input.channel },
    update: updateData,
    create: {
      channel: input.channel,
      lastSyncAt: input.lastSyncAt ?? new Date(),
      healthStatus: input.healthStatus,
      lastError: input.lastError ?? null,
    },
  });
}
