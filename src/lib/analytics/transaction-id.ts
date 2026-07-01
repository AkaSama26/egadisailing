import crypto from "node:crypto";

export function buildAnalyticsTransactionId(bookingId: string): string {
  return crypto.createHash("sha256").update(bookingId).digest("hex").slice(0, 16);
}
