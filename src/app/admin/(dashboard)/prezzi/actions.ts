"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { scheduleBokunPricingSync } from "@/lib/pricing/bokun-sync";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { ValidationError } from "@/lib/errors";

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
  // Guard NaN/Infinity + range (Round 10 Sec-M6).
  if (!Number.isFinite(input.pricePerPerson) || input.pricePerPerson <= 0) {
    throw new ValidationError("pricePerPerson must be a positive number");
  }
  if (input.pricePerPerson > 100_000) {
    throw new ValidationError("pricePerPerson fuori range (max 100.000€/pax)");
  }
  if (!Number.isInteger(input.year) || input.year < 2020 || input.year > 2100) {
    throw new ValidationError("year out of range 2020-2100");
  }

  const data = {
    serviceId: input.serviceId,
    label: input.label.trim(),
    startDate: start,
    endDate: end,
    pricePerPerson: new Prisma.Decimal(input.pricePerPerson.toFixed(2)),
    year: input.year,
  };

  // R25-A2-A4: overlap check + write in singola tx con advisory lock
  // per-serviceId. Prima check era fuori tx → race: 2 admin che creano
  // period overlapping contemporaneamente entrambi passavano il check
  // (neither exists yet) + entrambi create → `quotePrice` findFirst
  // non-deterministico sul giorno di overlap.
  const result = await db.$transaction(async (tx) => {
    await acquireTxAdvisoryLock(tx, "pricing-period", input.serviceId);

    const overlap = await tx.pricingPeriod.findFirst({
      where: {
        serviceId: input.serviceId,
        ...(input.id ? { id: { not: input.id } } : {}),
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, label: true, startDate: true, endDate: true },
    });
    if (overlap) {
      throw new ValidationError(
        `Overlap con period "${overlap.label}" (${overlap.startDate.toISOString().slice(0, 10)} → ${overlap.endDate.toISOString().slice(0, 10)})`,
      );
    }

    return input.id
      ? await tx.pricingPeriod.update({ where: { id: input.id }, data })
      : await tx.pricingPeriod.create({ data });
  });

  await auditLog({
    userId,
    action: input.id ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
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
  if (!Number.isFinite(input.multiplier) || input.multiplier <= 0) {
    throw new ValidationError("multiplier must be a positive number");
  }
  if (input.multiplier > 10) {
    throw new ValidationError("multiplier fuori range (max 10×)");
  }
  if (
    !Number.isInteger(input.roundTo) ||
    input.roundTo < 0 ||
    input.roundTo > 1000
  ) {
    throw new ValidationError("roundTo invalid (0-1000)");
  }
  if (!Number.isInteger(input.priority)) {
    throw new ValidationError("priority must be integer");
  }
  if (input.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ValidationError("weekdays must be integers in 0..6");
  }
  // Round 10 BL-A4: no past-only HotDayRule. Un admin distratto potrebbe
  // creare "Ferragosto 2024" per errore; la sync accoda job inutili.
  const todayUtc = parseIsoDay(new Date().toISOString().slice(0, 10));
  if (end < todayUtc) {
    throw new ValidationError(
      "HotDayRule con dateRangeEnd nel passato — nessuna data futura da applicare",
    );
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
    action: input.id ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
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

  // Enqueue sync Bokun solo sulle date future effettive (skip past + weekday filter).
  const dates: Date[] = [];
  for (const d of eachUtcDayInclusive(start, end)) {
    if (d < todayUtc) continue;
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
  if (!before) {
    throw new ValidationError(`HotDayRule ${id} non trovata`);
  }
  await db.hotDayRule.delete({ where: { id } });
  await auditLog({
    userId,
    action: AUDIT_ACTIONS.DELETE,
    entity: "HotDayRule",
    entityId: id,
    before: { name: before.name, multiplier: before.multiplier.toString() },
  });

  // Re-sync Bokun pricing sulle date precedentemente affected (Round 10 BL-A2).
  // Senza questo, Bokun conserva il prezzo-con-markup vecchio finche' un
  // altro evento non tocca le stesse date. Il worker ricalcolera' la
  // base-price corrente (senza il multiplier appena eliminato).
  const todayUtc = parseIsoDay(new Date().toISOString().slice(0, 10));
  const dates: Date[] = [];
  for (const d of eachUtcDayInclusive(before.dateRangeStart, before.dateRangeEnd)) {
    if (d < todayUtc) continue;
    if (before.weekdays.length === 0 || before.weekdays.includes(d.getUTCDay())) {
      dates.push(d);
    }
  }
  if (dates.length > 0) await scheduleBokunPricingSync({ dates });

  revalidatePath("/admin/prezzi");
}
