import { QUEUE_NAMES } from "@/lib/queue";
import { defineWorker } from "@/lib/queue/define-worker";
import { getBokunBooking } from "@/lib/bokun/bookings";
import { importBokunBooking } from "@/lib/bokun/adapters/booking";
import { syncBookingAvailability } from "@/lib/bokun/sync-availability";
import { isBokunConfigured } from "@/lib/bokun";
import type { BookingWebhookPayload } from "@/lib/queue/types";

interface BokunBookingJob {
  type: "booking.webhook.process";
  data: BookingWebhookPayload;
}

export function startBokunBookingWorker() {
  return defineWorker<BokunBookingJob, BookingWebhookPayload>({
    queue: QUEUE_NAMES.BOOKING_BOKUN,
    jobName: "booking.webhook.process",
    label: "bokun-booking",
    configCheck: isBokunConfigured,
    configCheckLogContext: (data) => ({
      bookingId: data.bookingId,
      topic: data.topic,
      eventId: data.eventId,
    }),
    workerOptions: { concurrency: 3, limiter: { max: 5, duration: 1000 } },
    handler: async (data) => {
      const bokunBooking = await getBokunBooking(data.bookingId);
      const imported = await importBokunBooking(bokunBooking);
      if (imported.mode !== "skipped") {
        await syncBookingAvailability(imported);
      }
    },
  });
}
