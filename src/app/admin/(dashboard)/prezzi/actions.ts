"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
import { scheduleBokunPricingSync } from "@/lib/pricing/bokun-sync";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import {
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";

async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  return { userId: session.user.id };
}

export interface UpsertPricingPeriodInput {
  id?: string;
  serviceId: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  pricePerPerson: number;
  year: number;
}

/**
 * Crea/aggiorna un PricingPeriod. Dopo il commit accoda sync Bokun
 * per le date coperte (il worker applica il markup).
 */
export async function upsertPricingPeriod(input: UpsertPricingPeriodInput): Promise<void> {
  const { userId } = await requireAdmin();
  const start = parseIsoDay(input.startDate);
  const end = parseIsoDay(input.endDate);
  if (end < start) throw new ValidationError("endDate before startDate");
  if (input.pricePerPerson <= 0) throw new ValidationError("pricePerPerson must be positive");

  const data = {
    serviceId: input.serviceId,
    label: input.label.trim(),
    startDate: start,
    endDate: end,
    pricePerPerson: new Prisma.Decimal(input.pricePerPerson.toFixed(2)),
    year: input.year,
  };

  const result = input.id
    ? await db.pricingPeriod.update({ where: { id: input.id }, data })
    : await db.pricingPeriod.create({ data });

  await auditLog({
    userId,
    action: input.id ? "UPDATE" : "CREATE",
    entity: "PricingPeriod",
    entityId: result.id,
    after: {
      serviceId: data.serviceId,
      label: data.label,
      startDate: input.startDate,
      endDate: input.endDate,
      pricePerPerson: input.pricePerPerson,
      year: data.year,
    },
  });

  const dates = Array.from(eachUtcDayInclusive(start, end));
  await scheduleBokunPricingSync({ dates, serviceIds: [input.serviceId] });

  revalidatePath("/admin/prezzi");
}

export interface UpsertHotDayRuleInput {
  id?: string;
  name: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weekdays: number[]; // 0=dom .. 6=sab JS; `[]` = ogni giorno
  multiplier: number;
  roundTo: number;
  priority: number;
  active: boolean;
}

export async function upsertHotDayRule(input: UpsertHotDayRuleInput): Promise<void> {
  const { userId } = await requireAdmin();
  const start = parseIsoDay(input.dateRangeStart);
  const end = parseIsoDay(input.dateRangeEnd);
  if (end < start) throw new ValidationError("dateRangeEnd before dateRangeStart");
  if (input.multiplier <= 0) throw new ValidationError("multiplier must be positive");
  if (input.roundTo < 0 || input.roundTo > 1000) throw new ValidationError("roundTo invalid");
  if (input.weekdays.some((d) => d < 0 || d > 6)) {
    throw new ValidationError("weekdays must be in 0..6");
  }

  const data = {
    name: input.name.trim(),
    dateRangeStart: start,
    dateRangeEnd: end,
    weekdays: input.weekdays,
    multiplier: new Prisma.Decimal(input.multiplier.toFixed(3)),
    roundTo: input.roundTo,
    priority: input.priority,
    active: input.active,
  };

  const result = input.id
    ? await db.hotDayRule.update({ where: { id: input.id }, data })
    : await db.hotDayRule.create({ data });

  await auditLog({
    userId,
    action: input.id ? "UPDATE" : "CREATE",
    entity: "HotDayRule",
    entityId: result.id,
    after: {
      name: data.name,
      dateRangeStart: input.dateRangeStart,
      dateRangeEnd: input.dateRangeEnd,
      weekdays: data.weekdays,
      multiplier: input.multiplier,
      roundTo: data.roundTo,
      priority: data.priority,
      active: data.active,
    },
  });

  // Enqueue sync Bokun solo sulle date effettive (weekday filter).
  const dates: Date[] = [];
  for (const d of eachUtcDayInclusive(start, end)) {
    if (data.weekdays.length === 0 || data.weekdays.includes(d.getUTCDay())) {
      dates.push(d);
    }
  }
  if (dates.length > 0) await scheduleBokunPricingSync({ dates });

  revalidatePath("/admin/prezzi");
}

export async function deleteHotDayRule(id: string): Promise<void> {
  const { userId } = await requireAdmin();
  const before = await db.hotDayRule.findUnique({ where: { id } });
  if (!before) return;
  await db.hotDayRule.delete({ where: { id } });
  await auditLog({
    userId,
    action: "DELETE",
    entity: "HotDayRule",
    entityId: id,
    before: { name: before.name, multiplier: before.multiplier.toString() },
  });
  revalidatePath("/admin/prezzi");
}
