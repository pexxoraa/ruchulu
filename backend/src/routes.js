const router = require("express").Router();

router.use("/auth", require("./modules/auth/auth.routes"));
router.use("/users", require("./modules/users/users.routes"));
router.use("/support-tickets", require("./modules/users/support.routes"));
router.use("/products", require("./modules/products/products.routes"));
router.use("/categories", require("./modules/categories/categories.routes"));
router.use("/cart", require("./modules/cart/cart.routes"));
router.use("/wishlist", require("./modules/wishlist/wishlist.routes"));
router.use("/orders", require("./modules/orders/orders.routes"));
router.use("/coupons", require("./modules/coupons/coupons.routes"));
router.use("/reviews", require("./modules/reviews/reviews.routes"));
router.use("/inventory", require("./modules/inventory/inventory.routes"));
router.use("/uploads", require("./modules/uploads/uploads.routes"));
router.use("/admin/dashboard", require("./modules/admin/admin.routes"));
router.use("/admin/banners", require("./modules/admin/banners.routes"));
router.use("/blog", require("./modules/admin/blog.routes"));
router.use("/admin/settings", require("./modules/admin/settings.routes"));
router.use("/contact", require("./modules/admin/contact.routes"));
router.use("/newsletter", require("./modules/admin/newsletter.routes").newsletterRouter);

module.exports = router;
