const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { PUBLIC_USER_FIELDS } = require("../auth/auth.service");

async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

async function updateProfile(userId, data) {
  return prisma.user.update({ where: { id: userId }, data, select: PUBLIC_USER_FIELDS });
}

async function listAddresses(userId) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

async function createAddress(userId, data) {
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const count = await prisma.address.count({ where: { userId } });
  return prisma.address.create({
    data: { ...data, userId, isDefault: data.isDefault ?? count === 0 },
  });
}

async function updateAddress(userId, addressId, data) {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw ApiError.notFound("Address not found");

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.update({ where: { id: addressId }, data });
}

async function deleteAddress(userId, addressId) {
  const existing = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!existing) throw ApiError.notFound("Address not found");
  await prisma.address.delete({ where: { id: addressId } });
}

// --- Admin: manage any user ---
async function adminListUsers({ skip, limit, role, search }) {
  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: PUBLIC_USER_FIELDS, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

async function adminSetUserStatus(userId, isActive) {
  return prisma.user.update({ where: { id: userId }, data: { isActive }, select: PUBLIC_USER_FIELDS });
}

async function adminSetUserRole(userId, role) {
  return prisma.user.update({ where: { id: userId }, data: { role }, select: PUBLIC_USER_FIELDS });
}

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  adminListUsers,
  adminSetUserStatus,
  adminSetUserRole,
};
