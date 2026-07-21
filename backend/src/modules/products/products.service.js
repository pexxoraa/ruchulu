const { prisma } = require("../../config/database");
const productRepository = require("./products.repository");
const categoryRepository = require("../categories/categories.repository");
const ApiError = require("../../utils/ApiError");
const { slugify, generateSku } = require("../../utils/helpers");
const redis = require("../../config/redis");

const CACHE_TTL_SECONDS = 60;

function buildSortOrder(sort) {
  switch (sort) {
    case "price_asc":
      return [{ basePrice: "asc" }];
    case "price_desc":
      return [{ basePrice: "desc" }];
    case "rating":
      return [{ avgRating: "desc" }];
    case "popularity":
      return [{ totalSold: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

async function listProducts(filters, { skip, limit }) {
  const where = { status: filters.status || "ACTIVE" };

  if (filters.category) {
    const category = await categoryRepository.findBySlug(filters.category);
    if (!category) return { items: [], total: 0 };
    where.categoryId = category.id;
  }
  if (filters.type) where.type = filters.type;
  if (filters.spiceLevel) where.spiceLevel = filters.spiceLevel;
  if (filters.featured) where.isFeatured = true;
  if (filters.trending) where.isTrending = true;
  if (filters.bestSeller) where.isBestSeller = true;
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.basePrice = {
      ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.inStock) {
    where.variants = { some: { isActive: true, inventory: { quantity: { gt: 0 } } } };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } },
      { tags: { has: filters.q.toLowerCase() } },
    ];
  }

  const orderBy = buildSortOrder(filters.sort);

  const [items, total] = await Promise.all([
    productRepository.findMany(where, { skip, take: limit, orderBy }),
    productRepository.count(where),
  ]);

  return { items, total };
}

async function getProductBySlug(slug) {
  const cacheKey = `product:slug:${slug}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached);

  const product = await productRepository.findBySlug(slug);
  if (!product) throw ApiError.notFound("Product not found");

  redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(product)).catch(() => {});
  return product;
}

async function invalidateProductCache(slug) {
  if (slug) await redis.del(`product:slug:${slug}`).catch(() => {});
}

async function getRelatedProducts(slug, limit = 8) {
  const product = await productRepository.findBySlug(slug);
  if (!product) throw ApiError.notFound("Product not found");
  return productRepository.findRelated(product.id, product.categoryId, limit);
}

async function createProduct(data, warehouseId) {
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  if (await productRepository.slugExists(slug)) {
    throw ApiError.conflict("A product with this slug already exists");
  }

  const sku = data.sku || generateSku("PROD");
  if (await productRepository.skuExists(sku)) {
    throw ApiError.conflict("A product with this SKU already exists");
  }

  const category = await categoryRepository.findById(data.categoryId);
  if (!category) throw ApiError.badRequest("Category does not exist");

  let warehouse = warehouseId ? await prisma.warehouse.findUnique({ where: { id: warehouseId } }) : null;
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } });
  }
  if (!warehouse) {
    throw ApiError.badRequest("No warehouse configured. Create a warehouse before adding products.");
  }

  const { variants, ...productData } = data;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...productData, slug, sku },
    });

    for (const [index, v] of variants.entries()) {
      const variant = await tx.productVariant.create({
        data: {
          productId: product.id,
          label: v.label,
          sku: generateSku(sku),
          price: v.price,
          offerPrice: v.offerPrice,
          weightGrams: v.weightGrams,
          isDefault: v.isDefault ?? index === 0,
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          warehouseId: warehouse.id,
          quantity: v.initialStock || 0,
        },
      });
    }

    return productRepository.findById(product.id);
  });
}

async function updateProduct(id, data) {
  const product = await productRepository.findById(id);
  if (!product) throw ApiError.notFound("Product not found");

  const updateData = { ...data };
  if (data.name && !data.slug) updateData.slug = slugify(data.name);
  if (data.slug) updateData.slug = slugify(data.slug);

  if (updateData.slug) {
    const existing = await productRepository.slugExists(updateData.slug, id);
    if (existing) throw ApiError.conflict("A product with this slug already exists");
  }
  if (data.categoryId) {
    const category = await categoryRepository.findById(data.categoryId);
    if (!category) throw ApiError.badRequest("Category does not exist");
  }

  const updated = await productRepository.update(id, updateData);
  await invalidateProductCache(product.slug);
  if (updated.slug !== product.slug) await invalidateProductCache(updated.slug);
  return updated;
}

async function deleteProduct(id) {
  const product = await productRepository.findById(id);
  if (!product) throw ApiError.notFound("Product not found");
  await productRepository.update(id, { status: "ARCHIVED" }); // soft-delete by archiving
  await invalidateProductCache(product.slug);
}

async function addProductImage(productId, data) {
  const product = await productRepository.findById(productId);
  if (!product) throw ApiError.notFound("Product not found");
  return productRepository.addImage(productId, data);
}

async function removeProductImage(imageId) {
  await productRepository.removeImage(imageId);
}

module.exports = {
  listProducts,
  getProductBySlug,
  getRelatedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
  invalidateProductCache,
};
