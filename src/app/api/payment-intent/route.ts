import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { assertOtaFreshBeforePayment } from "@/lib/booking/ota-preflight";
import {
  applyDirectBookingAvailabilityHold,
  attachPaymentIntentToPendingDirectBooking,
  cancelPendingDirectBookingAndReleaseHold,
} from "@/lib/booking/direct-availability-hold";
import { logger } from "@/lib/logger";
import { cancelPaymentIntent, createPaymentIntent } from "@/lib/stripe/payment-intents";
import { buildBookingMetadata } from "@/lib/stripe/metadata";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp, getUserAgent, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { ACCEPTED_POLICY_VERSIONS } from "@/lib/legal/policy-version";
import { normalizeEmail } from "@/lib/email-normalize";
import { emailSchema, personNameSchema } from "@/lib/validation/common-zod";
import { RL_WINDOW } from "@/lib/timing";
import { passengerBreakdownSchema } from "@/lib/booking/passengers";

export const runtime = "nodejs";

// R17-SEC-#10 + R18-REG-ALTA: policyVersion deciso server-side, importato
// da singola source-of-truth `src/lib/legal/policy-version.ts` (allineato
// con pagine /privacy, /terms e wizard client).

const schema = z.object({
  serviceId: z.string().min(1).max(100),
  // R17-SEC-#1: cap a 2 anni nel futuro. Senza, attaccante floodava PI
  // con startDate 2099 → Stripe quota fee + DB bloat.
  // R26-A1-A2: accetta ISO-day (`"YYYY-MM-DD"` da <input type="date">) OR
  // full datetime (back-compat) — il server delega a `parseDateLikelyLocalDay`
  // per normalizzazione consistente Europe/Rome. Invariante #16.
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "startDate must be ISO date or datetime")
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const maxFuture = new Date();
      maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 2);
      return d <= maxFuture;
    }, "startDate oltre 2 anni nel futuro o invalida"),
  durationDays: z.number().int().min(3).max(7).optional(),
  passengers: passengerBreakdownSchema.optional(),
  // Back-compat temporanea per test/client vecchi. Il nuovo wizard pubblico
  // manda sempre `passengers`.
  numPeople: z.number().int().min(1).max(50).optional(),
  customer: z.object({
    email: emailSchema,
    // Escape HTML-dangerous chars: riducono rischio XSS nei template email
    firstName: personNameSchema(100),
    lastName: personNameSchema(100),
    // R21-A3-ALTA-1: regex phone — permette solo digits + `+`, spazi, parentesi,
    // trattino, punto. Previene injection futura se phone finisce in template
    // HTML/WhatsApp URL. Max 30 per uniformita' con altri limiti.
    phone: z
      .string()
      .trim()
      .min(1, "Telefono obbligatorio")
      .max(30)
      .regex(/^(?=.*\d)[+\d\s()\-.]{1,30}$/, "Numero telefono non valido"),
    nationality: z.string().length(2).optional(),
    language: z.string().max(8).optional(),
  }),
  paymentSchedule: z.enum(["FULL", "DEPOSIT_BALANCE"]),
  depositPercentage: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(1000).optional(),
  turnstileToken: z.string().optional(),
  // GDPR consent — obbligatorio, server-validated (anche se il client
  // dovrebbe impedire il submit, non ci fidiamo del client).
  consent: z.object({
    privacyAccepted: z.literal(true),
    termsAccepted: z.literal(true),
    policyVersion: z.enum(ACCEPTED_POLICY_VERSIONS),
  }),
}).refine((value) => value.passengers || value.numPeople, {
  message: "passengers is required",
  path: ["passengers"],
});

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req.headers);

  // Rate limit aggressivo: 10/hour per IP, 5/hour per email
  // R25-A3-A1 consistency: normalizeIpForRateLimit per IPv6 /64 subnet
  // rotation bypass — attaccante con /64 IPv6 ruotava IP per moltiplicare
  // bucket. Pattern uniformato con webhook Bokun/Boataround.
  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: "PAYMENT_INTENT_IP_HOUR",
    limit: 10,
    windowSeconds: RL_WINDOW.HOUR,
    failOpen: false, // R17-SEC-#5: endpoint pubblico sensibile, no bypass su Redis down
  });

  const body = await req.json();
  const input = schema.parse(body);

  // Anti-bot: Turnstile enforced in production, optional in dev (allinea con
  // recupera-prenotazione OTP flow). Senza CAPTCHA, un bot pool bypassava il
  // rate-limit IP creando Stripe PaymentIntent fittizi + booking PENDING in DB.
  if (env.NODE_ENV === "production" || input.turnstileToken) {
    if (!input.turnstileToken) {
      throw new ValidationError("CAPTCHA verification required");
    }
    const valid = await verifyTurnstileToken(input.turnstileToken, ip);
    if (!valid) throw new ValidationError("CAPTCHA verification failed");
  }

  await enforceRateLimit({
    // R19-TechDebt-Bug: normalizeEmail invariant #17 (Gmail alias dedup).
    // Prima `.toLowerCase()` permetteva a bot di usare `mario+1@gmail.com`,
    // `mario+2@gmail.com`... come bucket diversi → bypass rate-limit email.
    identifier: normalizeEmail(input.customer.email),
    scope: "PAYMENT_INTENT_EMAIL_HOUR",
    limit: 5,
    windowSeconds: RL_WINDOW.HOUR,
    failOpen: false, // R17-SEC-#5
  });

  await assertOtaFreshBeforePayment({
    serviceId: input.serviceId,
    startDate: new Date(input.startDate),
    durationDays: input.durationDays,
  });

  const booking = await createPendingDirectBooking({
    serviceId: input.serviceId,
    startDate: new Date(input.startDate),
    durationDays: input.durationDays,
    numPeople: input.numPeople,
    passengers: input.passengers,
    customer: input.customer,
    paymentSchedule: input.paymentSchedule,
    depositPercentage: input.depositPercentage,
    notes: input.notes,
    consent: {
      privacyAccepted: input.consent.privacyAccepted,
      termsAccepted: input.consent.termsAccepted,
      policyVersion: input.consent.policyVersion,
      ipAddress: ip,
      userAgent: getUserAgent(req.headers),
    },
  });

  await applyDirectBookingAvailabilityHold(booking.bookingId);

  let pi: Awaited<ReturnType<typeof createPaymentIntent>>;
  try {
    pi = await createPaymentIntent({
      amountCents: booking.upfrontAmountCents,
      customerEmail: input.customer.email,
      customerName: `${input.customer.firstName} ${input.customer.lastName}`,
      description: `Egadisailing ${booking.confirmationCode}`,
      metadata: buildBookingMetadata({
        bookingId: booking.bookingId,
        confirmationCode: booking.confirmationCode,
        paymentType: input.paymentSchedule === "DEPOSIT_BALANCE" ? "DEPOSIT" : "FULL",
      }),
    });

    try {
      await attachPaymentIntentToPendingDirectBooking({
        bookingId: booking.bookingId,
        paymentIntentId: pi.paymentIntentId,
      });
    } catch (err) {
      await cancelPaymentIntent(pi.paymentIntentId).catch((cancelErr) => {
        logger.warn(
          { err: cancelErr, bookingId: booking.bookingId, piId: pi.paymentIntentId },
          "PaymentIntent cancel after attach failure failed",
        );
      });
      throw err;
    }
  } catch (err) {
    await cancelPendingDirectBookingAndReleaseHold({
      bookingId: booking.bookingId,
      reason: "payment_intent_create_failed",
    }).catch((cleanupErr) => {
      logger.error(
        { err: cleanupErr, bookingId: booking.bookingId },
        "Failed to release checkout availability hold after PaymentIntent failure",
      );
    });
    throw err;
  }

  // 201 Created + Location per consumer REST-aware. Envelope { data: ... }
  // coerente con convenzione documentata in AGENTS.md.
  return NextResponse.json(
    {
      data: {
        confirmationCode: booking.confirmationCode,
        clientSecret: pi.clientSecret,
        amountCents: booking.upfrontAmountCents,
        totalCents: booking.totalAmountCents,
        balanceCents: booking.balanceAmountCents,
      },
    },
    {
      status: 201,
      headers: {
        Location: `${env.APP_URL}/${env.APP_LOCALES_DEFAULT}/prenota/success/${booking.confirmationCode}`,
      },
    },
  );
});
