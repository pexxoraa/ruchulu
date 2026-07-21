const router = require("express").Router();
const { z } = require("zod");
const controller = require("./products.controller");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole, optionalAuth } = require("../../middlewares/auth");
const {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  idParamSchema,
  slugParamSchema,
  addImageSchema,
} = require("./products.validators");

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with filters, search, and sorting
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug, e.g. "pickles"
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [VEG, NON_VEG] }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 *       - in: query
 *         name: bestSeller
 *         schema: { type: boolean }
 *       - in: query
 *         name: inStock
 *         schema: { type: boolean }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, price_asc, price_desc, rating, popularity] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated product list }
 */
router.get("/", optionalAuth, validate({ query: listProductsQuerySchema }), controller.list);

/**
 * @openapi
 * /products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product by its slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: avakaya-mango-pickle
 *     responses:
 *       200: { description: Product detail }
 *       404: { description: Product not found }
 */
router.get("/:slug", optionalAuth, validate({ params: slugParamSchema }), controller.getBySlug);

/**
 * @openapi
 * /products/{slug}/related:
 *   get:
 *     tags: [Products]
 *     summary: Get related products (same category)
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Related products }
 */
router.get("/:slug/related", validate({ params: slugParamSchema }), controller.getRelated);

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a product with its weight variants (admin/manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, categoryId, basePrice, variants]
 *             properties:
 *               name: { type: string, example: "Avakaya Mango Pickle" }
 *               slug: { type: string, description: "Auto-generated from name if omitted" }
 *               sku: { type: string, description: "Auto-generated if omitted" }
 *               categoryId: { type: string, format: uuid }
 *               type: { type: string, enum: [VEG, NON_VEG], default: VEG }
 *               shortDescription: { type: string }
 *               description: { type: string }
 *               ingredients: { type: string }
 *               shelfLifeDays: { type: integer }
 *               storageInstructions: { type: string }
 *               spiceLevel: { type: string, enum: [LOW, MEDIUM, HIGH] }
 *               basePrice: { type: number, example: 329 }
 *               offerPrice: { type: number }
 *               gstPercent: { type: number, default: 5 }
 *               status: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED], default: DRAFT }
 *               isFeatured: { type: boolean }
 *               isTrending: { type: boolean }
 *               isBestSeller: { type: boolean }
 *               tags: { type: array, items: { type: string } }
 *               warehouseId: { type: string, format: uuid, description: "Defaults to the first active warehouse if omitted" }
 *               variants:
 *                 type: array
 *                 description: At least one weight/pack-size option is required
 *                 items:
 *                   type: object
 *                   required: [label, price]
 *                   properties:
 *                     label: { type: string, example: "500g" }
 *                     price: { type: number, example: 329 }
 *                     offerPrice: { type: number }
 *                     weightGrams: { type: integer, example: 500 }
 *                     isDefault: { type: boolean }
 *                     initialStock: { type: integer, default: 0 }
 *     responses:
 *       201: { description: Product created }
 *       400: { description: No warehouse configured, or invalid category }
 *       409: { description: Slug or SKU already exists }
 */
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ body: createProductSchema }),
  controller.create
);

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (admin/manager)
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
 *             description: Any subset of the product-creation fields (variants are managed separately — this endpoint doesn't touch them)
 *             properties:
 *               name: { type: string }
 *               categoryId: { type: string, format: uuid }
 *               basePrice: { type: number }
 *               offerPrice: { type: number }
 *               status: { type: string, enum: [DRAFT, ACTIVE, INACTIVE, ARCHIVED] }
 *               isFeatured: { type: boolean }
 *               isBestSeller: { type: boolean }
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: updateProductSchema }),
  controller.update
);

/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Archive a product (soft delete — admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product archived }
 *       404: { description: Product not found }
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  controller.remove
);

/**
 * @openapi
 * /products/{id}/images:
 *   post:
 *     tags: [Products]
 *     summary: Attach an image (by URL) to a product
 *     description: This adds an image record pointing at an already-hosted URL. To upload a new file first, use POST /uploads, then pass the returned URL here.
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
 *             required: [url]
 *             properties:
 *               url: { type: string, format: uri }
 *               altText: { type: string }
 *               isVideo: { type: boolean, default: false }
 *               sortOrder: { type: integer }
 *     responses:
 *       201: { description: Image added }
 *       404: { description: Product not found }
 */
router.post(
  "/:id/images",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: addImageSchema }),
  controller.addImage
);

/**
 * @openapi
 * /products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Products]
 *     summary: Remove an image from a product
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Image removed }
 */
router.delete(
  "/:id/images/:imageId",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema.extend({ imageId: z.string().uuid() }) }),
  controller.removeImage
);

module.exports = router;
