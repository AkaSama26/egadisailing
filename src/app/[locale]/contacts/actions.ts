"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/brevo";
import { escapeHtml } from "@/lib/html-escape";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp, getUserAgent, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/email-normalize";
import { emailSchema, freeTextSchema } from "@/lib/validation/common-zod";
import { RL_WINDOW } from "@/lib/timing";

const schema = z.object({
  name: z.string().min(2).max(120).regex(/^[^<>]*$/, "Caratteri non ammessi"),
  email: emailSchema,
  phone: z.string().max(32).optional(),
  subject: freeTextSchema({ min: 3, max: 200 }),
  message: freeTextSchema({ min: 10, max: 5000 }),
  turnstileToken: z.string().optional(),
});

export interface ContactFormState {
  status: "idle" | "sent" | "error";
  message?: string;
}

/**
 * Server Action che invia il messaggio contatti a `info@egadisailing.com`
 * via Brevo. Protezioni:
 *  - Turnstile in prod (anti-bot)
 *  - Rate-limit 3 msg/h per IP + 3/h per email
 *  - Zod validation strict (no HTML)
 *  - Body escapato prima dell'inclusione HTML
 */
export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const h = await headers();
  const ip = getClientIp(h);

  try {
    const parsed = schema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      subject: formData.get("subject"),
      message: formData.get("message"),
      turnstileToken: formData.get("cf-turnstile-response") ?? undefined,
    });

    if (env.NODE_ENV === "production" || parsed.turnstileToken) {
      if (!parsed.turnstileToken) {
        throw new ValidationError("CAPTCHA verification required");
      }
      const valid = await verifyTurnstileToken(parsed.turnstileToken, ip);
      if (!valid) throw new ValidationError("CAPTCHA verification failed");
    }

    await enforceRateLimit({
      // R25-A3-A1 consistency: normalizeIpForRateLimit IPv6 /64 (era ip raw,
      // attaccante con /64 ruotava IP). Pattern uniformato con webhook
      // Bokun/Boataround + payment-intent.
      identifier: normalizeIpForRateLimit(ip),
      scope: RATE_LIMIT_SCOPES.CONTACT_FORM_IP,
      limit: 3,
      windowSeconds: RL_WINDOW.HOUR,
      // R28-CRIT-3: fail-closed per prevenire spam Brevo durante Redis down
      // → SMTP reputation damage + quota abuse.
      failOpen: false,
    });
    await enforceRateLimit({
      // R19-TechDebt-Bug: normalizeEmail invariant #17 (Gmail alias dedup).
      identifier: normalizeEmail(parsed.email),
      scope: RATE_LIMIT_SCOPES.CONTACT_FORM_EMAIL,
      limit: 3,
      windowSeconds: RL_WINDOW.HOUR,
      failOpen: false,
    });

    const userAgent = getUserAgent(h);
    // R22-P2-MEDIA-1: strip \r\n / control chars da parsed per plain text
    // (Brevo SMTP bridge puo' corrompere MIME con header injection se il
    // message contiene sequenze \r\n Subject:). Zod gia' blocca <>, ma
    // \r\n non e' coperto.
    const safePlain = (s: string) =>
      s.replace(/[\r\n]+/g, " ").replace(/[\u0000-\u001F]/g, " ").trim();
    // R22-A2-MEDIA-3: IP + User-Agent rimossi dal body email. Inbox contatti
    // e' condivisa (info@egadisailing.com) quindi inviare IP del cliente
    // in chiaro a tutti gli agenti che leggono e' disproportionate per GDPR.
    // IP+UA restano nei log server per antifraud (retention 90g art. 6(1)(f)).
    logger.info(
      { subject: parsed.subject, ip, userAgent: userAgent ?? "n/a" },
      "Contact message metadata (server-side only)",
    );
    const html = `
      <h2>Nuovo messaggio dal sito</h2>
      <p><strong>Da:</strong> ${escapeHtml(parsed.name)} &lt;${escapeHtml(parsed.email)}&gt;</p>
      ${parsed.phone ? `<p><strong>Telefono:</strong> ${escapeHtml(parsed.phone)}</p>` : ""}
      <p><strong>Oggetto:</strong> ${escapeHtml(parsed.subject)}</p>
      <hr/>
      <p style="white-space: pre-wrap">${escapeHtml(parsed.message)}</p>
    `;

    await sendEmail({
      to: env.BREVO_SENDER_EMAIL, // info@egadisailing.com (stesso sender)
      subject: `[Contatti] ${parsed.subject}`,
      htmlContent: html,
      textContent: `Da: ${safePlain(parsed.name)} <${safePlain(parsed.email)}>\n${parsed.message.replace(/\r\n/g, "\n")}`,
      // R22-A4-ALTA-1: Reply → cliente. Senza questo override, Reply va al
      // sender stesso (info@) → loop o bisogna copia/incollare from-line.
      replyTo: { email: parsed.email, name: parsed.name },
    });

    logger.info({ subject: parsed.subject }, "Contact message sent");

    return {
      status: "sent",
      message: "Messaggio inviato. Ti risponderemo entro 24 ore.",
    };
  } catch (err) {
    logger.error(
      { err: (err as Error).message, ip },
      "Contact message send failed",
    );
    return {
      status: "error",
      message:
        err instanceof z.ZodError
          ? "Controlla i campi del modulo."
          : err instanceof Error
            ? err.message
            : "Errore sconosciuto, riprova piu' tardi.",
    };
  }
}
