const crypto = require("crypto");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const ApiError = require("../../utils/ApiError");

let razorpayClient = null;

function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;

  // Lazy-required so the package is only touched when actually configured.
  const Razorpay = require("razorpay");
  razorpayClient = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return razorpayClient;
}

/**
 * createRazorpayOrder — creates a payment intent on Razorpay's side for
 * the given amount (in rupees; converted to paise here). Returns the
 * fields the frontend Razorpay Checkout widget needs.
 */
async function createRazorpayOrder({ amountInRupees, receipt, notes }) {
  const client = getRazorpayClient();
  if (!client) {
    throw ApiError.badRequest(
      "Online payments are not configured on this server yet. Set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET, or choose Cash on Delivery."
    );
  }

  const order = await client.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: "INR",
    receipt,
    notes,
  });

  return { providerOrderId: order.id, amount: order.amount, currency: order.currency, keyId: env.RAZORPAY_KEY_ID };
}

/**
 * verifyPaymentSignature — validates the signature Razorpay Checkout
 * returns to the client after a successful payment, per their documented
 * HMAC-SHA256 scheme. This must pass before an order is marked PAID.
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/**
 * verifyWebhookSignature — validates the `X-Razorpay-Signature` header
 * on incoming webhook calls against the raw request body.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

async function refundPayment(providerPaymentId, amountInRupees) {
  const client = getRazorpayClient();
  if (!client) throw ApiError.badRequest("Payment gateway is not configured");

  try {
    return await client.payments.refund(providerPaymentId, {
      amount: amountInRupees ? Math.round(amountInRupees * 100) : undefined,
    });
  } catch (err) {
    logger.error({ err, providerPaymentId }, "Razorpay refund failed");
    throw ApiError.internal("Refund could not be processed. Please try again or contact support.");
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refundPayment,
};
