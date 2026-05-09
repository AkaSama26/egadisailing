import { env } from "@/lib/env";
import { childLogger, logError } from "@/lib/logger";

const CLOUDFLARE_GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

const log = childLogger("cloudflare/analytics");

export type CloudflareTrafficStatus = "configured" | "unavailable" | "error";

export interface CloudflareTrafficMetric {
  requests: number;
  visits: number;
  bytes: number;
}

export interface CloudflareTrafficRankItem extends CloudflareTrafficMetric {
  label: string;
}

export interface CloudflareTrafficConfigured {
  status: "configured";
  hostname: string;
  generatedAt: string;
  cacheTtlSeconds: number;
  last24h: CloudflareTrafficMetric & {
    errors4xx: number;
    errors5xx: number;
  };
  topPaths: CloudflareTrafficRankItem[];
  topCountries: CloudflareTrafficRankItem[];
}

export interface CloudflareTrafficUnavailable {
  status: "unavailable";
  generatedAt: string;
  message: string;
}

export interface CloudflareTrafficError {
  status: "error";
  hostname?: string;
  generatedAt: string;
  message: string;
}

export type CloudflareTrafficSummary =
  | CloudflareTrafficConfigured
  | CloudflareTrafficUnavailable
  | CloudflareTrafficError;

interface CloudflareAnalyticsConfig {
  apiToken?: string;
  zoneId?: string;
  hostname?: string;
  appUrl?: string;
}

interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        totals24h?: CloudflareGroup[];
        errors4xx?: CloudflareGroup[];
        errors5xx?: CloudflareGroup[];
        topPaths?: CloudflareGroup[];
        topCountries?: CloudflareGroup[];
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
}

interface CloudflareGroup {
  count?: number | string | null;
  sum?: {
    visits?: number | string | null;
    edgeResponseBytes?: number | string | null;
  } | null;
  dimensions?: {
    clientRequestPath?: string | null;
    clientCountryName?: string | null;
  } | null;
}

interface CacheEntry {
  key: string;
  expiresAt: number;
  value: CloudflareTrafficSummary;
}

interface GetCloudflareTrafficOptions {
  now?: Date;
  fetchImpl?: typeof fetch;
  envOverride?: CloudflareAnalyticsConfig;
  bypassCache?: boolean;
}

const globalForCloudflare = globalThis as unknown as {
  __egadiCloudflareAnalyticsCache__?: CacheEntry;
};

const TRAFFIC_QUERY = `
  query EgadiCloudflareTraffic(
    $zoneTag: string
    $summary24h: filter
    $errors4xx: filter
    $errors5xx: filter
    $top7d: filter
  ) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        totals24h: httpRequestsAdaptiveGroups(limit: 1, filter: $summary24h) {
          count
          sum {
            visits
            edgeResponseBytes
          }
        }
        errors4xx: httpRequestsAdaptiveGroups(limit: 1, filter: $errors4xx) {
          count
        }
        errors5xx: httpRequestsAdaptiveGroups(limit: 1, filter: $errors5xx) {
          count
        }
        topPaths: httpRequestsAdaptiveGroups(limit: 5, filter: $top7d, orderBy: [count_DESC]) {
          count
          sum {
            visits
            edgeResponseBytes
          }
          dimensions {
            clientRequestPath
          }
        }
        topCountries: httpRequestsAdaptiveGroups(limit: 5, filter: $top7d, orderBy: [count_DESC]) {
          count
          sum {
            visits
            edgeResponseBytes
          }
          dimensions {
            clientCountryName
          }
        }
      }
    }
  }
`;

export function resolveCloudflareAnalyticsConfig(
  source: CloudflareAnalyticsConfig = {
    apiToken: env.CLOUDFLARE_API_TOKEN,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    hostname: env.CLOUDFLARE_ANALYTICS_HOSTNAME,
    appUrl: env.APP_URL,
  },
) {
  const apiToken = source.apiToken?.trim();
  const zoneId = source.zoneId?.trim();
  const hostname = (source.hostname?.trim() || hostnameFromUrl(source.appUrl)).toLowerCase();

  if (!apiToken || !zoneId) {
    return {
      configured: false as const,
      message:
        "Cloudflare Analytics non configurato: aggiungi CLOUDFLARE_API_TOKEN e CLOUDFLARE_ZONE_ID.",
    };
  }

  if (!hostname) {
    return {
      configured: false as const,
      message:
        "Cloudflare Analytics non configurato: imposta CLOUDFLARE_ANALYTICS_HOSTNAME o APP_URL valido.",
    };
  }

  return {
    configured: true as const,
    apiToken,
    zoneId,
    hostname,
  };
}

export async function getCloudflareTrafficSummary(
  options: GetCloudflareTrafficOptions = {},
): Promise<CloudflareTrafficSummary> {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const config = resolveCloudflareAnalyticsConfig(options.envOverride);

  if (!config.configured) {
    return {
      status: "unavailable",
      generatedAt,
      message: config.message,
    };
  }

  const cacheKey = `${config.zoneId}:${config.hostname}`;
  const cached = globalForCloudflare.__egadiCloudflareAnalyticsCache__;
  if (!options.bypassCache && cached?.key === cacheKey && cached.expiresAt > now.getTime()) {
    return cached.value;
  }

  try {
    const summary = await fetchCloudflareTraffic(config, now, options.fetchImpl ?? fetch);
    globalForCloudflare.__egadiCloudflareAnalyticsCache__ = {
      key: cacheKey,
      expiresAt: now.getTime() + CACHE_TTL_MS,
      value: summary,
    };
    return summary;
  } catch (err) {
    logError(err, "Cloudflare analytics fetch failed", { hostname: config.hostname });
    return {
      status: "error",
      hostname: config.hostname,
      generatedAt,
      message: "Dati Cloudflare non disponibili al momento. La dashboard resta operativa.",
    };
  }
}

export function normalizeCloudflareTrafficResponse(
  response: CloudflareGraphQLResponse,
  hostname: string,
  generatedAt: string,
): CloudflareTrafficConfigured {
  const zone = response.data?.viewer?.zones?.[0];
  const total = metricFromGroup(zone?.totals24h?.[0]);

  return {
    status: "configured",
    hostname,
    generatedAt,
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
    last24h: {
      ...total,
      errors4xx: toNumber(zone?.errors4xx?.[0]?.count),
      errors5xx: toNumber(zone?.errors5xx?.[0]?.count),
    },
    topPaths: (zone?.topPaths ?? []).map((group) => ({
      label: group.dimensions?.clientRequestPath || "/",
      ...metricFromGroup(group),
    })),
    topCountries: (zone?.topCountries ?? []).map((group) => ({
      label: group.dimensions?.clientCountryName || "Paese non rilevato",
      ...metricFromGroup(group),
    })),
  };
}

export function formatCloudflareBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: value >= 10 || exponent === 0 ? 0 : 1,
  }).format(value)} ${units[exponent]}`;
}

async function fetchCloudflareTraffic(
  config: Extract<ReturnType<typeof resolveCloudflareAnalyticsConfig>, { configured: true }>,
  now: Date,
  fetchImpl: typeof fetch,
): Promise<CloudflareTrafficSummary> {
  const end = now.toISOString();
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const base24h = baseFilter(start24h, end, config.hostname);
  const base7d = baseFilter(start7d, end, config.hostname);

  const res = await fetchImpl(CLOUDFLARE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: TRAFFIC_QUERY,
      variables: {
        zoneTag: config.zoneId,
        summary24h: base24h,
        errors4xx: withStatusFilter(base24h, 400, 500),
        errors5xx: withStatusFilter(base24h, 500, 600),
        top7d: base7d,
      },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare GraphQL HTTP ${res.status}`);
  }

  const json = (await res.json()) as CloudflareGraphQLResponse;
  if (json.errors?.length) {
    log.warn({ errorCount: json.errors.length }, "Cloudflare GraphQL returned errors");
    throw new Error(json.errors.map((error) => error.message ?? "GraphQL error").join("; "));
  }

  return normalizeCloudflareTrafficResponse(json, config.hostname, now.toISOString());
}

function baseFilter(start: string, end: string, hostname: string) {
  return {
    AND: [
      { datetime_geq: start, datetime_leq: end },
      { requestSource: "eyeball" },
      { clientRequestHTTPHost: hostname },
    ],
  };
}

function withStatusFilter(
  filter: ReturnType<typeof baseFilter>,
  minInclusive: number,
  maxExclusive: number,
) {
  return {
    AND: [
      ...filter.AND,
      { edgeResponseStatus_geq: minInclusive, edgeResponseStatus_lt: maxExclusive },
    ],
  };
}

function metricFromGroup(group?: CloudflareGroup): CloudflareTrafficMetric {
  return {
    requests: toNumber(group?.count),
    visits: toNumber(group?.sum?.visits),
    bytes: toNumber(group?.sum?.edgeResponseBytes),
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hostnameFromUrl(value?: string): string {
  if (!value) return "";
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}
