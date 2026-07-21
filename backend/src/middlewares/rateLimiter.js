const rateLimit = require("express-rate-limit");
const env = require("../config/env");

/**
 * A general-purpose limiter applied to the whole API, plus a stricter
 * limiter layered on top of auth endpoints (login/register/otp) where
 * brute-force / enumeration attempts are the main risk.
 *
 * Uses the default in-memory store. For multi-instance deployments,
 * swap in `rate-limit-redis` pointed at the shared Redis instance
 * (see src/config/redis.js) so limits are enforced across all pods.
 */
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please slow down and try again shortly.",
  },
});

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many attempts. Please try again later.",
  },
});

module.exports = { apiLimiter, authLimiter };
