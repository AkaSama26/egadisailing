import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { OTP_LIMITS, blockEmail } from "@/lib/rate-limit/otp-limits";

export interface OtpVerifyResult {
  valid: boolean;
  reason?: "EXPIRED" | "INVALID" | "TOO_MANY_ATTEMPTS" | "ALREADY_USED";
  email?: string;
}

/**
 * Verifica un OTP in modo atomico (no TOCTOU).
 *
 * Race mitigation:
 * - Increment attempts via `updateMany({ where: { attempts < max, ... } })`:
 *   solo il primo update con count=1 procede.
 * - Claim-then-do su usedAt: il winner marca usedAt, gli altri vedono
 *   ALREADY_USED.
 *
 * bcrypt.compare e' intrinsecamente timing-safe.
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
    await blockEmail(email, 60 * 60);
    return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
  }

  const match = await bcrypt.compare(code, otp.codeHash);

  if (!match) {
    // Atomic increment con guard: solo se attempts e' ancora < max
    const result = await db.bookingRecoveryOtp.updateMany({
      where: {
        id: otp.id,
        usedAt: null,
        attempts: { lt: OTP_LIMITS.verifyAttemptsPerCode },
      },
      data: { attempts: { increment: 1 } },
    });
    if (result.count === 0) {
      return { valid: false, reason: "TOO_MANY_ATTEMPTS" };
    }
    return { valid: false, reason: "INVALID" };
  }

  // Claim atomico: solo il primo a fare updateMany vince.
  const claim = await db.bookingRecoveryOtp.updateMany({
    where: { id: otp.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claim.count === 0) {
    return { valid: false, reason: "ALREADY_USED" };
  }

  return { valid: true, email: otp.email };
}
