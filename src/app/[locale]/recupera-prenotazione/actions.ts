"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createOtp } from "@/lib/otp/generate";
import { verifyOtp } from "@/lib/otp/verify";
import { sendOtpEmail } from "@/lib/otp/email";
import { enforceOtpRequestLimit, enforceOtpVerifyLimit } from "@/lib/rate-limit/otp-limits";
import { createBookingSession } from "@/lib/session/create";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { env } from "@/lib/env";
import { ValidationError } from "@/lib/errors";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { db } from "@/lib/db";

const requestSchema = z.object({
  email: z.string().email().max(320),
  turnstileToken: z.string().optional(),
});

export interface RequestOtpState {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
}

export async function requestOtp(
  _prev: RequestOtpState,
  formData: FormData,
): Promise<RequestOtpState> {
  const h = await headers();
  const ip = getClientIp(h);

  try {
    const parsed = requestSchema.parse({
      email: formData.get("email"),
      turnstileToken: formData.get("cf-turnstile-response") ?? undefined,
    });

    const email = parsed.email.toLowerCase();

    // Turnstile enforced in production, optional in dev
    if (env.NODE_ENV === "production" || parsed.turnstileToken) {
      if (!parsed.turnstileToken) {
        throw new ValidationError("CAPTCHA verification required");
      }
      const valid = await verifyTurnstileToken(parsed.turnstileToken, ip);
      if (!valid) throw new ValidationError("CAPTCHA verification failed");
    }

    await enforceOtpRequestLimit(email, ip);

    const { code, otpId } = await createOtp(email, ip);
    try {
      await sendOtpEmail(email, code);
    } catch (err) {
      // Email fallita: invalida l'OTP appena creato per evitare che l'utente
      // sia bloccato (rate-limit consumato) con codice fantasma.
      await db.bookingRecoveryOtp
        .update({
          where: { id: otpId },
          data: { expiresAt: new Date() },
        })
        .catch(() => {});
      throw err;
    }

    return { status: "sent", email };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Errore sconosciuto",
    };
  }
}

const verifySchema = z.object({
  email: z.string().email().max(320),
  code: z.string().length(6).regex(/^\d{6}$/),
});

export interface VerifyOtpState {
  status: "idle" | "error";
  message?: string;
}

export async function verifyOtpAndLogin(
  _prev: VerifyOtpState,
  formData: FormData,
): Promise<VerifyOtpState> {
  const h = await headers();
  const ip = getClientIp(h);
  const userAgent = getUserAgent(h);

  const locale = env.APP_LOCALES_DEFAULT;

  try {
    const parsed = verifySchema.parse({
      email: formData.get("email"),
      code: formData.get("code"),
    });

    const email = parsed.email.toLowerCase();
    await enforceOtpVerifyLimit(email, ip);

    const result = await verifyOtp(email, parsed.code);
    if (!result.valid) {
      const msg =
        result.reason === "EXPIRED"
          ? "Codice scaduto"
          : result.reason === "TOO_MANY_ATTEMPTS"
            ? "Troppi tentativi, richiedi un nuovo codice"
            : "Codice non valido";
      return { status: "error", message: msg };
    }

    // Richiedi che esista una Customer con questa email. Previene sessioni
    // orfane su email arbitrarie (enumeration + quota DoS).
    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer) {
      return { status: "error", message: "Nessuna prenotazione trovata per questa email" };
    }

    await createBookingSession(email, ip, userAgent);
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Errore sconosciuto",
    };
  }

  redirect(`/${locale}/b/sessione`);
}
