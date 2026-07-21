const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");
const { requireAuth, requireRole } = require("../../middlewares/auth");
const { parsePagination, buildMeta } = require("../../utils/helpers");

router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN", "MANAGER"));

const restockSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  supplierId: z.string().uuid().optional(),
  batchNumber: z.string().min(1),
  mfgDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
});

const adjustSchema = z.object({
  quantity: z.coerce.number().int(), // can be negative for damage/loss
  reason: z.string().min(1),
});

const warehouseSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
});

const supplierSchema = z.object({
  name: z.string().min(2),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

/**
 * @openapi
 * /inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory across all products/variants (admin)
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const lowStockOnly = req.query.lowStock === "true";

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, label: true, sku: true } },
          warehouse: { select: { id: true, name: true, city: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.inventory.count(),
    ]);

    const filtered = lowStockOnly ? items.filter((i) => i.quantity <= i.lowStockAlertAt) : items;
    new ApiResponse(200, filtered, "Inventory fetched", buildMeta({ page, limit, total })).send(res);
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (req, res) => {
    const all = await prisma.inventory.findMany({
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, label: true } },
      },
    });
    const lowStock = all.filter((i) => i.quantity <= i.lowStockAlertAt);
    new ApiResponse(200, lowStock, `${lowStock.length} item(s) low on stock`).send(res);
  })
);

router.get(
  "/:id/movements",
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const movements = await prisma.inventoryMovement.findMany({
      where: { inventoryId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    new ApiResponse(200, movements).send(res);
  })
);

/**
 * @openapi
 * /inventory/{id}/restock:
 *   post:
 *     tags: [Inventory]
 *     summary: Add stock to a product variant, recording a batch and a movement entry
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The Inventory record's id (not the product id — see GET /inventory to find it)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity, batchNumber]
 *             properties:
 *               quantity: { type: integer, example: 50 }
 *               supplierId: { type: string, format: uuid }
 *               batchNumber: { type: string, example: "B-2026-07-01" }
 *               mfgDate: { type: string, format: date }
 *               expiryDate: { type: string, format: date }
 *     responses:
 *       200: { description: Stock replenished }
 *       404: { description: Inventory record not found }
 */
router.post(
  "/:id/restock",
  validate({ params: z.object({ id: z.string().uuid() }), body: restockSchema }),
  asyncHandler(async (req, res) => {
    const inventory = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!inventory) throw ApiError.notFound("Inventory record not found");

    const { quantity, supplierId, batchNumber, mfgDate, expiryDate } = req.body;

    const [updated] = await prisma.$transaction([
      prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: { increment: quantity } } }),
      prisma.inventoryBatch.create({
        data: { inventoryId: inventory.id, supplierId, batchNumber, quantity, mfgDate, expiryDate },
      }),
      prisma.inventoryMovement.create({
        data: { inventoryId: inventory.id, type: "RESTOCK", quantity, reason: `Restock — batch ${batchNumber}` },
      }),
    ]);

    new ApiResponse(200, updated, "Stock replenished").send(res);
  })
);

/**
 * @openapi
 * /inventory/{id}/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Manually adjust stock (e.g. for damage or a stock-take correction)
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
 *             required: [quantity, reason]
 *             properties:
 *               quantity: { type: integer, description: "Positive to add stock, negative to remove it", example: -3 }
 *               reason: { type: string, example: "3 units damaged in the warehouse" }
 *     responses:
 *       200: { description: Stock adjusted }
 *       400: { description: Adjustment would result in negative stock }
 */
router.post(
  "/:id/adjust",
  validate({ params: z.object({ id: z.string().uuid() }), body: adjustSchema }),
  asyncHandler(async (req, res) => {
    const inventory = await prisma.inventory.findUnique({ where: { id: req.params.id } });
    if (!inventory) throw ApiError.notFound("Inventory record not found");

    const newQuantity = inventory.quantity + req.body.quantity;
    if (newQuantity < 0) throw ApiError.badRequest("Adjustment would result in negative stock");

    const [updated] = await prisma.$transaction([
      prisma.inventory.update({ where: { id: inventory.id }, data: { quantity: newQuantity } }),
      prisma.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: req.body.quantity < 0 ? "DAMAGE" : "ADJUSTMENT",
          quantity: req.body.quantity,
          reason: req.body.reason,
        },
      }),
    ]);

    new ApiResponse(200, updated, "Stock adjusted").send(res);
  })
);

// --- Warehouses ---
/**
 * @openapi
 * /inventory/warehouses:
 *   get:
 *     tags: [Inventory]
 *     summary: List warehouses
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Warehouse list }
 */
router.get(
  "/warehouses",
  asyncHandler(async (req, res) => {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
    new ApiResponse(200, warehouses).send(res);
  })
);

/**
 * @openapi
 * /inventory/warehouses:
 *   post:
 *     tags: [Inventory]
 *     summary: Create a warehouse (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, city, state, pincode]
 *             properties:
 *               name: { type: string, example: "Ruchulu Main Warehouse" }
 *               city: { type: string, example: "Vijayawada" }
 *               state: { type: string, example: "Andhra Pradesh" }
 *               pincode: { type: string, example: "520001" }
 *     responses:
 *       201: { description: Warehouse created }
 */
router.post(
  "/warehouses",
  requireRole("ADMIN", "SUPER_ADMIN"),
  validate({ body: warehouseSchema }),
  asyncHandler(async (req, res) => {
    const warehouse = await prisma.warehouse.create({ data: req.body });
    new ApiResponse(201, warehouse, "Warehouse created").send(res);
  })
);

// --- Suppliers ---
/**
 * @openapi
 * /inventory/suppliers:
 *   get:
 *     tags: [Inventory]
 *     summary: List suppliers
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Supplier list }
 */
router.get(
  "/suppliers",
  asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    new ApiResponse(200, suppliers).send(res);
  })
);

/**
 * @openapi
 * /inventory/suppliers:
 *   post:
 *     tags: [Inventory]
 *     summary: Add a supplier
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactName: { type: string }
 *               phone: { type: string }
 *               email: { type: string, format: email }
 *               address: { type: string }
 *     responses:
 *       201: { description: Supplier added }
 */
router.post(
  "/suppliers",
  validate({ body: supplierSchema }),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.create({ data: req.body });
    new ApiResponse(201, supplier, "Supplier added").send(res);
  })
);

module.exports = router;
