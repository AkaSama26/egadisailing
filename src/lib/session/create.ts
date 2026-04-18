import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const BOOKING_SESSION_COOKIE = "egadi-booking-session";

/**
 * Hash deterministico SHA-256 del token — NON bcrypt.
 * Motivo: bcrypt e' lento per ogni request (200ms+). Per session token random
 * a 256-bit, SHA-256 e' sufficientemente sicuro (no brute force possibile).
 * Il confronto e' timing-safe via crypto.timingSafeEqual.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createBookingSession(
  email: string,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

  await db.bookingRecoverySession.create({
    data: { email, tokenHash, ipAddress: ip, userAgent, expiresAt },
  });

  const store = await cookies();
  store.set({
    name: BOOKING_SESSION_COOKIE,
    value: rawToken,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeBookingSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(BOOKING_SESSION_COOKIE)?.value;
  if (!token) return;

  const tokenHash = hashToken(token);
  await db.bookingRecoverySession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  store.delete(BOOKING_SESSION_COOKIE);
}
