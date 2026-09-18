const crypto = require("crypto");

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyStripeSignature(payload, signature, secret) {
  if (!signature || !secret) return false;
  const parts = signature.split(",");
  const timestampPart = parts.find(part => part.startsWith("t="));
  const signatures = parts.filter(part => part.startsWith("v1=")).map(part => part.slice(3));
  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const signedPayload = timestamp + "." + payload.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return signatures.some(candidate => {
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await getRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!verifyStripeSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET)) {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }

    const event = JSON.parse(payload.toString("utf8"));
    console.log("Stripe webhook received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.user_id;

      if (!userId) {
        console.error("Missing user_id in Checkout Session metadata");
        return res.status(400).json({ error: "Missing user ID" });
      }

      const updateResponse = await fetch(
        SUPABASE_URL + "/rest/v1/profiles?user_id=eq." + encodeURIComponent(userId),
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            is_premium: true,
          }),
        }
      );

      if (!updateResponse.ok) {
        const detail = await updateResponse.text();
        console.error("Supabase premium update failed:", detail);
        return res.status(500).json({ error: "Premium update failed" });
      }

      console.log("Premium enabled for user:", userId);
    }

    return res.status(200).json({ received: true, type: event.type });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
