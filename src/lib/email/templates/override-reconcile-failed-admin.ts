import { emailLayout, escapeHtml, safeUrl } from "./_layout";

export interface OverrideReconcileFailedAdminProps {
  overrideRequestId: string;
  newBookingCode: string;
  upstreamConflicts: Array<{
    bookingId: string;
    channel: string;
    externalRef: string;
    status: string;
  }>;
  overrideDetailUrl: string;
}

export function overrideReconcileFailedAdminTemplate(
  data: OverrideReconcileFailedAdminProps,
): { subject: string; html: string; text: string } {
  const subject = `[FATAL] OverrideRequest ${data.overrideRequestId} — reconcile failed`;
  const upstreamList = data.upstreamConflicts
    .map((c) =>
      `<li>${escapeHtml(c.channel)} &middot; ${escapeHtml(c.externalRef)} &middot; stato: <strong>${escapeHtml(c.status)}</strong></li>`,
    )
    .join("");
  const body = `
    <p>Attenzione: reconcile post-approve fallito.</p>
    <p>L'OverrideRequest <strong>${escapeHtml(data.overrideRequestId)}</strong>
      (new booking <strong>${escapeHtml(data.newBookingCode)}</strong>) e' stata approvata
      ma l'upstream OTA risulta ancora attivo dopo +1h.</p>
    <p>Booking upstream still active:</p>
    <ul>${upstreamList}</ul>
    <p><strong>Azione richiesta</strong>: verifica immediatamente sul pannello esterno che la cancellazione sia stata eseguita correttamente. Bug tipici: Viator non propaga cancel a Bokun, admin ha spuntato checkbox senza aver effettivamente cancellato nel pannello OTA.</p>
    <p><a href="${safeUrl(data.overrideDetailUrl)}">Apri detail + Retry reconcile</a></p>
  `;
  const text = `FATAL: OverrideRequest ${data.overrideRequestId} reconcile failed. Upstream still active: ${data.upstreamConflicts.map((c) => `${c.channel}:${c.externalRef}:${c.status}`).join(", ")}. Apri: ${data.overrideDetailUrl}`;
  return { subject, html: emailLayout({ heading: subject, bodyHtml: body }), text };
}
