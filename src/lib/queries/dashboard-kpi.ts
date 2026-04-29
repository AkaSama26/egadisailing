"use server";

import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";

/** Tipo di ritorno da listPendingManualAlerts (Prisma model row). */
type PendingManualAlert = Awaited<ReturnType<typeof listPendingManualAlerts>>[number];

export interface DashboardKpi {
  monthRevenue: Decimal;
  bookingsCount: number;
  upcomingCount: number;
  pendingBalances: Decimal;
  pendingAlerts: PendingManualAlert[];
  failedEmailCount: number;
  failedEmails: Array<{
    id: string;
    templateKey: string;
    recipientEmail: string;
    subject: string;
    attempts: number;
    lastError: string | null;
    updatedAt: Date;
  }>;
  overrideMonthlyApproved: number;
  overridePending: number;
}

/**
 * Aggregate KPIs per dashboard admin home. Centralizza 8 parallel queries
 * che erano inline in page.tsx. Riusabile per /admin/finanza summary,
 * homepage email digest (futuro), API admin metrics (futuro).
 *
 * Phase 7-3: extracted from app/admin/(dashboard)/page.tsx.
 */
export async function getDashboardKpi(now: Date = new Date()): Promise<DashboardKpi> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueAgg,
    bookingsCount,
    upcomingCount,
    balancesAgg,
    pendingAlerts,
    failedEmailCount,
    failedEmails,
    overrideMonthlyApproved,
    overridePending,
  ] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: ["DEPOSIT", "BALANCE", "FULL"] },
        processedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    db.booking.count({
      where: {
        createdAt: { gte: monthStart },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.booking.count({
      where: { status: "CONFIRMED", startDate: { gte: now } },
    }),
    db.directBooking.aggregate({
      where: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        booking: { startDate: { gte: now }, status: "CONFIRMED" },
      },
      _sum: { balanceAmount: true },
    }),
    listPendingManualAlerts(),
    db.emailOutbox.count({
      where: { status: "FAILED" },
    }),
    db.emailOutbox.findMany({
      where: { status: "FAILED" },
      select: {
        id: true,
        templateKey: true,
        recipientEmail: true,
        subject: true,
        attempts: true,
        lastError: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.overrideRequest.count({
      where: { status: "APPROVED", decidedAt: { gte: monthStart } },
    }),
    db.overrideRequest.count({
      where: { status: { in: ["PENDING", "PENDING_RECONCILE_FAILED"] } },
    }),
  ]);

  return {
    monthRevenue: new Decimal(revenueAgg._sum.amount?.toString() ?? "0"),
    bookingsCount,
    upcomingCount,
    pendingBalances: new Decimal(balancesAgg._sum.balanceAmount?.toString() ?? "0"),
    pendingAlerts,
    failedEmailCount,
    failedEmails,
    overrideMonthlyApproved,
    overridePending,
  };
}
