const categoriesService = require("./categories.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const { parsePagination, buildMeta } = require("../../utils/helpers");

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await categoriesService.listCategories({
    skip,
    limit,
    parentId: req.query.parentId,
    includeInactive: req.query.includeInactive,
  });
  new ApiResponse(200, items, "Categories fetched", buildMeta({ page, limit, total })).send(res);
});

const tree = asyncHandler(async (req, res) => {
  const data = await categoriesService.getCategoryTree(req.query.includeInactive === "true");
  new ApiResponse(200, data).send(res);
});

const getBySlug = asyncHandler(async (req, res) => {
  const data = await categoriesService.getCategoryBySlug(req.params.slug);
  new ApiResponse(200, data).send(res);
});

const create = asyncHandler(async (req, res) => {
  const data = await categoriesService.createCategory(req.body);
  new ApiResponse(201, data, "Category created").send(res);
});

const update = asyncHandler(async (req, res) => {
  const data = await categoriesService.updateCategory(req.params.id, req.body);
  new ApiResponse(200, data, "Category updated").send(res);
});

const remove = asyncHandler(async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  new ApiResponse(200, null, "Category deleted").send(res);
});

module.exports = { list, tree, getBySlug, create, update, remove };
