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
import { routing } from "@/i18n/routing";

const DEFAULT_RECOVERY_LOCALE = routing.defaultLocale;

function recoveryCopy(locale: string) {
  const isEs = locale === "es";
  const isEn = locale === "en";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return {
    captchaRequired: isEs
      ? "Verificación CAPTCHA obligatoria"
      : isFr
        ? "Vérification CAPTCHA obligatoire"
      : isDe
        ? "CAPTCHA-Verifizierung erforderlich"
      : isEn
        ? "CAPTCHA verification required"
        : "Verifica CAPTCHA richiesta",
    captchaFailed: isEs
      ? "Verificación CAPTCHA fallida"
      : isFr
        ? "Échec de la vérification CAPTCHA"
      : isDe
        ? "CAPTCHA-Verifizierung fehlgeschlagen"
      : isEn
        ? "CAPTCHA verification failed"
        : "Verifica CAPTCHA non riuscita",
    unknownError: isEs ? "Error desconocido" : isFr ? "Erreur inconnue" : isDe ? "Unbekannter Fehler" : isEn ? "Unknown error" : "Errore sconosciuto",
    codeExpired: isEs ? "Código caducado" : isFr ? "Code expiré" : isDe ? "Code abgelaufen" : isEn ? "Code expired" : "Codice scaduto",
    tooManyAttempts: isEs
      ? "Demasiados intentos. Solicita un nuevo código"
      : isFr
        ? "Trop de tentatives. Demandez un nouveau code"
      : isDe
        ? "Zu viele Versuche. Fordern Sie einen neuen Code an"
      : isEn
        ? "Too many attempts. Request a new code"
        : "Troppi tentativi, richiedi un nuovo codice",
    invalidCode: isEs ? "Código no válido" : isFr ? "Code invalide" : isDe ? "Ungültiger Code" : isEn ? "Invalid code" : "Codice non valido",
    noBooking: isEs
      ? "No se ha encontrado ninguna reserva para este email"
      : isFr
        ? "Aucune réservation trouvée pour cet email"
      : isDe
        ? "Für diese E-Mail wurde keine Buchung gefunden"
      : isEn
        ? "No booking found for this email"
        : "Nessuna prenotazione trovata per questa email",
  };
}

const requestSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
  locale: z.enum(routing.locales).default(DEFAULT_RECOVERY_LOCALE),
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
      locale: formData.get("locale") ?? DEFAULT_RECOVERY_LOCALE,
    });
    const copy = recoveryCopy(parsed.locale);

    // normalizeEmail invece di toLowerCase: applica Gmail alias dedup
    // (`mario+tag@gmail.com` → `mario@gmail.com`). Cosi' il lookup Customer
    // e il rate-limit per-email matchano quelli di checkout/webhook (invariante #17).
    const email = normalizeEmail(parsed.email);

    // Turnstile enforced in production, optional in dev
    if (env.NODE_ENV === "production" || parsed.turnstileToken) {
      if (!parsed.turnstileToken) {
        throw new ValidationError(copy.captchaRequired);
      }
      const valid = await verifyTurnstileToken(parsed.turnstileToken, ip);
      if (!valid) {
        throw new ValidationError(copy.captchaFailed);
      }
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
        if (parsed.locale === DEFAULT_RECOVERY_LOCALE) {
          await sendOtpEmail(email, code);
        } else {
          await sendOtpEmail(email, code, parsed.locale);
        }
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
      message:
        err instanceof Error
          ? err.message
          : recoveryCopy(String(formData.get("locale") ?? DEFAULT_RECOVERY_LOCALE)).unknownError,
    };
  }
}

const verifySchema = z.object({
  email: emailSchema,
  code: z.string().length(6).regex(/^\d{6}$/),
  locale: z.enum(routing.locales).default(DEFAULT_RECOVERY_LOCALE),
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

  let locale: (typeof routing.locales)[number] = DEFAULT_RECOVERY_LOCALE;

  try {
    const parsed = verifySchema.parse({
      email: formData.get("email"),
      code: formData.get("code"),
      locale: formData.get("locale") ?? DEFAULT_RECOVERY_LOCALE,
    });
    locale = parsed.locale;
    const copy = recoveryCopy(locale);

    // normalizeEmail invece di toLowerCase: applica Gmail alias dedup
    // (`mario+tag@gmail.com` → `mario@gmail.com`). Cosi' il lookup Customer
    // e il rate-limit per-email matchano quelli di checkout/webhook (invariante #17).
    const email = normalizeEmail(parsed.email);
    await enforceOtpVerifyLimit(email, ip);

    const result = await verifyOtp(email, parsed.code);
    if (!result.valid) {
      const msg =
        result.reason === "EXPIRED"
          ? copy.codeExpired
          : result.reason === "TOO_MANY_ATTEMPTS"
            ? copy.tooManyAttempts
            : copy.invalidCode;
      return { status: "error", message: msg };
    }

    // Richiedi che esista una Customer con questa email. Previene sessioni
    // orfane su email arbitrarie (enumeration + quota DoS).
    const customer = await db.customer.findUnique({ where: { email } });
    if (!customer) {
      return {
        status: "error",
        message: copy.noBooking,
      };
    }

    await createBookingSession(email, ip, userAgent);
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : recoveryCopy(locale).unknownError,
    };
  }

  redirect(locale === "es" ? "/es/b/sesion" : locale === "fr" ? "/fr/b/session" : locale === "de" ? "/de/b/buchung" : `/${locale}/b/sessione`);
}
