import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("analytics dataLayer client", () => {
  test("does not push analytics events before consent", async () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      __egadiTrackingConsentState: {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    });
    const { trackEvent } = await import("./client");

    expect(trackEvent("booking_step_view", { booking_step: "people" })).toBe(false);
    expect(dataLayer).toEqual([]);
  });

  test("pushes cleaned events to dataLayer after analytics consent", async () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      __egadiTrackingConsentState: {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    });
    const { trackEvent } = await import("./client");

    expect(
      trackEvent("booking_step_view", {
        booking_step: "people",
        email: "guest@example.com",
        cta_text: "Prenota ora",
        note: "private note",
      }),
    ).toBe(true);
    expect(dataLayer).toEqual([
      {
        event: "booking_step_view",
        booking_step: "people",
        cta_text: "Prenota ora",
      },
    ]);
  });

  test("keeps ISO dates while still redacting phone-like strings", async () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      __egadiTrackingConsentState: {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
    });
    const { trackEvent } = await import("./client");

    expect(
      trackEvent("date_selected", {
        selected_date: "2026-07-15",
        phone: "+39 333 123 4567",
        cta_text: "+39 333 123 4567",
      }),
    ).toBe(true);
    expect(dataLayer).toEqual([
      {
        event: "date_selected",
        selected_date: "2026-07-15",
        cta_text: "[redacted]",
      },
    ]);
  });

  test("pushes Consent Mode command and consent event", async () => {
    const dataLayer: unknown[] = [];
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", { dataLayer, dispatchEvent });
    const { pushConsentUpdate } = await import("./client");

    expect(
      pushConsentUpdate(
        {
          analytics_storage: "granted",
          ad_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        },
        { analyticsGranted: true, marketingGranted: true, source: "test" },
      ),
    ).toBe(true);

    expect(dataLayer[0]).toEqual([
      "consent",
      "update",
      {
        analytics_storage: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
      },
    ]);
    expect(dataLayer[1]).toMatchObject({
      event: "egadi_consent_update",
      analytics_storage: "granted",
      ad_storage: "granted",
      source: "test",
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
