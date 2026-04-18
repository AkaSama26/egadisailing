import { ExternalServiceError } from "@/lib/errors";

export class BokunApiError extends ExternalServiceError {
  constructor(message: string, statusCode: number, responseBody = "") {
    super("Bokun", message, { statusCode, responseBody });
    this.name = "BokunApiError";
  }
}
