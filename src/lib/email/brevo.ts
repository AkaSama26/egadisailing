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
 * Failure-safe per design: in dev senza API key logga e prosegue.
 * In production rilancia ExternalServiceError (il chiamante decide se bloccare).
 */
export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  if (!env.BREVO_API_KEY) {
    // In production, env.ts ha gia' enforced la presenza della key quindi
    // arriveremo qui solo se mancante. Fail loud invece di silent-skip.
    if (env.NODE_ENV === "production") {
      throw new ExternalServiceError("Brevo", "BREVO_API_KEY not configured");
    }
    logger.warn(
      { to: opts.to, subject: opts.subject },
      "BREVO_API_KEY not set in dev — skipping email send",
    );
    return;
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
        subject: opts.subject,
        htmlContent: opts.htmlContent,
        textContent: opts.textContent,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: errorBody, to: opts.to },
        "Brevo send failed",
      );
      throw new ExternalServiceError("Brevo", `send failed (${res.status})`, { to: opts.to });
    }

    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err;
    logger.error({ err, to: opts.to }, "Brevo sendEmail failed");
    throw new ExternalServiceError("Brevo", "sendEmail failed", { to: opts.to });
  }
}
