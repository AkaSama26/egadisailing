export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    context: Record<string, unknown> = {},
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.name = "AppError";
    Error.captureStackTrace?.(this, AppError);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("VALIDATION_ERROR", message, 400, context);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id ${id} not found`, 404, { entity, id });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("CONFLICT", message, 409, context);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, context: Record<string, unknown> = {}) {
    super("RATE_LIMITED", "Rate limit exceeded", 429, {
      retryAfterSeconds,
      ...context,
    });
    this.name = "RateLimitError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: Record<string, unknown> = {}) {
    super("EXTERNAL_SERVICE_ERROR", `${service}: ${message}`, 502, {
      service,
      ...context,
    });
    this.name = "ExternalServiceError";
  }
}
