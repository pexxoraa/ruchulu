const env = require("../config/env");
const logger = require("../utils/logger");
const ApiError = require("../utils/ApiError");
const { Prisma } = require("@prisma/client");

function mapPrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return ApiError.conflict(
          `A record with this ${(err.meta?.target || ["field"]).join(", ")} already exists`
        );
      case "P2025":
        return ApiError.notFound("Record not found");
      case "P2003":
        return ApiError.badRequest("Invalid reference to a related record");
      default:
        return ApiError.internal("Database error");
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return ApiError.badRequest("Invalid data sent to the database layer");
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  const prismaMapped = mapPrismaError(err);
  if (prismaMapped) error = prismaMapped;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    error = new ApiError(statusCode, error.message || "Internal server error", null, false);
  }

  const isServerError = error.statusCode >= 500;

  logger[isServerError ? "error" : "warn"](
    {
      err,
      statusCode: error.statusCode,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
    error.message
  );

  res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: isServerError && env.isProduction ? "Something went wrong. Please try again." : error.message,
    details: error.details || undefined,
    ...(env.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
