import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createBalancePaymentLink } from "@/lib/booking/balance-link";
import { sendEmail } from "@/lib/email/brevo";
import { balanceReminderTemplate } from "@/lib/email/templates/balance-reminder";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Cron quotidiano: trova le DirectBooking con saldo pendente per esperienze
 * che partono tra ~7 giorni, genera payment link Stripe e manda email.
 * Marca `balanceReminderSentAt` per non ripetere.
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysFrom = new Date(now);
  sevenDaysFrom.setUTCDate(sevenDaysFrom.getUTCDate() + 7);
  sevenDaysFrom.setUTCHours(0, 0, 0, 0);
  const eightDaysFrom = new Date(sevenDaysFrom);
  eightDaysFrom.setUTCDate(eightDaysFrom.getUTCDate() + 1);

  const candidates = await db.booking.findMany({
    where: {
      source: "DIRECT",
      status: "CONFIRMED",
      startDate: { gte: sevenDaysFrom, lt: eightDaysFrom },
      directBooking: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        balanceReminderSentAt: null,
      },
    },
    include: { customer: true, service: true, directBooking: true },
  });

  const results: Array<{ bookingId: string; sent: boolean; error?: string }> = [];

  for (const b of candidates) {
    try {
      const link = await createBalancePaymentLink(b.id);
      const { subject, html } = balanceReminderTemplate({
        customerName: `${b.customer.firstName} ${b.customer.lastName}`,
        confirmationCode: b.confirmationCode,
        serviceName: b.service.name,
        startDate: b.startDate.toLocaleDateString("it-IT"),
        balanceAmount: `€${b.directBooking!.balanceAmount!.toFixed(2)}`,
        paymentLinkUrl: link,
      });
      await sendEmail({
        to: b.customer.email,
        toName: `${b.customer.firstName} ${b.customer.lastName}`,
        subject,
        htmlContent: html,
      });
      await db.directBooking.update({
        where: { bookingId: b.id },
        data: { balanceReminderSentAt: new Date() },
      });
      results.push({ bookingId: b.id, sent: true });
    } catch (err) {
      logger.error({ err, bookingId: b.id }, "Balance reminder failed");
      results.push({ bookingId: b.id, sent: false, error: (err as Error).message });
    }
  }

  return NextResponse.json({ processed: candidates.length, results });
}
