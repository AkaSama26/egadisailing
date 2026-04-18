import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";
import { BOOKING_SESSION_COOKIE, hashToken } from "./create";

export interface BookingSessionInfo {
  email: string;
  sessionId: string;
}

/**
 * Valida il cookie di sessione cliente.
 * Lookup diretto per tokenHash (indicizzato, O(1)) — no loop su tutte le sessioni.
 */
export async function getBookingSession(): Promise<BookingSessionInfo | null> {
  const store = await cookies();
  const token = store.get(BOOKING_SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.bookingRecoverySession.findUnique({
    where: { tokenHash },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  return { email: session.email, sessionId: session.id };
}

export async function requireBookingSession(): Promise<BookingSessionInfo> {
  const s = await getBookingSession();
  if (!s) throw new UnauthorizedError("Session required");
  return s;
}
