const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth } = require("../../middlewares/auth");
const cartService = require("../cart/cart.service");

const productIdSchema = z.object({ productId: z.string().uuid() });
const moveToCartSchema = z.object({ variantId: z.string().uuid(), quantity: z.coerce.number().int().positive().default(1) });

router.use(requireAuth);

/**
 * @openapi
 * /wishlist:
 *   get:
 *     tags: [Wishlist]
 *     summary: Get the current user's wishlist
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    new ApiResponse(200, items).send(res);
  })
);

/**
 * @openapi
 * /wishlist:
 *   post:
 *     tags: [Wishlist]
 *     summary: Add a product to the wishlist
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Added to wishlist }
 *       404: { description: Product not found }
 */
router.post(
  "/",
  validate({ body: productIdSchema }),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.body.productId } });
    if (!product) throw ApiError.notFound("Product not found");

    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId: req.body.productId } },
      update: {},
      create: { userId: req.user.id, productId: req.body.productId },
    });
    new ApiResponse(201, item, "Added to wishlist").send(res);
  })
);

/**
 * @openapi
 * /wishlist/{productId}:
 *   delete:
 *     tags: [Wishlist]
 *     summary: Remove a product from the wishlist
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Removed from wishlist }
 */
router.delete(
  "/:productId",
  validate({ params: productIdSchema }),
  asyncHandler(async (req, res) => {
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
    new ApiResponse(200, null, "Removed from wishlist").send(res);
  })
);

/**
 * @openapi
 * /wishlist/{productId}/move-to-cart:
 *   post:
 *     tags: [Wishlist]
 *     summary: Move a wishlist item into the cart (and remove it from the wishlist)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [variantId]
 *             properties:
 *               variantId: { type: string, format: uuid, description: "Which weight/pack-size variant to add" }
 *               quantity: { type: integer, default: 1 }
 *     responses:
 *       200: { description: Updated cart }
 */
router.post(
  "/:productId/move-to-cart",
  validate({ params: productIdSchema, body: moveToCartSchema }),
  asyncHandler(async (req, res) => {
    const cart = await cartService.addItem(
      { userId: req.user.id },
      { productId: req.params.productId, variantId: req.body.variantId, quantity: req.body.quantity }
    );
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId: req.params.productId } });
    new ApiResponse(200, cart, "Moved to cart").send(res);
  })
);

module.exports = router;
