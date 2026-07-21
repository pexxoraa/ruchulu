const categoryRepository = require("./categories.repository");
const ApiError = require("../../utils/ApiError");
const { slugify } = require("../../utils/helpers");

async function listCategories({ skip, limit, parentId, includeInactive }) {
  const where = {
    ...(parentId ? { parentId } : {}),
    ...(includeInactive ? {} : { isActive: true }),
  };
  const [items, total] = await Promise.all([
    categoryRepository.findMany(where, { skip, take: limit }),
    categoryRepository.count(where),
  ]);
  return { items, total };
}

async function getCategoryTree(includeInactive = false) {
  return categoryRepository.findTree(includeInactive);
}

async function getCategoryBySlug(slug) {
  const category = await categoryRepository.findBySlug(slug);
  if (!category) throw ApiError.notFound("Category not found");
  return category;
}

async function createCategory(data) {
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  const existing = await categoryRepository.slugExists(slug);
  if (existing) throw ApiError.conflict("A category with this slug already exists");

  if (data.parentId) {
    const parent = await categoryRepository.findById(data.parentId);
    if (!parent) throw ApiError.badRequest("Parent category does not exist");
  }

  return categoryRepository.create({ ...data, slug });
}

async function updateCategory(id, data) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const updateData = { ...data };
  if (data.name && !data.slug) updateData.slug = slugify(data.name);
  if (data.slug) updateData.slug = slugify(data.slug);

  if (updateData.slug) {
    const existing = await categoryRepository.slugExists(updateData.slug, id);
    if (existing) throw ApiError.conflict("A category with this slug already exists");
  }

  if (data.parentId === id) throw ApiError.badRequest("A category cannot be its own parent");

  return categoryRepository.update(id, updateData);
}

async function deleteCategory(id) {
  const category = await categoryRepository.findById(id);
  if (!category) throw ApiError.notFound("Category not found");

  const [productCount, childCount] = await Promise.all([
    categoryRepository.countProducts(id),
    categoryRepository.countChildren(id),
  ]);

  if (productCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: ${productCount} product(s) are assigned to this category. Reassign them first.`
    );
  }
  if (childCount > 0) {
    throw ApiError.badRequest(`Cannot delete: this category has ${childCount} subcategor(y/ies). Remove them first.`);
  }

  await categoryRepository.delete(id);
}

module.exports = {
  listCategories,
  getCategoryTree,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
