const crypto = require("crypto");
const { prisma } = require("../../config/database");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../../utils/jwt");
const ApiError = require("../../utils/ApiError");
const env = require("../../config/env");

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function msFromExpiresIn(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30d
  const value = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return value * unit;
}

/**
 * Issues a fresh access + refresh token pair for a user, persisting a
 * hash of the refresh token (never the raw value) so tokens can be
 * revoked / audited without being readable from a DB dump.
 */
async function issueTokenPair(user, meta = {}) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date(Date.now() + msFromExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return { accessToken, refreshToken };
}

/**
 * Rotates a refresh token: verifies the JWT signature, checks it exists
 * (by hash) and hasn't been revoked/expired in the DB, revokes it, then
 * issues a brand new pair. Rotation on every use limits the blast radius
 * of a leaked refresh token.
 */
async function rotateTokenPair(rawRefreshToken, meta = {}) {
  if (!rawRefreshToken) throw ApiError.unauthorized("Refresh token missing");

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch (err) {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: tokenHash } });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw ApiError.unauthorized("Refresh token is no longer valid — please log in again");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw ApiError.unauthorized("User account not available");

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

  return issueTokenPair(user, meta);
}

async function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { token: tokenHash },
    data: { revoked: true },
  });
}

async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

module.exports = {
  hashToken,
  issueTokenPair,
  rotateTokenPair,
  revokeRefreshToken,
  revokeAllUserTokens,
};
