/**
 * Hierarchy di errori applicativi.
 *
 * `toJSON()` = forma completa per log (include context). NON esporre al client.
 * `toClientJSON()` = forma sanitizzata per risposta HTTP al client.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: Record<string, unknown>;
  public readonly isOperational: boolean;

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
    this.isOperational = true;
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }

  /** Serialization completa per log — include stack e context. */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }

  /** Risposta sanitizzata per il client HTTP (no stack, no context raw).
   * statusCode NON incluso nel body — il client lo legge dall'HTTP status.
   * Retry-After e' esposto come header dal withErrorHandler. */
  toClientJSON(): { code: string; message: string; retryAfterSeconds?: number } {
    const payload: { code: string; message: string; retryAfterSeconds?: number } = {
      code: this.code,
      message: this.message,
    };
    if (typeof this.context.retryAfterSeconds === "number") {
      payload.retryAfterSeconds = this.context.retryAfterSeconds;
    }
    return payload;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("VALIDATION_ERROR", message, 400, context);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super("NOT_FOUND", `${entity} with id ${id} not found`, 404, { entity, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super("CONFLICT", message, 409, context);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, context: Record<string, unknown> = {}) {
    super("RATE_LIMITED", "Rate limit exceeded", 429, {
      retryAfterSeconds,
      ...context,
    });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context: Record<string, unknown> = {}) {
    // Generic client-facing message (il dettaglio va in log, non al client).
    super("EXTERNAL_SERVICE_ERROR", "External service temporarily unavailable", 502, {
      service,
      upstreamMessage: message,
      ...context,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}
