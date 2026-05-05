import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { assertOtaFreshBeforePayment } from "@/lib/booking/ota-preflight";
import {
  applyDirectBookingAvailabilityHold,
  attachCheckoutSessionToPendingDirectBooking,
  cancelPendingDirectBookingAndReleaseHold,
} from "@/lib/booking/direct-availability-hold";
import { logger } from "@/lib/logger";
import { createCheckoutSession, expireCheckoutSession } from "@/lib/stripe/checkout-sessions";
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
import { routing } from "@/i18n/routing";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";

export const runtime = "nodejs";

const schema = z.object({
  locale: z.enum(routing.locales).optional(),
  serviceId: z.string().min(1).max(100),
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
  numPeople: z.number().int().min(1).max(50).optional(),
  customer: z.object({
    email: emailSchema,
    firstName: personNameSchema(100),
    lastName: personNameSchema(100),
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
  if (!env.FEATURE_STRIPE_CHECKOUT_ENABLED) {
    throw new ValidationError("Stripe Checkout is not enabled");
  }

  const ip = getClientIp(req.headers);
  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: "PAYMENT_INTENT_IP_HOUR",
    limit: 10,
    windowSeconds: RL_WINDOW.HOUR,
    failOpen: false,
  });

  const body = await req.json();
  const input = schema.parse(body);
  if (!isPublicBookingServiceEnabled(input.serviceId)) {
    throw new ValidationError("Esperienza non disponibile");
  }

  if (env.NODE_ENV === "production" || input.turnstileToken) {
    if (!input.turnstileToken) {
      throw new ValidationError("CAPTCHA verification required");
    }
    const valid = await verifyTurnstileToken(input.turnstileToken, ip);
    if (!valid) throw new ValidationError("CAPTCHA verification failed");
  }

  await enforceRateLimit({
    identifier: normalizeEmail(input.customer.email),
    scope: "PAYMENT_INTENT_EMAIL_HOUR",
    limit: 5,
    windowSeconds: RL_WINDOW.HOUR,
    failOpen: false,
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

  const locale = input.locale ?? env.APP_LOCALES_DEFAULT;
  const baseUrl = env.APP_URL.replace(/\/$/, "");
  const metadata = buildBookingMetadata({
    bookingId: booking.bookingId,
    confirmationCode: booking.confirmationCode,
    paymentType: input.paymentSchedule === "DEPOSIT_BALANCE" ? "DEPOSIT" : "FULL",
  });

  let checkoutSessionId: string | null = null;
  try {
    const session = await createCheckoutSession({
      amountCents: booking.upfrontAmountCents,
      customerEmail: normalizeEmail(input.customer.email),
      clientReferenceId: booking.bookingId,
      productName: "Egadisailing experience",
      successUrl: `${baseUrl}/${locale}/prenota/success/${booking.confirmationCode}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/${locale}/prenota/${input.serviceId}`,
      metadata,
    });
    checkoutSessionId = session.checkoutSessionId;

    await attachCheckoutSessionToPendingDirectBooking({
      bookingId: booking.bookingId,
      checkoutSessionId: session.checkoutSessionId,
      checkoutSessionExpiresAt: session.expiresAt,
      paymentIntentId: session.paymentIntentId,
    });

    return NextResponse.json(
      {
        data: {
          confirmationCode: booking.confirmationCode,
          checkoutUrl: session.checkoutUrl,
          amountCents: booking.upfrontAmountCents,
          totalCents: booking.totalAmountCents,
          balanceCents: booking.balanceAmountCents,
        },
      },
      {
        status: 201,
        headers: {
          Location: session.checkoutUrl,
        },
      },
    );
  } catch (err) {
    if (checkoutSessionId) {
      await expireCheckoutSession(checkoutSessionId).catch((expireErr) => {
        logger.warn(
          { err: expireErr, bookingId: booking.bookingId, checkoutSessionId },
          "Failed to expire Checkout Session after attach failure",
        );
      });
    }
    await cancelPendingDirectBookingAndReleaseHold({
      bookingId: booking.bookingId,
      reason: "checkout_session_create_failed",
    }).catch((cleanupErr) => {
      logger.error(
        { err: cleanupErr, bookingId: booking.bookingId },
        "Failed to release checkout availability hold after Checkout Session failure",
      );
    });
    throw err;
  }
});
