const { z } = require("zod");

const variantInput = z.object({
  label: z.string().min(1),
  price: z.coerce.number().positive(),
  offerPrice: z.coerce.number().positive().optional(),
  weightGrams: z.coerce.number().int().positive().optional(),
  isDefault: z.boolean().optional(),
  initialStock: z.coerce.number().int().nonnegative().default(0),
});

const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().uuid(),
  type: z.enum(["VEG", "NON_VEG"]).default("VEG"),
  shortDescription: z.string().max(300).optional(),
  description: z.string().optional(),
  ingredients: z.string().optional(),
  nutritionInfo: z.record(z.any()).optional(),
  shelfLifeDays: z.coerce.number().int().positive().optional(),
  storageInstructions: z.string().optional(),
  spiceLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  basePrice: z.coerce.number().positive(),
  offerPrice: z.coerce.number().positive().optional(),
  gstPercent: z.coerce.number().min(0).max(28).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantInput).min(1, "At least one weight/variant option is required"),
  warehouseId: z.string().uuid().optional(),
});

const updateProductSchema = createProductSchema.partial().omit({ variants: true });

const listProductsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  category: z.string().optional(), // category slug
  type: z.enum(["VEG", "NON_VEG"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  spiceLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  featured: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  bestSeller: z.coerce.boolean().optional(),
  inStock: z.coerce.boolean().optional(),
  q: z.string().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "rating", "popularity"])
    .default("newest"),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });
const slugParamSchema = z.object({ slug: z.string() });

const addImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  isVideo: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  idParamSchema,
  slugParamSchema,
  addImageSchema,
  variantInput,
};
