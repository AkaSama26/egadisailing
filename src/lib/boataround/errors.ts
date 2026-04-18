import { ExternalServiceError } from "@/lib/errors";

export class BoataroundApiError extends ExternalServiceError {
  constructor(message: string, statusCode: number, responseBody = "") {
    super("Boataround", message, { statusCode, responseBody });
    this.name = "BoataroundApiError";
  }
}
