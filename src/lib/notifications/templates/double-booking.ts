import { escapeHtml } from "@/lib/html-escape";

export interface DoubleBookingConflictItem {
  source: string;
  confirmationCode: string;
  status: string;
}

export interface DoubleBookingPayload {
  newBookingId: string;
  newSource: string;
  newConfirmationCode: string;
  boatId: string;
  startDate: string;
  endDate: string;
  conflicts: DoubleBookingConflictItem[];
}

function safePlain(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export function doubleBookingTemplate(payload: DoubleBookingPayload) {
  const subject = `⚠️ DOUBLE BOOKING rilevato · ${payload.newConfirmationCode}`;

  const conflictsHtml = payload.conflicts
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.source)}</strong> ${escapeHtml(c.confirmationCode)} (${escapeHtml(c.status)})</li>`,
    )
    .join("");

  const html = `
    <h2>Double-booking cross-OTA rilevato</h2>
    <p><strong>Azione urgente:</strong> cliente potrebbe presentarsi senza slot.</p>
    <p>Nuovo: <strong>${escapeHtml(payload.newConfirmationCode)}</strong> · ${escapeHtml(payload.newSource)}</p>
    <p>Barca <code>${escapeHtml(payload.boatId)}</code> · ${escapeHtml(payload.startDate)}${payload.startDate !== payload.endDate ? ` → ${escapeHtml(payload.endDate)}` : ""}</p>
    <p><strong>Overlappa con:</strong></p>
    <ul>${conflictsHtml}</ul>
    <p>Azione richiesta: decidere quale booking cancellare + rimborsare cliente + cancellare upstream sul panel OTA.</p>
    <p><a href="/admin/prenotazioni/${escapeHtml(payload.newBookingId)}">Apri nel pannello admin</a></p>
  `;

  const textLines = [
    "DOUBLE BOOKING cross-OTA rilevato",
    `Nuovo: ${safePlain(payload.newConfirmationCode)} · ${safePlain(payload.newSource)}`,
    `Barca: ${safePlain(payload.boatId)} · ${safePlain(payload.startDate)}${payload.startDate !== payload.endDate ? ` - ${safePlain(payload.endDate)}` : ""}`,
    "Conflitti:",
    ...payload.conflicts.map(
      (c) => `  - ${safePlain(c.source)} ${safePlain(c.confirmationCode)} (${safePlain(c.status)})`,
    ),
    "",
    "Decidere quale cancellare + rimborsare. Aprire /admin/prenotazioni.",
  ];
  const text = textLines.join("\n");

  const telegramLines = [
    `<b>⚠️ DOUBLE BOOKING</b>`,
    `${escapeHtml(payload.newSource)} ${escapeHtml(payload.newConfirmationCode)}`,
    `Boat ${escapeHtml(payload.boatId)} · ${escapeHtml(payload.startDate)}`,
    "Overlap:",
    ...payload.conflicts.map(
      (c) => `  ${escapeHtml(c.source)} ${escapeHtml(c.confirmationCode)} (${escapeHtml(c.status)})`,
    ),
  ];
  const telegram = telegramLines.join("\n");

  return { subject, html, text, telegram };
}
