"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { CrewRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { ValidationError } from "@/lib/errors";

export interface UpsertCrewMemberInput {
  id?: string;
  name: string;
  role: CrewRole;
  phone?: string;
  email?: string;
  dailyRateEur?: number;
  active: boolean;
}

export async function upsertCrewMember(input: UpsertCrewMemberInput): Promise<void> {
  const { userId } = await requireAdmin();
  const name = input.name.trim();
  if (!name) throw new ValidationError("Nome obbligatorio");
  if (input.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) {
    throw new ValidationError("Email non valida");
  }

  // Round 10 Sec-M6 + M5: NaN guard + range cap.
  if (typeof input.dailyRateEur === "number") {
    if (!Number.isFinite(input.dailyRateEur) || input.dailyRateEur < 0) {
      throw new ValidationError("dailyRateEur must be a non-negative number");
    }
    if (input.dailyRateEur > 10_000) {
      throw new ValidationError("dailyRateEur fuori range (max 10.000€/giorno)");
    }
  }

  const data = {
    name,
    role: input.role,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    dailyRate:
      typeof input.dailyRateEur === "number"
        ? new Prisma.Decimal(input.dailyRateEur.toFixed(2))
        : null,
    active: input.active,
  };

  const result = input.id
    ? await db.crewMember.update({ where: { id: input.id }, data })
    : await db.crewMember.create({ data });

  await auditLog({
    userId,
    action: input.id ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
    entity: "CrewMember",
    entityId: result.id,
    after: { name: data.name, role: data.role, active: data.active },
  });

  revalidatePath("/admin/crew");
}

export async function assignCrewToBooking(
  bookingId: string,
  crewMemberId: string,
  role: CrewRole,
): Promise<void> {
  const { userId } = await requireAdmin();

  // Round 10 BL-A1: check crew attivo + booking in stato assegnabile.
  const [crew, booking] = await Promise.all([
    db.crewMember.findUnique({
      where: { id: crewMemberId },
      select: { id: true, active: true, name: true },
    }),
    db.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    }),
  ]);
  if (!crew) throw new ValidationError(`CrewMember ${crewMemberId} non trovato`);
  if (!booking) throw new ValidationError(`Booking ${bookingId} non trovato`);
  if (!crew.active) {
    throw new ValidationError(`Crew ${crew.name} e' disattivato, impossibile assegnare`);
  }
  if (booking.status === "CANCELLED" || booking.status === "REFUNDED") {
    throw new ValidationError(`Booking ${booking.status}: no assegnazione crew possibile`);
  }

  await db.tripCrew.upsert({
    where: { bookingId_crewMemberId: { bookingId, crewMemberId } },
    update: { role },
    create: { bookingId, crewMemberId, role },
  });

  await auditLog({
    userId,
    action: AUDIT_ACTIONS.ASSIGN_CREW,
    entity: "Booking",
    entityId: bookingId,
    after: { crewMemberId, role },
  });

  revalidatePath(`/admin/prenotazioni/${bookingId}`);
  revalidatePath("/admin/crew");
}

export async function toggleCrewActive(id: string, active: boolean): Promise<void> {
  const { userId } = await requireAdmin();
  await db.crewMember.update({ where: { id }, data: { active } });
  await auditLog({
    userId,
    action: active ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
    entity: "CrewMember",
    entityId: id,
  });
  revalidatePath("/admin/crew");
}
