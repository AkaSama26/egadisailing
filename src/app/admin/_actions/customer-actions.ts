// @ts-nocheck - legacy schema references, refactored in Plan 2-5
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateCustomer(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string | null;
  const nationality = formData.get("nationality") as string | null;
  const language = formData.get("language") as string | null;
  const notes = formData.get("notes") as string | null;

  await db.customer.update({
    where: { id },
    data: {
      name,
      email,
      phone: phone || null,
      nationality: nationality || null,
      language: language || null,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}
