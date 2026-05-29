"use client";

import { useEffect } from "react";
import { centsToAnalyticsValue, trackEventOncePerSession } from "@/lib/analytics/client";

interface BookingSuccessAnalyticsProps {
  transactionId: string;
  locale: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  status: string;
  guestCount: number;
  totalCents: number;
  paidCents: number;
  paymentSchedule?: string | null;
}

export function BookingSuccessAnalytics({
  transactionId,
  locale,
  serviceId,
  serviceName,
  serviceType,
  status,
  guestCount,
  totalCents,
  paidCents,
  paymentSchedule,
}: BookingSuccessAnalyticsProps) {
  useEffect(() => {
    const value = centsToAnalyticsValue(paidCents);
    const totalValue = centsToAnalyticsValue(totalCents);
    const baseParams = {
      locale,
      service_id: serviceId,
      service_name: serviceName,
      service_type: serviceType,
      booking_status: status,
      guest_count: guestCount,
      payment_schedule: paymentSchedule ?? undefined,
      currency: "EUR",
      value,
      total_value: totalValue,
      items: [
        {
          item_id: serviceId,
          item_name: serviceName,
          item_category: serviceType,
          quantity: Math.max(1, guestCount),
          price: totalValue,
        },
      ],
    };

    trackEventOncePerSession(
      "booking-confirmed:" + transactionId,
      "booking_confirmed",
      baseParams,
    );

    if (paidCents > 0) {
      trackEventOncePerSession("purchase:" + transactionId, "purchase", {
        ...baseParams,
        transaction_id: transactionId,
      });
    }
  }, [
    guestCount,
    locale,
    paidCents,
    paymentSchedule,
    serviceId,
    serviceName,
    serviceType,
    status,
    totalCents,
    transactionId,
  ]);

  return null;
}
