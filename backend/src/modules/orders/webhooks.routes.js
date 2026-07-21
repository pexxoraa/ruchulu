const router = require("express").Router();
const { prisma } = require("../../config/database");
const paymentsService = require("./payments.service");
const logger = require("../../utils/logger");

/**
 * This route MUST receive the raw request body (not JSON-parsed) for
 * signature verification to work — see app.js where express.raw() is
 * mounted specifically for this path, ahead of the global express.json().
 */
router.post("/razorpay", async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body; // Buffer, thanks to express.raw()

  if (!signature || !paymentsService.verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Rejected Razorpay webhook with invalid signature");
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid payload" });
  }

  try {
    if (event.event === "payment.captured") {
      const providerOrderId = event.payload.payment.entity.order_id;
      const payment = await prisma.payment.findFirst({ where: { providerOrderId } });
      if (payment && payment.status !== "PAID") {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: "PAID", providerPaymentId: event.payload.payment.entity.id, paidAt: new Date() },
          }),
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "CONFIRMED", timeline: { create: { status: "CONFIRMED", note: "Payment captured (webhook)" } } },
          }),
        ]);
      }
    }

    if (event.event === "payment.failed") {
      const providerOrderId = event.payload.payment.entity.order_id;
      const payment = await prisma.payment.findFirst({ where: { providerOrderId } });
      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: event.payload.payment.entity.error_description },
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error processing Razorpay webhook");
    res.status(500).json({ success: false });
  }
});

module.exports = router;
