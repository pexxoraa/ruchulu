const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { prisma } = require("../../config/database");
const env = require("../../config/env");
const ApiError = require("../../utils/ApiError");
const { generateOtp } = require("../../utils/helpers");
const { sendEmail, templates } = require("../../jobs/email.service");
const { sendSms } = require("../../jobs/sms.service");
const tokenService = require("./token.service");

const PUBLIC_USER_FIELDS = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isEmailVerified: true,
  isPhoneVerified: true,
  avatarUrl: true,
  rewardPoints: true,
  walletBalance: true,
  createdAt: true,
};

async function register({ fullName, email, phone, password }, meta) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
  });
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? "An account with this email already exists" : "This phone number is already registered"
    );
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash },
  });

  // Every new customer gets an empty cart ready to use.
  await prisma.cart.create({ data: { userId: user.id } });

  const { subject, html } = templates.welcome(fullName);
  sendEmail({ to: email, subject, html }).catch(() => {});

  await issueEmailVerification(user);

  const tokens = await tokenService.issueTokenPair(user, meta);
  return { user: sanitizeUser(user), ...tokens };
}

async function login({ email, password }, meta) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  if (!user.isActive) throw ApiError.forbidden("Your account has been deactivated. Contact support.");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const tokens = await tokenService.issueTokenPair(user, meta);
  return { user: sanitizeUser(user), ...tokens };
}

async function refresh(rawRefreshToken, meta) {
  const tokens = await tokenService.rotateTokenPair(rawRefreshToken, meta);
  return tokens;
}

async function logout(rawRefreshToken) {
  await tokenService.revokeRefreshToken(rawRefreshToken);
}

async function logoutAllDevices(userId) {
  await tokenService.revokeAllUserTokens(userId);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await tokenService.revokeAllUserTokens(userId);
}

/**
 * Forgot / reset password uses a short-lived signed token stored (hashed)
 * as an OtpCode row with purpose RESET_PASSWORD, reusing the same table
 * rather than introducing a parallel mechanism.
 */
async function forgotPassword(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success-shaped to the caller (handled in controller)
  // to avoid leaking which emails are registered.
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const codeHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.otpCode.create({
    data: {
      userId: user.id,
      identifier: email,
      codeHash,
      purpose: "RESET_PASSWORD",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const resetUrl = `${env.CLIENT_URL}/reset-password.html?token=${rawToken}&email=${encodeURIComponent(email)}`;
  const { subject, html, text } = templates.passwordReset(resetUrl);
  await sendEmail({ to: email, subject, html, text });
}

async function resetPassword({ token, newPassword }, email) {
  const codeHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.otpCode.findFirst({
    where: { codeHash, purpose: "RESET_PASSWORD", identifier: email, consumed: false },
  });

  if (!record || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This reset link is invalid or has expired");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } }),
  ]);

  await tokenService.revokeAllUserTokens(record.userId);
}

async function issueEmailVerification(user) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const codeHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await prisma.otpCode.create({
    data: {
      userId: user.id,
      identifier: user.email,
      codeHash,
      purpose: "VERIFY_EMAIL",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${env.CLIENT_URL}/verify-email.html?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
  const { subject, html, text } = templates.emailVerification(verifyUrl);
  sendEmail({ to: user.email, subject, html, text }).catch(() => {});
}

async function verifyEmail(token, email) {
  const codeHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.otpCode.findFirst({
    where: { codeHash, purpose: "VERIFY_EMAIL", identifier: email, consumed: false },
  });
  if (!record || record.expiresAt < new Date()) {
    throw ApiError.badRequest("This verification link is invalid or has expired");
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
    prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } }),
  ]);
}

/**
 * requestOtp / verifyOtp implement phone-based OTP login. The OTP is
 * hashed at rest (never stored in plaintext) and rate-limited by the
 * `attempts` counter to resist brute forcing a 6-digit code.
 */
async function requestOtp(phone, purpose) {
  const otp = generateOtp(6);
  const codeHash = crypto.createHash("sha256").update(otp).digest("hex");

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user && purpose === "LOGIN") {
    throw ApiError.notFound("No account found with this phone number. Please register first.");
  }

  await prisma.otpCode.create({
    data: {
      userId: user?.id,
      identifier: phone,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  await sendSms(phone, `Your Ruchulu verification code is ${otp}. Valid for 10 minutes.`);
}

async function verifyOtp({ phone, otp, purpose }, meta) {
  const codeHash = crypto.createHash("sha256").update(otp).digest("hex");

  const record = await prisma.otpCode.findFirst({
    where: { identifier: phone, purpose, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date()) {
    throw ApiError.badRequest("OTP has expired. Please request a new one.");
  }
  if (record.attempts >= 5) {
    throw ApiError.tooManyRequests("Too many incorrect attempts. Please request a new OTP.");
  }
  if (record.codeHash !== codeHash) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest("Incorrect OTP");
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } });

  let user = await prisma.user.findUnique({ where: { phone } });

  if (purpose === "VERIFY_PHONE") {
    if (!user) throw ApiError.notFound("User not found");
    user = await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
    return { user: sanitizeUser(user) };
  }

  // purpose === LOGIN
  const tokens = await tokenService.issueTokenPair(user, meta);
  return { user: sanitizeUser(user), ...tokens };
}

/**
 * Social login (Google) — verifies the ID token against Google's
 * tokeninfo endpoint (no extra SDK dependency required) and finds or
 * creates a local user. Facebook/Apple follow the same shape but need
 * their own token-verification calls wired in with real app credentials
 * before going live — left as a clear extension point rather than a
 * fake implementation.
 */
async function socialLogin({ provider, idToken }, meta) {
  if (provider !== "google") {
    throw ApiError.badRequest(
      `${provider} login is not yet wired up on the server. Add the provider's token-verification call in auth.service.js#socialLogin.`
    );
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) throw ApiError.unauthorized("Invalid Google token");
  const payload = await res.json();

  if (env.GOOGLE_CLIENT_ID && payload.aud !== env.GOOGLE_CLIENT_ID) {
    throw ApiError.unauthorized("Google token was not issued for this app");
  }

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        fullName: payload.name || payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString("hex"), env.BCRYPT_SALT_ROUNDS),
        isEmailVerified: payload.email_verified === "true",
        avatarUrl: payload.picture,
      },
    });
    await prisma.cart.create({ data: { userId: user.id } });
  } else if (!user.googleId) {
    user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
  }

  const tokens = await tokenService.issueTokenPair(user, meta);
  return { user: sanitizeUser(user), ...tokens };
}

function sanitizeUser(user) {
  const clean = {};
  for (const key of Object.keys(PUBLIC_USER_FIELDS)) clean[key] = user[key];
  return clean;
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAllDevices,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  requestOtp,
  verifyOtp,
  socialLogin,
  sanitizeUser,
  PUBLIC_USER_FIELDS,
};
