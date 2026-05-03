import { normalizeConfirmationCode } from "./helpers";

const RAW_CODE_RE = /^[A-Z0-9-]{4,32}$/;

export function extractConfirmationCodeFromQrPayload(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  const urlCode = extractCodeFromUrl(raw);
  if (urlCode) return urlCode;

  const pathMatch = raw.match(/(?:^|\/)ticket\/([^/?#\s]+)/i);
  if (pathMatch?.[1]) {
    return normalizeCandidate(pathMatch[1]);
  }

  return normalizeCandidate(raw);
}

function extractCodeFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const segments = url.pathname.split("/").filter(Boolean);
    const ticketIndex = segments.findIndex((segment) => segment.toLowerCase() === "ticket");
    if (ticketIndex === -1) return null;
    const code = segments[ticketIndex + 1];
    return code ? normalizeCandidate(code) : null;
  } catch {
    return null;
  }
}

function normalizeCandidate(candidate: string): string | null {
  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    decoded = candidate;
  }
  const code = normalizeConfirmationCode(decoded);
  return RAW_CODE_RE.test(code) ? code : null;
}
