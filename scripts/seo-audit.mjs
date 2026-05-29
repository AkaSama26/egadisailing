#!/usr/bin/env node
import { writeFile } from "node:fs/promises";

const DEFAULT_BASE_URL = process.env.SEO_AUDIT_BASE_URL ?? process.argv[2] ?? "https://egadisailing.com";
const BASE_URL = DEFAULT_BASE_URL.replace(/\/+$/, "");
const SITEMAP_URL = process.env.SEO_AUDIT_SITEMAP_URL ?? `${BASE_URL}/sitemap.xml`;
const USER_AGENT = "EgadisailingSEOAudit/1.0 (+https://egadisailing.com)";
const MIN_DESCRIPTION_LENGTH = Number(process.env.SEO_AUDIT_MIN_DESCRIPTION_LENGTH ?? 90);
const MAX_DESCRIPTION_LENGTH = Number(process.env.SEO_AUDIT_MAX_DESCRIPTION_LENGTH ?? 180);
const REQUIRED_HREFLANGS = ["it", "en", "es", "fr", "de", "x-default"];
const REPORT_PATH = process.env.SEO_AUDIT_REPORT_PATH ?? "";

function textBetween(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ")) : "";
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[2] ?? match?.[3] ?? match?.[4] ?? "");
}

function tags(html, tagName) {
  return Array.from(html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, "gi")), (match) => match[0]);
}

function parseSitemap(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => decodeHtml(match[1])).filter(Boolean);
}

async function fetchText(url) {
  const started = performance.now();
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
    redirect: "manual",
  });
  const text = await response.text();
  return {
    url,
    status: response.status,
    location: response.headers.get("location") ?? "",
    ms: Math.round(performance.now() - started),
    text,
  };
}

function inspectPage(page) {
  const html = page.text;
  const title = textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = tags(html, "meta")
    .map((tag) => ({ name: attr(tag, "name").toLowerCase(), content: attr(tag, "content") }))
    .find((meta) => meta.name === "description")?.content.trim() ?? "";
  const links = tags(html, "link").map((tag) => ({
    rel: attr(tag, "rel").toLowerCase(),
    href: attr(tag, "href"),
    hreflang: attr(tag, "hreflang").toLowerCase(),
  }));
  const canonical = links.find((link) => link.rel.split(/\s+/).includes("canonical"))?.href ?? "";
  const alternates = links.filter((link) => link.rel.split(/\s+/).includes("alternate") && link.hreflang);
  const h1s = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi), (match) =>
    decodeHtml(match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()),
  ).filter(Boolean);
  const images = tags(html, "img");
  const missingAltImages = images.filter((tag) => !/\salt\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i.test(tag)).length;
  const jsonLdCount = Array.from(html.matchAll(/<script\b[^>]*type=("application\/ld\+json"|'application\/ld\+json')[^>]*>/gi)).length;

  const issues = [];
  if (page.status !== 200) issues.push(`status:${page.status}`);
  if (!title) issues.push("missing-title");
  if (!metaDescription) issues.push("missing-description");
  if (metaDescription && metaDescription.length < MIN_DESCRIPTION_LENGTH) issues.push(`short-description:${metaDescription.length}`);
  if (metaDescription && metaDescription.length > MAX_DESCRIPTION_LENGTH) issues.push(`long-description:${metaDescription.length}`);
  if (!canonical) issues.push("missing-canonical");
  for (const hreflang of REQUIRED_HREFLANGS) {
    if (!alternates.some((alternate) => alternate.hreflang === hreflang)) issues.push(`missing-hreflang:${hreflang}`);
  }
  if (h1s.length !== 1) issues.push(`h1-count:${h1s.length}`);
  if (missingAltImages > 0) issues.push(`missing-alt-images:${missingAltImages}`);
  if (jsonLdCount === 0) issues.push("missing-jsonld");

  return {
    url: page.url,
    status: page.status,
    ms: page.ms,
    titleLength: title.length,
    descriptionLength: metaDescription.length,
    canonical,
    hreflangCount: alternates.length,
    h1Count: h1s.length,
    imageCount: images.length,
    missingAltImages,
    jsonLdCount,
    issues,
  };
}

const sitemap = await fetchText(SITEMAP_URL);
if (sitemap.status !== 200) {
  console.error(`[seo:audit] sitemap failed: ${SITEMAP_URL} status ${sitemap.status}`);
  process.exit(1);
}

const urls = parseSitemap(sitemap.text).filter((url) => url.startsWith(BASE_URL));
if (urls.length === 0) {
  console.error(`[seo:audit] no URLs found in sitemap ${SITEMAP_URL}`);
  process.exit(1);
}

const results = [];
for (const url of urls) {
  const page = await fetchText(url);
  results.push(inspectPage(page));
}

const failing = results.filter((result) => result.issues.length > 0);
const missingAltTotal = results.reduce((sum, result) => sum + result.missingAltImages, 0);
const jsonLdPages = results.filter((result) => result.jsonLdCount > 0).length;
const summary = {
  baseUrl: BASE_URL,
  sitemapUrl: SITEMAP_URL,
  checkedAt: new Date().toISOString(),
  pageCount: results.length,
  failingCount: failing.length,
  missingAltTotal,
  jsonLdPages,
  avgMs: Math.round(results.reduce((sum, result) => sum + result.ms, 0) / results.length),
  failures: failing.map((result) => ({ url: result.url, issues: result.issues })),
};

if (REPORT_PATH) {
  await writeFile(REPORT_PATH, `${JSON.stringify({ summary, results }, null, 2)}\n`, "utf8");
}

console.log(`[seo:audit] checked ${results.length} URLs from ${SITEMAP_URL}`);
console.log(`[seo:audit] JSON-LD pages: ${jsonLdPages}/${results.length}; missing alt images: ${missingAltTotal}; avg fetch: ${summary.avgMs}ms`);

if (failing.length > 0) {
  console.error(`[seo:audit] ${failing.length} pages failed SEO invariants`);
  for (const failure of failing.slice(0, 25)) {
    console.error(`- ${failure.url}: ${failure.issues.join(", ")}`);
  }
  if (failing.length > 25) console.error(`...and ${failing.length - 25} more`);
  process.exit(1);
}

console.log("[seo:audit] core SEO invariants passed");
