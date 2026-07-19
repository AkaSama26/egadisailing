import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalServiceError, UnauthorizedError } from "@/lib/errors";
import { requireBearerSecret, withErrorHandler } from "./with-error-handler";

const captureError = vi.fn();

vi.mock("@/lib/sentry/init", () => ({ captureError }));

beforeEach(() => {
  captureError.mockClear();
});

describe("requireBearerSecret", () => {
  it("rifiuta un Bearer Unicode con byte length diversa senza RangeError", () => {
    const req = new Request("https://example.test/api/health?deep=1", {
      headers: { authorization: "Bearer éééé" },
    });

    expect(() => requireBearerSecret(req, "abcd")).toThrow(UnauthorizedError);
  });
});

describe("withErrorHandler Sentry capture", () => {
  it("cattura gli AppError 5xx con il request id", async () => {
    const error = new ExternalServiceError("Brevo", "upstream timeout");
    const handler = withErrorHandler(async (_req: Request): Promise<Response> => {
      throw error;
    });

    const response = await handler(
      new Request("https://example.test/api/send", {
        headers: { "x-request-id": "req-sentry-502" },
      }),
    );

    expect(response.status).toBe(502);
    expect(captureError).toHaveBeenCalledWith(error, {
      requestId: "req-sentry-502",
      code: "EXTERNAL_SERVICE_ERROR",
      statusCode: 502,
    });
  });

  it("non cattura gli AppError 4xx attesi", async () => {
    const handler = withErrorHandler(async (_req: Request): Promise<Response> => {
      throw new UnauthorizedError();
    });

    const response = await handler(
      new Request("https://example.test/api/private"),
    );

    expect(response.status).toBe(401);
    expect(captureError).not.toHaveBeenCalled();
  });
});
