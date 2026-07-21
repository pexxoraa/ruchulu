const ordersService = require("./orders.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");
const { parsePagination, buildMeta } = require("../../utils/helpers");

const placeOrder = asyncHandler(async (req, res) => {
  const result = await ordersService.placeOrder(req.user.id, req.body);
  new ApiResponse(201, result, "Order placed successfully").send(res);
});

const verifyPayment = asyncHandler(async (req, res) => {
  const order = await ordersService.verifyPayment(req.user.id, req.params.id, req.body);
  new ApiResponse(200, order, "Payment verified, order confirmed").send(res);
});

const getById = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id, req.user);
  new ApiResponse(200, order).send(res);
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await ordersService.listUserOrders(req.user.id, { skip, limit, status: req.query.status });
  new ApiResponse(200, items, "Orders fetched", buildMeta({ page, limit, total })).send(res);
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { items, total } = await ordersService.listAllOrders({ skip, limit, status: req.query.status });
  new ApiResponse(200, items, "Orders fetched", buildMeta({ page, limit, total })).send(res);
});

const cancel = asyncHandler(async (req, res) => {
  const order = await ordersService.cancelOrder(req.user.id, req.params.id, req.body.reason);
  new ApiResponse(200, order, "Order cancelled").send(res);
});

const adminUpdateStatus = asyncHandler(async (req, res) => {
  const order = await ordersService.adminUpdateStatus(req.params.id, req.body);
  new ApiResponse(200, order, "Order status updated").send(res);
});

const requestReturn = asyncHandler(async (req, res) => {
  const returnRequest = await ordersService.createReturnRequest(req.user.id, req.params.id, req.body);
  new ApiResponse(201, returnRequest, "Return request submitted").send(res);
});

const handleReturn = asyncHandler(async (req, res) => {
  const returnRequest = await ordersService.adminHandleReturn(req.params.returnId, req.body);
  new ApiResponse(200, returnRequest, "Return request updated").send(res);
});

module.exports = {
  placeOrder,
  verifyPayment,
  getById,
  listMine,
  listAll,
  cancel,
  adminUpdateStatus,
  requestReturn,
  handleReturn,
};
