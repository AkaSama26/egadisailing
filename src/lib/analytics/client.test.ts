import { describe, expect, test } from "vitest";
import { mapMetaPixelEvent } from "./client";

describe("Meta Pixel event mapping", () => {
  test("maps checkout start to InitiateCheckout", () => {
    expect(
      mapMetaPixelEvent("begin_checkout", {
        locale: "it",
        service_id: "boat-private-full-day",
        service_name: "Tour privato Favignana e Levanzo",
        service_type: "BOAT_PRIVATE",
        currency: "EUR",
        value: 120,
        guest_count: 4,
        payment_schedule: "DEPOSIT_BALANCE",
      }),
    ).toEqual({
      eventName: "InitiateCheckout",
      parameters: {
        content_type: "product",
        content_ids: ["boat-private-full-day"],
        contents: [{ id: "boat-private-full-day", quantity: 4 }],
        content_name: "Tour privato Favignana e Levanzo",
        content_category: "BOAT_PRIVATE",
        num_items: 4,
        value: 120,
        currency: "EUR",
        locale: "it",
        payment_schedule: "DEPOSIT_BALANCE",
      },
    });
  });

  test("maps purchase with event id for Meta deduplication", () => {
    expect(
      mapMetaPixelEvent("purchase", {
        transaction_id: "booking_123",
        service_id: "trimaran-gourmet",
        service_name: "Trimarano gourmet",
        service_type: "TRIMARAN",
        currency: "EUR",
        value: 450,
        guest_count: 8,
        booking_status: "CONFIRMED",
      }),
    ).toEqual({
      eventName: "Purchase",
      eventId: "booking_123",
      parameters: {
        content_type: "product",
        content_ids: ["trimaran-gourmet"],
        contents: [{ id: "trimaran-gourmet", quantity: 8 }],
        content_name: "Trimarano gourmet",
        content_category: "TRIMARAN",
        num_items: 8,
        value: 450,
        currency: "EUR",
        order_id: "booking_123",
        booking_status: "CONFIRMED",
      },
    });
  });

  test("maps contact actions to lead and contact standards", () => {
    expect(mapMetaPixelEvent("contact_submit", { locale: "en", method: "contact_form" }))
      .toEqual({
        eventName: "Lead",
        parameters: {
          content_name: "contact_form",
          locale: "en",
          method: "contact_form",
        },
      });

    expect(
      mapMetaPixelEvent("whatsapp_click", {
        locale: "it",
        contact_key: "italy",
        source: "floating_button",
      }),
    ).toEqual({
      eventName: "Contact",
      parameters: {
        content_name: "whatsapp",
        locale: "it",
        contact_key: "italy",
        source: "floating_button",
      },
    });
  });

  test("ignores custom GA-only events", () => {
    expect(mapMetaPixelEvent("booking_step", { step: "people" })).toBeNull();
  });
});
