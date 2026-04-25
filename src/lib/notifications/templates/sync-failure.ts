import { escapeHtml } from "@/lib/html-escape";
import { safePlain } from "./_shared";

export interface SyncFailurePayload {
  queueName: string;
  jobName: string;
  jobId: string;
  attemptsMade: number;
  errorCode?: string;
  errorMessage: string;
}

// R28-ALTA-4: template per SYNC_FAILURE notification. Consumer: BullMQ
// `worker.on("failed")` dopo JOB_MAX_ATTEMPTS (final failure, non retry
// intermedi). Alerting admin per DLQ draining: 100+ failed job su Bokun
// con product-not-found = cross-channel drift garantito se non risolto.

export function syncFailureTemplate(payload: SyncFailurePayload) {
  const subject = `Sync failure · ${payload.queueName} · ${payload.jobName}`;
  const html = `
    <h2 style="color:#b91c1c">Job fallito dopo ${payload.attemptsMade} tentativi</h2>
    <p><strong>Queue:</strong> ${escapeHtml(payload.queueName)}</p>
    <p><strong>Job:</strong> ${escapeHtml(payload.jobName)} <code>${escapeHtml(payload.jobId)}</code></p>
    <p><strong>Error:</strong> ${escapeHtml(payload.errorCode ?? "")} ${escapeHtml(payload.errorMessage)}</p>
    <p>Dettagli + retry manuale: <a href="/admin/sync-log">/admin/sync-log</a></p>
  `;
  const text = [
    `SYNC FAILURE — Job fallito dopo ${payload.attemptsMade} tentativi`,
    `Queue: ${safePlain(payload.queueName)}`,
    `Job: ${safePlain(payload.jobName)} (${safePlain(payload.jobId)})`,
    `Error: ${safePlain(payload.errorCode ?? "")} ${safePlain(payload.errorMessage)}`,
    `Admin: /admin/sync-log`,
  ].join("\n");
  const telegram = `<b>🔴 Sync failure</b>\n${escapeHtml(payload.queueName)} · ${escapeHtml(payload.jobName)}\n${escapeHtml(payload.errorMessage.slice(0, 200))}`;
  return { subject, html, text, telegram };
}
