const { prisma } = require("../../config/database");

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" } },
  variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { price: "asc" } },
};

const productRepository = {
  findMany: (where, { skip, take, orderBy }) =>
    prisma.product.findMany({ where, skip, take, orderBy, include: productInclude }),

  count: (where) => prisma.product.count({ where }),

  findById: (id) => prisma.product.findUnique({ where: { id }, include: productInclude }),

  findBySlug: (slug) => prisma.product.findUnique({ where: { slug }, include: productInclude }),

  skuExists: (sku) => prisma.product.findUnique({ where: { sku } }),

  slugExists: (slug, excludeId) =>
    prisma.product.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } }),

  create: (data) => prisma.product.create({ data, include: productInclude }),

  update: (id, data) => prisma.product.update({ where: { id }, data, include: productInclude }),

  delete: (id) => prisma.product.delete({ where: { id } }),

  addImage: (productId, data) => prisma.productImage.create({ data: { ...data, productId } }),

  removeImage: (imageId) => prisma.productImage.delete({ where: { id: imageId } }),

  findRelated: (productId, categoryId, limit = 8) =>
    prisma.product.findMany({
      where: { categoryId, id: { not: productId }, status: "ACTIVE" },
      take: limit,
      include: productInclude,
      orderBy: { totalSold: "desc" },
    }),

  updateRatingAggregate: async (productId) => {
    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating || 0,
        reviewCount: agg._count.rating || 0,
      },
    });
  },
};

module.exports = productRepository;
