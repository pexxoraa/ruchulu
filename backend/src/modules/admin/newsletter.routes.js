const router = require("express").Router();
const { z } = require("zod");
const { prisma } = require("../../config/database");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../middlewares/validate");

const newsletterSchema = z.object({ email: z.string().email() });
const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().optional(),
  message: z.string().min(5).max(2000),
});

/**
 * @openapi
 * /newsletter/subscribe:
 *   post:
 *     tags: [Newsletter]
 *     summary: Subscribe an email to the newsletter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Subscribed successfully }
 */
router.post(
  "/subscribe",
  validate({ body: newsletterSchema }),
  asyncHandler(async (req, res) => {
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email: req.body.email },
      update: { isActive: true },
      create: { email: req.body.email },
    });
    new ApiResponse(200, subscriber, "Subscribed successfully").send(res);
  })
);

/**
 * @openapi
 * /newsletter/unsubscribe:
 *   post:
 *     tags: [Newsletter]
 *     summary: Unsubscribe an email from the newsletter
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Unsubscribed }
 */
router.post(
  "/unsubscribe",
  validate({ body: newsletterSchema }),
  asyncHandler(async (req, res) => {
    await prisma.newsletterSubscriber
      .update({ where: { email: req.body.email }, data: { isActive: false } })
      .catch(() => {});
    new ApiResponse(200, null, "Unsubscribed").send(res);
  })
);

module.exports = { newsletterRouter: router };
