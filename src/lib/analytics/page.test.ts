import { describe, expect, test } from "vitest";
import { buildPageViewPayload, sanitizePageUrl, sanitizePathname, sanitizeSearch } from "./page";

describe("analytics page URL sanitizer", () => {
  test("keeps only attribution query params", () => {
    expect(
      sanitizeSearch("?utm_source=google&email=guest@example.com&phone=3331234567&service=trimaran&foo=bar&gclid=abc"),
    ).toBe("?utm_source=google&service=trimaran&gclid=abc");
  });

  test("redacts booking and ticket codes from paths", () => {
    expect(sanitizePathname("/it/prenota/success/ABC-123-SECRET")).toBe("/it/prenota/success/[code]");
    expect(sanitizePathname("/it/ticket/TICKET-123-SECRET")).toBe("/it/ticket/[code]");
  });

  test("builds deterministic page_view payload without PII", () => {
    expect(
      buildPageViewPayload(
        "https://www.egadisailing.com/it/esperienze/trimarano?utm_campaign=spring&email=guest@example.com",
        { title: "Trimarano | Egadisailing", referrer: "https://www.google.com/search?q=egadi" },
      ),
    ).toMatchObject({
      page_location: "https://www.egadisailing.com/it/esperienze/trimarano?utm_campaign=spring",
      page_path: "/it/esperienze/trimarano?utm_campaign=spring",
      page_type: "experience_detail",
      service_slug: "trimarano",
      locale: "it",
      page_title: "Trimarano | Egadisailing",
    });
    expect(sanitizePageUrl("https://www.egadisailing.com/it?email=guest@example.com")).toBe(
      "https://www.egadisailing.com/it",
    );
  });
});
