"use client";

type AnalyticsPrimitive = string | number | boolean;
export type AnalyticsEventParams = Record<
  string,
  | AnalyticsPrimitive
  | AnalyticsPrimitive[]
  | Record<string, unknown>
  | Array<Record<string, unknown>>
  | null
  | undefined
>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __egadiGtagLoadedIds?: Record<string, true>;
  }
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const SESSION_KEY_PREFIX = "egadi:analytics:event:";

type MetaPixelEventName =
  | "AddPaymentInfo"
  | "Contact"
  | "InitiateCheckout"
  | "Lead"
  | "Purchase"
  | "ViewContent";

export interface MetaPixelEventPayload {
  eventName: MetaPixelEventName;
  parameters: Record<string, unknown>;
  eventId?: string;
}

type MetaPixelWindow = Window & {
  fbq?: (...args: unknown[]) => void;
  __egadiMetaPixelLoadedIds?: Record<string, true>;
  __egadiMetaPixelConsentGranted?: Record<string, true>;
};

function canTrackAnalytics(): boolean {
  if (typeof window === "undefined") return false;
  if (!GA_MEASUREMENT_ID) return false;
  return Boolean(window.gtag && window.__egadiGtagLoadedIds?.[GA_MEASUREMENT_ID]);
}

function canTrackMetaPixel(): boolean {
  if (typeof window === "undefined") return false;
  if (!META_PIXEL_ID) return false;
  const metaWindow = window as MetaPixelWindow;
  return Boolean(
    metaWindow.fbq &&
      metaWindow.__egadiMetaPixelLoadedIds?.[META_PIXEL_ID] &&
      metaWindow.__egadiMetaPixelConsentGranted?.[META_PIXEL_ID],
  );
}

function cleanParams(params: Record<string, unknown> = {}): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function stringParam(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberParam(params: Record<string, unknown>, key: string): number | undefined {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function firstItem(params: Record<string, unknown>): Record<string, unknown> | undefined {
  const items = params.items;
  if (!Array.isArray(items)) return undefined;
  const [item] = items;
  return item && typeof item === "object" && !Array.isArray(item)
    ? (item as Record<string, unknown>)
    : undefined;
}

function buildMetaContentParams(params: Record<string, unknown>): Record<string, unknown> {
  const item = firstItem(params);
  const serviceId =
    stringParam(params, "service_id") ??
    (item ? stringParam(item, "item_id") : undefined);
  const serviceName =
    stringParam(params, "service_name") ??
    (item ? stringParam(item, "item_name") : undefined);
  const serviceType =
    stringParam(params, "service_type") ??
    (item ? stringParam(item, "item_category") : undefined);
  const guestCount =
    numberParam(params, "guest_count") ??
    (item ? numberParam(item, "quantity") : undefined);
  const result: Record<string, unknown> = {
    content_type: "product",
  };

  if (serviceId) {
    result.content_ids = [serviceId];
    result.contents = [
      {
        id: serviceId,
        quantity: guestCount ? Math.max(1, Math.round(guestCount)) : 1,
      },
    ];
  }
  if (serviceName) result.content_name = serviceName;
  if (serviceType) result.content_category = serviceType;
  if (guestCount) result.num_items = Math.max(1, Math.round(guestCount));

  return result;
}

function buildMetaValueParams(params: Record<string, unknown>): Record<string, unknown> {
  const value = numberParam(params, "value") ?? numberParam(params, "total_value");
  if (value === undefined) return {};
  return {
    value,
    currency: stringParam(params, "currency") ?? "EUR",
  };
}

function metaPayload(
  eventName: MetaPixelEventName,
  parameters: Record<string, unknown>,
  eventId?: string,
): MetaPixelEventPayload {
  const payload: MetaPixelEventPayload = {
    eventName,
    parameters: cleanParams(parameters),
  };
  if (eventId) payload.eventId = eventId;
  return payload;
}

export function mapMetaPixelEvent(
  name: string,
  params: AnalyticsEventParams | Record<string, unknown> = {},
): MetaPixelEventPayload | null {
  const cleaned = cleanParams(params);
  const contentParams = buildMetaContentParams(cleaned);
  const valueParams = buildMetaValueParams(cleaned);

  if (name === "booking_start") {
    return metaPayload("ViewContent", {
      ...contentParams,
      locale: stringParam(cleaned, "locale"),
    });
  }

  if (name === "begin_checkout") {
    return metaPayload("InitiateCheckout", {
      ...contentParams,
      ...valueParams,
      locale: stringParam(cleaned, "locale"),
      payment_schedule: stringParam(cleaned, "payment_schedule"),
    });
  }

  if (name === "payment_submit") {
    return metaPayload("AddPaymentInfo", {
      ...valueParams,
      locale: stringParam(cleaned, "locale"),
    });
  }

  if (name === "contact_submit") {
    return metaPayload("Lead", {
      content_name: "contact_form",
      locale: stringParam(cleaned, "locale"),
      method: stringParam(cleaned, "method"),
    });
  }

  if (name === "whatsapp_click") {
    return metaPayload("Contact", {
      content_name: "whatsapp",
      locale: stringParam(cleaned, "locale"),
      contact_key: stringParam(cleaned, "contact_key"),
      source: stringParam(cleaned, "source"),
    });
  }

  if (name === "purchase") {
    const transactionId =
      stringParam(cleaned, "transaction_id") ?? stringParam(cleaned, "order_id");
    return metaPayload(
      "Purchase",
      {
        ...contentParams,
        ...valueParams,
        locale: stringParam(cleaned, "locale"),
        order_id: transactionId,
        payment_schedule: stringParam(cleaned, "payment_schedule"),
        booking_status: stringParam(cleaned, "booking_status"),
      },
      transactionId,
    );
  }

  return null;
}

function trackMetaPixelEvent(name: string, params: Record<string, unknown>): boolean {
  if (!canTrackMetaPixel()) return false;
  const event = mapMetaPixelEvent(name, params);
  if (!event) return false;

  const metaWindow = window as MetaPixelWindow;
  if (event.eventId) {
    metaWindow.fbq?.("track", event.eventName, event.parameters, {
      eventID: event.eventId,
    });
  } else {
    metaWindow.fbq?.("track", event.eventName, event.parameters);
  }
  return true;
}

export function trackEvent(name: string, params: AnalyticsEventParams = {}): boolean {
  const cleaned = cleanParams(params);
  let tracked = false;

  if (canTrackAnalytics()) {
    window.gtag?.("event", name, cleaned);
    tracked = true;
  }

  if (trackMetaPixelEvent(name, cleaned)) {
    tracked = true;
  }

  return tracked;
}

export function trackEventOncePerSession(
  key: string,
  name: string,
  params: AnalyticsEventParams = {},
): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = SESSION_KEY_PREFIX + key;
  try {
    if (window.sessionStorage.getItem(storageKey)) return false;
  } catch {
    // Session storage can be disabled; tracking may still proceed once.
  }

  const tracked = trackEvent(name, params);
  if (!tracked) return false;

  try {
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Best-effort dedupe only.
  }
  return true;
}

export function centsToAnalyticsValue(cents: number | null | undefined): number | undefined {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return undefined;
  return Math.round(cents) / 100;
}
