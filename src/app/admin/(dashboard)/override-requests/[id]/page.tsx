import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OTA_CHANNELS } from "@/lib/booking/override-types";
import { OverrideDetailClient } from "./client";
import { notFound } from "next/navigation";

export default async function OverrideDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const request = await db.overrideRequest.findUnique({
    where: { id },
    include: {
      newBooking: {
        include: {
          customer: true,
          service: true,
          boat: true,
        },
      },
    },
  });
  if (!request) notFound();

  const conflicts = await db.booking.findMany({
    where: { id: { in: request.conflictingBookingIds } },
    include: {
      customer: true,
      service: true,
      bokunBooking: true,
      charterBooking: true,
    },
  });

  const otaConflicts = conflicts
    .filter((c) => (OTA_CHANNELS as readonly string[]).includes(c.source))
    .map((c) => {
      const externalRef =
        c.bokunBooking?.bokunBookingId ??
        c.charterBooking?.platformBookingRef ??
        c.id;
      const panelUrl =
        c.source === "BOKUN" && c.bokunBooking?.bokunBookingId
          ? `https://secure.bokun.io/bookings/${c.bokunBooking.bokunBookingId}`
          : "";
      return {
        conflictId: c.id,
        channel: c.source,
        externalRef,
        panelUrl,
        customerName:
          `${c.customer?.firstName ?? ""} ${c.customer?.lastName ?? ""}`.trim() ||
          c.customer?.email ||
          "?",
        amount: c.totalPrice.toFixed(2),
      };
    });

  return (
    <OverrideDetailClient
      request={{
        id: request.id,
        status: request.status,
        newBookingRevenue: request.newBookingRevenue.toFixed(2),
        conflictingRevenueTotal: request.conflictingRevenueTotal.toFixed(2),
        conflictSourceChannels: request.conflictSourceChannels,
        newBookingCode: request.newBooking.confirmationCode,
        newBookingCustomer: `${request.newBooking.customer.firstName} ${request.newBooking.customer.lastName}`.trim(),
        newBookingServiceName: request.newBooking.service.name,
        newBookingStartDate: request.newBooking.startDate.toISOString().slice(0, 10),
        newBookingNumPeople: request.newBooking.numPeople,
        dropDeadAt: request.dropDeadAt.toISOString(),
        decisionNotes: request.decisionNotes,
      }}
      otaConflicts={otaConflicts}
    />
  );
}
