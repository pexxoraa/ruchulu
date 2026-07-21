const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken } = require("../utils/jwt");
const { prisma } = require("../config/database");

/**
 * requireAuth — verifies the Bearer access token and attaches a lean
 * `req.user` object. Throws 401 if missing/invalid/expired, or if the
 * account has since been deactivated.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized("Authentication token missing");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Access token expired");
    }
    throw ApiError.unauthorized("Invalid access token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true, fullName: true },
  });

  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (!user.isActive) throw ApiError.forbidden("Account has been deactivated");

  req.user = user;
  next();
});

/**
 * optionalAuth — attaches req.user if a valid token is present, but
 * never throws. Used for endpoints like product listing that behave
 * slightly differently for logged-in users (wishlist state, etc.)
 * without requiring login.
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, fullName: true },
    });
    if (user && user.isActive) req.user = user;
  } catch (err) {
    // silently ignore — this route doesn't require auth
  }
  next();
});

/**
 * requireRole('ADMIN', 'SUPER_ADMIN') — must follow requireAuth.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized("Authentication required"));
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden("You do not have permission to perform this action"));
  }
  next();
};

module.exports = { requireAuth, optionalAuth, requireRole };
