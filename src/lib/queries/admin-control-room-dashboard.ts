"use server";

import Decimal from "decimal.js";
import type { BookingSource, BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addDays, isoDay, toUtcDay } from "@/lib/dates";
import { listPendingManualAlerts } from "@/lib/charter/manual-alerts";
import { assessRisk, type WeatherRisk } from "@/lib/weather/risk-assessment";
import type { OpenMeteoForecast } from "@/lib/weather/open-meteo";
import { summarizeControlRoomTasks } from "./admin-control-room-dashboard-helpers";

const MONEY_IN_TYPES = ["DEPOSIT", "BALANCE", "FULL"] as const;
const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED"] as const;
const PROBLEM_HEALTH = new Set(["YELLOW", "RED"]);

type PendingManualAlert = Awaited<ReturnType<typeof listPendingManualAlerts>>[number];

export interface ControlRoomBooking {
  id: string;
  confirmationCode: string;
  source: BookingSource;
  status: BookingStatus;
  serviceName: string;
  serviceType: string;
  boatName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startDate: Date;
  endDate: Date;
  numPeople: number;
  totalPrice: Decimal;
  paidAmount: Decimal;
  balanceAmount: Decimal | null;
  balancePaid: boolean;
  latestNote: string | null;
  weatherRisk: WeatherRisk | null;
  weatherReasons: string[];
}

export interface ControlRoomPayment {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  amount: Decimal;
  type: string;
  method: string;
  status: string;
  processedAt: Date | null;
}

export interface ControlRoomChangeRequest {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  originalStartDate: Date;
  requestedStartDate: Date;
  createdAt: Date;
}

export interface ControlRoomOverrideRequest {
  id: string;
  bookingId: string;
  bookingCode: string;
  customerName: string;
  serviceName: string;
  startDate: Date;
  status: string;
  deltaRevenue: Decimal;
  conflictSourceChannels: string[];
}

export interface ControlRoomChannelRow {
  source: BookingSource | string;
  bookingsCount: number;
  revenue: Decimal;
  healthStatus: string;
  lastSyncAt: Date | null;
  hasError: boolean;
}

export interface ControlRoomServiceRow {
  serviceId: string;
  serviceName: string;
  bookingsCount: number;
  revenue: Decimal;
}

export interface ControlRoomDashboard {
  generatedAt: Date;
  today: Date;
  weekEnd: Date;
  monthRevenue: Decimal;
  monthRefunds: Decimal;
  seasonRevenue: Decimal;
  seasonRefunds: Decimal;
  openBalanceTotal: Decimal;
  openBalanceCount: number;
  monthBookingsCount: number;
  upcomingCount: number;
  bookingStatusCounts: Record<string, number>;
  taskCount: number;
  upcomingBookings: ControlRoomBooking[];
  recentBookings: ControlRoomBooking[];
  openBalanceBookings: ControlRoomBooking[];
  recentPayments: ControlRoomPayment[];
  pendingAlerts: PendingManualAlert[];
  failedEmails: Array<{
    id: string;
    templateKey: string;
    recipientEmail: string;
    subject: string;
    attempts: number;
    lastError: string | null;
    updatedAt: Date;
  }>;
  failedEmailCount: number;
  pendingChangeRequests: ControlRoomChangeRequest[];
  pendingChangeRequestCount: number;
  pendingOverrides: ControlRoomOverrideRequest[];
  pendingOverrideCount: number;
  weatherWatchBookings: ControlRoomBooking[];
  channels: ControlRoomChannelRow[];
  channelProblemCount: number;
  topServices: ControlRoomServiceRow[];
  activeServiceCount: number;
  servicesWithoutPrices: number;
}

export async function getAdminControlRoomDashboard(
  now: Date = new Date(),
): Promise<ControlRoomDashboard> {
  const today = toUtcDay(now);
  const weekEnd = addDays(today, 7);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const seasonStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const year = today.getUTCFullYear();

  const [
    monthRevenueAgg,
    monthRefundAgg,
    seasonRevenueAgg,
    seasonRefundAgg,
    openBalanceAgg,
    openBalanceCount,
    monthBookingsCount,
    upcomingCount,
    upcomingRows,
    recentRows,
    openBalanceRows,
    recentPaymentRows,
    bookingStatusRows,
    sourceRows,
    serviceRows,
    services,
    servicePrices,
    channelStatuses,
    pendingAlerts,
    failedEmailCount,
    failedEmails,
    changeRequestCount,
    changeRequestRows,
    overrideCount,
    overrideRows,
    forecastRows,
  ] = await Promise.all([
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: [...MONEY_IN_TYPES] },
        processedAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "REFUNDED", type: "REFUND", processedAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        status: "SUCCEEDED",
        type: { in: [...MONEY_IN_TYPES] },
        processedAt: { gte: seasonStart },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "REFUNDED", type: "REFUND", processedAt: { gte: seasonStart } },
      _sum: { amount: true },
    }),
    db.directBooking.aggregate({
      where: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        booking: { startDate: { gte: today }, status: "CONFIRMED" },
      },
      _sum: { balanceAmount: true },
    }),
    db.directBooking.count({
      where: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        booking: { startDate: { gte: today }, status: "CONFIRMED" },
      },
    }),
    db.booking.count({
      where: { createdAt: { gte: monthStart }, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    }),
    db.booking.count({
      where: { startDate: { gte: today }, status: "CONFIRMED" },
    }),
    db.booking.findMany({
      where: {
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        startDate: { gte: today, lte: weekEnd },
      },
      include: bookingDashboardInclude(),
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
    db.booking.findMany({
      include: bookingDashboardInclude(),
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.directBooking.findMany({
      where: {
        paymentSchedule: "DEPOSIT_BALANCE",
        balancePaidAt: null,
        booking: { startDate: { gte: today }, status: "CONFIRMED" },
      },
      include: { booking: { include: bookingDashboardInclude() } },
      orderBy: { booking: { startDate: "asc" } },
      take: 8,
    }),
    db.payment.findMany({
      where: {
        processedAt: { not: null },
        OR: [
          { status: "SUCCEEDED", type: { in: [...MONEY_IN_TYPES] } },
          { status: "REFUNDED", type: "REFUND" },
        ],
      },
      include: {
        booking: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { processedAt: "desc" },
      take: 8,
    }),
    db.booking.groupBy({
      by: ["status"],
      where: { createdAt: { gte: seasonStart } },
      _count: { _all: true },
    }),
    db.booking.groupBy({
      by: ["source"],
      where: { createdAt: { gte: seasonStart }, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      _sum: { totalPrice: true },
      _count: { _all: true },
    }),
    db.booking.groupBy({
      by: ["serviceId"],
      where: { createdAt: { gte: seasonStart }, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      _sum: { totalPrice: true },
      _count: { _all: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    db.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.servicePrice.findMany({
      where: { year },
      select: { serviceId: true },
    }),
    db.channelSyncStatus.findMany({ orderBy: { channel: "asc" } }),
    listPendingManualAlerts(),
    db.emailOutbox.count({ where: { status: "FAILED" } }),
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
    db.bookingChangeRequest.count({ where: { status: "PENDING" } }),
    db.bookingChangeRequest.findMany({
      where: { status: "PENDING" },
      include: {
        booking: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.overrideRequest.count({
      where: { status: { in: ["PENDING", "PENDING_RECONCILE_FAILED"] } },
    }),
    db.overrideRequest.findMany({
      where: { status: { in: ["PENDING", "PENDING_RECONCILE_FAILED"] } },
      include: {
        newBooking: {
          include: {
            customer: { select: { firstName: true, lastName: true } },
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.weatherForecastCache.findMany({
      where: { date: { gte: today, lte: weekEnd } },
      orderBy: [{ date: "asc" }, { fetchedAt: "desc" }],
    }),
  ]);

  const forecastByDate = new Map<string, OpenMeteoForecast>();
  for (const row of forecastRows) {
    const key = isoDay(row.date);
    if (!forecastByDate.has(key)) {
      forecastByDate.set(key, row.forecast as unknown as OpenMeteoForecast);
    }
  }

  const upcomingBookings = upcomingRows.map((booking) =>
    toControlRoomBooking(booking, forecastByDate),
  );
  const weatherWatchBookings = upcomingBookings.filter(
    (booking) => booking.weatherRisk && booking.weatherRisk !== "LOW",
  );
  const recentBookings = recentRows.map((booking) => toControlRoomBooking(booking, forecastByDate));
  const openBalanceBookings = openBalanceRows.map((row) =>
    toControlRoomBooking(row.booking, forecastByDate),
  );
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));
  const pricedServiceIds = new Set(servicePrices.map((price) => price.serviceId));
  const sourceBusinessByName = new Map(sourceRows.map((row) => [row.source, row]));
  const channelNames = [
    ...new Set([...channelStatuses.map((status) => status.channel), ...sourceRows.map((row) => row.source)]),
  ];

  const taskCount = summarizeControlRoomTasks({
    openBalanceCount,
    pendingAlertCount: pendingAlerts.length,
    failedEmailCount,
    pendingChangeRequestCount: changeRequestCount,
    pendingOverrideCount: overrideCount,
    weatherWatchCount: weatherWatchBookings.length,
  });

  return {
    generatedAt: now,
    today,
    weekEnd,
    monthRevenue: toDecimal(monthRevenueAgg._sum.amount),
    monthRefunds: toDecimal(monthRefundAgg._sum.amount),
    seasonRevenue: toDecimal(seasonRevenueAgg._sum.amount),
    seasonRefunds: toDecimal(seasonRefundAgg._sum.amount),
    openBalanceTotal: toDecimal(openBalanceAgg._sum.balanceAmount),
    openBalanceCount,
    monthBookingsCount,
    upcomingCount,
    bookingStatusCounts: Object.fromEntries(
      bookingStatusRows.map((row) => [row.status, row._count._all]),
    ),
    taskCount,
    upcomingBookings,
    recentBookings,
    openBalanceBookings,
    recentPayments: recentPaymentRows.map((payment) => ({
      id: payment.id,
      bookingId: payment.bookingId,
      bookingCode: payment.booking.confirmationCode,
      customerName: fullName(payment.booking.customer),
      serviceName: payment.booking.service.name,
      amount: toDecimal(payment.amount),
      type: payment.type,
      method: payment.method,
      status: payment.status,
      processedAt: payment.processedAt,
    })),
    pendingAlerts,
    failedEmails,
    failedEmailCount,
    pendingChangeRequests: changeRequestRows.map((request) => ({
      id: request.id,
      bookingId: request.bookingId,
      bookingCode: request.booking.confirmationCode,
      customerName: fullName(request.booking.customer),
      serviceName: request.booking.service.name,
      originalStartDate: request.originalStartDate,
      requestedStartDate: request.requestedStartDate,
      createdAt: request.createdAt,
    })),
    pendingChangeRequestCount: changeRequestCount,
    pendingOverrides: overrideRows.map((request) => ({
      id: request.id,
      bookingId: request.newBookingId,
      bookingCode: request.newBooking.confirmationCode,
      customerName: fullName(request.newBooking.customer),
      serviceName: request.newBooking.service.name,
      startDate: request.newBooking.startDate,
      status: request.status,
      deltaRevenue: toDecimal(request.newBookingRevenue).minus(
        toDecimal(request.conflictingRevenueTotal),
      ),
      conflictSourceChannels: request.conflictSourceChannels,
    })),
    pendingOverrideCount: overrideCount,
    weatherWatchBookings,
    channels: channelNames.map((source) => {
      const row = sourceBusinessByName.get(source as BookingSource);
      const status = channelStatuses.find((channel) => channel.channel === source);
      return {
        source,
        bookingsCount: row?._count._all ?? 0,
        revenue: toDecimal(row?._sum.totalPrice),
        healthStatus: status?.healthStatus ?? "GREEN",
        lastSyncAt: status?.lastSyncAt ?? null,
        hasError: Boolean(status?.lastError),
      };
    }),
    channelProblemCount: channelStatuses.filter(
      (status) => PROBLEM_HEALTH.has(status.healthStatus) || Boolean(status.lastError),
    ).length,
    topServices: serviceRows.map((row) => ({
      serviceId: row.serviceId,
      serviceName: serviceNameById.get(row.serviceId) ?? row.serviceId,
      bookingsCount: row._count._all,
      revenue: toDecimal(row._sum.totalPrice),
    })),
    activeServiceCount: services.length,
    servicesWithoutPrices: services.filter((service) => !pricedServiceIds.has(service.id)).length,
  };
}

function bookingDashboardInclude() {
  return {
    customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
    service: { select: { name: true, type: true } },
    boat: { select: { name: true } },
    directBooking: { select: { balanceAmount: true, balancePaidAt: true } },
    payments: { select: { amount: true, status: true, type: true } },
    bookingNotes: {
      select: { note: true, createdAt: true },
      orderBy: { createdAt: "desc" as const },
      take: 1,
    },
  };
}

type BookingDashboardRow = Awaited<ReturnType<typeof db.booking.findMany>>[number] & {
  customer: { firstName: string; lastName: string; email: string; phone: string | null };
  service: { name: string; type: string };
  boat: { name: string };
  directBooking: { balanceAmount: unknown; balancePaidAt: Date | null } | null;
  payments: Array<{ amount: unknown; status: string; type: string }>;
  bookingNotes: Array<{ note: string }>;
};

function toControlRoomBooking(
  booking: BookingDashboardRow,
  forecastByDate: Map<string, OpenMeteoForecast>,
): ControlRoomBooking {
  const forecast = forecastByDate.get(isoDay(booking.startDate));
  const assessment = forecast ? assessRisk(forecast) : null;
  const paidAmount = booking.payments
    .filter((payment) => payment.status === "SUCCEEDED" && payment.type !== "REFUND")
    .reduce((acc, payment) => acc.plus(toDecimal(payment.amount)), new Decimal(0));

  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    source: booking.source,
    status: booking.status,
    serviceName: booking.service.name,
    serviceType: booking.service.type,
    boatName: booking.boat.name,
    customerName: fullName(booking.customer),
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,
    startDate: booking.startDate,
    endDate: booking.endDate,
    numPeople: booking.numPeople,
    totalPrice: toDecimal(booking.totalPrice),
    paidAmount,
    balanceAmount: booking.directBooking?.balanceAmount
      ? toDecimal(booking.directBooking.balanceAmount)
      : null,
    balancePaid: Boolean(booking.directBooking?.balancePaidAt),
    latestNote: booking.bookingNotes[0]?.note ?? null,
    weatherRisk: assessment?.risk ?? null,
    weatherReasons: assessment?.reasons ?? [],
  };
}

function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  if (typeof value === "string" || typeof value === "number") return new Decimal(value);
  if (typeof value === "object" && "toString" in value) return new Decimal(value.toString());
  return new Decimal(0);
}

function fullName(customer: { firstName: string; lastName: string }): string {
  return `${customer.firstName} ${customer.lastName}`.trim();
}
