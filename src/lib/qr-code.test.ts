import { describe, expect, it } from "vitest";
import { createQrDataUri, createQrSvg, encodeQr } from "./qr-code";

describe("local QR code generator", () => {
  it("creates a square module matrix for a ticket URL", () => {
    const qr = encodeQr("https://egadisailing.com/it/ticket/ABC123");

    expect(qr.version).toBeGreaterThanOrEqual(1);
    expect(qr.size).toBe(qr.version * 4 + 17);
    expect(qr.modules).toHaveLength(qr.size);
    expect(qr.modules.every((row) => row.length === qr.size)).toBe(true);
  });

  it("renders a standalone SVG with dark modules", () => {
    const svg = createQrSvg("https://egadisailing.com/it/ticket/ABC123", {
      scale: 4,
      border: 2,
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<rect");
    expect(svg).toContain('fill="#000"');
  });

  it("creates an embeddable SVG data URI", () => {
    const uri = createQrDataUri("https://egadisailing.com/it/ticket/ABC123");

    expect(uri).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(decodeURIComponent(uri)).toContain("<svg");
  });

  it("fails loudly when the payload exceeds the supported local range", () => {
    expect(() => encodeQr("x".repeat(200))).toThrow(/payload too long/i);
  });
});
