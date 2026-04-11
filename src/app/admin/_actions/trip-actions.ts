"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createTrip(formData: FormData) {
  const serviceId = formData.get("serviceId") as string;
  const date = formData.get("date") as string;
  const departureTime = formData.get("departureTime") as string;
  const returnTime = formData.get("returnTime") as string;
  const notes = formData.get("notes") as string | null;

  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service) throw new Error("Servizio non trovato");

  await db.trip.create({
    data: {
      serviceId,
      date: new Date(date),
      departureTime,
      returnTime,
      availableSpots: service.capacityMax,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
}

export async function updateTripStatus(
  tripId: string,
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED",
) {
  await db.trip.update({ where: { id: tripId }, data: { status } });
  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

export async function deleteTrip(tripId: string) {
  await db.trip.delete({ where: { id: tripId } });
  revalidatePath("/admin/trips");
  revalidatePath("/admin/calendar");
}
