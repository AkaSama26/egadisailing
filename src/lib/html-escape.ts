/**
 * Escape HTML entities per prevenire injection nei template email/HTML.
 * Usare SEMPRE prima di interpolare dati utente in template string HTML.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Escape URL per prevenire javascript: e altre schema injection.
 * Returns "#" se la URL contiene uno schema pericoloso.
 */
const SAFE_URL_SCHEMES = /^(https?|mailto|tel):/i;
const RELATIVE_URL = /^[/?#]/;

export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (SAFE_URL_SCHEMES.test(trimmed) || RELATIVE_URL.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "#";
}
