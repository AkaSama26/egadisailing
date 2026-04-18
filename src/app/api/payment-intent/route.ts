import { NextResponse } from "next/server";
import { z } from "zod";
import { createPendingDirectBooking } from "@/lib/booking/create-direct";
import { createPaymentIntent } from "@/lib/stripe/payment-intents";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

const schema = z.object({
  serviceId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  numPeople: z.number().int().min(1).max(50),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().max(30).optional(),
    nationality: z.string().length(2).optional(),
    language: z.string().max(8).optional(),
  }),
  paymentSchedule: z.enum(["FULL", "DEPOSIT_BALANCE"]),
  depositPercentage: z.number().int().min(1).max(100).optional(),
  weatherGuarantee: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = schema.parse(body);

    const booking = await createPendingDirectBooking({
      serviceId: input.serviceId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      numPeople: input.numPeople,
      customer: input.customer,
      paymentSchedule: input.paymentSchedule,
      depositPercentage: input.depositPercentage,
      weatherGuarantee: input.weatherGuarantee,
      notes: input.notes,
    });

    const pi = await createPaymentIntent({
      amountCents: booking.upfrontAmountCents,
      customerEmail: input.customer.email,
      customerName: `${input.customer.firstName} ${input.customer.lastName}`,
      description: `Egadisailing ${booking.confirmationCode}`,
      metadata: {
        bookingId: booking.bookingId,
        confirmationCode: booking.confirmationCode,
        paymentType: input.paymentSchedule === "DEPOSIT_BALANCE" ? "DEPOSIT" : "FULL",
      },
    });

    return NextResponse.json({
      confirmationCode: booking.confirmationCode,
      clientSecret: pi.clientSecret,
      amountCents: booking.upfrontAmountCents,
      totalCents: booking.totalAmountCents,
      balanceCents: booking.balanceAmountCents,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.toClientJSON() }, { status: err.statusCode });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", issues: err.issues } },
        { status: 400 },
      );
    }
    logger.error({ err }, "payment-intent route error");
    return NextResponse.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
