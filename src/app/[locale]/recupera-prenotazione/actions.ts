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
import { normalizeEmail } from "@/lib/email-normalize";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { db } from "@/lib/db";
import { emailSchema } from "@/lib/validation/common-zod";
import { swallow } from "@/lib/result";

const requestSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
});

export interface RequestOtpState {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
  /** R15-REG-UX-12: timestamp monotono di invio, serve al client come dep
   *  di `useEffect` per resettare il cooldown ANCHE al reinvio stessa email
   *  (senza, `useActionState` ritorna nuova reference ma React deps `status`+
   *  `email` sono `Object.is` identici → effect non scatta → cooldown rotto). */
  sentAt?: number;
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

    // normalizeEmail invece di toLowerCase: applica Gmail alias dedup
    // (`mario+tag@gmail.com` → `mario@gmail.com`). Cosi' il lookup Customer
    // e il rate-limit per-email matchano quelli di checkout/webhook (invariante #17).
    const email = normalizeEmail(parsed.email);

    // Turnstile enforced in production, optional in dev
    if (env.NODE_ENV === "production" || parsed.turnstileToken) {
      if (!parsed.turnstileToken) {
        throw new ValidationError("CAPTCHA verification required");
      }
      const valid = await verifyTurnstileToken(parsed.turnstileToken, ip);
      if (!valid) throw new ValidationError("CAPTCHA verification failed");
    }

    await enforceOtpRequestLimit(email, ip);

    // R24-A2-M1: email bomb prevention. Sender API attacker-controlled:
    // con 3 req/h email + 30 req/day IP (single IP), attacker puo'
    // bombardare 30 email-bombing vittime/giorno via sendOtpEmail anche
    // se la email non ha Customer. Fix: check customer existence BEFORE
    // createOtp+sendOtpEmail. Constant-time delay per evitare enumeration
    // side-channel (timing difference tra "customer exists" vs "non
    // exists").
    const customer = await db.customer.findUnique({ where: { email } });

    if (customer) {
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
          .catch(swallow("recovery-flow invalidate orphan OTP", { otpId }));
        throw err;
      }
    } else {
      // Non leak l'assenza del customer: aspetta ~200ms (tempo comparabile
      // a createOtp + sendOtpEmail) prima di ritornare "sent" al client.
      // L'utente vede sempre lo stesso messaggio → no enumeration.
      await new Promise((r) => setTimeout(r, 200));
    }

    return { status: "sent", email, sentAt: Date.now() };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Errore sconosciuto",
    };
  }
}

const verifySchema = z.object({
  email: emailSchema,
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

    // normalizeEmail invece di toLowerCase: applica Gmail alias dedup
    // (`mario+tag@gmail.com` → `mario@gmail.com`). Cosi' il lookup Customer
    // e il rate-limit per-email matchano quelli di checkout/webhook (invariante #17).
    const email = normalizeEmail(parsed.email);
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
