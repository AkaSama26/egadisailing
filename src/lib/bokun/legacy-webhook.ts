import crypto from "node:crypto";
import { ValidationError } from "@/lib/errors";
import { toBokunRestBookingId } from "./booking-id";

const LEGACY_AUTH_CONTEXT = "egadisailing:bokun-legacy-webhook:v1";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;
}

/**
 * Il webhook HTTP legacy non firma il body. Esponiamo quindi soltanto un
 * digest HMAC derivato dalla secret server-side, mai la secret stessa.
 */
export function deriveBokunLegacyWebhookAuth(secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(LEGACY_AUTH_CONTEXT)
    .digest("hex");
}

export function verifyBokunLegacyWebhookAuth(
  provided: string | null,
  secret: string,
): boolean {
  if (!provided || !/^[0-9a-f]{64}$/i.test(provided)) return false;

  const expected = Buffer.from(deriveBokunLegacyWebhookAuth(secret), "hex");
  const received = Buffer.from(provided, "hex");
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

/**
 * Accetta le shape osservabili del booking notification legacy, ma restituisce
 * soltanto un ID REST numerico. Il payload restante resta non attendibile e
 * non viene scritto: il worker rilegge sempre il booking dalle API Bokun.
 */
export function extractLegacyBokunBookingId(payload: unknown): string {
  const root = asRecord(payload);
  if (!root) throw new ValidationError("Invalid Bokun legacy webhook payload");

  const booking = asRecord(root.booking);
  const candidates = [
    root.bookingId,
    root.id,
    booking?.bookingId,
    booking?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") continue;
    try {
      return toBokunRestBookingId(candidate);
    } catch {
      // Prova la shape successiva senza fidarsi del primo campo malformato.
    }
  }

  throw new ValidationError("Missing Bokun bookingId");
}

export function inferLegacyBokunTopic(payload: unknown): string {
  const root = asRecord(payload);
  const booking = asRecord(root?.booking);
  const statusValue = root?.status ?? booking?.status;
  const status = typeof statusValue === "string"
    ? statusValue.trim().toUpperCase()
    : "";

  return status === "CANCELLED" || status === "CANCELED"
    ? "bookings/cancel"
    : "bookings/update";
}
