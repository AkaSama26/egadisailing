import { escapeHtml, safeUrl } from "@/lib/html-escape";
import { env } from "@/lib/env";

export { escapeHtml, safeUrl };

/**
 * Wrapper HTML condiviso per tutte le email transazionali.
 * Brand colors centralizzati qui.
 */
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string; // HTML gia' sanitizzato dal chiamante
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const ctaBlock =
    opts.ctaText && opts.ctaUrl
      ? `<div style="margin: 32px 0; text-align: center;">
          <a href="${safeUrl(opts.ctaUrl)}" style="display: inline-block; background: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 16px;">
            ${escapeHtml(opts.ctaText)}
          </a>
        </div>`
      : "";
  const privacyUrl = `${env.APP_URL}/privacy`;
  const termsUrl = `${env.APP_URL}/terms`;

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><title>${escapeHtml(opts.heading)}</title></head>
  <body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f4f4f4; padding: 24px;">
    <div style="max-width: 560px; margin: auto; background: white; padding: 32px; border-radius: 12px;">
      <h2 style="color: #0c3d5e; margin-top: 0;">${escapeHtml(opts.heading)}</h2>
      ${opts.bodyHtml}
      ${ctaBlock}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 16px;" />
      <p style="color: #6b7280; font-size: 12px; line-height: 1.5;">
        Egadisailing Srl · Email transazionale relativa ai servizi richiesti.<br />
        Per assistenza rispondi a questa email o scrivici dai contatti ufficiali.
      </p>
      <p style="color: #6b7280; font-size: 12px;">
        <a href="${safeUrl(privacyUrl)}" style="color: #0c3d5e;">Privacy</a>
        ·
        <a href="${safeUrl(termsUrl)}" style="color: #0c3d5e;">Termini</a>
      </p>
    </div>
  </body>
</html>`;
}
