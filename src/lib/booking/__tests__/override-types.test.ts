import { describe, it, expect } from "vitest";
import { isOtaChannel, isOtaConfirmationComplete, OTA_CHANNELS } from "../override-types";

describe("override-types", () => {
  it("DIRECT is NOT ota", () => {
    expect(isOtaChannel("DIRECT")).toBe(false);
  });
  it("BOKUN/BOATAROUND/SAMBOAT/CLICKANDBOAT/NAUTAL sono ota", () => {
    for (const ch of OTA_CHANNELS) expect(isOtaChannel(ch)).toBe(true);
  });
  it("isOtaConfirmationComplete richiede tutte le 4 flag", () => {
    const base = {
      conflictBookingId: "b1", channel: "BOKUN" as const,
      externalRef: "BK-1", panelOpened: true, upstreamCancelled: true,
      refundVerified: true, adminDeclared: true,
    };
    expect(isOtaConfirmationComplete(base)).toBe(true);
    expect(isOtaConfirmationComplete({ ...base, refundVerified: false })).toBe(false);
  });
});
