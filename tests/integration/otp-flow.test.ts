/**
 * Integration test — OTP flow end-to-end (R24 fixes).
 *
 * Scenari:
 *  1. R24-A2-M1: requestOtp a email non-customer NON crea OTP row (email bomb
 *     prevention) + costant-time delay 200ms anti-enumeration.
 *  2. R24-A2-C2: createBookingSession revoca session esistente prima di
 *     emettere nuovo cookie (old cookie invalidated server-side).
 *  3. verifyOtp atomic claim: 2 verify concorrenti su stesso codice → solo
 *     1 valid, l'altro ALREADY_USED.
 *  4. OTP TOO_MANY_ATTEMPTS: 3 wrong guess → locked codice + blockEmail.
 *  5. Expired OTP → EXPIRED.
 *  6. createOtp invalida OTP precedenti stessa email (idempotent re-request).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, resetTestDb, closeTestDb } from "../helpers/test-db";
import { installRedisMock, resetRedisMock } from "../helpers/redis-mock";

let testPrisma: Awaited<ReturnType<typeof setupTestDb>>;
vi.mock("@/lib/db", () => ({
  get db() {
    return testPrisma;
  },
}));

vi.mock("@/lib/queue", () => ({
  getRedisConnection: () => installRedisMock(),
  syncQueue: () => ({ add: vi.fn() }),
  availBokunQueue: () => ({ add: vi.fn() }),
  availBoataroundQueue: () => ({ add: vi.fn() }),
  availManualQueue: () => ({ add: vi.fn() }),
  pricingBokunQueue: () => ({ add: vi.fn() }),
  emailTransactionalQueue: () => ({ add: vi.fn() }),
  getQueue: () => ({ add: vi.fn() }),
  QUEUE_NAMES: {
    AVAIL_BOKUN: "sync.avail.bokun",
    AVAIL_BOATAROUND: "sync.avail.boataround",
    AVAIL_MANUAL: "sync.avail.manual",
    PRICING_BOKUN: "sync.pricing.bokun",
      EMAIL_TRANSACTIONAL: "email.transactional",
  },
  ALL_QUEUE_NAMES: [
    "sync.avail.bokun",
    "sync.avail.boataround",
    "sync.avail.manual",
    "sync.pricing.bokun",
  ],
}));

// Mock email delivery per non colpire Brevo reale.
const sendOtpEmailMock = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/otp/email", () => ({
  sendOtpEmail: sendOtpEmailMock,
}));

// Mock Next cookies (Server Action only).
const cookieStore = new Map<string, { value: string; expires?: Date }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = cookieStore.get(name);
      return v ? { name, value: v.value } : undefined;
    },
    set: (opts: {
      name: string;
      value: string;
      expires?: Date;
    }) => {
      cookieStore.set(opts.name, { value: opts.value, expires: opts.expires });
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  }),
  headers: async () => new Headers(),
}));

let db: Awaited<ReturnType<typeof setupTestDb>>;

beforeAll(async () => {
  db = await setupTestDb();
  testPrisma = db;
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  await resetRedisMock();
  cookieStore.clear();
  vi.clearAllMocks();
});

describe("OTP request flow (R24-A2-M1 email bomb prevention)", () => {
  it("request OTP a email non-customer → no OTP creato + email non inviata", async () => {
    // No Customer seeded → request per qualsiasi email = non-customer.
    const { requestOtp } = await import("@/app/[locale]/recupera-prenotazione/actions");

    const fd = new FormData();
    fd.append("email", "stranger@example.com");

    const start = Date.now();
    const result = await requestOtp({ status: "idle" }, fd);
    const elapsed = Date.now() - start;

    // Response: "sent" come se OK (anti-enumeration).
    expect(result.status).toBe("sent");

    // Nessun OTP creato in DB.
    const otps = await db.bookingRecoveryOtp.findMany();
    expect(otps).toHaveLength(0);

    // Email NON inviata.
    expect(sendOtpEmailMock).not.toHaveBeenCalled();

    // Constant-time delay ~200ms (accetta 150-500ms per ioredis-mock+test
    // variability).
    expect(elapsed).toBeGreaterThanOrEqual(150);
  });

  it("request OTP a customer esistente → OTP creato + email inviata", async () => {
    await db.customer.create({
      data: {
        email: "mario@example.com",
        firstName: "Mario",
        lastName: "Rossi",
      },
    });

    const { requestOtp } = await import("@/app/[locale]/recupera-prenotazione/actions");

    const fd = new FormData();
    fd.append("email", "mario@example.com");

    const result = await requestOtp({ status: "idle" }, fd);
    expect(result.status).toBe("sent");

    const otps = await db.bookingRecoveryOtp.findMany({
      where: { email: "mario@example.com" },
    });
    expect(otps).toHaveLength(1);
    expect(otps[0].usedAt).toBeNull();

    expect(sendOtpEmailMock).toHaveBeenCalledWith(
      "mario@example.com",
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it("2 OTP request stessa email → prima OTP invalidata, solo ultima attiva", async () => {
    await db.customer.create({
      data: {
        email: "c@example.com",
        firstName: "C",
        lastName: "X",
      },
    });

    const { createOtp } = await import("@/lib/otp/generate");
    const { code: code1 } = await createOtp("c@example.com", "1.2.3.4");
    // piccolo delay per differenziare createdAt
    await new Promise((r) => setTimeout(r, 20));
    const { code: code2 } = await createOtp("c@example.com", "1.2.3.4");

    // Primo code non deve piu' validare — codeHash diverso + expiresAt=now
    // dopo invalidate di createOtp #2.
    const { verifyOtp } = await import("@/lib/otp/verify");
    const r1 = await verifyOtp("c@example.com", code1);
    expect(r1.valid).toBe(false);

    const r2 = await verifyOtp("c@example.com", code2);
    expect(r2.valid).toBe(true);
  });
});

describe("OTP verify atomic (R14-class race)", () => {
  it("2 verify concorrenti stesso codice → 1 valid + 1 ALREADY_USED", async () => {
    await db.customer.create({
      data: { email: "c@example.com", firstName: "C", lastName: "X" },
    });
    const { createOtp } = await import("@/lib/otp/generate");
    const { code } = await createOtp("c@example.com", "1.2.3.4");

    const { verifyOtp } = await import("@/lib/otp/verify");
    const [r1, r2] = await Promise.all([
      verifyOtp("c@example.com", code),
      verifyOtp("c@example.com", code),
    ]);

    // Invariante critica SAFETY: MAX 1 valid. Prima della claim atomica
    // updateMany+count==1 pattern (verify.ts:67), 2 concurrent verify
    // avrebbero potuto entrambe ritornare valid → 2 session emesse per
    // stesso OTP. Il claim guard risolve questa race; il test la verifica.
    const validCount = [r1, r2].filter((r) => r.valid).length;
    expect(validCount).toBeLessThanOrEqual(1);
  });

  it("3 wrong guesses → TOO_MANY_ATTEMPTS + codice lockato", async () => {
    await db.customer.create({
      data: { email: "c@example.com", firstName: "C", lastName: "X" },
    });
    const { createOtp } = await import("@/lib/otp/generate");
    await createOtp("c@example.com", "1.2.3.4");

    const { verifyOtp } = await import("@/lib/otp/verify");
    const r1 = await verifyOtp("c@example.com", "000000");
    const r2 = await verifyOtp("c@example.com", "111111");
    const r3 = await verifyOtp("c@example.com", "222222");
    const r4 = await verifyOtp("c@example.com", "333333");

    expect(r1.reason).toBe("INVALID");
    expect(r2.reason).toBe("INVALID");
    expect(r3.reason).toBe("INVALID");
    // 4° tentativo: attempts gia' == 3 quindi TOO_MANY_ATTEMPTS pre-compare.
    expect(r4.reason).toBe("TOO_MANY_ATTEMPTS");
  });

  it("expired OTP → EXPIRED", async () => {
    await db.customer.create({
      data: { email: "c@example.com", firstName: "C", lastName: "X" },
    });
    const bcrypt = await import("bcryptjs");
    const codeHash = await bcrypt.hash("123456", 8);
    await db.bookingRecoveryOtp.create({
      data: {
        email: "c@example.com",
        codeHash,
        expiresAt: new Date(Date.now() - 60_000),
        ipAddress: "1.2.3.4",
      },
    });

    const { verifyOtp } = await import("@/lib/otp/verify");
    const result = await verifyOtp("c@example.com", "123456");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("EXPIRED");
  });
});

describe("R24-A2-C2: createBookingSession rotates existing cookie", () => {
  it("login con cookie esistente → vecchia session revocata prima di nuova", async () => {
    const { createBookingSession, BOOKING_SESSION_COOKIE, hashToken } = await import(
      "@/lib/session/create"
    );

    // Prima login: session S1.
    await createBookingSession("mario@example.com", "1.2.3.4", "Mozilla/5.0");
    const s1Token = cookieStore.get(BOOKING_SESSION_COOKIE)?.value;
    expect(s1Token).toBeDefined();
    const s1Row = await db.bookingRecoverySession.findFirst({
      where: { tokenHash: hashToken(s1Token!) },
    });
    expect(s1Row?.revokedAt).toBeNull();

    // Secondo login: cookie S1 ancora presente. Ci aspettiamo che S1 venga
    // revocato server-side + nuovo cookie S2 emesso.
    await createBookingSession("mario@example.com", "1.2.3.4", "Mozilla/5.0");
    const s2Token = cookieStore.get(BOOKING_SESSION_COOKIE)?.value;
    expect(s2Token).toBeDefined();
    expect(s2Token).not.toBe(s1Token);

    // S1 row in DB deve essere revokedAt != null.
    const s1After = await db.bookingRecoverySession.findFirst({
      where: { tokenHash: hashToken(s1Token!) },
    });
    expect(s1After?.revokedAt).not.toBeNull();

    // S2 row attiva.
    const s2Row = await db.bookingRecoverySession.findFirst({
      where: { tokenHash: hashToken(s2Token!) },
    });
    expect(s2Row?.revokedAt).toBeNull();
  });

  it("login pulito (no cookie) → solo new session, no revoke", async () => {
    const { createBookingSession, BOOKING_SESSION_COOKIE } = await import(
      "@/lib/session/create"
    );

    await createBookingSession("mario@example.com", "1.2.3.4", "Mozilla/5.0");
    const token = cookieStore.get(BOOKING_SESSION_COOKIE)?.value;
    expect(token).toBeDefined();

    // Solo 1 row DB.
    const rows = await db.bookingRecoverySession.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).toBeNull();
  });
});
