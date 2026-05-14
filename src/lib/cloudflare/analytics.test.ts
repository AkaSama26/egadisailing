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

  test("aggregates localized homepage paths before ranking", () => {
    const summary = normalizeCloudflareTrafficResponse(
      {
        data: {
          viewer: {
            zones: [
              {
                totals24h: [{ count: 20, sum: { visits: 20, edgeResponseBytes: 200 } }],
                topPaths: [
                  {
                    count: 5,
                    sum: { visits: 5, edgeResponseBytes: 50 },
                    dimensions: { clientRequestPath: "/it" },
                  },
                  {
                    count: 4,
                    sum: { visits: 4, edgeResponseBytes: 40 },
                    dimensions: { clientRequestPath: "/en/" },
                  },
                  {
                    count: 3,
                    sum: { visits: 3, edgeResponseBytes: 30 },
                    dimensions: { clientRequestPath: "/" },
                  },
                  {
                    count: 8,
                    sum: { visits: 8, edgeResponseBytes: 80 },
                    dimensions: { clientRequestPath: "/api/health" },
                  },
                  {
                    count: 6,
                    sum: { visits: 6, edgeResponseBytes: 60 },
                    dimensions: { clientRequestPath: "/it/esperienze" },
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

    expect(summary.topPaths).toEqual([
      {
        label: "Homepage",
        requests: 12,
        visits: 12,
        bytes: 120,
        sourceLabels: ["/it", "/en/", "/"],
      },
      {
        label: "/it/esperienze",
        requests: 6,
        visits: 6,
        bytes: 60,
        sourceLabels: ["/it/esperienze"],
      },
    ]);
  });

  test("keeps the current partial hour in the hourly chart series", () => {
    const summary = normalizeCloudflareTrafficResponse(
      {
        data: {
          viewer: {
            zones: [
              {
                totals24h: [{ count: 15, sum: { visits: 15, edgeResponseBytes: 150 } }],
                hourly24h: [
                  {
                    count: 10,
                    sum: { visits: 10, edgeResponseBytes: 100 },
                    dimensions: { datetimeHour: "2026-05-12T10:00:00Z" },
                  },
                  {
                    count: 5,
                    sum: { visits: 5, edgeResponseBytes: 50 },
                    dimensions: { datetimeHour: "2026-05-13T10:00:00Z" },
                  },
                ],
              },
            ],
          },
        },
      },
      "egadisailing.com",
      "2026-05-13T10:23:00.000Z",
    );

    expect(summary.hourlyVisits).toHaveLength(25);
    expect(summary.hourlyVisits[0]).toMatchObject({
      hour: "2026-05-12T10:00:00Z",
      visits: 10,
    });
    expect(summary.hourlyVisits.at(-1)).toMatchObject({
      hour: "2026-05-13T10:00:00Z",
      visits: 5,
    });
    expect(summary.hourlyVisits.reduce((total, point) => total + point.visits, 0)).toBe(15);
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
