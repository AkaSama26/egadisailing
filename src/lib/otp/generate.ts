import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "@/lib/db";

const OTP_LIFETIME_MS = 15 * 60 * 1000;
const OTP_BCRYPT_COST = 8;

/**
 * Genera un codice OTP a 6 cifre con randomInt crypto-sicuro.
 * Leading zeros preservati (es. "007123").
 */
export function generateCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

/**
 * Crea un OTP record atomicamente: invalida gli OTP pending della stessa
 * email e crea il nuovo, tutto in una singola transazione interattiva.
 * Restituisce l'id creato dalla transaction (no second findFirst race).
 */
export async function createOtp(
  email: string,
  ipAddress: string,
): Promise<{ code: string; otpId: string }> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, OTP_BCRYPT_COST);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_LIFETIME_MS);

  const created = await db.$transaction(async (tx) => {
    await tx.bookingRecoveryOtp.updateMany({
      where: { email, usedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });
    return tx.bookingRecoveryOtp.create({
      data: { email, codeHash, expiresAt, ipAddress },
    });
  });

  return { code, otpId: created.id };
}
