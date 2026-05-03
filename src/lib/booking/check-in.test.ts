import { describe, expect, it } from "vitest";
import { extractConfirmationCodeFromQrPayload } from "./check-in";

describe("extractConfirmationCodeFromQrPayload", () => {
  it("extracts a code from the public ticket URL", () => {
    expect(
      extractConfirmationCodeFromQrPayload("https://egadisailing.com/it/ticket/es-abc1234"),
    ).toBe("ES-ABC1234");
  });

  it("accepts a raw confirmation code for manual check-in", () => {
    expect(extractConfirmationCodeFromQrPayload(" es-7z9k2qp ")).toBe("ES-7Z9K2QP");
  });

  it("rejects unrelated QR payloads", () => {
    expect(extractConfirmationCodeFromQrPayload("https://example.com/not-a-ticket")).toBeNull();
  });
});
