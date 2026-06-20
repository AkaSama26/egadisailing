import crypto from "node:crypto";
import { env } from "@/lib/env";
import { childLogger, logError } from "@/lib/logger";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GA4_RUN_REPORT_ENDPOINT = "https://analyticsdata.googleapis.com/v1beta";
const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

const TRACKED_EVENTS = [
  "page_view",
  "book_now_click",
  "cta_click",
  "nav_click",
  "language_change",
  "view_item_list",
  "select_item",
  "view_item",
  "scroll_depth",
  "section_view",
  "booking_start",
  "booking_step_view",
  "booking_step_complete",
  "date_selected",
  "guest_count_selected",
  "payment_option_selected",
  "begin_checkout",
  "add_payment_info",
  "payment_submit",
  "payment_success",
  "booking_confirmed",
  "purchase",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "maps_click",
  "contact_submit",
  "generate_lead",
  "form_error",
  "booking_error",
  "payment_error",
  "availability_unavailable",
] as const;

const FUNNEL_EVENTS = [
  "booking_start",
  "booking_step_view",
  "booking_step_complete",
  "begin_checkout",
  "add_payment_info",
  "payment_submit",
  "payment_success",
  "purchase",
] as const;

const log = childLogger("analytics/ga4-server");

export type Ga4DashboardStatus = "configured" | "unavailable" | "error";

export interface Ga4MetricTotals {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  eventCount: number;
}

export interface Ga4EventMetric {
  name: string;
  eventCount: number;
  activeUsers: number;
}

export interface Ga4TopPageMetric {
  path: string;
  pageViews: number;
  activeUsers: number;
}

export interface Ga4TopCountryMetric {
  country: string;
  activeUsers: number;
  sessions: number;
}

export interface Ga4DashboardConfigured {
  status: "configured";
  property: string;
  generatedAt: string;
  cacheTtlSeconds: number;
  last7d: Ga4MetricTotals;
  last30d: Ga4MetricTotals;
  trackedEvents30d: Ga4EventMetric[];
  funnel30d: Ga4EventMetric[];
  topPages30d: Ga4TopPageMetric[];
  topCountries30d: Ga4TopCountryMetric[];
}

export interface Ga4DashboardUnavailable {
  status: "unavailable";
  generatedAt: string;
  message: string;
}

export interface Ga4DashboardError {
  status: "error";
  property?: string;
  generatedAt: string;
  message: string;
}

export type Ga4DashboardSummary =
  | Ga4DashboardConfigured
  | Ga4DashboardUnavailable
  | Ga4DashboardError;

interface Ga4AnalyticsConfig {
  propertyId?: string;
  clientEmail?: string;
  privateKey?: string;
}

interface Ga4ResolvedConfig {
  property: string;
  clientEmail: string;
  privateKey: string;
}

interface GetGa4DashboardOptions {
  now?: Date;
  fetchImpl?: typeof fetch;
  envOverride?: Ga4AnalyticsConfig;
  bypassCache?: boolean;
}

interface Ga4RunReportResponse {
  dimensionHeaders?: Array<{ name?: string }>;
  metricHeaders?: Array<{ name?: string }>;
  rows?: Ga4ReportRow[];
}

interface Ga4ReportRow {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface CacheEntry {
  key: string;
  expiresAt: number;
  value: Ga4DashboardSummary;
}

interface TokenCacheEntry {
  key: string;
  expiresAt: number;
  accessToken: string;
}

const globalForGa4 = globalThis as unknown as {
  __egadiGa4DashboardCache__?: CacheEntry;
  __egadiGa4TokenCache__?: TokenCacheEntry;
};

export function resolveGa4AnalyticsConfig(
  source: Ga4AnalyticsConfig = {
    propertyId: env.GA4_PROPERTY_ID,
    clientEmail: env.GOOGLE_ANALYTICS_CLIENT_EMAIL,
    privateKey: env.GOOGLE_ANALYTICS_PRIVATE_KEY,
  },
) {
  const property = normalizePropertyId(source.propertyId);
  const clientEmail = source.clientEmail?.trim();
  const privateKey = normalizePrivateKey(source.privateKey);

  if (!property || !clientEmail || !privateKey) {
    return {
      configured: false as const,
      message:
        "GA4 Data API non configurata: aggiungi GA4_PROPERTY_ID, GOOGLE_ANALYTICS_CLIENT_EMAIL e GOOGLE_ANALYTICS_PRIVATE_KEY.",
    };
  }

  return {
    configured: true as const,
    property,
    clientEmail,
    privateKey,
  };
}

export async function getGa4DashboardSummary(
  options: GetGa4DashboardOptions = {},
): Promise<Ga4DashboardSummary> {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const config = resolveGa4AnalyticsConfig(options.envOverride);

  if (!config.configured) {
    return {
      status: "unavailable",
      generatedAt,
      message: config.message,
    };
  }

  const cacheKey = `${config.property}:${config.clientEmail}`;
  const cached = globalForGa4.__egadiGa4DashboardCache__;
  if (!options.bypassCache && cached?.key === cacheKey && cached.expiresAt > now.getTime()) {
    return cached.value;
  }

  try {
    const summary = await fetchGa4Dashboard(config, now, options.fetchImpl ?? fetch);
    globalForGa4.__egadiGa4DashboardCache__ = {
      key: cacheKey,
      expiresAt: now.getTime() + CACHE_TTL_MS,
      value: summary,
    };
    return summary;
  } catch (err) {
    logError(err, "GA4 dashboard fetch failed", { property: config.property });
    return {
      status: "error",
      property: config.property,
      generatedAt,
      message: "Dati GA4 non disponibili al momento. La dashboard resta operativa.",
    };
  }
}

export function normalizeGa4DashboardReports(input: {
  property: string;
  generatedAt: string;
  last7d: Ga4RunReportResponse;
  last30d: Ga4RunReportResponse;
  trackedEvents30d: Ga4RunReportResponse;
  topPages30d: Ga4RunReportResponse;
  topCountries30d: Ga4RunReportResponse;
}): Ga4DashboardConfigured {
  const trackedEvents30d = eventRows(input.trackedEvents30d);
  const byEvent = new Map(trackedEvents30d.map((event) => [event.name, event]));

  return {
    status: "configured",
    property: input.property,
    generatedAt: input.generatedAt,
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
    last7d: totalsFromReport(input.last7d),
    last30d: totalsFromReport(input.last30d),
    trackedEvents30d,
    funnel30d: FUNNEL_EVENTS.map((name) => byEvent.get(name) ?? emptyEventMetric(name)),
    topPages30d: pageRows(input.topPages30d),
    topCountries30d: countryRows(input.topCountries30d),
  };
}

async function fetchGa4Dashboard(
  config: Ga4ResolvedConfig,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<Ga4DashboardConfigured> {
  const accessToken = await getGoogleAccessToken(config, now, fetchImpl);
  const last7 = dateRange(now, 7);
  const last30 = dateRange(now, 30);

  const [last7d, last30d, trackedEvents30d, topPages30d, topCountries30d] = await Promise.all([
    runGa4Report(config.property, accessToken, totalsRequest(last7), fetchImpl),
    runGa4Report(config.property, accessToken, totalsRequest(last30), fetchImpl),
    runGa4Report(config.property, accessToken, trackedEventsRequest(last30), fetchImpl),
    runGa4Report(config.property, accessToken, topPagesRequest(last30), fetchImpl),
    runGa4Report(config.property, accessToken, topCountriesRequest(last30), fetchImpl),
  ]);

  return normalizeGa4DashboardReports({
    property: config.property,
    generatedAt: now.toISOString(),
    last7d,
    last30d,
    trackedEvents30d,
    topPages30d,
    topCountries30d,
  });
}

async function getGoogleAccessToken(
  config: Ga4ResolvedConfig,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<string> {
  const tokenCacheKey = `${config.clientEmail}:${crypto
    .createHash("sha256")
    .update(config.privateKey)
    .digest("hex")
    .slice(0, 12)}`;
  const cached = globalForGa4.__egadiGa4TokenCache__;
  if (cached?.key === tokenCacheKey && cached.expiresAt > now.getTime() + 60_000) {
    return cached.accessToken;
  }

  const assertion = signServiceAccountJwt(config, now);
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Google OAuth token HTTP ${res.status}`);
  }

  const json = (await res.json()) as GoogleTokenResponse;
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || "Google OAuth token missing access_token");
  }

  const expiresInSeconds = Math.max(60, Number(json.expires_in ?? 3600));
  globalForGa4.__egadiGa4TokenCache__ = {
    key: tokenCacheKey,
    accessToken: json.access_token,
    expiresAt: now.getTime() + (expiresInSeconds - 60) * 1000,
  };

  return json.access_token;
}

function signServiceAccountJwt(config: Ga4ResolvedConfig, now: Date): string {
  const iat = Math.floor(now.getTime() / 1000);
  const payload = {
    iss: config.clientEmail,
    scope: ANALYTICS_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat,
    exp: iat + 3600,
  };
  const unsigned = `${base64UrlJson({ alg: "RS256", typ: "JWT" })}.${base64UrlJson(payload)}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
  return `${unsigned}.${base64Url(signature)}`;
}

async function runGa4Report(
  property: string,
  accessToken: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<Ga4RunReportResponse> {
  const res = await fetchImpl(`${GA4_RUN_REPORT_ENDPOINT}/${property}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.warn({ status: res.status, bodyPreview: text.slice(0, 240) }, "GA4 runReport failed");
    throw new Error(`GA4 runReport HTTP ${res.status}`);
  }

  return (await res.json()) as Ga4RunReportResponse;
}

function totalsRequest(range: ReturnType<typeof dateRange>) {
  return {
    dateRanges: [range],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
    keepEmptyRows: true,
  };
}

function trackedEventsRequest(range: ReturnType<typeof dateRange>) {
  return {
    dateRanges: [range],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "activeUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: { values: [...TRACKED_EVENTS] },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: "20",
  };
}

function topPagesRequest(range: ReturnType<typeof dateRange>) {
  return {
    dateRanges: [range],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: "8",
  };
}

function topCountriesRequest(range: ReturnType<typeof dateRange>) {
  return {
    dateRanges: [range],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "activeUsers" }, { name: "sessions" }],
    orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    limit: "8",
  };
}

function totalsFromReport(report: Ga4RunReportResponse): Ga4MetricTotals {
  const row = report.rows?.[0];
  return {
    activeUsers: metricValue(report, row, "activeUsers"),
    sessions: metricValue(report, row, "sessions"),
    pageViews: metricValue(report, row, "screenPageViews"),
    eventCount: metricValue(report, row, "eventCount"),
  };
}

function eventRows(report: Ga4RunReportResponse): Ga4EventMetric[] {
  return (report.rows ?? []).map((row) => ({
    name: dimensionValue(row, 0) || "unknown",
    eventCount: metricValue(report, row, "eventCount"),
    activeUsers: metricValue(report, row, "activeUsers"),
  }));
}

function pageRows(report: Ga4RunReportResponse): Ga4TopPageMetric[] {
  return (report.rows ?? [])
    .map((row) => ({
      path: dimensionValue(row, 0) || "/",
      pageViews: metricValue(report, row, "screenPageViews"),
      activeUsers: metricValue(report, row, "activeUsers"),
    }))
    .filter((row) => isPublicPagePath(row.path));
}

function countryRows(report: Ga4RunReportResponse): Ga4TopCountryMetric[] {
  return (report.rows ?? []).map((row) => ({
    country: dimensionValue(row, 0) || "Paese non rilevato",
    activeUsers: metricValue(report, row, "activeUsers"),
    sessions: metricValue(report, row, "sessions"),
  }));
}

function metricValue(report: Ga4RunReportResponse, row: Ga4ReportRow | undefined, metricName: string) {
  const index = report.metricHeaders?.findIndex((metric) => metric.name === metricName) ?? -1;
  if (index < 0) return 0;
  return toNumber(row?.metricValues?.[index]?.value);
}

function dimensionValue(row: Ga4ReportRow, index: number) {
  return row.dimensionValues?.[index]?.value?.trim() ?? "";
}

function emptyEventMetric(name: string): Ga4EventMetric {
  return { name, eventCount: 0, activeUsers: 0 };
}

function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateRange(now: Date, daysInclusive: number) {
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = new Date(endDate.getTime() - (daysInclusive - 1) * 24 * 60 * 60 * 1000);
  return {
    startDate: formatApiDate(startDate),
    endDate: formatApiDate(endDate),
  };
}

function formatApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizePropertyId(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return `properties/${trimmed}`;
  if (/^properties\/\d+$/.test(trimmed)) return trimmed;
  return null;
}

function normalizePrivateKey(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\\n/g, "\n");
}

function base64UrlJson(value: unknown): string {
  return base64Url(Buffer.from(JSON.stringify(value), "utf8"));
}

function base64Url(value: Buffer): string {
  return value.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function isPublicPagePath(path: string): boolean {
  if (!path || path === "/") return true;
  if (
    path.startsWith("/api/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/admin") ||
    path.startsWith("/images/") ||
    path.startsWith("/videos/") ||
    path.startsWith("/fonts/")
  ) {
    return false;
  }
  return !/\.[a-z0-9]{2,5}$/i.test(path);
}
