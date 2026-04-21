/**
 * R28-CRIT-4: CIDR parser + IP-in-range matcher per trusted proxy list.
 *
 * Uso: `getClientIp` preferisce X-Real-IP (setting by trusted upstream).
 * Se manca, walk X-Forwarded-For right-to-left skippando hop trusted →
 * primo hop non-trusted = client vero. Previene spoofing quando attaccante
 * bypassa proxy (direct-to-origin) e inietta X-Forwarded-For falso.
 *
 * Funzioni pure, testabili senza env/network.
 */

export interface CidrRange {
  bytes: Uint8Array;
  prefix: number;
  v6: boolean;
}

/**
 * Default CIDR list se TRUSTED_PROXY_IPS non configurato:
 * - loopback IPv4 + IPv6
 * - RFC1918 private IPv4 (Docker bridge 172.17/16, K8s pod default 10.0/8)
 * - ULA IPv6 fd00::/8
 */
const DEFAULT_TRUSTED = [
  "127.0.0.1/32",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "fd00::/8",
];

export function parseTrustedProxies(raw?: string): CidrRange[] {
  const list =
    raw
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? DEFAULT_TRUSTED;
  const parsed: CidrRange[] = [];
  for (const cidr of list) {
    const range = parseCidr(cidr);
    if (range) parsed.push(range);
  }
  return parsed;
}

export function parseCidr(cidr: string): CidrRange | null {
  const slash = cidr.indexOf("/");
  if (slash === -1) return null;
  const ipStr = cidr.slice(0, slash);
  const prefix = Number(cidr.slice(slash + 1));
  if (!Number.isFinite(prefix) || prefix < 0) return null;

  const v6 = ipStr.includes(":");
  if (v6) {
    if (prefix > 128) return null;
    const bytes = ipv6ToBytes(ipStr);
    if (!bytes) return null;
    return { bytes, prefix, v6: true };
  }
  if (prefix > 32) return null;
  const bytes = ipv4ToBytes(ipStr);
  if (!bytes) return null;
  return { bytes, prefix, v6: false };
}

export function ipInCidr(ip: string, range: CidrRange): boolean {
  const v6 = ip.includes(":");
  if (v6 !== range.v6) {
    // IPv4-mapped IPv6 `::ffff:1.2.3.4` → normalizza IPv4.
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped && !range.v6) {
      return ipInCidr(mapped[1], range);
    }
    return false;
  }
  const bytes = v6 ? ipv6ToBytes(ip) : ipv4ToBytes(ip);
  if (!bytes) return false;
  return bytesMatchPrefix(bytes, range.bytes, range.prefix);
}

function bytesMatchPrefix(a: Uint8Array, b: Uint8Array, prefixBits: number): boolean {
  if (a.length !== b.length) return false;
  const fullBytes = Math.floor(prefixBits / 8);
  for (let i = 0; i < fullBytes; i++) {
    if (a[i] !== b[i]) return false;
  }
  const remBits = prefixBits - fullBytes * 8;
  if (remBits === 0) return true;
  if (fullBytes >= a.length) return true;
  const mask = 0xff << (8 - remBits);
  return (a[fullBytes] & mask) === (b[fullBytes] & mask);
}

function ipv4ToBytes(ip: string): Uint8Array | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const bytes = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const n = Number(parts[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    bytes[i] = n;
  }
  return bytes;
}

function ipv6ToBytes(ip: string): Uint8Array | null {
  const clean = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (!/^[0-9a-f:]+$/.test(clean)) return null;
  const doubleColonCount = (clean.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) return null;

  let hextets: string[];
  if (doubleColonCount === 1) {
    const [left, right] = clean.split("::");
    const l = left ? left.split(":") : [];
    const r = right ? right.split(":") : [];
    const missing = 8 - l.length - r.length;
    if (missing < 0) return null;
    hextets = [...l, ...Array(missing).fill("0"), ...r];
  } else {
    hextets = clean.split(":");
    if (hextets.length !== 8) return null;
  }
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const h = hextets[i];
    const n = parseInt(h || "0", 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    bytes[i * 2] = (n >> 8) & 0xff;
    bytes[i * 2 + 1] = n & 0xff;
  }
  return bytes;
}
