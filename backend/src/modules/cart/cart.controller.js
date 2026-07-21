const cartService = require("./cart.service");
const asyncHandler = require("../../utils/asyncHandler");
const ApiResponse = require("../../utils/ApiResponse");

const GUEST_COOKIE = "ruchulu_guest_cart";

function getIdentity(req) {
  return {
    userId: req.user?.id || null,
    guestToken: req.user ? null : req.cookies?.[GUEST_COOKIE] || req.headers["x-guest-token"] || null,
  };
}

function persistGuestCookie(req, res, cart) {
  if (!req.user && cart.guestToken) {
    res.cookie(GUEST_COOKIE, cart.guestToken, {
      httpOnly: true,
      sameSite: "lax",
      // IMPORTANT: path must be set explicitly and match what auth.controller.js
      // expects. Without it, the browser computes a default path from
      // whichever endpoint happened to set the cookie last (RFC 6265) — since
      // that's almost always POST /cart/items, the cookie would end up scoped
      // to /api/v1/cart and never get sent to /api/v1/auth/login, silently
      // breaking "merge my guest cart on login" for the most common real flow.
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
}

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCart(getIdentity(req));
  persistGuestCookie(req, res, cart);
  new ApiResponse(200, cart).send(res);
});

const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(getIdentity(req), req.body);
  persistGuestCookie(req, res, cart);
  new ApiResponse(200, cart, "Item added to cart").send(res);
});

const updateItem = asyncHandler(async (req, res) => {
  const cart = await cartService.updateItem(getIdentity(req), req.params.itemId, req.body.quantity);
  new ApiResponse(200, cart, "Cart updated").send(res);
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await cartService.removeItem(getIdentity(req), req.params.itemId);
  new ApiResponse(200, cart, "Item removed from cart").send(res);
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await cartService.clearCart(getIdentity(req));
  new ApiResponse(200, cart, "Cart cleared").send(res);
});

const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await cartService.applyCoupon(getIdentity(req), req.body.code);
  new ApiResponse(200, cart, "Coupon applied").send(res);
});

const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await cartService.removeCoupon(getIdentity(req));
  new ApiResponse(200, cart, "Coupon removed").send(res);
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart, applyCoupon, removeCoupon, getIdentity, GUEST_COOKIE };
