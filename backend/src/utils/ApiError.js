/**
 * ApiError represents a known, operational error (bad input, not found,
 * unauthorized, etc.) as opposed to an unexpected programming error.
 * The global error handler uses `isOperational` to decide whether to
 * expose the message to the client or hide it behind a generic 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict", details = null) {
    return new ApiError(409, message, details);
  }

  static unprocessable(message = "Unprocessable entity", details = null) {
    return new ApiError(422, message, details);
  }

  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message, null, false);
  }
}

module.exports = ApiError;
