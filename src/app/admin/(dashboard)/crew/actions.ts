"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { CrewRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { auditLog } from "@/lib/audit/log";
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

  const data = {
    name,
    role: input.role,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    dailyRate:
      typeof input.dailyRateEur === "number" && input.dailyRateEur >= 0
        ? new Prisma.Decimal(input.dailyRateEur.toFixed(2))
        : null,
    active: input.active,
  };

  const result = input.id
    ? await db.crewMember.update({ where: { id: input.id }, data })
    : await db.crewMember.create({ data });

  await auditLog({
    userId,
    action: input.id ? "UPDATE" : "CREATE",
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

  await db.tripCrew.upsert({
    where: { bookingId_crewMemberId: { bookingId, crewMemberId } },
    update: { role },
    create: { bookingId, crewMemberId, role },
  });

  await auditLog({
    userId,
    action: "ASSIGN_CREW",
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
    action: active ? "ACTIVATE" : "DEACTIVATE",
    entity: "CrewMember",
    entityId: id,
  });
  revalidatePath("/admin/crew");
}
