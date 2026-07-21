const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");

router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await prisma.setting.findMany();
    const asObject = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    new ApiResponse(200, asObject).send(res);
  })
);

router.put(
  "/:key",
  validate({ params: z.object({ key: z.string().min(1) }), body: z.object({ value: z.any() }) }),
  asyncHandler(async (req, res) => {
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value: req.body.value },
      create: { key: req.params.key, value: req.body.value },
    });
    new ApiResponse(200, setting, "Setting updated").send(res);
  })
);

module.exports = router;
