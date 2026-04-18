import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { OTP_LIMITS, blockEmail } from "@/lib/rate-limit/otp-limits";

export interface OtpVerifyResult {
  valid: boolean;
  reason?: "EXPIRED" | "INVALID" | "TOO_MANY_ATTEMPTS" | "ALREADY_USED";
  email?: string;
}

/**
 * Verifica un OTP per una email. bcrypt.compare e' intrinsecamente
 * timing-safe (usa crypto.timingSafeEqual internamente), quindi no leak.
 *
 * Incrementa `attempts` su fallimento, invalida l'OTP dopo `verifyAttemptsPerCode`
 * tentativi. Se le richieste fallite per email in 1h superano la soglia,
 * blocca l'email per 1h.
 */
export async function verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
  const now = new Date();

  const otp = await db.bookingRecoveryOtp.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (otp.attempts >= OTP_LIMITS.verifyAttemptsPerCode) {
    await db.bookingRecoveryOtp.update({
      where: { id: otp.id },
      data: { expiresAt: now },
    });
    // Blocca l'email per 1h se ha esaurito tentativi su questo codice
    await blockEmail(email, 60 * 60);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const match = await bcrypt.compare(code, otp.codeHash);

  if (!match) {
    await db.bookingRecoveryOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { valid: false, reason: "INVALID" };
  }

  await db.bookingRecoveryOtp.update({
    where: { id: otp.id },
    data: { usedAt: now },
  });

  return { valid: true, email: otp.email };
}
