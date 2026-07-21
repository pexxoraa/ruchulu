const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");

const bannerSchema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  position: z.string().default("HOME_HERO"),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});
const idParamSchema = z.object({ id: z.string().uuid() });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const isPublic = !req.headers.authorization;
    const where = isPublic
      ? {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          ...(req.query.position ? { position: req.query.position } : {}),
        }
      : req.query.position
      ? { position: req.query.position }
      : {};

    const banners = await prisma.banner.findMany({ where, orderBy: { sortOrder: "asc" } });
    new ApiResponse(200, banners).send(res);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ body: bannerSchema }),
  asyncHandler(async (req, res) => {
    const banner = await prisma.banner.create({ data: req.body });
    new ApiResponse(201, banner, "Banner created").send(res);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: bannerSchema.partial() }),
  asyncHandler(async (req, res) => {
    const banner = await prisma.banner.update({ where: { id: req.params.id }, data: req.body });
    new ApiResponse(200, banner, "Banner updated").send(res);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.banner.delete({ where: { id: req.params.id } });
    new ApiResponse(200, null, "Banner deleted").send(res);
  })
);

module.exports = router;
