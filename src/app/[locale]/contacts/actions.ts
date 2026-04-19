"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/brevo";
import { escapeHtml } from "@/lib/html-escape";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { normalizeEmail } from "@/lib/email-normalize";

const schema = z.object({
  name: z.string().min(2).max(120).regex(/^[^<>]*$/, "Caratteri non ammessi"),
  email: z.string().email().max(320),
  phone: z.string().max(32).optional(),
  subject: z.string().min(3).max(200).regex(/^[^<>]*$/, "Caratteri non ammessi"),
  message: z.string().min(10).max(5000).regex(/^[^<>]*$/, "Caratteri non ammessi"),
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
      identifier: ip,
      scope: RATE_LIMIT_SCOPES.CONTACT_FORM_IP,
      limit: 3,
      windowSeconds: 3600,
    });
    await enforceRateLimit({
      // R19-TechDebt-Bug: normalizeEmail invariant #17 (Gmail alias dedup).
      identifier: normalizeEmail(parsed.email),
      scope: RATE_LIMIT_SCOPES.CONTACT_FORM_EMAIL,
      limit: 3,
      windowSeconds: 3600,
    });

    const userAgent = getUserAgent(h);
    const html = `
      <h2>Nuovo messaggio dal sito</h2>
      <p><strong>Da:</strong> ${escapeHtml(parsed.name)} &lt;${escapeHtml(parsed.email)}&gt;</p>
      ${parsed.phone ? `<p><strong>Telefono:</strong> ${escapeHtml(parsed.phone)}</p>` : ""}
      <p><strong>Oggetto:</strong> ${escapeHtml(parsed.subject)}</p>
      <hr/>
      <p style="white-space: pre-wrap">${escapeHtml(parsed.message)}</p>
      <hr/>
      <p style="font-size: 12px; color: #888">
        IP: ${escapeHtml(ip)}<br/>
        User-Agent: ${escapeHtml(userAgent ?? "n/a")}
      </p>
    `;

    await sendEmail({
      to: env.BREVO_SENDER_EMAIL, // info@egadisailing.com (stesso sender)
      subject: `[Contatti] ${parsed.subject}`,
      htmlContent: html,
      textContent: `Da: ${parsed.name} <${parsed.email}>\n${parsed.message}`,
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
