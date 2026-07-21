const { z } = require("zod");

const createCouponSchema = z.object({
  code: z.string().min(3).max(30).transform((v) => v.toUpperCase()),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FLAT", "FREE_SHIPPING"]),
  value: z.coerce.number().nonnegative(),
  minOrderAmount: z.coerce.number().nonnegative().optional(),
  maxDiscountAmount: z.coerce.number().positive().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  usageLimitPerUser: z.coerce.number().int().positive().default(1),
  applicableCategoryIds: z.array(z.string().uuid()).optional(),
  applicableProductIds: z.array(z.string().uuid()).optional(),
  isFestival: z.boolean().optional(),
  isReferral: z.boolean().optional(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

const updateCouponSchema = createCouponSchema.partial();

const applyCouponSchema = z.object({
  code: z.string().min(3).max(30),
});

const idParamSchema = z.object({ id: z.string().uuid() });

module.exports = { createCouponSchema, updateCouponSchema, applyCouponSchema, idParamSchema };
