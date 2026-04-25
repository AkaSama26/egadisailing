"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { CrewRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auditLog } from "@/lib/audit/log";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { ValidationError } from "@/lib/errors";
import { withAdminAction } from "@/lib/admin/with-admin-action";

const upsertCrewMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome obbligatorio").transform((s) => s.trim()),
  role: z.nativeEnum(CrewRole),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Email non valida",
    ),
  // Round 10 Sec-M6 + M5: NaN guard + range cap.
  dailyRateEur: z
    .number()
    .nonnegative("dailyRateEur must be a non-negative number")
    .max(10_000, "dailyRateEur fuori range (max 10.000€/giorno)")
    .optional(),
  active: z.boolean(),
});

export type UpsertCrewMemberInput = z.input<typeof upsertCrewMemberSchema>;

export const upsertCrewMember = withAdminAction(
  {
    schema: upsertCrewMemberSchema,
    revalidatePaths: ["/admin/crew"],
  },
  async (input, { userId }) => {
    const data = {
      name: input.name,
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
  },
);

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

const toggleCrewActiveSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export const toggleCrewActive = withAdminAction(
  {
    schema: toggleCrewActiveSchema,
    revalidatePaths: ["/admin/crew"],
  },
  async (input, { userId }) => {
    await db.crewMember.update({ where: { id: input.id }, data: { active: input.active } });
    await auditLog({
      userId,
      action: input.active ? AUDIT_ACTIONS.ACTIVATE : AUDIT_ACTIONS.DEACTIVATE,
      entity: "CrewMember",
      entityId: input.id,
    });
  },
);
