import { describe, expect, test, vi } from "vitest";
import {
  formatCloudflareBytes,
  getCloudflareTrafficSummary,
  normalizeCloudflareTrafficResponse,
  resolveCloudflareAnalyticsConfig,
} from "./analytics";

describe("Cloudflare analytics helpers", () => {
  test("normalizes totals, status code groups and rankings", () => {
    const summary = normalizeCloudflareTrafficResponse(
      {
        data: {
          viewer: {
            zones: [
              {
                totals24h: [
                  { count: "1200", sum: { visits: "340", edgeResponseBytes: "5242880" } },
                ],
                errors4xx: [{ count: 12 }],
                errors5xx: [{ count: "3" }],
                topPaths: [
                  {
                    count: 500,
                    sum: { visits: 120, edgeResponseBytes: 2048 },
                    dimensions: { clientRequestPath: "/it/esperienze" },
                  },
                ],
                topCountries: [
                  {
                    count: "300",
                    sum: { visits: "90", edgeResponseBytes: "1024" },
                    dimensions: { clientCountryName: "Italy" },
                  },
                ],
              },
            ],
          },
        },
      },
      "egadisailing.com",
      "2026-05-09T10:00:00.000Z",
    );

    expect(summary.last24h).toEqual({
      requests: 1200,
      visits: 340,
      bytes: 5_242_880,
      errors4xx: 12,
      errors5xx: 3,
    });
    expect(summary.topPaths[0]).toMatchObject({ label: "/it/esperienze", requests: 500 });
    expect(summary.topCountries[0]).toMatchObject({ label: "Italy", visits: 90 });
  });

  test("reports missing environment as unavailable", () => {
    const config = resolveCloudflareAnalyticsConfig({
      apiToken: "",
      zoneId: "",
      appUrl: "https://egadisailing.com",
    });

    expect(config.configured).toBe(false);
    if (!config.configured) {
      expect(config.message).toContain("CLOUDFLARE_API_TOKEN");
    }
  });

  test("returns non-blocking error state on API failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const summary = await getCloudflareTrafficSummary({
      now: new Date("2026-05-09T10:00:00.000Z"),
      bypassCache: true,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      envOverride: {
        apiToken: "cf_test_token_123456",
        zoneId: "zone_123",
        hostname: "egadisailing.com",
      },
    });

    expect(summary.status).toBe("error");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  test("formats transferred bytes for the admin widget", () => {
    expect(formatCloudflareBytes(0)).toBe("0 B");
    expect(formatCloudflareBytes(1024)).toBe("1 KB");
    expect(formatCloudflareBytes(1_572_864)).toBe("1,5 MB");
  });
});
