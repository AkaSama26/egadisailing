import { describe, expect, test } from "vitest";
import { buildMetaPixelInitScript, mapDataLayerEventToMetaPixel } from "./meta-pixel";

describe("Meta Pixel event mapping", () => {
  test("maps checkout to InitiateCheckout with commerce params", () => {
    expect(
      mapDataLayerEventToMetaPixel({
        event: "begin_checkout",
        service_id: "boat-exclusive-full-day",
        service_name: "Tour privato Favignana e Levanzo",
        service_type: "BOAT_EXCLUSIVE",
        currency: "EUR",
        value: 500,
        total_value: 1000,
        guest_count: 4,
      }),
    ).toEqual({
      kind: "standard",
      name: "InitiateCheckout",
      params: {
        service_id: "boat-exclusive-full-day",
        service_name: "Tour privato Favignana e Levanzo",
        service_type: "BOAT_EXCLUSIVE",
        currency: "EUR",
        value: 500,
        content_ids: ["boat-exclusive-full-day"],
        content_type: "product",
        content_name: "Tour privato Favignana e Levanzo",
        content_category: "BOAT_EXCLUSIVE",
        num_items: 4,
        contents: [{ id: "boat-exclusive-full-day", quantity: 4, item_price: 125 }],
      },
    });
  });

  test("uses total booking value for Purchase while preserving paid value", () => {
    expect(
      mapDataLayerEventToMetaPixel({
        event: "purchase",
        service_id: "charter-egadi-trimarano",
        service_name: "Charter Egadi trimarano",
        currency: "EUR",
        value: 900,
        total_value: 3000,
        guest_count: 6,
      }),
    ).toMatchObject({
      kind: "standard",
      name: "Purchase",
      params: {
        value: 3000,
        paid_value: 900,
        num_items: 6,
        contents: [{ id: "charter-egadi-trimarano", quantity: 6, item_price: 500 }],
      },
    });
  });

  test("maps lead/contact events without free-text personal fields", () => {
    expect(
      mapDataLayerEventToMetaPixel({
        event: "generate_lead",
        locale: "it",
        method: "contact_form",
        cta_text: "Messaggio con telefono +39 333 1234567",
      }),
    ).toEqual({
      kind: "standard",
      name: "Lead",
      params: {
        locale: "it",
        lead_source: "contact_form",
      },
    });

    expect(
      mapDataLayerEventToMetaPixel({
        event: "whatsapp_click",
        locale: "en",
        contact_method: "whatsapp",
        cta_location: "floating_button",
      }),
    ).toEqual({
      kind: "standard",
      name: "Contact",
      params: {
        locale: "en",
        contact_method: "whatsapp",
        cta_location: "floating_button",
        lead_source: "whatsapp",
      },
    });
  });

  test("skips page views and consent events handled elsewhere", () => {
    expect(mapDataLayerEventToMetaPixel({ event: "page_view" })).toBeNull();
    expect(mapDataLayerEventToMetaPixel({ event: "egadi_consent_update" })).toBeNull();
  });

  test("builds the official loader script with an encoded pixel id", () => {
    const script = buildMetaPixelInitScript("1234567890");
    expect(script).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(script).toContain("fbq('init', \"1234567890\")");
  });
});
