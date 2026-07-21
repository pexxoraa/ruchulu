const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole, optionalAuth } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");
const productRepository = require("../products/products.repository");

const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
  videos: z.array(z.string().url()).max(2).optional(),
});

const adminReplySchema = z.object({ adminReply: z.string().min(1).max(1000) });
const moderateSchema = z.object({ isApproved: z.boolean() });
const idParamSchema = z.object({ id: z.string().uuid() });
const productIdParamSchema = z.object({ productId: z.string().uuid() });

/**
 * @openapi
 * /reviews/product/{productId}:
 *   get:
 *     tags: [Reviews]
 *     summary: List approved reviews for a product
 */
router.get(
  "/product/:productId",
  validate({ params: productIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { productId: req.params.productId, isApproved: true };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
      }),
      prisma.review.count({ where }),
    ]);
    new ApiResponse(200, items, "Reviews fetched", buildMeta({ page, limit, total })).send(res);
  })
);

/**
 * @openapi
 * /reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Submit a review for a product (goes into moderation before appearing publicly)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, rating]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               comment: { type: string }
 *               images: { type: array, items: { type: string, format: uri }, maxItems: 5 }
 *               videos: { type: array, items: { type: string, format: uri }, maxItems: 2 }
 *     responses:
 *       201: { description: Review submitted and pending approval }
 *       404: { description: Product not found }
 */
router.post(
  "/",
  requireAuth,
  validate({ body: createReviewSchema }),
  asyncHandler(async (req, res) => {
    const { productId, rating, title, comment, images, videos } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound("Product not found");

    // A review counts as "verified purchase" if the user has a delivered
    // order containing this product.
    const deliveredPurchase = await prisma.orderItem.findFirst({
      where: { productId, order: { userId: req.user.id, status: "DELIVERED" } },
    });

    const review = await prisma.review.upsert({
      where: { productId_userId: { productId, userId: req.user.id } },
      update: { rating, title, comment, images, videos, isApproved: false },
      create: {
        productId,
        userId: req.user.id,
        rating,
        title,
        comment,
        images: images || [],
        videos: videos || [],
        isVerifiedPurchase: !!deliveredPurchase,
        isApproved: false, // goes through moderation before appearing publicly
      },
    });

    new ApiResponse(201, review, "Review submitted and pending approval").send(res);
  })
);

router.post(
  "/:id/helpful",
  optionalAuth,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { helpfulVotes: { increment: 1 } },
    });
    new ApiResponse(200, review, "Thanks for your feedback").send(res);
  })
);

// --- Admin moderation ---
router.get(
  "/admin/pending",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { isApproved: false };
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, fullName: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);
    new ApiResponse(200, items, "Pending reviews", buildMeta({ page, limit, total })).send(res);
  })
);

router.patch(
  "/:id/moderate",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: moderateSchema }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { isApproved: req.body.isApproved },
    });
    await productRepository.updateRatingAggregate(review.productId);
    new ApiResponse(200, review, "Review moderated").send(res);
  })
);

router.patch(
  "/:id/reply",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: adminReplySchema }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { adminReply: req.body.adminReply },
    });
    new ApiResponse(200, review, "Reply added").send(res);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const review = await prisma.review.delete({ where: { id: req.params.id } });
    await productRepository.updateRatingAggregate(review.productId);
    new ApiResponse(200, null, "Review deleted").send(res);
  })
);

module.exports = router;
