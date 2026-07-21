const router = require("express").Router();
const controller = require("./cart.controller");
const validate = require("../../middlewares/validate");
const { optionalAuth } = require("../../middlewares/auth");
const { addItemSchema, updateItemSchema, applyCouponSchema, itemParamSchema } = require("./cart.validators");

// Cart works for guests too, so auth is optional everywhere here.
router.use(optionalAuth);

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get the current cart (guest or logged-in)
 *     description: If logged in (Bearer token), returns your persistent cart. If not, returns/creates a guest cart tracked via a cookie.
 *     responses:
 *       200: { description: Cart with computed subtotal, discount, shipping and total }
 */
router.get("/", controller.getCart);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add an item to the cart
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, variantId]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               variantId: { type: string, format: uuid }
 *               quantity: { type: integer, default: 1 }
 *     responses:
 *       200: { description: Updated cart }
 *       400: { description: Invalid product/variant, product unavailable, or insufficient stock }
 */
router.post("/items", validate({ body: addItemSchema }), controller.addItem);

/**
 * @openapi
 * /cart/items/{itemId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update a cart item's quantity
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, example: 2 }
 *     responses:
 *       200: { description: Updated cart }
 *       400: { description: Insufficient stock for the requested quantity }
 *       404: { description: Cart item not found }
 */
router.patch("/items/:itemId", validate({ params: itemParamSchema, body: updateItemSchema }), controller.updateItem);

/**
 * @openapi
 * /cart/items/{itemId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove an item from the cart
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated cart }
 *       404: { description: Cart item not found }
 */
router.delete("/items/:itemId", validate({ params: itemParamSchema }), controller.removeItem);

/**
 * @openapi
 * /cart:
 *   delete:
 *     tags: [Cart]
 *     summary: Clear the entire cart
 *     responses:
 *       200: { description: Empty cart }
 */
router.delete("/", controller.clearCart);

/**
 * @openapi
 * /cart/coupon:
 *   post:
 *     tags: [Cart]
 *     summary: Apply a coupon code to the cart (requires login)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "WELCOME10" }
 *     responses:
 *       200: { description: Cart with coupon discount applied }
 *       400: { description: Invalid, expired, or inapplicable coupon }
 *       401: { description: Must be logged in to apply a coupon }
 */
router.post("/coupon", validate({ body: applyCouponSchema }), controller.applyCoupon);

/**
 * @openapi
 * /cart/coupon:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove the applied coupon from the cart
 *     responses:
 *       200: { description: Cart with coupon removed }
 */
router.delete("/coupon", controller.removeCoupon);

module.exports = router;
