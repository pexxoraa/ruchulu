const router = require("express").Router();
const controller = require("./users.controller");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { z } = require("zod");
const {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  idParamSchema,
} = require("./users.validators");

router.use(requireAuth);

/**
 * @openapi
 * /users/me/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get your own profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile }
 */
router.get("/me/profile", controller.getProfile);

/**
 * @openapi
 * /users/me/profile:
 *   patch:
 *     tags: [Users]
 *     summary: Update your own profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string }
 *               avatarUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Profile updated }
 */
router.patch("/me/profile", validate({ body: updateProfileSchema }), controller.updateProfile);

/**
 * @openapi
 * /users/me/addresses:
 *   get:
 *     tags: [Users]
 *     summary: List your saved addresses
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Address list }
 */
router.get("/me/addresses", controller.listAddresses);

/**
 * @openapi
 * /users/me/addresses:
 *   post:
 *     tags: [Users]
 *     summary: Add a new address
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phone, line1, city, state, pincode]
 *             properties:
 *               label: { type: string, example: "Home" }
 *               type: { type: string, enum: [HOME, WORK, OTHER], default: HOME }
 *               fullName: { type: string }
 *               phone: { type: string, example: "9876543210" }
 *               line1: { type: string }
 *               line2: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               pincode: { type: string, example: "520001" }
 *               isDefault: { type: boolean }
 *     responses:
 *       201: { description: Address added }
 */
router.post("/me/addresses", validate({ body: addressSchema }), controller.createAddress);

/**
 * @openapi
 * /users/me/addresses/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update an address
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Any subset of the address-creation fields
 *     responses:
 *       200: { description: Address updated }
 *       404: { description: Address not found }
 */
router.patch(
  "/me/addresses/:id",
  validate({ params: idParamSchema, body: updateAddressSchema }),
  controller.updateAddress
);

/**
 * @openapi
 * /users/me/addresses/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete an address
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Address removed }
 */
router.delete("/me/addresses/:id", validate({ params: idParamSchema }), controller.deleteAddress);

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin/manager)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [CUSTOMER, DELIVERY_PARTNER, MANAGER, ADMIN, SUPER_ADMIN] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated user list }
 */
router.get("/", requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"), controller.adminListUsers);

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user account (admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: User status updated }
 */
router.patch(
  "/:id/status",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ params: idParamSchema, body: z.object({ isActive: z.boolean() }) }),
  controller.adminSetUserStatus
);

/**
 * @openapi
 * /users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user's role (super admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [CUSTOMER, DELIVERY_PARTNER, MANAGER, ADMIN, SUPER_ADMIN] }
 *     responses:
 *       200: { description: User role updated }
 */
router.patch(
  "/:id/role",
  requireRole("SUPER_ADMIN"),
  validate({
    params: idParamSchema,
    body: z.object({ role: z.enum(["CUSTOMER", "DELIVERY_PARTNER", "MANAGER", "ADMIN", "SUPER_ADMIN"]) }),
  }),
  controller.adminSetUserRole
);

module.exports = router;
