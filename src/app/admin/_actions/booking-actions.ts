"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createManualBooking(formData: FormData) {
  const tripId = formData.get("tripId") as string;
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string | null;
  const numPeople = parseInt(formData.get("numPeople") as string);
  const totalPrice = parseFloat(formData.get("totalPrice") as string);
  const channel = (formData.get("channel") as string) || "MANUAL";
  const notes = formData.get("notes") as string | null;

  const customer = await db.customer.upsert({
    where: { email: customerEmail },
    update: { name: customerName, phone: customerPhone || undefined },
    create: {
      name: customerName,
      email: customerEmail,
      phone: customerPhone || null,
    },
  });

  await db.booking.create({
    data: {
      tripId,
      customerId: customer.id,
      numPeople,
      totalPrice,
      status: "CONFIRMED",
      channel: channel as any,
      notes: notes || null,
    },
  });

  await db.trip.update({
    where: { id: tripId },
    data: { availableSpots: { decrement: numPeople } },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/trips");
  revalidatePath("/admin");
}

export async function updateBookingStatus(
  bookingId: string,
  status: "CONFIRMED" | "PENDING" | "CANCELLED" | "REFUNDED",
) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Prenotazione non trovata");

  await db.booking.update({ where: { id: bookingId }, data: { status } });

  if (
    (status === "CANCELLED" || status === "REFUNDED") &&
    booking.status === "CONFIRMED"
  ) {
    await db.trip.update({
      where: { id: booking.tripId },
      data: { availableSpots: { increment: booking.numPeople } },
    });
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/trips");
  revalidatePath("/admin");
}
