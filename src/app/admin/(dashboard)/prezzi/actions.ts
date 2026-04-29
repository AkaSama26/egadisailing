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
  label: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1).max(64)),
  startDate: z.string().min(1), // YYYY-MM-DD
  endDate: z.string().min(1),
  pricePerPerson: z
    .number()
    .positive("pricePerPerson must be a positive number")
    .max(100_000, "Prezzo fuori range (max 100.000€)"),
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
    revalidatePaths: (input) => [
      "/admin/prezzi",
      ...(input.id ? [`/admin/prezzi/${input.id}`] : []),
    ],
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

    return { id: result.id };
  },
);

const deletePricingPeriodSchema = z.object({ id: z.string().min(1) });

export const deletePricingPeriod = withAdminAction(
  {
    schema: deletePricingPeriodSchema,
    revalidatePaths: ["/admin/prezzi"],
  },
  async (input, { userId }) => {
    const before = await db.pricingPeriod.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        serviceId: true,
        label: true,
        startDate: true,
        endDate: true,
        pricePerPerson: true,
        year: true,
      },
    });
    if (!before) {
      throw new ValidationError(`PricingPeriod ${input.id} non trovato`);
    }

    await db.pricingPeriod.delete({ where: { id: input.id } });

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.DELETE,
      entity: "PricingPeriod",
      entityId: input.id,
      before: {
        serviceId: before.serviceId,
        label: before.label,
        startDate: before.startDate.toISOString().slice(0, 10),
        endDate: before.endDate.toISOString().slice(0, 10),
        pricePerPerson: before.pricePerPerson.toString(),
        year: before.year,
      },
    });

    const dates = Array.from(eachUtcDayInclusive(before.startDate, before.endDate));
    await scheduleBokunPricingSync({ dates, serviceIds: [before.serviceId] });
  },
);

const PRICE_BUCKETS = ["LOW", "MID", "HIGH"] as const;
const SEASON_KEYS = ["LOW", "MID", "HIGH", "LATE_LOW"] as const;

const servicePriceInputSchema = z.object({
  serviceId: z.string().min(1),
  priceBucket: z.enum(PRICE_BUCKETS).nullable().optional(),
  durationDays: z.number().int().min(1).max(30).nullable().optional(),
  amount: z.number().positive("Il prezzo deve essere positivo").max(100_000),
  pricingUnit: z.enum(["PER_PERSON", "PER_PACKAGE"]),
});

const saveServicePriceMatrixSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  rows: z.array(servicePriceInputSchema).min(1),
});

type ServicePriceInput = z.infer<typeof servicePriceInputSchema>;

async function upsertServicePrice(
  tx: Prisma.TransactionClient,
  year: number,
  row: ServicePriceInput,
) {
  const priceBucket = row.priceBucket ?? null;
  const durationDays = row.durationDays ?? null;
  const existing = await tx.servicePrice.findFirst({
    where: {
      serviceId: row.serviceId,
      year,
      priceBucket,
      durationDays,
    },
    select: { id: true },
  });
  const data = {
    serviceId: row.serviceId,
    year,
    priceBucket,
    durationDays,
    amount: new Prisma.Decimal(row.amount.toFixed(2)),
    pricingUnit: row.pricingUnit,
  };
  return existing
    ? tx.servicePrice.update({ where: { id: existing.id }, data })
    : tx.servicePrice.create({ data });
}

export const saveServicePriceMatrix = withAdminAction(
  {
    schema: saveServicePriceMatrixSchema,
    revalidatePaths: ["/admin/prezzi", "/"],
  },
  async (input, { userId }) => {
    const touchedServiceIds = Array.from(new Set(input.rows.map((row) => row.serviceId)));
    await db.$transaction(async (tx) => {
      await acquireTxAdvisoryLock(tx, "service-price-matrix", String(input.year));
      for (const row of input.rows) {
        if (!row.priceBucket && !row.durationDays) {
          throw new ValidationError("Ogni prezzo deve avere stagione o durata");
        }
        if (row.priceBucket && row.durationDays) {
          throw new ValidationError("Un prezzo non puo' avere insieme stagione e durata");
        }
        await upsertServicePrice(tx, input.year, row);
      }
    });

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: "ServicePriceMatrix",
      entityId: String(input.year),
      after: {
        year: input.year,
        services: touchedServiceIds,
        rows: input.rows.length,
      },
    });

    const seasons = await db.season.findMany({ where: { year: input.year } });
    const dates = seasons.flatMap((season) =>
      Array.from(eachUtcDayInclusive(season.startDate, season.endDate)),
    );
    if (dates.length > 0) {
      await scheduleBokunPricingSync({ dates, serviceIds: touchedServiceIds });
    }
  },
);

const saveSeasonsSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  seasons: z
    .array(
      z.object({
        key: z.enum(SEASON_KEYS),
        label: z.string().min(1).max(80),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        priceBucket: z.enum(PRICE_BUCKETS),
      }),
    )
    .length(4),
});

export const saveSeasons = withAdminAction(
  {
    schema: saveSeasonsSchema,
    revalidatePaths: ["/admin/prezzi", "/"],
  },
  async (input, { userId }) => {
    const normalized = input.seasons
      .map((season) => ({
        ...season,
        start: parseIsoDay(season.startDate),
        end: parseIsoDay(season.endDate),
        priceBucket: season.key === "LATE_LOW" ? "LOW" : season.priceBucket,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const season of normalized) {
      if (season.end < season.start) throw new ValidationError("Stagione con fine prima dell'inizio");
    }
    for (let i = 1; i < normalized.length; i += 1) {
      if (normalized[i].start <= normalized[i - 1].end) {
        throw new ValidationError("Le stagioni non possono sovrapporsi nello stesso anno");
      }
    }

    await db.$transaction(async (tx) => {
      await acquireTxAdvisoryLock(tx, "season-year", String(input.year));
      for (const season of normalized) {
        await tx.season.upsert({
          where: { year_key: { year: input.year, key: season.key } },
          update: {
            label: season.label,
            startDate: season.start,
            endDate: season.end,
            priceBucket: season.priceBucket,
          },
          create: {
            year: input.year,
            key: season.key,
            label: season.label,
            startDate: season.start,
            endDate: season.end,
            priceBucket: season.priceBucket,
          },
        });
      }
    });

    await auditLog({
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: "Season",
      entityId: String(input.year),
      after: {
        year: input.year,
        seasons: normalized.map((season) => ({
          key: season.key,
          startDate: season.startDate,
          endDate: season.endDate,
          priceBucket: season.priceBucket,
        })),
      },
    });
  },
);
