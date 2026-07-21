const router = require("express").Router();
const { z } = require("zod");
const controller = require("./orders.controller");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const {
  placeOrderSchema,
  verifyPaymentSchema,
  updateStatusSchema,
  cancelOrderSchema,
  returnRequestSchema,
  listOrdersQuerySchema,
  idParamSchema,
} = require("./orders.validators");

router.use(requireAuth);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place an order from the current cart
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId, paymentMethod]
 *             properties:
 *               addressId: { type: string, format: uuid }
 *               paymentMethod: { type: string, enum: [COD, RAZORPAY, UPI, WALLET] }
 *               notes: { type: string }
 *     responses:
 *       201: { description: "Order placed — for RAZORPAY, response includes the Razorpay order details needed to open Checkout" }
 *       400: { description: Cart is empty, address doesn't belong to you, or a stock/coupon problem }
 */
router.post("/", validate({ body: placeOrderSchema }), controller.placeOrder);

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List your own orders
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED, REFUNDED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated order list }
 */
router.get("/", validate({ query: listOrdersQuerySchema }), controller.listMine);

/**
 * @openapi
 * /orders/admin/all:
 *   get:
 *     tags: [Orders]
 *     summary: List every order in the system (admin/manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONFIRMED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED, REFUNDED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated order list, including customer details }
 */
router.get(
  "/admin/all",
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ query: listOrdersQuerySchema }),
  controller.listAll
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order details (your own order, or any order if you're staff)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Order detail — items, address, payment, status timeline }
 *       403: { description: Not your order }
 *       404: { description: Order not found }
 */
router.get("/:id", validate({ params: idParamSchema }), controller.getById);

/**
 * @openapi
 * /orders/{id}/verify-payment:
 *   post:
 *     tags: [Orders]
 *     summary: Verify a Razorpay payment and confirm the order
 *     description: Call this from the client after Razorpay Checkout's handler callback fires, using the three values it returns.
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
 *             required: [razorpayOrderId, razorpayPaymentId, razorpaySignature]
 *             properties:
 *               razorpayOrderId: { type: string }
 *               razorpayPaymentId: { type: string }
 *               razorpaySignature: { type: string }
 *     responses:
 *       200: { description: Payment verified, order confirmed }
 *       400: { description: Signature verification failed }
 */
router.post(
  "/:id/verify-payment",
  validate({ params: idParamSchema, body: verifyPaymentSchema }),
  controller.verifyPayment
);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel your own order (only while it's PENDING, CONFIRMED, or PACKED)
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Ordered by mistake" }
 *     responses:
 *       200: { description: Order cancelled, stock restocked, payment refunded if already paid }
 *       400: { description: Order can no longer be cancelled at its current status }
 */
router.post("/:id/cancel", validate({ params: idParamSchema, body: cancelOrderSchema }), controller.cancel);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update an order's status (admin/manager/delivery partner)
 *     description: This is the main endpoint for running the store day-to-day — move an order through PENDING → CONFIRMED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED, or CANCEL it.
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, CONFIRMED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURNED, REFUNDED] }
 *               note: { type: string, description: "Shown in the order's status timeline" }
 *               trackingNumber: { type: string }
 *               courierName: { type: string }
 *     responses:
 *       200: { description: Order status updated }
 *       404: { description: Order not found }
 */
router.patch(
  "/:id/status",
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER", "DELIVERY_PARTNER"),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  controller.adminUpdateStatus
);

/**
 * @openapi
 * /orders/{id}/return:
 *   post:
 *     tags: [Orders]
 *     summary: Request a return/refund for a delivered order
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Item arrived damaged" }
 *               isPartial: { type: boolean, default: false }
 *               refundAmount: { type: number, description: "Only relevant for a partial refund" }
 *     responses:
 *       201: { description: Return request submitted }
 *       400: { description: Only delivered orders can be returned }
 */
router.post(
  "/:id/return",
  validate({ params: idParamSchema, body: returnRequestSchema }),
  controller.requestReturn
);

/**
 * @openapi
 * /orders/returns/{returnId}:
 *   patch:
 *     tags: [Orders]
 *     summary: Approve, reject, or refund a return request (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: returnId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [REQUESTED, APPROVED, REJECTED, REFUNDED] }
 *               refundAmount: { type: number, description: "Setting status=REFUNDED triggers an actual Razorpay refund call if a refundAmount is given (or the full order amount otherwise)" }
 *     responses:
 *       200: { description: Return request updated }
 *       404: { description: Return request not found }
 */
router.patch(
  "/returns/:returnId",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({
    params: z.object({ returnId: z.string().uuid() }),
    body: z.object({
      status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "REFUNDED"]),
      refundAmount: z.coerce.number().positive().optional(),
    }),
  }),
  controller.handleReturn
);

module.exports = router;
