import { escapeHtml, safeUrl } from "@/lib/html-escape";
import { env } from "@/lib/env";
import { PUBLIC_COMPANY_LEGAL } from "@/lib/public-contact";
import { BRAND_LOGO_SRC } from "@/lib/public-assets";
import { localizedStaticPath } from "@/lib/i18n/static-paths";
import { resolveEmailLocale } from "./locale";

export { escapeHtml, safeUrl };

function absoluteAssetUrl(src: string): string {
  try {
    return new URL(src, env.APP_URL).toString();
  } catch {
    return src;
  }
}

/**
 * Wrapper HTML condiviso per tutte le email transazionali.
 * Brand colors centralizzati qui.
 */
export function emailLayout(opts: {
  heading: string;
  bodyHtml: string; // HTML gia' sanitizzato dal chiamante
  ctaText?: string;
  ctaUrl?: string;
  locale?: string | null;
}): string {
  const locale = resolveEmailLocale(opts.locale);
  const ctaBlock =
    opts.ctaText && opts.ctaUrl
      ? `<div style="margin: 30px 0 6px; text-align: center;">
          <a href="${safeUrl(opts.ctaUrl)}" style="display: inline-block; background: #d97706; color: #ffffff; padding: 14px 26px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 15px; line-height: 1.2;">
            ${escapeHtml(opts.ctaText)}
          </a>
        </div>`
      : "";
  const privacyUrl = `${env.APP_URL}${localizedStaticPath(locale, "/privacy")}`;
  const termsUrl = `${env.APP_URL}${localizedStaticPath(locale, "/terms")}`;
  const logoUrl = safeUrl(absoluteAssetUrl(BRAND_LOGO_SRC));
  const footerCopy =
    locale === "en"
      ? "Transactional email about the services you requested.<br />For support, reply to this email or contact us through the official channels."
      : locale === "es"
        ? "Email transaccional relacionado con los servicios solicitados.<br />Para recibir ayuda, responde a este email o escríbenos a través de los contactos oficiales."
        : locale === "fr"
          ? "Email transactionnel lié aux services demandés.<br />Pour toute assistance, répondez à cet email ou contactez-nous via les canaux officiels."
          : "Email transazionale relativa ai servizi richiesti.<br />Per assistenza rispondi a questa email o scrivici dai contatti ufficiali.";
  const termsLabel =
    locale === "en"
      ? "Terms"
      : locale === "es"
        ? "Condiciones"
        : locale === "fr"
          ? "Conditions"
          : "Termini";
  const vatLabel = locale === "it" ? "P.IVA" : "VAT";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(opts.heading)}</title>
    <style>
      body, table, td, p, a { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
      p { margin: 0 0 14px; line-height: 1.65; }
      a { color: #0369a1; }
      .email-content strong { color: #0f172a; }
      .email-content ul, .email-content ol { margin: 0 0 16px 20px; padding: 0; }
      .email-content li { margin: 0 0 8px; line-height: 1.55; }
      @media (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background: #eef3f7; color: #1e293b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background: #eef3f7;">
      <tr>
        <td align="center" style="padding: 28px 12px;">
          <table role="presentation" class="email-shell" width="600" cellspacing="0" cellpadding="0" style="width: 600px; max-width: 600px; border-collapse: separate; border-spacing: 0;">
            <tr>
              <td align="center" style="background: #071934; padding: 26px 28px 22px; border-radius: 18px 18px 0 0;">
                <img src="${logoUrl}" width="74" alt="Egadisailing" style="display: block; width: 74px; max-width: 74px; height: auto; margin: 0 auto 12px; filter: brightness(0) invert(1);" />
                <div style="font-size: 18px; line-height: 1.2; font-weight: 800; color: #ffffff; letter-spacing: 0;">
                  Egadisailing
                </div>
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="background: #ffffff; padding: 34px 34px 28px; border-left: 1px solid #dbe7ef; border-right: 1px solid #dbe7ef;">
                <h1 style="margin: 0 0 22px; color: #0c3d5e; font-size: 26px; line-height: 1.2; font-weight: 800;">
                  ${escapeHtml(opts.heading)}
                </h1>
                <div class="email-content" style="font-size: 15px; line-height: 1.65; color: #334155;">
                  ${opts.bodyHtml}
                </div>
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td class="email-pad" style="background: #f8fafc; padding: 20px 34px 26px; border: 1px solid #dbe7ef; border-top: 1px solid #e2e8f0; border-radius: 0 0 18px 18px;">
                <p style="margin: 0 0 10px; color: #64748b; font-size: 12px; line-height: 1.55;">
                  ${escapeHtml(PUBLIC_COMPANY_LEGAL.name)} · ${vatLabel} ${escapeHtml(PUBLIC_COMPANY_LEGAL.vatNumber)} · ${footerCopy}
                </p>
                <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                  <a href="${safeUrl(privacyUrl)}" style="color: #0c3d5e; text-decoration: underline;">Privacy</a>
                  ·
                  <a href="${safeUrl(termsUrl)}" style="color: #0c3d5e; text-decoration: underline;">${escapeHtml(termsLabel)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
