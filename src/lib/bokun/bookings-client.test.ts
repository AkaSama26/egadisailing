import { describe, expect, test, vi } from "vitest";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("./index", () => ({
  bokunClient: () => ({ request: requestMock }),
}));

import { getBokunBooking } from "./bookings";

describe("getBokunBooking", () => {
  test("converts the webhook global ID before calling the legacy REST API", async () => {
    requestMock.mockResolvedValueOnce({
      id: 37648,
      confirmationCode: "BKN-37648",
      status: "CONFIRMED",
      productId: "1208224",
      productConfirmationCode: "PROD-37648",
      startDate: "2026-08-10",
      endDate: "2026-08-10",
      totalPrice: 180,
      currency: "EUR",
      channelName: "BOKUN",
      mainContactDetails: {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      },
      numPeople: 2,
    });

    const booking = await getBokunBooking("Qm9va2luZzozNzY0OA");

    expect(requestMock).toHaveBeenCalledWith("GET", "/booking.json/booking/37648");
    expect(booking.id).toBe(37648);
  });
});
