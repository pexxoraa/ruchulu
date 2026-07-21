const env = require("../config/env");
const logger = require("../utils/logger");

/**
 * sendSms — routes to the configured provider (MSG91 or Twilio). If no
 * provider credentials are set, the message is logged instead of sent
 * so local development and automated tests never require a real SMS
 * account. Swap this for a queued job in production.
 */
async function sendSms(phone, message) {
  if (env.SMS_PROVIDER === "msg91" && env.MSG91_AUTH_KEY) {
    return sendViaMsg91(phone, message);
  }
  if (env.SMS_PROVIDER === "twilio" && env.TWILIO_ACCOUNT_SID) {
    return sendViaTwilio(phone, message);
  }

  logger.info({ phone, message }, "📱 [DEV SMS - not actually sent, no provider configured]");
  return { simulated: true };
}

async function sendViaMsg91(phone, message) {
  const url = "https://control.msg91.com/api/v5/flow/";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", authkey: env.MSG91_AUTH_KEY },
    body: JSON.stringify({
      template_id: env.MSG91_OTP_TEMPLATE_ID,
      sender: env.MSG91_SENDER_ID,
      short_url: "0",
      mobiles: `91${phone}`,
      var: message,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 send failed: ${res.status} ${body}`);
  }
  return res.json();
}

async function sendViaTwilio(phone, message) {
  const sid = env.TWILIO_ACCOUNT_SID;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

  const body = new URLSearchParams({
    To: `+91${phone}`,
    From: env.TWILIO_FROM_NUMBER,
    Body: message,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio send failed: ${res.status} ${errBody}`);
  }
  return res.json();
}

module.exports = { sendSms };
