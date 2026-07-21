const router = require("express").Router();
const controller = require("./auth.controller");
const validate = require("../../middlewares/validate");
const { requireAuth } = require("../../middlewares/auth");
const { authLimiter } = require("../../middlewares/rateLimiter");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  requestOtpSchema,
  verifyOtpSchema,
  verifyEmailSchema,
  socialLoginSchema,
} = require("./auth.validators");

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, phone, password]
 *             properties:
 *               fullName: { type: string, example: "Ramya K" }
 *               email: { type: string, format: email, example: "ramya@example.com" }
 *               phone: { type: string, example: "9876543210", description: "10-digit Indian mobile number — required, used for order updates and OTP login" }
 *               password: { type: string, format: password, example: "StrongPass1", description: "Min 8 chars, needs an uppercase letter, a lowercase letter, and a number" }
 *     responses:
 *       201: { description: Account created }
 *       409: { description: Email or phone already registered }
 */
router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "admin@ruchulu.com" }
 *               password: { type: string, format: password, example: "ChangeMe123!" }
 *     responses:
 *       200: { description: Logged in — returns accessToken and sets a refresh-token cookie }
 *       401: { description: Invalid email or password }
 */
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a refresh token for a new access token
 *     description: Reads the refresh token from the httpOnly cookie set on login. If calling this from outside a browser (e.g. this Swagger UI without cookies enabled), you can instead pass it in the body.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string, description: "Only needed if not sent automatically via cookie" }
 *     responses:
 *       200: { description: Token refreshed }
 *       401: { description: Refresh token missing, invalid, or expired }
 */
router.post("/refresh", controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out the current session
 *     responses:
 *       200: { description: Logged out }
 */
router.post("/logout", controller.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Log out of every device / session for this account
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out everywhere }
 */
router.post("/logout-all", requireAuth, controller.logoutAll);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get("/me", requireAuth, controller.me);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the current user's password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password, description: "Min 8 chars, needs an uppercase letter, a lowercase letter, and a number" }
 *     responses:
 *       200: { description: Password changed — all sessions are logged out }
 *       400: { description: Current password is incorrect }
 */
router.post(
  "/change-password",
  requireAuth,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset email sent if the account exists (response is the same either way, to avoid leaking which emails are registered) }
 */
router.post(
  "/forgot-password",
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using the token emailed by /auth/forgot-password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string, description: "The token from the reset-password link" }
 *               newPassword: { type: string, format: password }
 *               email: { type: string, format: email, description: "Also required — sent as a query param (?email=) by the reset link, or include it here" }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Reset link is invalid or has expired }
 */
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword
);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an email address using the token emailed on registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Verification link is invalid or has expired }
 */
router.post("/verify-email", validate({ body: verifyEmailSchema }), controller.verifyEmail);

/**
 * @openapi
 * /auth/otp/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request an OTP for phone login or phone verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, example: "9876543210" }
 *               purpose: { type: string, enum: [LOGIN, VERIFY_PHONE], default: LOGIN }
 *     responses:
 *       200: { description: OTP sent }
 *       404: { description: No account found with this phone number (LOGIN purpose only) }
 */
router.post("/otp/request", authLimiter, validate({ body: requestOtpSchema }), controller.requestOtp);

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an OTP to complete phone login or phone verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, otp]
 *             properties:
 *               phone: { type: string, example: "9876543210" }
 *               otp: { type: string, example: "123456" }
 *               purpose: { type: string, enum: [LOGIN, VERIFY_PHONE], default: LOGIN }
 *     responses:
 *       200: { description: OTP verified }
 *       400: { description: Incorrect or expired OTP }
 */
router.post("/otp/verify", authLimiter, validate({ body: verifyOtpSchema }), controller.verifyOtp);

/**
 * @openapi
 * /auth/social-login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with a Google ID token (Facebook/Apple not yet implemented)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, idToken]
 *             properties:
 *               provider: { type: string, enum: [google, facebook, apple] }
 *               idToken: { type: string, description: "The ID token from the provider's sign-in SDK" }
 *     responses:
 *       200: { description: Logged in }
 *       400: { description: "Provider not supported yet (facebook/apple), or invalid token" }
 */
router.post(
  "/social-login",
  authLimiter,
  validate({ body: socialLoginSchema }),
  controller.socialLogin
);

module.exports = router;
