import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    EMAIL_DELIVERY_MODE: "brevo",
    BREVO_API_KEY: "test-api-key",
    BREVO_SENDER_EMAIL: "sender@example.test",
    BREVO_SENDER_NAME: "Egadisailing Test",
    BREVO_REPLY_TO: "reply@example.test",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { sendEmailWithResult } from "./brevo";

describe("Brevo outbox idempotency", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("tratta duplicate_parameter come un ack gia' consegnato", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "duplicate_parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const idempotencyKey = "1bc773a8-2a65-5ef3-9885-719cd15b1588"; // gitleaks:allow deterministic test UUID
    const result = await sendEmailWithResult({
      to: "recipient@example.test",
      subject: "Test",
      htmlContent: "<p>Test</p>",
      idempotencyKey,
    });

    expect(result).toEqual({
      delivered: true,
      messageId: `brevo-idempotent-${idempotencyKey}`,
    });
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body)) as {
      headers: Record<string, string>;
    };
    expect(body.headers.idempotencyKey).toBe(idempotencyKey);
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });
});
