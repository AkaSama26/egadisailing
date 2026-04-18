import { describe, test, expect } from "vitest";
import { parseBookingMetadata, buildBookingMetadata } from "./metadata";

describe("buildBookingMetadata", () => {
  test("creates string-only Stripe metadata", () => {
    const m = buildBookingMetadata({
      bookingId: "b1",
      confirmationCode: "ES-ABC1234",
      paymentType: "DEPOSIT",
    });
    expect(m).toEqual({
      bookingId: "b1",
      confirmationCode: "ES-ABC1234",
      paymentType: "DEPOSIT",
    });
  });
});

describe("parseBookingMetadata", () => {
  test("round-trips with buildBookingMetadata", () => {
    const input = { bookingId: "b1", confirmationCode: "ES-X", paymentType: "FULL" as const };
    const parsed = parseBookingMetadata(buildBookingMetadata(input));
    expect(parsed).toEqual(input);
  });

  test("throws on missing bookingId", () => {
    expect(() =>
      parseBookingMetadata({ confirmationCode: "ES-X", paymentType: "FULL" }),
    ).toThrow();
  });

  test("throws on bad paymentType", () => {
    expect(() =>
      parseBookingMetadata({
        bookingId: "b1",
        confirmationCode: "ES-X",
        paymentType: "PARTIAL",
      }),
    ).toThrow();
  });

  test("throws on null metadata", () => {
    expect(() => parseBookingMetadata(null)).toThrow();
  });
});
