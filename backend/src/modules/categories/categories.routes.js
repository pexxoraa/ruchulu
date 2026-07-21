const router = require("express").Router();
const controller = require("./categories.controller");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  idParamSchema,
  slugParamSchema,
} = require("./categories.validators");

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories (flat, paginated)
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Paginated category list }
 */
router.get("/", validate({ query: listCategoriesQuerySchema }), controller.list);

/**
 * @openapi
 * /categories/tree:
 *   get:
 *     tags: [Categories]
 *     summary: Get the full nested category tree (for navigation menus)
 *     responses:
 *       200: { description: Nested category tree }
 */
router.get("/tree", controller.tree);

/**
 * @openapi
 * /categories/{slug}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a single category by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: pickles
 *     responses:
 *       200: { description: Category detail }
 *       404: { description: Category not found }
 */
router.get("/:slug", validate({ params: slugParamSchema }), controller.getBySlug);

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (admin/manager)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Podis" }
 *               slug: { type: string, description: "Auto-generated from name if omitted" }
 *               description: { type: string }
 *               imageUrl: { type: string, format: uri }
 *               bannerUrl: { type: string, format: uri }
 *               parentId: { type: string, format: uuid, description: "Omit for a top-level category" }
 *               metaTitle: { type: string }
 *               metaDescription: { type: string }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean, default: true }
 *     responses:
 *       201: { description: Category created }
 *       409: { description: A category with this slug already exists }
 */
router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ body: createCategorySchema }),
  controller.create
);

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update a category (admin/manager)
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
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               sortOrder: { type: integer }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Category updated }
 *       404: { description: Category not found }
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: updateCategorySchema }),
  controller.update
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (admin only — fails if it still has products or subcategories)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Category deleted }
 *       400: { description: Category still has products or subcategories attached }
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  controller.remove
);

module.exports = router;
