import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("trackEventOncePerSession", () => {
  test("dedupes only after dataLayer push succeeds", async () => {
    const dataLayer: unknown[] = [];
    const sessionStorage = new Map<string, string>();
    vi.stubGlobal("window", {
      dataLayer,
      __egadiTrackingConsentState: {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      },
      sessionStorage: {
        getItem: (key: string) => sessionStorage.get(key) ?? null,
        setItem: (key: string, value: string) => sessionStorage.set(key, value),
      },
    });
    const { trackEventOncePerSession, setTrackingConsentState } = await import("./client");

    expect(trackEventOncePerSession("cta:1", "book_now_click", { cta_id: "hero" })).toBe(false);
    expect(sessionStorage.size).toBe(0);

    setTrackingConsentState({
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(trackEventOncePerSession("cta:1", "book_now_click", { cta_id: "hero" })).toBe(true);
    expect(trackEventOncePerSession("cta:1", "book_now_click", { cta_id: "hero" })).toBe(false);
    expect(dataLayer).toEqual([{ event: "book_now_click", cta_id: "hero" }]);
  });
});
