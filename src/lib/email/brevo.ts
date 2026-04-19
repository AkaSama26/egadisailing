import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Invia email transazionale via Brevo REST API.
 *
 * Failure-safe per design: in dev senza API key logga e prosegue (ritorna
 * `false`). In production rilancia ExternalServiceError (il chiamante
 * decide se bloccare).
 *
 * R14-REG-C1: ritorna `boolean` (true = consegnato a Brevo 2xx, false =
 * dev skip). `throw` invece di `return false` solo in prod con errori
 * upstream effettivi — cosi' il dispatcher distingue skip da fail e il
 * caller non marca falsi "anyOk=true".
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!env.BREVO_API_KEY) {
    // In production, env.ts ha gia' enforced la presenza della key quindi
    // arriveremo qui solo se mancante. Fail loud invece di silent-skip.
    if (env.NODE_ENV === "production") {
      throw new ExternalServiceError("Brevo", "BREVO_API_KEY not configured");
    }
    logger.warn({ subject: opts.subject }, "BREVO_API_KEY not set in dev — skipping email send");
    return false;
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to: [{ email: opts.to, name: opts.toName }],
        // R12-A3: replyTo dedicato cosi' le risposte cliente non finiscono
        // nel mailbox "noreply". Default al sender se non configurato.
        replyTo: env.BREVO_REPLY_TO
          ? { email: env.BREVO_REPLY_TO }
          : { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        subject: opts.subject,
        htmlContent: opts.htmlContent,
        textContent: opts.textContent,
      }),
    });

    if (!res.ok) {
      // R14-Area1-ALTA: body Brevo 4xx spesso include l'email destinataria
      // e estratti del contenuto — niente raw body nel log. Solo status +
      // primo codice/messaggio JSON se presente.
      const errorBody = await res.text().catch(() => "");
      let code: string | undefined;
      try {
        const parsed = JSON.parse(errorBody) as { code?: string; message?: string };
        code = parsed.code ?? parsed.message?.slice(0, 120);
      } catch {
        code = errorBody.slice(0, 120);
      }
      logger.error(
        { status: res.status, brevoCode: code },
        "Brevo send failed",
      );
      throw new ExternalServiceError("Brevo", `send failed (${res.status})`);
    }

    // R14-Area1-CRITICA: niente email in chiaro nei log. Subject OK (non-PII
    // per template admin/customer generici).
    logger.info({ subject: opts.subject }, "Email sent");
    return true;
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err;
    logger.error({ err: (err as Error).message }, "Brevo sendEmail failed");
    throw new ExternalServiceError("Brevo", "sendEmail failed");
  }
}
