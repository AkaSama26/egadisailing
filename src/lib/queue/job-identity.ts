import { randomUUID } from "node:crypto";

export interface QueueJobIdentity {
  /** Identita' unica di questa esecuzione, mai riutilizzata dopo terminal state. */
  executionId: string;
  /** Identita' business stabile usata per serializzazione/convergenza. */
  logicalKey: string;
}

/**
 * Separa la deduplica business dall'identita' BullMQ. Un job completed/failed
 * resta in Redis per retention e quindi non deve occupare per giorni l'ID che
 * serve a una nuova variazione della stessa cella.
 */
export function createQueueJobIdentity(logicalKey: string): QueueJobIdentity {
  return { executionId: randomUUID(), logicalKey };
}

export function queueExecutionJobId(identity: QueueJobIdentity): string {
  return `exec-${identity.executionId}`;
}
