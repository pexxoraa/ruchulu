const { z } = require("zod");

const addItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

const applyCouponSchema = z.object({
  code: z.string().min(3).max(30),
});

const itemParamSchema = z.object({ itemId: z.string().uuid() });

module.exports = { addItemSchema, updateItemSchema, applyCouponSchema, itemParamSchema };
