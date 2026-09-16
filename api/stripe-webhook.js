const crypto = require("crypto");

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyStripeSignature(payload, signature, secret) {
  if (!signature || !secret) return false;

  const parts = signature.split(",");
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  if (Math.abs(Date.now() / 1000 - timestamp) > 300) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload.toString("utf8")}`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatures.some((candidate) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(candidate),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await getRawBody(req);
    const signature = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!verifyStripeSignature(payload, signature, secret)) {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    const event = JSON.parse(payload.toString("utf8"));

    console.log("Stripe webhook received:", event.type);

    return res.status(200).json({
      received: true,
      type: event.type,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

module.exports = handler;

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
