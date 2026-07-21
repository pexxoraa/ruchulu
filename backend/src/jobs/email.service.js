const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../utils/logger");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER) {
    logger.warn(
      "SMTP is not configured (SMTP_HOST/SMTP_USER missing) — emails will be logged to the console instead of sent."
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * sendEmail — fire-and-forget by design (callers should not block the
 * request/response cycle on email delivery). In production this should
 * be pushed onto a queue (BullMQ/Redis) rather than sent inline; the
 * queue wiring is intentionally left out here since it requires a
 * worker process, but this function is the natural job payload.
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    logger.info({ to, subject, text: text || html }, "📧 [DEV EMAIL - not actually sent]");
    return { simulated: true };
  }

  try {
    const info = await t.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info({ to, subject, messageId: info.messageId }, "Email sent");
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send email");
    throw err;
  }
}

const templates = {
  welcome: (name) => ({
    subject: "Welcome to Ruchulu 🌶️",
    html: `<p>Hi ${name},</p><p>Welcome to Ruchulu — authentic Andhra & Telangana pickles and snacks, delivered to your door. We're glad you're here.</p>`,
  }),
  passwordReset: (resetUrl) => ({
    subject: "Reset your Ruchulu password",
    html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Click here to reset your password</a>. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
    text: `Reset your Ruchulu password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
  }),
  emailVerification: (verifyUrl) => ({
    subject: "Verify your Ruchulu email",
    html: `<p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">Verify Email</a></p>`,
    text: `Verify your Ruchulu email address:\n${verifyUrl}`,
  }),
  orderConfirmation: (order) => ({
    subject: `Order Confirmed — ${order.orderNumber}`,
    html: `<p>Thanks for your order! Your order <b>${order.orderNumber}</b> for ₹${order.totalAmount} has been confirmed and is being prepared.</p>`,
  }),
  lowStockAlert: (product) => ({
    subject: `⚠️ Low stock: ${product.name}`,
    html: `<p>${product.name} (SKU: ${product.sku}) is running low on stock. Please restock soon.</p>`,
  }),
};

module.exports = { sendEmail, templates };
