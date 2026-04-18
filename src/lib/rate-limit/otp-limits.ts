import { enforceRateLimit, blockIdentifier } from "./service";

export const OTP_LIMITS = {
  requestPerEmailHour: 3,
  requestPerEmailDay: 5,
  requestPerIpHour: 10,
  requestPerIpDay: 30,
  requestPerEmailIpHour: 2,
  requestBurstSeconds: 30,
  verifyAttemptsPerCode: 3,
  verifyPerEmailHour: 10,
  verifyPerIpHour: 20,
} as const;

export async function enforceOtpRequestLimit(email: string, ip: string): Promise<void> {
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_REQUEST_EMAIL_HOUR",
    limit: OTP_LIMITS.requestPerEmailHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_REQUEST_EMAIL_DAY",
    limit: OTP_LIMITS.requestPerEmailDay,
    windowSeconds: 24 * 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_REQUEST_IP_HOUR",
    limit: OTP_LIMITS.requestPerIpHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_REQUEST_IP_DAY",
    limit: OTP_LIMITS.requestPerIpDay,
    windowSeconds: 24 * 60 * 60,
  });
  await enforceRateLimit({
    identifier: `${email}|${ip}`,
    scope: "OTP_REQUEST_EMAILIP_HOUR",
    limit: OTP_LIMITS.requestPerEmailIpHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: `${email}|${ip}`,
    scope: "OTP_REQUEST_BURST",
    limit: 1,
    windowSeconds: OTP_LIMITS.requestBurstSeconds,
  });
}

export async function enforceOtpVerifyLimit(email: string, ip: string): Promise<void> {
  await enforceRateLimit({
    identifier: email,
    scope: "OTP_VERIFY_EMAIL_HOUR",
    limit: OTP_LIMITS.verifyPerEmailHour,
    windowSeconds: 60 * 60,
  });
  await enforceRateLimit({
    identifier: ip,
    scope: "OTP_VERIFY_IP_HOUR",
    limit: OTP_LIMITS.verifyPerIpHour,
    windowSeconds: 60 * 60,
  });
}

export async function blockEmail(email: string, durationSeconds: number): Promise<void> {
  await blockIdentifier(email, "OTP_BLOCK_EMAIL", durationSeconds);
}

export async function blockIp(ip: string, durationSeconds: number): Promise<void> {
  await blockIdentifier(ip, "OTP_BLOCK_IP", durationSeconds);
}
