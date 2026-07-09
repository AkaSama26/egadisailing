import Decimal from "decimal.js";
import type { Prisma } from "@/generated/prisma/client";
import type { DurationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import {
  blockDates,
  reconcileBoatDatesFromActiveBookings,
} from "@/lib/availability/service";
import { CHANNELS } from "@/lib/channels";
import { acquireAvailabilityRangeLock } from "@/lib/db/advisory-lock";
import { parseIsoDay, toUtcDay } from "@/lib/dates";
import { normalizeEmail } from "@/lib/email-normalize";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { fromCents, toCents } from "@/lib/pricing/cents";
import { isBoatExclusiveServiceType } from "@/lib/booking/cross-channel-conflicts";
import {
  decideBoatSlotAvailability,
  isBoatServiceType,
  isBoatSharedServiceType,
  loadBoatSlotAvailability,
} from "@/lib/booking/boat-slot-availability";
import { deriveEndDate, generateConfirmationCode } from "./helpers";

const MAX_MANUAL_AMOUNT_CENTS = 100_000_000;
const MONEY_TOLERANCE_CENTS = 1;
const BOAT_EXCLUSIVE_TYPES = ["EXCLUSIVE_EXPERIENCE", "CABIN_CHARTER", "BOAT_EXCLUSIVE"];

export interface CreateManualAdminBookingInput {
  boatId: string;
  serviceId: string;
  dateIso: string;
  seats: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  totalEur: number;
  depositEur: number;
  balanceEur: number;
  paymentMethod: "CASH" | "BANK_TRANSFER";
  note?: string | null;
  userId?: string;
}

export interface CreatedManualAdminBooking {
  bookingId: string;
  confirmationCode: string;
}

function moneyToCents(label: string, amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new ValidationError(`${label} deve essere un numero valido`);
  }
  const cents = toCents(amount);
  if (cents < 0) {
    throw new ValidationError(`${label} non puo' essere negativo`);
  }
  if (cents > MAX_MANUAL_AMOUNT_CENTS) {
    throw new ValidationError(`${label} fuori range (max 1.000.000 EUR)`);
  }
  return cents;
}

function normalizeText(value: string, label: string): string {
  const clean = value.trim();
  if (!clean) throw new ValidationError(`${label} obbligatorio`);
  return clean;
}

async function validateSharedCapacity(params: {
  tx: Prisma.TransactionClient;
  boatId: string;
  serviceId: string;
  serviceType: string;
  durationType: DurationType;
  startDate: Date;
  endDate: Date;
  seats: number;
  capacityMax: number;
}): Promise<void> {
  if (isBoatServiceType(params.serviceType)) {
    const availability = await loadBoatSlotAvailability(
      params.tx,
      params.boatId,
      params.startDate,
    );
    const decision = decideBoatSlotAvailability(
      {
        id: params.serviceId,
        type: params.serviceType,
        boatId: params.boatId,
        durationType: params.durationType,
        capacityMax: params.capacityMax,
      },
      params.seats,
      availability,
    );
    if (decision.conflicts.length > 0) {
      throw new ConflictError("Slot non disponibile per conflitto con booking esistente", {
        conflictingBookings: decision.conflicts.map((c) => c.booking.id),
      });
    }
    if (decision.capacityExceeded) {
      throw new ConflictError("Capienza residua insufficiente", {
        requestedPeople: params.seats,
        sold: decision.sharedSold,
        remaining: decision.sharedRemaining,
        capacityMax: params.capacityMax,
      });
    }
    return;
  }

  if (isBoatExclusiveServiceType(params.serviceType)) return;

  const exclusiveConflict = await params.tx.booking.findFirst({
    where: {
      boatId: params.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      claimsAvailability: true,
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
      service: { is: { type: { in: BOAT_EXCLUSIVE_TYPES } } },
    },
    select: { confirmationCode: true, source: true },
  });
  if (exclusiveConflict) {
    throw new ConflictError("Slot non disponibile per booking esclusivo esistente", {
      conflictingBooking: exclusiveConflict.confirmationCode,
      source: exclusiveConflict.source,
    });
  }

  const sold = await params.tx.booking.aggregate({
    where: {
      serviceId: params.serviceId,
      boatId: params.boatId,
      status: { in: ["PENDING", "CONFIRMED"] },
      claimsAvailability: true,
      startDate: { lte: params.endDate },
      endDate: { gte: params.startDate },
    },
    _sum: { numPeople: true },
  });
  const alreadySold = sold._sum.numPeople ?? 0;
  if (alreadySold + params.seats > params.capacityMax) {
    throw new ConflictError("Capienza residua insufficiente", {
      requestedPeople: params.seats,
      sold: alreadySold,
      remaining: Math.max(0, params.capacityMax - alreadySold),
      capacityMax: params.capacityMax,
    });
  }
}

export async function createManualAdminBooking(
  input: CreateManualAdminBookingInput,
): Promise<CreatedManualAdminBooking> {
  const startDate = parseIsoDay(input.dateIso);
  const seats = Math.trunc(input.seats);
  if (!Number.isInteger(seats) || seats < 1) {
    throw new ValidationError("Posti occupati non validi");
  }

  const firstName = normalizeText(input.customer.firstName, "Nome");
  const lastName = normalizeText(input.customer.lastName, "Cognome");
  const email = normalizeEmail(normalizeText(input.customer.email, "Email"));
  const phone = normalizeText(input.customer.phone, "Telefono");
  const note = input.note?.trim().slice(0, 2000) || null;

  const totalCents = moneyToCents("Totale", input.totalEur);
  const depositCents = moneyToCents("Acconto", input.depositEur);
  const balanceCents = moneyToCents("Restante", input.balanceEur);
  if (Math.abs(totalCents - depositCents - balanceCents) > MONEY_TOLERANCE_CENTS) {
    throw new ValidationError(
      "Totale, acconto e restante non tornano: il totale deve essere uguale ad acconto + restante",
    );
  }
  if (totalCents <= 0) {
    throw new ValidationError("Totale deve essere maggiore di zero");
  }
  if (input.paymentMethod !== "CASH" && input.paymentMethod !== "BANK_TRANSFER") {
    throw new ValidationError("Metodo acconto non valido");
  }

  const confirmationCode = generateConfirmationCode();

  const result = await db.$transaction(async (tx) => {
    const service = await tx.service.findUnique({
      where: { id: input.serviceId },
      select: {
        id: true,
        name: true,
        type: true,
        boatId: true,
        durationType: true,
        durationHours: true,
        capacityMax: true,
        active: true,
      },
    });
    if (!service) throw new NotFoundError("Service", input.serviceId);
    if (!service.active) throw new ValidationError("Servizio non attivo");
    if (service.boatId !== input.boatId) {
      throw new ValidationError("Servizio non compatibile con la barca selezionata");
    }
    if (seats > service.capacityMax) {
      throw new ValidationError(`Posti fuori range (1..${service.capacityMax})`);
    }

    const endDate = toUtcDay(deriveEndDate(startDate, service.durationType, service.durationHours));
    await acquireAvailabilityRangeLock(tx, service.boatId, startDate, endDate);

    const blockedCells = await tx.boatAvailability.findMany({
      where: {
        boatId: service.boatId,
        date: { gte: startDate, lte: endDate },
        status: "BLOCKED",
      },
      select: { date: true, lockedByBookingId: true },
    });
    if (blockedCells.length > 0) {
      throw new ConflictError("Date non disponibili", {
        blockedDates: blockedCells.map((c) => c.date.toISOString().slice(0, 10)),
      });
    }

    if (isBoatExclusiveServiceType(service.type)) {
      const conflict = await tx.booking.findFirst({
        where: {
          boatId: service.boatId,
          status: { in: ["PENDING", "CONFIRMED"] },
          claimsAvailability: true,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: { confirmationCode: true, source: true },
      });
      if (conflict) {
        throw new ConflictError("Date non disponibili per booking esistente", {
          conflictingBooking: conflict.confirmationCode,
          source: conflict.source,
        });
      }
    } else {
      await validateSharedCapacity({
        tx,
        boatId: service.boatId,
        serviceId: service.id,
        serviceType: service.type,
        durationType: service.durationType,
        startDate,
        endDate,
        seats,
        capacityMax: service.capacityMax,
      });
    }

    const customer = await tx.customer.upsert({
      where: { email },
      update: { phone },
      create: { email, firstName, lastName, phone },
    });

    const booking = await tx.booking.create({
      data: {
        confirmationCode,
        source: "DIRECT",
        customerId: customer.id,
        serviceId: service.id,
        boatId: service.boatId,
        startDate,
        endDate,
        cancellationPolicyAnchorDate: startDate,
        numPeople: seats,
        adultCount: seats,
        childCount: 0,
        freeChildSeatCount: 0,
        infantCount: 0,
        totalPrice: fromCents(totalCents).toFixed(2),
        currency: "EUR",
        status: "CONFIRMED",
        exclusiveSlot: isBoatExclusiveServiceType(service.type),
        claimsAvailability: true,
        notes: note ?? "Prenotazione manuale admin",
        directBooking: {
          create: {
            paymentSchedule: balanceCents > 0 ? "DEPOSIT_BALANCE" : "FULL",
            depositAmount:
              balanceCents > 0 ? fromCents(depositCents).toFixed(2) : null,
            balanceAmount:
              balanceCents > 0 ? fromCents(balanceCents).toFixed(2) : null,
            balancePaidAt: null,
          },
        },
      },
      select: {
        id: true,
        confirmationCode: true,
        boatId: true,
        startDate: true,
        endDate: true,
        service: { select: { type: true, name: true } },
      },
    });

    if (depositCents > 0) {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: fromCents(depositCents).toFixed(2),
          currency: "EUR",
          type: balanceCents > 0 ? "DEPOSIT" : "FULL",
          method: input.paymentMethod,
          status: "SUCCEEDED",
          processedAt: new Date(),
          note: "Acconto registrato durante creazione manuale admin",
        },
      });
    }

    await tx.bookingNote.create({
      data: {
        bookingId: booking.id,
        authorId: input.userId,
        note: note
          ? `Prenotazione manuale admin. ${note}`
          : "Prenotazione manuale creata da admin dal calendario.",
      },
    });

    return booking;
  });

  if (isBoatSharedServiceType(result.service.type)) {
    await reconcileBoatDatesFromActiveBookings({
      boatId: result.boatId,
      startDate: result.startDate,
      endDate: result.endDate,
      sourceChannel: CHANNELS.DIRECT,
    });
  } else {
    await blockDates(
      result.boatId,
      result.startDate,
      result.endDate,
      CHANNELS.DIRECT,
      result.id,
    );
  }

  await auditLog({
    userId: input.userId,
    action: AUDIT_ACTIONS.CREATE_MANUAL_BOOKING,
    entity: "Booking",
    entityId: result.id,
    after: {
      confirmationCode: result.confirmationCode,
      boatId: result.boatId,
      serviceName: result.service.name,
      startDate: result.startDate,
      endDate: result.endDate,
      seats,
      totalEur: new Decimal(totalCents).div(100).toFixed(2),
      depositEur: new Decimal(depositCents).div(100).toFixed(2),
      balanceEur: new Decimal(balanceCents).div(100).toFixed(2),
      paymentMethod: input.paymentMethod,
      manual: true,
    },
  });

  return {
    bookingId: result.id,
    confirmationCode: result.confirmationCode,
  };
}
