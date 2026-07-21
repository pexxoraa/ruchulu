const router = require("express").Router();
const couponsService = require("./coupons.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");
const { createCouponSchema, updateCouponSchema, idParamSchema } = require("./coupons.validators");

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await couponsService.listCoupons({
    skip,
    limit,
    isActive: req.query.isActive != null ? req.query.isActive === "true" : undefined,
  });
  new ApiResponse(200, items, "Coupons fetched", buildMeta({ page, limit, total })).send(res);
});

const create = asyncHandler(async (req, res) => {
  const coupon = await couponsService.createCoupon(req.body);
  new ApiResponse(201, coupon, "Coupon created").send(res);
});

const update = asyncHandler(async (req, res) => {
  const coupon = await couponsService.updateCoupon(req.params.id, req.body);
  new ApiResponse(200, coupon, "Coupon updated").send(res);
});

const remove = asyncHandler(async (req, res) => {
  await couponsService.deleteCoupon(req.params.id);
  new ApiResponse(200, null, "Coupon deactivated").send(res);
});

/**
 * @openapi
 * /coupons:
 *   get:
 *     tags: [Coupons]
 *     summary: List coupons (admin/manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated coupon list }
 */
router.get("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"), list);

/**
 * @openapi
 * /coupons:
 *   post:
 *     tags: [Coupons]
 *     summary: Create a coupon (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value]
 *             properties:
 *               code: { type: string, example: "WELCOME10" }
 *               description: { type: string }
 *               type: { type: string, enum: [PERCENTAGE, FLAT, FREE_SHIPPING] }
 *               value: { type: number, description: "Percentage (e.g. 10) or flat rupee amount, depending on type" }
 *               minOrderAmount: { type: number }
 *               maxDiscountAmount: { type: number, description: "Caps the discount for PERCENTAGE coupons" }
 *               usageLimit: { type: integer, description: "Total redemptions allowed across all customers" }
 *               usageLimitPerUser: { type: integer, default: 1 }
 *               applicableCategoryIds: { type: array, items: { type: string, format: uuid } }
 *               applicableProductIds: { type: array, items: { type: string, format: uuid } }
 *               isFestival: { type: boolean }
 *               isReferral: { type: boolean }
 *               startsAt: { type: string, format: date-time }
 *               expiresAt: { type: string, format: date-time }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201: { description: Coupon created }
 *       409: { description: A coupon with this code already exists }
 */
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ body: createCouponSchema }),
  create
);

/**
 * @openapi
 * /coupons/{id}:
 *   patch:
 *     tags: [Coupons]
 *     summary: Update a coupon (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any subset of the coupon-creation fields
 *             properties:
 *               isActive: { type: boolean }
 *               expiresAt: { type: string, format: date-time }
 *     responses:
 *       200: { description: Coupon updated }
 *       404: { description: Coupon not found }
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema, body: updateCouponSchema }),
  update
);

/**
 * @openapi
 * /coupons/{id}:
 *   delete:
 *     tags: [Coupons]
 *     summary: Deactivate a coupon (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Coupon deactivated }
 *       404: { description: Coupon not found }
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  remove
);

module.exports = router;
