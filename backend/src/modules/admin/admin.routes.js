const router = require("express").Router();
const { prisma } = require("../../config/database");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const { requireAuth, requireRole } = require("../../middlewares/auth");

router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"));

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

/**
 * @openapi
 * /admin/dashboard/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Key headline metrics for the admin dashboard
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const todayStart = startOfDay();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [
      todayOrders,
      todayRevenue,
      monthOrders,
      monthRevenue,
      totalCustomers,
      pendingOrders,
      pendingReturns,
      totalProducts,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.returnRequest.count({ where: { status: "REQUESTED" } }),
      prisma.product.count({ where: { status: "ACTIVE" } }),
    ]);

    // Prisma can't compare two columns (quantity <= lowStockAlertAt)
    // directly in a `where` filter, so low-stock count is computed here
    // in-memory. Fine at this catalog size; for a much larger inventory
    // this would move to a raw SQL query or a materialized view.
    const allInventory = await prisma.inventory.findMany({ select: { quantity: true, lowStockAlertAt: true } });
    const actualLowStock = allInventory.filter((i) => i.quantity <= i.lowStockAlertAt).length;

    new ApiResponse(200, {
      todayOrders,
      todayRevenue: todayRevenue._sum.totalAmount || 0,
      monthOrders,
      monthRevenue: monthRevenue._sum.totalAmount || 0,
      totalCustomers,
      pendingOrders,
      lowStockCount: actualLowStock,
      pendingReturns,
      totalProducts,
    }).send(res);
  })
);

router.get(
  "/recent-orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true, email: true } }, items: true },
    });
    new ApiResponse(200, orders).send(res);
  })
);

router.get(
  "/top-products",
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { totalSold: "desc" },
      take: 10,
      select: { id: true, name: true, slug: true, totalSold: true, avgRating: true, basePrice: true },
    });
    new ApiResponse(200, products).send(res);
  })
);

router.get(
  "/low-selling-products",
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { totalSold: "asc" },
      take: 10,
      select: { id: true, name: true, slug: true, totalSold: true },
    });
    new ApiResponse(200, products).send(res);
  })
);

/**
 * @openapi
 * /admin/dashboard/revenue-chart:
 *   get:
 *     tags: [Admin]
 *     summary: Daily revenue for the last N days (default 30)
 */
router.get(
  "/revenue-chart",
  asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 180);
    const since = daysAgo(days);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
      select: { createdAt: true, totalAmount: true },
    });

    const byDay = {};
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] || 0) + Number(order.totalAmount);
    }

    const series = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = daysAgo(i);
      const key = d.toISOString().slice(0, 10);
      series.push({ date: key, revenue: Math.round((byDay[key] || 0) * 100) / 100 });
    }

    new ApiResponse(200, series).send(res);
  })
);

router.get(
  "/customer-stats",
  asyncHandler(async (req, res) => {
    const [total, newThisMonth, repeatCustomers] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({
        where: { role: "CUSTOMER", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.order.groupBy({ by: ["userId"], _count: { userId: true } }).then((rows) => rows.filter((r) => r._count.userId > 1).length),
    ]);
    new ApiResponse(200, { total, newThisMonth, repeatCustomers }).send(res);
  })
);

router.get(
  "/latest-reviews",
  asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true } },
        product: { select: { name: true, slug: true } },
      },
    });
    new ApiResponse(200, reviews).send(res);
  })
);

router.get(
  "/pending-refunds",
  asyncHandler(async (req, res) => {
    const refunds = await prisma.returnRequest.findMany({
      where: { status: "REQUESTED" },
      include: { order: { select: { orderNumber: true, totalAmount: true, userId: true } } },
      orderBy: { createdAt: "asc" },
    });
    new ApiResponse(200, refunds).send(res);
  })
);

router.get(
  "/coupon-usage",
  asyncHandler(async (req, res) => {
    const coupons = await prisma.coupon.findMany({
      orderBy: { usedCount: "desc" },
      take: 20,
      select: { id: true, code: true, type: true, value: true, usedCount: true, usageLimit: true, isActive: true },
    });
    new ApiResponse(200, coupons).send(res);
  })
);

module.exports = router;
