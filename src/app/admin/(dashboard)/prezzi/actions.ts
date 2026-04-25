"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { scheduleBokunPricingSync } from "@/lib/pricing/bokun-sync";
import { parseIsoDay, eachUtcDayInclusive } from "@/lib/dates";
import { acquireTxAdvisoryLock } from "@/lib/db/advisory-lock";
import { ValidationError } from "@/lib/errors";
import { withAdminAction } from "@/lib/admin/with-admin-action";

const upsertPricingPeriodSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().min(1),
  label: z.string().transform((s) => s.trim()),
  startDate: z.string().min(1), // YYYY-MM-DD
  endDate: z.string().min(1),
  pricePerPerson: z
    .number()
    .positive("pricePerPerson must be a positive number")
    .max(100_000, "pricePerPerson fuori range (max 100.000€/pax)"),
  year: z
    .number()
    .int("year must be integer")
    .min(2020, "year out of range 2020-2100")
    .max(2100, "year out of range 2020-2100"),
});

export type UpsertPricingPeriodInput = z.input<typeof upsertPricingPeriodSchema>;

/**
 * Crea/aggiorna un PricingPeriod. Dopo il commit accoda sync Bokun
 * per le date coperte (il worker applica il markup).
 */
export const upsertPricingPeriod = withAdminAction(
  {
    schema: upsertPricingPeriodSchema,
    revalidatePaths: ["/admin/prezzi"],
  },
  async (input, { userId }) => {
    const start = parseIsoDay(input.startDate);
    const end = parseIsoDay(input.endDate);
    if (end < start) throw new ValidationError("endDate before startDate");

    const data = {
      serviceId: input.serviceId,
      label: input.label,
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
  },
);

const upsertHotDayRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().transform((s) => s.trim()),
  dateRangeStart: z.string().min(1),
  dateRangeEnd: z.string().min(1),
  weekdays: z
    .array(z.number().int().min(0).max(6, "weekdays must be integers in 0..6"))
    .default([]),
  multiplier: z
    .number()
    .positive("multiplier must be a positive number")
    .max(10, "multiplier fuori range (max 10×)"),
  roundTo: z
    .number()
    .int("roundTo must be integer")
    .min(0, "roundTo invalid (0-1000)")
    .max(1000, "roundTo invalid (0-1000)"),
  priority: z.number().int("priority must be integer"),
  active: z.boolean(),
});

export type UpsertHotDayRuleInput = z.input<typeof upsertHotDayRuleSchema>;

export const upsertHotDayRule = withAdminAction(
  {
    schema: upsertHotDayRuleSchema,
    revalidatePaths: ["/admin/prezzi"],
  },
  async (input, { userId }) => {
    const start = parseIsoDay(input.dateRangeStart);
    const end = parseIsoDay(input.dateRangeEnd);
    if (end < start) throw new ValidationError("dateRangeEnd before dateRangeStart");
    // Round 10 BL-A4: no past-only HotDayRule. Un admin distratto potrebbe
    // creare "Ferragosto 2024" per errore; la sync accoda job inutili.
    const todayUtc = parseIsoDay(new Date().toISOString().slice(0, 10));
    if (end < todayUtc) {
      throw new ValidationError(
        "HotDayRule con dateRangeEnd nel passato — nessuna data futura da applicare",
      );
    }

    const data = {
      name: input.name,
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
  },
);

const deleteHotDayRuleSchema = z.object({ id: z.string().min(1) });

export const deleteHotDayRule = withAdminAction(
  {
    schema: deleteHotDayRuleSchema,
    revalidatePaths: ["/admin/prezzi"],
  },
  async (input, { userId }) => {
    const before = await db.hotDayRule.findUnique({ where: { id: input.id } });
    if (!before) {
      throw new ValidationError(`HotDayRule ${input.id} non trovata`);
    }
    await db.hotDayRule.delete({ where: { id: input.id } });
    await auditLog({
      userId,
      action: AUDIT_ACTIONS.DELETE,
      entity: "HotDayRule",
      entityId: input.id,
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
  },
);
