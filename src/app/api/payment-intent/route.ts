import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { createPaymentIntent } from "@/lib/stripe/payment-intents";
import { buildBookingMetadata } from "@/lib/stripe/metadata";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp, getUserAgent } from "@/lib/http/client-ip";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { verifyTurnstileToken } from "@/lib/turnstile/verify";
import { ValidationError } from "@/lib/errors";
import { env } from "@/lib/env";
import { ACCEPTED_POLICY_VERSIONS } from "@/lib/legal/policy-version";

export const runtime = "nodejs";

// R17-SEC-#10 + R18-REG-ALTA: policyVersion deciso server-side, importato
// da singola source-of-truth `src/lib/legal/policy-version.ts` (allineato
// con pagine /privacy, /terms e wizard client).

const schema = z.object({
  serviceId: z.string().min(1).max(100),
  // R17-SEC-#1: cap a 2 anni nel futuro. Senza, attaccante floodava PI
  // con startDate 2099 → Stripe quota fee + DB bloat.
  startDate: z
    .string()
    .datetime()
    .refine((v) => {
      const d = new Date(v);
      const maxFuture = new Date();
      maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 2);
      return d <= maxFuture;
    }, "startDate oltre 2 anni nel futuro"),
  numPeople: z.number().int().min(1).max(50),
  customer: z.object({
    email: z.string().email().max(320),
    // Escape HTML-dangerous chars: riducono rischio XSS nei template email
    firstName: z.string().min(1).max(100).regex(/^[^<>]*$/, "Invalid chars"),
    lastName: z.string().min(1).max(100).regex(/^[^<>]*$/, "Invalid chars"),
    phone: z.string().max(30).optional(),
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
});

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req.headers);

  // Rate limit aggressivo: 10/hour per IP, 5/hour per email
  await enforceRateLimit({
    identifier: ip,
    scope: "PAYMENT_INTENT_IP_HOUR",
    limit: 10,
    windowSeconds: 3600,
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
    identifier: input.customer.email.toLowerCase(),
    scope: "PAYMENT_INTENT_EMAIL_HOUR",
    limit: 5,
    windowSeconds: 3600,
    failOpen: false, // R17-SEC-#5
  });

  const booking = await createPendingDirectBooking({
    serviceId: input.serviceId,
    startDate: new Date(input.startDate),
    numPeople: input.numPeople,
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

  const pi = await createPaymentIntent({
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
