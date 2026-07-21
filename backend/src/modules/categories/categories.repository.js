const { prisma } = require("../../config/database");

const categoryRepository = {
  findMany: (where, { skip, take } = {}) =>
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),

  count: (where) => prisma.category.count({ where }),

  findTree: (includeInactive = false) =>
    prisma.category.findMany({
      where: { parentId: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            children: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            },
          },
        },
      },
    }),

  findById: (id) =>
    prisma.category.findUnique({ where: { id }, include: { children: true, parent: true } }),

  findBySlug: (slug) =>
    prisma.category.findUnique({ where: { slug }, include: { children: true, parent: true } }),

  create: (data) => prisma.category.create({ data }),

  update: (id, data) => prisma.category.update({ where: { id }, data }),

  delete: (id) => prisma.category.delete({ where: { id } }),

  countProducts: (categoryId) => prisma.product.count({ where: { categoryId } }),

  countChildren: (categoryId) => prisma.category.count({ where: { parentId: categoryId } }),

  slugExists: (slug, excludeId) =>
    prisma.category.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) } }),
};

module.exports = categoryRepository;
