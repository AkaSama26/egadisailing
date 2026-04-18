/**
 * Extract client IP from request headers, honouring common proxy headers.
 * Order: cf-connecting-ip (Cloudflare) > x-real-ip > x-forwarded-for first hop.
 */
export function getClientIp(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export function getUserAgent(headers: Headers): string | null {
  return headers.get("user-agent");
}
