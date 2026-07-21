const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");
const { slugify } = require("../../utils/helpers");

const blogSchema = z.object({
  title: z.string().min(3),
  slug: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(10),
  authorName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});
const idParamSchema = z.object({ id: z.string().uuid() });
const slugParamSchema = z.object({ slug: z.string() });

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const isPublic = !req.headers.authorization;
    const where = isPublic ? { isPublished: true } : {};
    const [items, total] = await Promise.all([
      prisma.blog.findMany({ where, skip, take: limit, orderBy: { publishedAt: "desc" } }),
      prisma.blog.count({ where }),
    ]);
    new ApiResponse(200, items, "Blog posts fetched", buildMeta({ page, limit, total })).send(res);
  })
);

router.get(
  "/:slug",
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const post = await prisma.blog.findUnique({ where: { slug: req.params.slug } });
    if (!post || (!post.isPublished && !req.headers.authorization)) throw ApiError.notFound("Blog post not found");
    new ApiResponse(200, post).send(res);
  })
);

router.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ body: blogSchema }),
  asyncHandler(async (req, res) => {
    const slug = req.body.slug ? slugify(req.body.slug) : slugify(req.body.title);
    const post = await prisma.blog.create({
      data: { ...req.body, slug, publishedAt: req.body.isPublished ? new Date() : null },
    });
    new ApiResponse(201, post, "Blog post created").send(res);
  })
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"),
  validate({ params: idParamSchema, body: blogSchema.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.blog.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound("Blog post not found");

    const data = { ...req.body };
    if (data.slug) data.slug = slugify(data.slug);
    if (data.isPublished && !existing.publishedAt) data.publishedAt = new Date();

    const post = await prisma.blog.update({ where: { id: req.params.id }, data });
    new ApiResponse(200, post, "Blog post updated").send(res);
  })
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await prisma.blog.delete({ where: { id: req.params.id } });
    new ApiResponse(200, null, "Blog post deleted").send(res);
  })
);

module.exports = router;
