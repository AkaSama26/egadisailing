import { env } from "@/lib/env";
import { ipInCidr, parseTrustedProxies, type CidrRange } from "./trusted-proxy";

// R28-CRIT-4: parse once al boot. Lista CIDR trusted → se X-Forwarded-For
// e' presente, walk right-to-left skippando hop trusted → primo non-trusted
// = client vero. Previene spoofing per attaccante che bypassa Caddy/Cloudflare.
// Default (lista vuota env): loopback + RFC1918 + ULA (copre Docker bridge).
let trustedCache: CidrRange[] | null = null;
function getTrusted(): CidrRange[] {
  if (trustedCache) return trustedCache;
  trustedCache = parseTrustedProxies(env.TRUSTED_PROXY_IPS);
  return trustedCache;
}

// Export per test: invalidate cache dopo cambio env in test runner.
export function resetTrustedProxiesCacheForTests(): void {
  trustedCache = null;
}

function isValidIp(s: string): boolean {
  // IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(s)) {
    return s.split(".").every((p) => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  // IPv6: permissive check (hex + colon, optional IPv4-mapped suffix).
  if (/^[0-9a-fA-F:.]+$/.test(s) && s.includes(":")) return true;
  return false;
}

/**
 * R28-CRIT-4: extract client IP con trust model esplicito.
 *
 * Priorita':
 *  1. `X-Real-IP` (single-value, settato da Caddy con `{remote_host}`)
 *  2. `CF-Connecting-IP` (single-value, settato da Cloudflare edge)
 *  3. `X-Forwarded-For`: walk right-to-left skippando hop trusted.
 *     Primo hop non-trusted = client reale. Se tutti trusted, primo hop
 *     (back-compat). Se TRUSTED_PROXY_IPS non configurato, usa default
 *     loopback+RFC1918+ULA (copre container-private networks standard).
 *
 * Prevenzione spoofing richiede firewall-level: l'origin app NON deve
 * accettare connessioni direct (solo via Caddy). Documentato in
 * docs/runbook/deployment.md.
 */
export function getClientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real && isValidIp(real)) return real;

  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf && isValidIp(cf)) return cf;

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const trusted = getTrusted();
    // Walk right-to-left: gli hop piu' "vicini al server" sono in fondo
    // (ultima riga aggiunta dal proxy piu' interno). Il primo hop non-
    // trusted = client. Se TRUSTED_PROXY_IPS vuoto, default list copre
    // Docker bridge + loopback → comportamento ragionevole in dev.
    for (let i = hops.length - 1; i >= 0; i--) {
      const hop = hops[i];
      if (!isValidIp(hop)) continue;
      const isTrusted = trusted.some((cidr) => ipInCidr(hop, cidr));
      if (!isTrusted) return hop;
    }
    return hops[0] ?? "unknown";
  }
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
