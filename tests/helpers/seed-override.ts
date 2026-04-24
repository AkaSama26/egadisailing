/**
 * Seed helpers condivisi per i test override (Fase 1 priority override).
 *
 * Differiscono dai seed inline di `booking-creation.test.ts` perche':
 *  - service type = BOAT_EXCLUSIVE (semantica "barca intera", obbligatoria
 *    perche' il meccanismo override scatta solo su conflitti reali — R28-CRIT-1
 *    spiega perche' SOCIAL_BOATING non ha conflitti).
 *  - signature generica `seedBooking(db, overrides)` con upsert Customer
 *    automatico (email default unique per seed).
 *
 * Non include ConsentRecord: i test override preparano Booking gia' esistenti
 * per verificare side-effect post-commit (refund, release, cancel), NON la
 * creazione end-to-end (che ha la sua suite dedicata).
 *
 * Assume che il DB sia truncated fra i test (cfr. `resetTestDb`) — usiamo
 * `create` (non `upsert`) quindi una chiamata multipla nello stesso test
 * throwerrebbe con P2002.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import type { BookingStatus, BookingSource } from "@/generated/prisma/enums";
import { randomUUID } from "node:crypto";

export interface SeedBoatServiceOptions {
  boatId?: string;
  serviceId?: string;
  capacityMax?: number;
}

/**
 * Crea Boat + Service (BOAT_EXCLUSIVE) + PricingPeriod minimal per test
 * override. ID di default stabili (`b-override` / `s-override`).
 */
export async function seedBoatAndService(
  db: PrismaClient,
  opts: SeedBoatServiceOptions = {},
) {
  const boatId = opts.boatId ?? "b-override";
  const serviceId = opts.serviceId ?? "s-override";
  const capacityMax = opts.capacityMax ?? 8;

  const boat = await db.boat.create({
    data: {
      id: boatId,
      name: "Trimarano Override",
      type: "TRIMARAN",
      description: "Test boat",
      amenities: [],
      images: [],
    },
  });

  const service = await db.service.create({
    data: {
      id: serviceId,
      boatId: boat.id,
      name: "Gourmet Exclusive",
      type: "BOAT_EXCLUSIVE",
      durationType: "FULL_DAY",
      durationHours: 8,
      capacityMax,
      minPaying: 1,
      defaultPaymentSchedule: "FULL",
      active: true,
    },
  });

  // PricingPeriod per coerenza (quotePrice downstream). I test override
  // passano totalPrice esplicitamente quindi PricingPeriod non e' consultato.
  await db.pricingPeriod.create({
    data: {
      serviceId: service.id,
      label: "Test 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      pricePerPerson: "250.00",
      year: 2026,
    },
  });

  return { boat, service };
}

export interface SeedBookingOverrides {
  boatId: string;
  serviceId: string;
  /** Se non passato, crea Customer con email unica. */
  customerId?: string;
  /** Default: "2026-08-15" UTC day */
  startDate?: Date;
  /** Default: uguale a startDate (single day). */
  endDate?: Date;
  numPeople?: number;
  totalPrice?: string;
  status?: BookingStatus;
  source?: BookingSource;
  confirmationCode?: string;
  /** Se true, crea DirectBooking associato (paymentSchedule FULL). */
  withDirectBooking?: boolean;
}

/**
 * Crea un Booking con Customer auto-upserted (email `seed-{uuid}@test.local`).
 * Default: status=PENDING, source=DIRECT, 2026-08-15 single day, 2 pax, €500.
 */
export async function seedBooking(db: PrismaClient, opts: SeedBookingOverrides) {
  let customerId: string;
  if (opts.customerId) {
    customerId = opts.customerId;
  } else {
    const created = await db.customer.create({
      data: {
        email: `seed-${randomUUID()}@test.local`,
        firstName: "Seed",
        lastName: "Customer",
      },
    });
    customerId = created.id;
  }

  const startDate = opts.startDate ?? new Date("2026-08-15");
  const endDate = opts.endDate ?? startDate;
  const confirmationCode =
    opts.confirmationCode ?? `SEED${randomUUID().slice(0, 6).toUpperCase()}`;

  return db.booking.create({
    data: {
      confirmationCode,
      source: opts.source ?? "DIRECT",
      customerId,
      serviceId: opts.serviceId,
      boatId: opts.boatId,
      startDate,
      endDate,
      numPeople: opts.numPeople ?? 2,
      totalPrice: opts.totalPrice ?? "500.00",
      status: opts.status ?? "PENDING",
      ...(opts.withDirectBooking
        ? {
            directBooking: {
              create: {
                paymentSchedule: "FULL",
                stripePaymentIntentId: `pi_seed_${randomUUID().slice(0, 8)}`,
              },
            },
          }
        : {}),
    },
    include: { directBooking: true, customer: true },
  });
}
