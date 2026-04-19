import type { Prisma } from "@/generated/prisma/client";

/**
 * Include Prisma condiviso per le query che necessitano di booking + customer
 * + service + directBooking (email transazionali, admin detail, cron balance
 * reminders). R20-A3 consolidamento — 3 copie identiche eliminate.
 */
export const bookingWithDetailsInclude = {
  customer: true,
  service: true,
  directBooking: true,
} as const satisfies Prisma.BookingInclude;
