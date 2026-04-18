import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { createPaymentIntent } from "@/lib/stripe/payment-intents";
import { buildBookingMetadata } from "@/lib/stripe/metadata";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { getClientIp } from "@/lib/http/client-ip";
import { withErrorHandler } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";

const schema = z.object({
  serviceId: z.string().min(1).max(100),
  startDate: z.string().datetime(),
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
});

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req.headers);

  // Rate limit aggressivo: 10/hour per IP, 5/hour per email
  await enforceRateLimit({
    identifier: ip,
    scope: "PAYMENT_INTENT_IP_HOUR",
    limit: 10,
    windowSeconds: 3600,
  });

  const body = await req.json();
  const input = schema.parse(body);

  await enforceRateLimit({
    identifier: input.customer.email.toLowerCase(),
    scope: "PAYMENT_INTENT_EMAIL_HOUR",
    limit: 5,
    windowSeconds: 3600,
  });

  const booking = await createPendingDirectBooking({
    serviceId: input.serviceId,
    startDate: new Date(input.startDate),
    numPeople: input.numPeople,
    customer: input.customer,
    paymentSchedule: input.paymentSchedule,
    depositPercentage: input.depositPercentage,
    notes: input.notes,
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

  return NextResponse.json({
    confirmationCode: booking.confirmationCode,
    clientSecret: pi.clientSecret,
    amountCents: booking.upfrontAmountCents,
    totalCents: booking.totalAmountCents,
    balanceCents: booking.balanceAmountCents,
  });
});
