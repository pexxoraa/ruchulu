const { z } = require("zod");

const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional().nullable(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const listCategoriesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  parentId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const slugParamSchema = z.object({ slug: z.string() });

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  idParamSchema,
  slugParamSchema,
};
