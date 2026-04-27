import { describe, expect, it } from "vitest";
import { CHANNELS } from "@/lib/channels";
import { evaluateOtaFreshness } from "./ota-preflight";

describe("evaluateOtaFreshness", () => {
  const now = new Date("2026-04-26T10:00:00.000Z");

  it("accetta canali configurati con sync GREEN fresco", () => {
    expect(
      evaluateOtaFreshness(
        {
          channel: CHANNELS.BOKUN,
          configured: true,
          healthStatus: "GREEN",
          lastSyncAt: new Date("2026-04-26T09:58:00.000Z"),
        },
        now,
      ),
    ).toEqual({ fresh: true, ageMs: 120000 });
  });

  it("blocca canali configurati senza stato sync", () => {
    expect(
      evaluateOtaFreshness(
        {
          channel: CHANNELS.BOKUN,
          configured: true,
          healthStatus: null,
          lastSyncAt: null,
        },
        now,
      ),
    ).toEqual({ fresh: false, reason: "missing_status", ageMs: null });
  });

  it("blocca canali configurati con stato non GREEN", () => {
    expect(
      evaluateOtaFreshness(
        {
          channel: CHANNELS.BOATAROUND,
          configured: true,
          healthStatus: "RED",
          lastSyncAt: new Date("2026-04-26T09:59:00.000Z"),
        },
        now,
      ),
    ).toEqual({ fresh: false, reason: "red_status", ageMs: 60000 });
  });

  it("blocca canali configurati con sync troppo vecchio", () => {
    expect(
      evaluateOtaFreshness(
        {
          channel: CHANNELS.BOKUN,
          configured: true,
          healthStatus: "GREEN",
          lastSyncAt: new Date("2026-04-26T09:50:00.000Z"),
        },
        now,
      ),
    ).toEqual({ fresh: false, reason: "stale_status", ageMs: 600000 });
  });
});
