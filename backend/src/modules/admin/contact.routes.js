const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(5).max(2000),
});

/**
 * @openapi
 * /contact:
 *   post:
 *     tags: [Contact]
 *     summary: Submit a contact form message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, message]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               subject: { type: string }
 *               message: { type: string, example: "I'd like to place a bulk order for a wedding." }
 *     responses:
 *       201: { description: Message received }
 */
router.post(
  "/",
  validate({ body: contactSchema }),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.create({ data: req.body });
    new ApiResponse(201, message, "Thanks — we'll get back to you within a day.").send(res);
  })
);

router.get(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const where = req.query.resolved != null ? { isResolved: req.query.resolved === "true" } : {};
    const [items, total] = await Promise.all([
      prisma.contactMessage.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.contactMessage.count({ where }),
    ]);
    new ApiResponse(200, items, "Messages fetched", buildMeta({ page, limit, total })).send(res);
  })
);

router.patch(
  "/:id/resolve",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const message = await prisma.contactMessage.update({ where: { id: req.params.id }, data: { isResolved: true } });
    new ApiResponse(200, message, "Marked as resolved").send(res);
  })
);

module.exports = router;
