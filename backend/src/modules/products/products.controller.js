const productsService = require("./products.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const { parsePagination, buildMeta } = require("../../utils/helpers");
const { prisma } = require("../../config/database");

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  // Only staff can request non-ACTIVE statuses (e.g. to preview drafts)
  const status = req.user && ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(req.user.role) ? req.query.status : undefined;

  const { items, total } = await productsService.listProducts(
    { ...req.query, status },
    { skip, limit }
  );
  new ApiResponse(200, items, "Products fetched", buildMeta({ page, limit, total })).send(res);
});

const getBySlug = asyncHandler(async (req, res) => {
  const product = await productsService.getProductBySlug(req.params.slug);

  // Fire-and-forget recently-viewed tracking for logged-in users.
  if (req.user) {
    prisma.recentlyViewed
      .upsert({
        where: { userId_productId: { userId: req.user.id, productId: product.id } },
        update: { viewedAt: new Date() },
        create: { userId: req.user.id, productId: product.id },
      })
      .catch(() => {});
  }

  new ApiResponse(200, product).send(res);
});

const getRelated = asyncHandler(async (req, res) => {
  const items = await productsService.getRelatedProducts(req.params.slug, Number(req.query.limit) || 8);
  new ApiResponse(200, items).send(res);
});

const create = asyncHandler(async (req, res) => {
  const product = await productsService.createProduct(req.body, req.body.warehouseId);
  new ApiResponse(201, product, "Product created").send(res);
});

const update = asyncHandler(async (req, res) => {
  const product = await productsService.updateProduct(req.params.id, req.body);
  new ApiResponse(200, product, "Product updated").send(res);
});

const remove = asyncHandler(async (req, res) => {
  await productsService.deleteProduct(req.params.id);
  new ApiResponse(200, null, "Product archived").send(res);
});

const addImage = asyncHandler(async (req, res) => {
  const image = await productsService.addProductImage(req.params.id, req.body);
  new ApiResponse(201, image, "Image added").send(res);
});

const removeImage = asyncHandler(async (req, res) => {
  await productsService.removeProductImage(req.params.imageId);
  new ApiResponse(200, null, "Image removed").send(res);
});

module.exports = { list, getBySlug, getRelated, create, update, remove, addImage, removeImage };
