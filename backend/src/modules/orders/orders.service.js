const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const { generateOrderNumber } = require("../../utils/helpers");
const cartService = require("../cart/cart.service");
const couponsService = require("../coupons/coupons.service");
const paymentsService = require("./payments.service");
const { sendEmail, templates } = require("../../jobs/email.service");
const logger = require("../../utils/logger");

const orderInclude = {
  items: { include: { product: { select: { id: true, name: true, slug: true } } } },
  address: true,
  payment: true,
  timeline: { orderBy: { createdAt: "asc" } },
};

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PACKED"];

/**
 * placeOrder — the authoritative checkout path. Re-derives pricing from
 * the database inside a single transaction (never trusts client-sent
 * totals), locks stock by decrementing inventory atomically, and leaves
 * the order in PENDING for online payments or CONFIRMED for COD.
 */
async function placeOrder(userId, { addressId, paymentMethod, notes }) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw ApiError.badRequest("Selected address does not belong to this account");

  const cart = await cartService.getCart({ userId });
  if (cart.items.length === 0) throw ApiError.badRequest("Your cart is empty");

  return prisma.$transaction(async (tx) => {
    let subtotal = 0;
    let taxAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { inventory: true, product: true },
      });
      if (!variant || !variant.isActive) {
        throw ApiError.badRequest(`${item.product.name} is no longer available`);
      }

      const available = variant.inventory ? variant.inventory.quantity - variant.inventory.reservedQty : 0;
      if (available < item.quantity) {
        throw ApiError.badRequest(`Only ${Math.max(available, 0)} unit(s) of ${variant.label} left in stock`);
      }

      const unitPrice = Number(variant.offerPrice ?? variant.price);
      const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      const lineTax = Math.round(((lineTotal * Number(variant.product.gstPercent)) / 100) * 100) / 100;

      subtotal += lineTotal;
      taxAmount += lineTax;

      orderItemsData.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantLabel: variant.label,
        unitPrice,
        quantity: item.quantity,
        totalPrice: lineTotal,
      });

      // Decrement stock now — simplification for a single-warehouse demo
      // scale system. A high-volume deployment would reserve stock at
      // add-to-cart time (with a TTL) and only finalize on payment.
      await tx.inventory.update({
        where: { id: variant.inventory.id },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          inventoryId: variant.inventory.id,
          type: "SALE",
          quantity: -item.quantity,
          reason: "Order placed",
        },
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;

    let discount = 0;
    let couponId = null;
    let freeShipping = false;
    if (cart.couponId) {
      const result = await couponsService.validateCouponForCart(cart.coupon.code, userId, cart.items, subtotal);
      discount = result.discount;
      freeShipping = result.freeShipping;
      couponId = result.coupon.id;
    }

    const shippingFee = subtotal - discount >= 999 || freeShipping || subtotal === 0 ? 0 : 60;
    const totalAmount = Math.round((subtotal - discount + taxAmount + shippingFee) * 100) / 100;

    const order = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
        subtotal,
        discount,
        shippingFee,
        taxAmount,
        totalAmount,
        couponId,
        notes,
        items: { create: orderItemsData },
        timeline: {
          create: {
            status: paymentMethod === "COD" ? "CONFIRMED" : "PENDING",
            note: paymentMethod === "COD" ? "Order confirmed (Cash on Delivery)" : "Awaiting payment",
          },
        },
      },
      include: orderInclude,
    });

    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethod,
        status: paymentMethod === "COD" ? "PENDING" : "PENDING",
        amount: totalAmount,
        provider: paymentMethod === "RAZORPAY" ? "razorpay" : null,
      },
    });

    if (couponId) {
      await tx.couponUsage.create({ data: { couponId, userId, orderId: order.id } });
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

    let razorpayOrder = null;
    if (paymentMethod === "RAZORPAY") {
      razorpayOrder = await paymentsService.createRazorpayOrder({
        amountInRupees: totalAmount,
        receipt: order.orderNumber,
        notes: { orderId: order.id, userId },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { providerOrderId: razorpayOrder.providerOrderId } });
    } else {
      const { subject, html } = templates.orderConfirmation(order);
      const user = await tx.user.findUnique({ where: { id: userId } });
      sendEmail({ to: user.email, subject, html }).catch((err) => logger.error({ err }, "order email failed"));
    }

    return {
      order,
      payment,
      // Only present for RAZORPAY orders — everything the frontend's
      // Razorpay Checkout widget needs. Kept separate from `payment`
      // above deliberately: `payment.amount` is rupees (from the DB,
      // matching every other order/payment view in the app), while
      // Razorpay's own `amount` is in paise. Merging them into one
      // object would make `amount` silently mean different things
      // depending on payment method — a real bug waiting to happen.
      razorpayCheckout: razorpayOrder,
    };
  });
}

async function verifyPayment(userId, orderId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
  if (!order) throw ApiError.notFound("Order not found");
  if (!order.payment || order.payment.providerOrderId !== razorpayOrderId) {
    throw ApiError.badRequest("Payment does not match this order");
  }

  const valid = paymentsService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) throw ApiError.badRequest("Payment verification failed. If money was deducted, contact support.");

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        timeline: { create: { status: "CONFIRMED", note: "Payment verified" } },
      },
      include: orderInclude,
    }),
    prisma.payment.update({
      where: { orderId },
      data: {
        status: "PAID",
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
        paidAt: new Date(),
      },
    }),
  ]);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const { subject, html } = templates.orderConfirmation(updatedOrder);
  sendEmail({ to: user.email, subject, html }).catch(() => {});

  return updatedOrder;
}

async function getOrderById(orderId, user) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.userId !== user.id && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(user.role)) {
    throw ApiError.forbidden("You do not have access to this order");
  }
  return order;
}

async function listUserOrders(userId, { skip, limit, status }) {
  const where = { userId, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: orderInclude }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

async function listAllOrders({ skip, limit, status }) {
  const where = status ? { status } : {};
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { ...orderInclude, user: { select: { id: true, fullName: true, email: true, phone: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  return { items, total };
}

async function restockOrderItems(tx, orderId) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    const inventory = await tx.inventory.findUnique({ where: { variantId: item.variantId } });
    if (!inventory) continue;
    await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: { increment: item.quantity } } });
    await tx.inventoryMovement.create({
      data: { inventoryId: inventory.id, type: "RETURN", quantity: item.quantity, reason: "Order cancelled/returned", referenceId: orderId },
    });
  }
}

async function cancelOrder(userId, orderId, reason) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId }, include: { payment: true } });
  if (!order) throw ApiError.notFound("Order not found");
  if (!ACTIVE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(`Order cannot be cancelled once it is ${order.status.toLowerCase()}`);
  }

  return prisma.$transaction(async (tx) => {
    await restockOrderItems(tx, orderId);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        timeline: { create: { status: "CANCELLED", note: reason } },
      },
      include: orderInclude,
    });

    if (order.payment?.status === "PAID") {
      await tx.payment.update({ where: { orderId }, data: { status: "REFUNDED", refundedAmount: order.payment.amount } });
      if (order.payment.providerPaymentId) {
        paymentsService
          .refundPayment(order.payment.providerPaymentId, Number(order.payment.amount))
          .catch((err) => logger.error({ err, orderId }, "Refund failed after cancellation"));
      }
    }

    return updated;
  });
}

async function adminUpdateStatus(orderId, { status, note, trackingNumber, courierName }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw ApiError.notFound("Order not found");

  return prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" && ACTIVE_STATUSES.includes(order.status)) {
      await restockOrderItems(tx, orderId);
    }
    if (status === "DELIVERED") {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { totalSold: { increment: item.quantity } } });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
        ...(courierName ? { courierName } : {}),
        timeline: { create: { status, note } },
      },
      include: orderInclude,
    });
  });
}

async function createReturnRequest(userId, orderId, { reason, isPartial, refundAmount }) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw ApiError.notFound("Order not found");
  if (order.status !== "DELIVERED") throw ApiError.badRequest("Only delivered orders can be returned");

  return prisma.returnRequest.create({
    data: { orderId, reason, isPartial: !!isPartial, refundAmount },
  });
}

async function adminHandleReturn(returnId, { status, refundAmount }) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: { order: { include: { payment: true } } },
  });
  if (!returnRequest) throw ApiError.notFound("Return request not found");

  const updated = await prisma.returnRequest.update({
    where: { id: returnId },
    data: { status, refundAmount },
  });

  if (status === "REFUNDED" && returnRequest.order.payment?.providerPaymentId) {
    await paymentsService.refundPayment(
      returnRequest.order.payment.providerPaymentId,
      refundAmount || Number(returnRequest.order.payment.amount)
    );
    await prisma.payment.update({
      where: { orderId: returnRequest.orderId },
      data: {
        status: refundAmount && refundAmount < Number(returnRequest.order.payment.amount) ? "PARTIALLY_REFUNDED" : "REFUNDED",
        refundedAmount: refundAmount || Number(returnRequest.order.payment.amount),
      },
    });
    await prisma.order.update({
      where: { id: returnRequest.orderId },
      data: { status: "REFUNDED", timeline: { create: { status: "REFUNDED", note: "Refund processed" } } },
    });
  }

  return updated;
}

module.exports = {
  placeOrder,
  verifyPayment,
  getOrderById,
  listUserOrders,
  listAllOrders,
  cancelOrder,
  adminUpdateStatus,
  createReturnRequest,
  adminHandleReturn,
};
