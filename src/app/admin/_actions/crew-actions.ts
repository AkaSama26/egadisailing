"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCrewMember(formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as "SKIPPER" | "CHEF" | "HOSTESS";
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;

  await db.crewMember.create({
    data: { name, role, phone: phone || null, email: email || null },
  });
  revalidatePath("/admin/crew");
}

export async function updateCrewMember(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const role = formData.get("role") as "SKIPPER" | "CHEF" | "HOSTESS";
  const phone = formData.get("phone") as string | null;
  const email = formData.get("email") as string | null;

  await db.crewMember.update({
    where: { id },
    data: { name, role, phone: phone || null, email: email || null },
  });
  revalidatePath("/admin/crew");
}

export async function toggleCrewMemberActive(id: string, active: boolean) {
  await db.crewMember.update({ where: { id }, data: { active } });
  revalidatePath("/admin/crew");
}
