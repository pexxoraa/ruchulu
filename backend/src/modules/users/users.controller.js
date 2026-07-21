const usersService = require("./users.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const { parsePagination, buildMeta } = require("../../utils/helpers");

const getProfile = asyncHandler(async (req, res) => {
  const user = await usersService.getProfile(req.user.id);
  new ApiResponse(200, user).send(res);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  new ApiResponse(200, user, "Profile updated").send(res);
});

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await usersService.listAddresses(req.user.id);
  new ApiResponse(200, addresses).send(res);
});

const createAddress = asyncHandler(async (req, res) => {
  const address = await usersService.createAddress(req.user.id, req.body);
  new ApiResponse(201, address, "Address added").send(res);
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await usersService.updateAddress(req.user.id, req.params.id, req.body);
  new ApiResponse(200, address, "Address updated").send(res);
});

const deleteAddress = asyncHandler(async (req, res) => {
  await usersService.deleteAddress(req.user.id, req.params.id);
  new ApiResponse(200, null, "Address removed").send(res);
});

// --- Admin ---
const adminListUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await usersService.adminListUsers({
    skip,
    limit,
    role: req.query.role,
    search: req.query.search,
  });
  new ApiResponse(200, items, "Users fetched", buildMeta({ page, limit, total })).send(res);
});

const adminSetUserStatus = asyncHandler(async (req, res) => {
  const user = await usersService.adminSetUserStatus(req.params.id, req.body.isActive);
  new ApiResponse(200, user, "User status updated").send(res);
});

const adminSetUserRole = asyncHandler(async (req, res) => {
  const user = await usersService.adminSetUserRole(req.params.id, req.body.role);
  new ApiResponse(200, user, "User role updated").send(res);
});

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  adminListUsers,
  adminSetUserStatus,
  adminSetUserRole,
};
