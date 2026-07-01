export type MetaPixelEventKind = "standard" | "custom";

export type MetaPixelMappedEvent = {
  kind: MetaPixelEventKind;
  name: string;
  params: Record<string, unknown>;
};

export type DataLayerEventLike = {
  event?: unknown;
  [key: string]: unknown;
};

const CUSTOM_EVENT_NAMES: Record<string, string> = {
  book_now_click: "EgadiBookNowClick",
  booking_start: "EgadiBookingStart",
  booking_confirmed: "EgadiBookingConfirmed",
  payment_success: "EgadiPaymentSuccess",
  payment_submit: "EgadiPaymentSubmit",
  payment_error: "EgadiPaymentError",
  booking_error: "EgadiBookingError",
  availability_unavailable: "EgadiAvailabilityUnavailable",
};

const CONTACT_EVENTS = new Set(["contact_submit", "whatsapp_click", "phone_click", "email_click"]);

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function intValue(value: unknown): number | undefined {
  const parsed = numberValue(value);
  if (parsed === undefined) return undefined;
  return Math.max(1, Math.round(parsed));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function addString(params: Record<string, unknown>, key: string, value: unknown) {
  const parsed = stringValue(value);
  if (parsed) params[key] = parsed;
}

function addNumber(params: Record<string, unknown>, key: string, value: unknown) {
  const parsed = numberValue(value);
  if (parsed !== undefined) params[key] = roundCurrency(parsed);
}

function baseContext(event: DataLayerEventLike): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  addString(params, "locale", event.locale);
  addString(params, "page_type", event.page_type);
  addString(params, "service_id", event.service_id);
  addString(params, "service_name", event.service_name);
  addString(params, "service_type", event.service_type);
  addString(params, "payment_schedule", event.payment_schedule);
  addString(params, "contact_method", event.contact_method);
  addString(params, "cta_location", event.cta_location);
  return params;
}

function commerceParams(
  event: DataLayerEventLike,
  options: { preferTotalValue?: boolean } = {},
): Record<string, unknown> {
  const params = baseContext(event);
  const currency = stringValue(event.currency) ?? "EUR";
  const serviceId = stringValue(event.service_id);
  const serviceName = stringValue(event.service_name);
  const serviceType = stringValue(event.service_type);
  const quantity = intValue(event.guest_count) ?? 1;
  const value = numberValue(event.value);
  const totalValue = numberValue(event.total_value);
  const eventValue = options.preferTotalValue ? totalValue ?? value : value ?? totalValue;

  params.currency = currency;
  if (eventValue !== undefined) params.value = roundCurrency(eventValue);
  if (options.preferTotalValue && value !== undefined && totalValue !== undefined && value !== totalValue) {
    params.paid_value = roundCurrency(value);
  }

  if (serviceId) {
    params.content_ids = [serviceId];
    params.content_type = "product";
  }
  if (serviceName) params.content_name = serviceName;
  if (serviceType) params.content_category = serviceType;
  params.num_items = quantity;

  if (serviceId) {
    const content: Record<string, unknown> = { id: serviceId, quantity };
    if (eventValue !== undefined) content.item_price = roundCurrency(eventValue / quantity);
    params.contents = [content];
  }

  return params;
}

function leadParams(event: DataLayerEventLike): Record<string, unknown> {
  const params = baseContext(event);
  addString(params, "lead_source", event.method ?? event.contact_method ?? event.cta_location);
  return params;
}

function customParams(event: DataLayerEventLike): Record<string, unknown> {
  const params = baseContext(event);
  addNumber(params, "value", event.value);
  addNumber(params, "total_value", event.total_value);
  addString(params, "currency", event.currency);
  addString(params, "booking_step", event.booking_step ?? event.step);
  addString(params, "error_code", event.error_code);
  const guestCount = intValue(event.guest_count);
  if (guestCount !== undefined) params.guest_count = guestCount;
  return params;
}

export function mapDataLayerEventToMetaPixel(event: DataLayerEventLike): MetaPixelMappedEvent | null {
  const eventName = stringValue(event.event);
  if (!eventName || eventName.startsWith("egadi_consent_") || eventName === "page_view") return null;

  if (eventName === "view_item") {
    return { kind: "standard", name: "ViewContent", params: commerceParams(event) };
  }
  if (eventName === "begin_checkout") {
    return { kind: "standard", name: "InitiateCheckout", params: commerceParams(event) };
  }
  if (eventName === "add_payment_info") {
    return { kind: "standard", name: "AddPaymentInfo", params: commerceParams(event) };
  }
  if (eventName === "purchase") {
    return { kind: "standard", name: "Purchase", params: commerceParams(event, { preferTotalValue: true }) };
  }
  if (eventName === "generate_lead") {
    return { kind: "standard", name: "Lead", params: leadParams(event) };
  }
  if (CONTACT_EVENTS.has(eventName)) {
    return { kind: "standard", name: "Contact", params: leadParams(event) };
  }

  const customName = CUSTOM_EVENT_NAMES[eventName];
  if (!customName) return null;
  return { kind: "custom", name: customName, params: customParams(event) };
}

export function buildMetaPixelInitScript(pixelId: string): string {
  const encodedPixelId = JSON.stringify(pixelId);
  return `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${encodedPixelId});
`.trim();
}
