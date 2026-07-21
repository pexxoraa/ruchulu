const authService = require("./auth.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const env = require("../../config/env");
const cartService = require("../cart/cart.service");

const GUEST_CART_COOKIE = "ruchulu_guest_cart";

async function mergeGuestCartIfPresent(req, res, userId) {
  const guestToken = req.cookies?.[GUEST_CART_COOKIE];
  if (!guestToken) return;
  try {
    await cartService.mergeGuestCart(userId, guestToken);
  } finally {
    // path must match what cart.controller.js used when setting this cookie,
    // or the browser won't recognize it as the same cookie to clear.
    res.clearCookie(GUEST_CART_COOKIE, { path: "/" });
  }
}

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "strict" : "lax",
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, token) {
  res.cookie(env.REFRESH_COOKIE_NAME, token, cookieOptions);
}

function clearRefreshCookie(res) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}

function getRefreshTokenFromRequest(req) {
  return req.cookies?.[env.REFRESH_COOKIE_NAME] || req.body?.refreshToken;
}

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  await mergeGuestCartIfPresent(req, res, result.user.id);
  new ApiResponse(201, { user: result.user, accessToken: result.accessToken }, "Account created successfully").send(res);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  await mergeGuestCartIfPresent(req, res, result.user.id);
  new ApiResponse(200, { user: result.user, accessToken: result.accessToken }, "Logged in successfully").send(res);
});

const refresh = asyncHandler(async (req, res) => {
  const rawToken = getRefreshTokenFromRequest(req);
  const tokens = await authService.refresh(rawToken, requestMeta(req));
  setRefreshCookie(res, tokens.refreshToken);
  new ApiResponse(200, { accessToken: tokens.accessToken }, "Token refreshed").send(res);
});

const logout = asyncHandler(async (req, res) => {
  const rawToken = getRefreshTokenFromRequest(req);
  await authService.logout(rawToken);
  clearRefreshCookie(res);
  new ApiResponse(200, null, "Logged out successfully").send(res);
});

const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAllDevices(req.user.id);
  clearRefreshCookie(res);
  new ApiResponse(200, null, "Logged out from all devices").send(res);
});

const me = asyncHandler(async (req, res) => {
  new ApiResponse(200, req.user, "Current user").send(res);
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  new ApiResponse(200, null, "Password changed successfully. Please log in again.").send(res);
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  new ApiResponse(200, null, "If an account exists with this email, a reset link has been sent.").send(res);
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body, req.query.email || req.body.email);
  new ApiResponse(200, null, "Password reset successfully. Please log in.").send(res);
});

const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token, req.query.email || req.body.email);
  new ApiResponse(200, null, "Email verified successfully").send(res);
});

const requestOtp = asyncHandler(async (req, res) => {
  await authService.requestOtp(req.body.phone, req.body.purpose);
  new ApiResponse(200, null, "OTP sent successfully").send(res);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body, requestMeta(req));
  if (result.refreshToken) setRefreshCookie(res, result.refreshToken);
  new ApiResponse(200, { user: result.user, accessToken: result.accessToken }, "OTP verified").send(res);
});

const socialLogin = asyncHandler(async (req, res) => {
  const result = await authService.socialLogin(req.body, requestMeta(req));
  setRefreshCookie(res, result.refreshToken);
  new ApiResponse(200, { user: result.user, accessToken: result.accessToken }, "Logged in successfully").send(res);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  requestOtp,
  verifyOtp,
  socialLogin,
};
