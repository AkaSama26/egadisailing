import { describe, expect, test } from "vitest";
import { normalizeGa4DashboardReports, resolveGa4AnalyticsConfig } from "./ga4-server";

describe("GA4 dashboard helpers", () => {
  test("reports missing Data API credentials as unavailable", () => {
    const config = resolveGa4AnalyticsConfig({
      propertyId: "",
      clientEmail: "",
      privateKey: "",
    });

    expect(config.configured).toBe(false);
    if (!config.configured) {
      expect(config.message).toContain("GA4_PROPERTY_ID");
    }
  });

  test("accepts numeric property ids and escaped private key newlines", () => {
    const config = resolveGa4AnalyticsConfig({
      propertyId: "123456789",
      clientEmail: "ga-reader@example.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
    });

    expect(config.configured).toBe(true);
    if (config.configured) {
      expect(config.property).toBe("properties/123456789");
      expect(config.privateKey).toContain("\nabc\n");
    }
  });

  test("normalizes totals, tracked events, funnel gaps and public top pages", () => {
    const summary = normalizeGa4DashboardReports({
      property: "properties/123456789",
      generatedAt: "2026-05-25T10:00:00.000Z",
      last7d: {
        metricHeaders: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
        ],
        rows: [
          {
            metricValues: [
              { value: "90" },
              { value: "120" },
              { value: "340" },
              { value: "880" },
            ],
          },
        ],
      },
      last30d: {
        metricHeaders: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "eventCount" },
        ],
        rows: [
          {
            metricValues: [
              { value: "210" },
              { value: "300" },
              { value: "900" },
              { value: "2100" },
            ],
          },
        ],
      },
      trackedEvents30d: {
        dimensionHeaders: [{ name: "eventName" }],
        metricHeaders: [{ name: "eventCount" }, { name: "activeUsers" }],
        rows: [
          {
            dimensionValues: [{ value: "whatsapp_click" }],
            metricValues: [{ value: "18" }, { value: "12" }],
          },
          {
            dimensionValues: [{ value: "begin_checkout" }],
            metricValues: [{ value: "4" }, { value: "3" }],
          },
        ],
      },
      topPages30d: {
        dimensionHeaders: [{ name: "pagePath" }],
        metricHeaders: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        rows: [
          {
            dimensionValues: [{ value: "/it" }],
            metricValues: [{ value: "90" }, { value: "50" }],
          },
          {
            dimensionValues: [{ value: "/_next/static/chunk.js" }],
            metricValues: [{ value: "70" }, { value: "1" }],
          },
        ],
      },
      topCountries30d: {
        dimensionHeaders: [{ name: "country" }],
        metricHeaders: [{ name: "activeUsers" }, { name: "sessions" }],
        rows: [
          {
            dimensionValues: [{ value: "Germany" }],
            metricValues: [{ value: "80" }, { value: "110" }],
          },
        ],
      },
    });

    expect(summary.last7d).toMatchObject({ activeUsers: 90, sessions: 120, pageViews: 340 });
    expect(summary.trackedEvents30d[0]).toMatchObject({ name: "whatsapp_click", eventCount: 18 });
    expect(summary.funnel30d).toContainEqual({ name: "booking_start", eventCount: 0, activeUsers: 0 });
    expect(summary.topPages30d).toEqual([{ path: "/it", pageViews: 90, activeUsers: 50 }]);
    expect(summary.topCountries30d[0]).toMatchObject({ country: "Germany", activeUsers: 80 });
  });
});
