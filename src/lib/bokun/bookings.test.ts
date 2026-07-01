import { describe, expect, test } from "vitest";
import { normalizeBokunBookingResponse } from "./bookings";

describe("normalizeBokunBookingResponse", () => {
  test("normalizes current Bokun parent booking shape with activityBookings", () => {
    const normalized = normalizeBokunBookingResponse({
      bookingId: 96028815,
      confirmationCode: "GENERIC15",
      status: "CONFIRMED",
      currency: "EUR",
      totalPrice: 180,
      totalPaid: 216,
      customerPayments: [{ amountAsMoney: { amount: 216, currency: "EUR" } }],
      language: "en",
      bookingChannel: { title: "GetYourGuide" },
      customer: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        phoneNumber: "+39 123",
        country: "IT",
      },
      activityBookings: [
        {
          bookingId: 136187987,
          parentBookingId: 96028815,
          confirmationCode: "ACT987",
          productConfirmationCode: "PROD987",
          status: "CONFIRMED",
          startDateTime: Date.UTC(2026, 6, 7, 10, 0, 0),
          endDateTime: Date.UTC(2026, 6, 7, 18, 0, 0),
          totalPrice: 180,
          paidType: "PAID_IN_FULL",
          sellerInvoice: { lineItems: [{ commission: 30 }] },
          productId: 1208224,
          totalParticipants: 2,
          product: { id: 1208224, title: "Shared tour" },
        },
      ],
    });

    expect(normalized).toMatchObject({
      id: 96028815,
      confirmationCode: "GENERIC15",
      productConfirmationCode: "PROD987",
      status: "CONFIRMED",
      productId: "1208224",
      startDate: "2026-07-07",
      endDate: "2026-07-07",
      totalPrice: 216,
      supplierPrice: 180,
      commissionPercent: 30,
      commissionAmount: 64.8,
      netAmount: 151.2,
      currency: "EUR",
      channelName: "GetYourGuide",
      numPeople: 2,
      mainContactDetails: {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        language: "en",
      },
    });
  });
});
