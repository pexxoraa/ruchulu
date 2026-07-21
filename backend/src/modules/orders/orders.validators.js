const { z } = require("zod");

const placeOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(["COD", "RAZORPAY", "UPI", "WALLET"]),
  notes: z.string().max(500).optional(),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "RETURNED",
    "REFUNDED",
  ]),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(3).max(300),
});

const returnRequestSchema = z.object({
  reason: z.string().min(3).max(500),
  isPartial: z.boolean().optional(),
  refundAmount: z.coerce.number().positive().optional(),
});

const listOrdersQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PACKED",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "RETURNED",
      "REFUNDED",
    ])
    .optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

module.exports = {
  placeOrderSchema,
  verifyPaymentSchema,
  updateStatusSchema,
  cancelOrderSchema,
  returnRequestSchema,
  listOrdersQuerySchema,
  idParamSchema,
};
