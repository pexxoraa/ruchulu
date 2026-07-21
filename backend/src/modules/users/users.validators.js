const { z } = require("zod");

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  type: z.enum(["HOME", "WORK", "OTHER"]).default("HOME"),
  fullName: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = addressSchema.partial();

const idParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = { updateProfileSchema, addressSchema, updateAddressSchema, idParamSchema };
