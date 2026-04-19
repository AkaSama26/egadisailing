import { describe, expect, it } from "vitest";
import { assessRisk } from "./risk-assessment";
import type { OpenMeteoForecast } from "./open-meteo";

function fc(partial: Partial<OpenMeteoForecast>): OpenMeteoForecast {
  return {
    date: "2026-07-15",
    temperatureMax: 28,
    temperatureMin: 22,
    windSpeedKmh: 10,
    windGustKmh: 15,
    windDirectionDeg: 180,
    precipitationProbability: 0,
    precipitationMm: 0,
    weatherCode: 0,
    waveHeightM: 0.3,
    ...partial,
  };
}

describe("assessRisk", () => {
  it("returns LOW for calm sunny day", () => {
    const r = assessRisk(fc({}));
    expect(r.risk).toBe("LOW");
    expect(r.reasons).toEqual([]);
  });

  it("escalates to MEDIUM on moderate wind", () => {
    const r = assessRisk(fc({ windSpeedKmh: 30 }));
    expect(r.risk).toBe("MEDIUM");
    expect(r.reasons[0]).toMatch(/vento/);
  });

  it("escalates to HIGH on strong wind", () => {
    const r = assessRisk(fc({ windSpeedKmh: 50 }));
    expect(r.risk).toBe("HIGH");
  });

  it("escalates to EXTREME on gale-force wind", () => {
    const r = assessRisk(fc({ windSpeedKmh: 60 }));
    expect(r.risk).toBe("EXTREME");
  });

  it("combines multiple reasons without downgrading risk", () => {
    const r = assessRisk(fc({ windSpeedKmh: 50, precipitationProbability: 80 }));
    expect(r.risk).toBe("HIGH");
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("uses worst-case rule across axes", () => {
    // onde alte + vento basso → HIGH (onde dominano)
    const r = assessRisk(fc({ windSpeedKmh: 10, waveHeightM: 2.0 }));
    expect(r.risk).toBe("HIGH");
  });

  it("cold temperature triggers MEDIUM", () => {
    const r = assessRisk(fc({ temperatureMin: 14 }));
    expect(r.risk).toBe("MEDIUM");
  });

  it("null wave height (marine API down) escalates to MEDIUM with partial-data reason", () => {
    const r = assessRisk(fc({ waveHeightM: null }));
    expect(r.risk).toBe("MEDIUM");
    expect(r.reasons.some((x) => /dati parziali/.test(x))).toBe(true);
    expect(r.reasons.some((x) => /onde/.test(x))).toBe(true);
  });

  it("NaN wind flagged as partial data (defense vs malformed Open-Meteo payload)", () => {
    const r = assessRisk(fc({ windSpeedKmh: Number.NaN }));
    expect(r.risk).toBe("MEDIUM");
    expect(r.reasons.some((x) => /vento/.test(x))).toBe(true);
  });

  it("Infinity precipitation flagged as partial data", () => {
    const r = assessRisk(fc({ precipitationProbability: Number.POSITIVE_INFINITY }));
    expect(r.risk).toBe("MEDIUM");
    expect(r.reasons.some((x) => /pioggia/.test(x))).toBe(true);
  });

  it("real risk never downgraded by missing axis", () => {
    const r = assessRisk(fc({ windSpeedKmh: 60, waveHeightM: null }));
    expect(r.risk).toBe("EXTREME");
  });
});
