const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");

async function listCoupons({ skip, limit, isActive }) {
  const where = isActive != null ? { isActive } : {};
  const [items, total] = await Promise.all([
    prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.coupon.count({ where }),
  ]);
  return { items, total };
}

async function createCoupon(data) {
  const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict("A coupon with this code already exists");
  return prisma.coupon.create({ data });
}

async function updateCoupon(id, data) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw ApiError.notFound("Coupon not found");
  return prisma.coupon.update({ where: { id }, data });
}

async function deleteCoupon(id) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw ApiError.notFound("Coupon not found");
  await prisma.coupon.update({ where: { id }, data: { isActive: false } });
}

/**
 * validateCouponForCart — the single source of truth for whether a
 * coupon can be applied to a given cart/user, and what discount it
 * yields. Reused by both the cart "apply coupon" endpoint (for preview)
 * and the order placement flow (for the authoritative final charge),
 * so the two can never disagree.
 */
async function validateCouponForCart(code, userId, cartItems, subtotal) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) throw ApiError.badRequest("Invalid or inactive coupon code");
  if (coupon.startsAt && coupon.startsAt > new Date()) throw ApiError.badRequest("This coupon is not active yet");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw ApiError.badRequest("This coupon has expired");
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw ApiError.badRequest("This coupon has reached its usage limit");
  }
  if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
    throw ApiError.badRequest(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`);
  }

  if (coupon.usageLimitPerUser) {
    const userUsageCount = await prisma.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (userUsageCount >= coupon.usageLimitPerUser) {
      throw ApiError.badRequest("You have already used this coupon the maximum number of times");
    }
  }

  if (coupon.applicableProductIds?.length) {
    const hasApplicable = cartItems.some((item) => coupon.applicableProductIds.includes(item.productId));
    if (!hasApplicable) throw ApiError.badRequest("This coupon does not apply to items in your cart");
  }
  if (coupon.applicableCategoryIds?.length) {
    const hasApplicable = cartItems.some((item) => coupon.applicableCategoryIds.includes(item.product.categoryId));
    if (!hasApplicable) throw ApiError.badRequest("This coupon does not apply to items in your cart");
  }

  let discount = 0;
  let freeShipping = false;

  if (coupon.type === "PERCENTAGE") {
    discount = (subtotal * Number(coupon.value)) / 100;
    if (coupon.maxDiscountAmount) discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  } else if (coupon.type === "FLAT") {
    discount = Math.min(Number(coupon.value), subtotal);
  } else if (coupon.type === "FREE_SHIPPING") {
    freeShipping = true;
  }

  return { coupon, discount: Math.round(discount * 100) / 100, freeShipping };
}

async function recordCouponUsage(couponId, userId, orderId) {
  await prisma.$transaction([
    prisma.couponUsage.create({ data: { couponId, userId, orderId } }),
    prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } }),
  ]);
}

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCouponForCart,
  recordCouponUsage,
};
