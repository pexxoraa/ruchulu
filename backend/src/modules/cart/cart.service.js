const { v4: uuidv4 } = require("uuid");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const couponsService = require("../coupons/coupons.service");

const cartInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, slug: true, categoryId: true, status: true } },
      variant: { include: { inventory: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  coupon: true,
};

const FLAT_SHIPPING_FEE = 60;
const FREE_SHIPPING_THRESHOLD = 999;

/**
 * resolveCart — finds (or lazily creates) the cart for the current
 * request, whether it belongs to a logged-in user or an anonymous
 * guest identified by an opaque token. This is the single entry point
 * every other cart operation goes through.
 */
async function resolveCart({ userId, guestToken }) {
  if (userId) {
    let cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
    if (!cart) cart = await prisma.cart.create({ data: { userId }, include: cartInclude });
    return cart;
  }

  if (guestToken) {
    const cart = await prisma.cart.findUnique({ where: { guestToken }, include: cartInclude });
    if (cart) return cart;
  }

  const newToken = guestToken || uuidv4();
  return prisma.cart.create({ data: { guestToken: newToken }, include: cartInclude });
}

function computeTotals(cart) {
  const items = cart.items.map((item) => {
    const unitPrice = Number(item.variant.offerPrice ?? item.variant.price);
    return {
      ...item,
      unitPrice,
      lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      availableStock: item.variant.inventory ? item.variant.inventory.quantity - item.variant.inventory.reservedQty : 0,
    };
  });

  const subtotal = Math.round(items.reduce((sum, i) => sum + i.lineTotal, 0) * 100) / 100;

  let discount = 0;
  let freeShipping = false;
  if (cart.coupon) {
    if (cart.coupon.type === "PERCENTAGE") {
      discount = (subtotal * Number(cart.coupon.value)) / 100;
      if (cart.coupon.maxDiscountAmount) discount = Math.min(discount, Number(cart.coupon.maxDiscountAmount));
    } else if (cart.coupon.type === "FLAT") {
      discount = Math.min(Number(cart.coupon.value), subtotal);
    } else if (cart.coupon.type === "FREE_SHIPPING") {
      freeShipping = true;
    }
  }
  discount = Math.round(discount * 100) / 100;

  const shippingFee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD || freeShipping ? 0 : FLAT_SHIPPING_FEE;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const taxAmount = Math.round(taxableAmount * 0.05 * 100) / 100; // flat 5% GST estimate for cart preview
  const total = Math.round((taxableAmount + taxAmount + shippingFee) * 100) / 100;

  return {
    ...cart,
    items,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    discount,
    shippingFee,
    taxAmount,
    total,
  };
}

async function getCart(identity) {
  const cart = await resolveCart(identity);
  return computeTotals(cart);
}

async function addItem(identity, { productId, variantId, quantity }) {
  const cart = await resolveCart(identity);

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: true },
  });
  if (!variant || variant.productId !== productId) throw ApiError.badRequest("Invalid product/variant combination");
  if (variant.product.status !== "ACTIVE") throw ApiError.badRequest("This product is not currently available");

  const existing = cart.items.find((i) => i.variantId === variantId);
  const newQuantity = (existing?.quantity || 0) + quantity;

  const availableStock = variant.inventory ? variant.inventory.quantity - variant.inventory.reservedQty : 0;
  if (availableStock < newQuantity) {
    throw ApiError.badRequest(`Only ${Math.max(availableStock, 0)} unit(s) of ${variant.label} left in stock`);
  }

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity } });
  }

  return getCart({ userId: cart.userId, guestToken: cart.guestToken });
}

async function updateItem(identity, itemId, quantity) {
  const cart = await resolveCart(identity);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  const availableStock = item.variant.inventory
    ? item.variant.inventory.quantity - item.variant.inventory.reservedQty
    : 0;
  if (availableStock < quantity) {
    throw ApiError.badRequest(`Only ${Math.max(availableStock, 0)} unit(s) left in stock`);
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  return getCart({ userId: cart.userId, guestToken: cart.guestToken });
}

async function removeItem(identity, itemId) {
  const cart = await resolveCart(identity);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw ApiError.notFound("Cart item not found");

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart({ userId: cart.userId, guestToken: cart.guestToken });
}

async function clearCart(identity) {
  const cart = await resolveCart(identity);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
  return getCart({ userId: cart.userId, guestToken: cart.guestToken });
}

async function applyCoupon(identity, code) {
  if (!identity.userId) throw ApiError.unauthorized("Please log in to apply a coupon");

  const cart = await resolveCart(identity);
  if (cart.items.length === 0) throw ApiError.badRequest("Your cart is empty");

  const totals = computeTotals(cart);
  const { coupon } = await couponsService.validateCouponForCart(code, identity.userId, cart.items, totals.subtotal);

  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });
  return getCart(identity);
}

async function removeCoupon(identity) {
  const cart = await resolveCart(identity);
  await prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
  return getCart(identity);
}

/**
 * mergeGuestCart — called right after login. Any items sitting in the
 * anonymous cart (identified by guestToken) are folded into the user's
 * persistent cart, then the guest cart is deleted.
 */
async function mergeGuestCart(userId, guestToken) {
  if (!guestToken) return getCart({ userId });

  const guestCart = await prisma.cart.findUnique({ where: { guestToken }, include: cartInclude });
  if (!guestCart || guestCart.items.length === 0) return getCart({ userId });

  let userCart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
  if (!userCart) userCart = await prisma.cart.create({ data: { userId }, include: cartInclude });

  for (const item of guestCart.items) {
    const existing = userCart.items.find((i) => i.variantId === item.variantId);
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: userCart.id, productId: item.productId, variantId: item.variantId, quantity: item.quantity },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
  return getCart({ userId });
}

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  mergeGuestCart,
  computeTotals,
};
