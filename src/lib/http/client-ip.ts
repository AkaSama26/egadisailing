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

/**
 * R24-A2-A1: normalizza IPv6 a /64 prefix per rate-limit bucketing.
 * Un attaccante con subnet IPv6 /64 ha 2^64 indirizzi — rotation tra essi
 * bypassava rate-limit per-IP. IPv4 e' passthrough.
 *
 * Esempio: `2001:db8:abcd:1234::5` → `2001:db8:abcd:1234::/64`.
 * Usare come `identifier` invece di IP raw in scope IP per OTP, payment-intent,
 * contact form, admin login.
 */
export function normalizeIpForRateLimit(ip: string): string {
  if (!ip || ip === "unknown") return ip;

  // R24-P2-ALTA: IPv4-mapped IPv6 `::ffff:1.2.3.4` (dual-stack proxy) → estrai
  // IPv4 e ritorna per-IP (come IPv4 nativo). Senza questo, il check
  // "has dot + no colon" fallisce (contiene both) → expandIpv6 regex rejecta
  // (dots) → fallback raw → stesso client da dual-stack vede bucket diverso
  // dal suo IPv4 pure.
  const mappedMatch = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) return mappedMatch[1];

  // IPv4 puro (contains dot, no colon): ritorna invariato.
  if (ip.includes(".") && !ip.includes(":")) return ip;

  // IPv6: estrai /64 prefix (primi 4 hextet = 64 bit).
  const expanded = expandIpv6(ip);
  if (!expanded) return ip; // fallback: malformed
  const hextets = expanded.split(":");
  if (hextets.length < 4) return ip;
  return `${hextets.slice(0, 4).join(":")}::/64`;
}

/**
 * Espande IPv6 abbreviato (`::` notation) in 8 hextet espliciti.
 * Ritorna null se malformato.
 */
function expandIpv6(ip: string): string | null {
  // Strip IPv4-mapped suffix se presente (`::ffff:1.2.3.4`) — trattiamo
  // come IPv4 e ritorniamo per-octet — ma caller fa gia' il check IPv4 above.
  const plain = ip.toLowerCase();
  if (!/^[0-9a-f:]+$/.test(plain)) return null;

  const doubleColonCount = (plain.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) return null;

  if (doubleColonCount === 1) {
    const [left, right] = plain.split("::");
    const leftParts = left ? left.split(":") : [];
    const rightParts = right ? right.split(":") : [];
    const missing = 8 - leftParts.length - rightParts.length;
    if (missing < 0) return null;
    const filled = [...leftParts, ...Array(missing).fill("0"), ...rightParts];
    return filled.join(":");
  }

  const parts = plain.split(":");
  if (parts.length !== 8) return null;
  return parts.join(":");
}
