"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createPricingPeriod(formData: FormData) {
  const serviceId = formData.get("serviceId") as string;
  const label = formData.get("label") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const pricePerPerson = parseFloat(formData.get("pricePerPerson") as string);
  const year = parseInt(formData.get("year") as string);

  await db.pricingPeriod.create({
    data: {
      serviceId,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      pricePerPerson,
      year,
    },
  });
  revalidatePath("/admin/pricing");
}

export async function updatePricingPeriod(id: string, formData: FormData) {
  const pricePerPerson = parseFloat(formData.get("pricePerPerson") as string);
  const label = formData.get("label") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  await db.pricingPeriod.update({
    where: { id },
    data: {
      pricePerPerson,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });
  revalidatePath("/admin/pricing");
}

export async function deletePricingPeriod(id: string) {
  await db.pricingPeriod.delete({ where: { id } });
  revalidatePath("/admin/pricing");
}
