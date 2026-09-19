const crypto = require("crypto");

const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";

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
  const signatures = parts
    .filter(part => part.startsWith("v1="))
    .map(part => part.slice(3));

  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const signedPayload = timestamp + "." + payload.toString("utf8");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatures.some(candidate => {
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

async function stripeGet(path) {
  const response = await fetch("https://api.stripe.com/v1/" + path, {
    headers: {
      Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    console.error("Stripe lookup failed:", response.status, text);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function enablePremium(userId) {
  const updateResponse = await fetch(
    SUPABASE_URL +
      "/rest/v1/profiles?user_id=eq." +
      encodeURIComponent(userId),
    {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ is_premium: true }),
    }
  );

  const detail = await updateResponse.text();

  if (!updateResponse.ok) {
    console.error("Supabase premium update failed:", detail);
    throw new Error("Premium update failed");
  }

  console.log("Premium enabled for user:", userId);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = await getRawBody(req);
    const rawText = payload.toString("utf8");
    const incoming = JSON.parse(rawText);
    const signature = req.headers["stripe-signature"];

    let session = null;
    let authenticated = false;

    // Normal path: verify the Stripe webhook signature and trust its snapshot.
    if (verifyStripeSignature(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )) {
      authenticated = true;

      if (
        incoming.type === "checkout.session.completed" &&
        incoming.data &&
        incoming.data.object
      ) {
        session = incoming.data.object;
      }
    }

    // Recovery path: use Stripe's secret key to retrieve the actual Checkout Session.
    // This also handles an out-of-sync webhook signing secret.
    if (!session && incoming.data && incoming.data.object) {
      const checkoutSessionId = incoming.data.object.id;

      if (checkoutSessionId) {
        const liveSession = await stripeGet(
          "checkout/sessions/" + encodeURIComponent(checkoutSessionId)
        );

        if (
          liveSession &&
          liveSession.id === checkoutSessionId &&
          liveSession.mode === "subscription" &&
          liveSession.status === "complete" &&
          liveSession.payment_status === "paid"
        ) {
          session = liveSession;
          authenticated = true;
          console.log(
            "Webhook authenticated by Stripe Checkout Session lookup:",
            checkoutSessionId
          );
        }
      }
    }

    if (!authenticated || !session) {
      console.error("Webhook rejected: could not authenticate Stripe event.");
      return res.status(400).json({ error: "Invalid Stripe webhook" });
    }

    const userId = session.metadata && session.metadata.user_id;

    if (!userId) {
      console.error(
        "Missing user_id in Checkout Session metadata:",
        session.id
      );
      return res.status(400).json({ error: "Missing user ID" });
    }

    await enablePremium(userId);

    return res.status(200).json({
      received: true,
      type: incoming.type || "checkout.session.completed",
      session_id: session.id,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
