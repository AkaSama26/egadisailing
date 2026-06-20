const ALLOWED_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "fbclid",
  "service",
  "locale",
]);

const BOOKING_CONFIRMATION_SEGMENTS = new Set([
  "success",
  "conferma",
  "confirmation",
  "confirmacion",
  "bestaetigung",
]);
const BOOKING_ROUTE_SEGMENTS = new Set(["prenota", "book", "booking", "buchen", "reservar", "reserver"]);
const SENSITIVE_QUERY_PATTERN = /(email|mail|phone|tel|name|nome|cognome|code|codice|ticket|confirmation|session|secret|client_secret|payment_intent)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const LONG_DIGIT_PATTERN = /\+?\d[\d\s().-]{6,}\d/;

export type SanitizedPageView = {
  page_location: string;
  page_path: string;
  page_title?: string;
  page_referrer?: string;
  locale?: string;
  page_type: string;
  service_slug?: string;
};

function safeUrl(input: string, base = "https://www.egadisailing.com"): URL | null {
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

function sanitizeSegment(segment: string, previousSegment?: string): string {
  if (!segment) return segment;
  const lower = segment.toLowerCase();
  if (previousSegment && BOOKING_CONFIRMATION_SEGMENTS.has(previousSegment.toLowerCase())) return "[code]";
  if (lower === "ticket" || lower === "biglietto") return segment;
  if (previousSegment && ["ticket", "biglietto"].includes(previousSegment.toLowerCase())) return "[code]";
  if (EMAIL_PATTERN.test(segment) || LONG_DIGIT_PATTERN.test(segment)) return "[redacted]";
  return segment;
}

export function sanitizePathname(pathname: string): string {
  const url = safeUrl(pathname);
  const rawPath = url ? url.pathname : pathname;
  const segments = rawPath.split("/").map(decodeURIComponent);
  const sanitized = segments.map((segment, index) => sanitizeSegment(segment, segments[index - 1]));
  return sanitized.join("/") || "/";
}

export function sanitizeSearch(search: string | URLSearchParams): string {
  const input = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const output = new URLSearchParams();
  for (const [key, value] of input.entries()) {
    const normalizedKey = key.toLowerCase();
    if (!ALLOWED_QUERY_KEYS.has(normalizedKey)) continue;
    if (SENSITIVE_QUERY_PATTERN.test(key)) continue;
    if (EMAIL_PATTERN.test(value) || LONG_DIGIT_PATTERN.test(value)) continue;
    output.append(key, value.slice(0, 160));
  }
  const value = output.toString();
  return value ? `?${value}` : "";
}

export function sanitizePageUrl(input: string, base?: string): string {
  const url = safeUrl(input, base);
  if (!url) return sanitizePathname(input);
  return `${url.origin}${sanitizePathname(url.pathname)}${sanitizeSearch(url.search)}`;
}

export function getLocaleFromPath(pathname: string): string | undefined {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : undefined;
}

export function getPageType(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  const withoutLocale = segments[0] && /^[a-z]{2}$/.test(segments[0]) ? segments.slice(1) : segments;
  const [first, second] = withoutLocale;

  if (!first) return "home";
  if (BOOKING_ROUTE_SEGMENTS.has(first)) return "booking";
  if (["esperienze", "experiences", "erlebnisse", "experiencias"].includes(first)) {
    return second ? "experience_detail" : "experience_list";
  }
  if (["barche", "boats", "boote", "bateaux", "barcos"].includes(first)) return second ? "boat_detail" : "boat_list";
  if (["contatti", "contacts", "kontakt", "contacto"].includes(first)) return "contact";
  if (["isole", "islands", "inseln", "iles", "islas"].includes(first)) return second ? "island_detail" : "island_list";
  if (["privacy", "cookie-policy", "politica-de-cookies", "politique-de-cookies", "cookie-richtlinie"].includes(first)) return "legal";
  if (first === "admin") return "admin";
  return first;
}

export function getServiceSlugFromPath(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const withoutLocale = segments[0] && /^[a-z]{2}$/i.test(segments[0]) ? segments.slice(1) : segments;
  const [first, second] = withoutLocale;
  if (["esperienze", "experiences", "erlebnisse", "experiencias"].includes((first ?? "").toLowerCase())) {
    return second;
  }
  return undefined;
}

export function buildPageViewPayload(
  href: string,
  options: { title?: string; referrer?: string; base?: string } = {},
): SanitizedPageView {
  const url = safeUrl(href, options.base);
  const pathname = sanitizePathname(url ? url.pathname : href);
  const payload: SanitizedPageView = {
    page_location: sanitizePageUrl(href, options.base),
    page_path: `${pathname}${url ? sanitizeSearch(url.search) : ""}`,
    page_type: getPageType(pathname),
  };
  const title = options.title?.trim();
  if (title) payload.page_title = title.slice(0, 160);
  if (options.referrer) payload.page_referrer = sanitizePageUrl(options.referrer, options.base);
  const locale = getLocaleFromPath(pathname);
  if (locale) payload.locale = locale;
  const serviceSlug = getServiceSlugFromPath(pathname);
  if (serviceSlug) payload.service_slug = serviceSlug;
  return payload;
}
