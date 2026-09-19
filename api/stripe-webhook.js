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

async function stripeGetCheckoutSession(sessionId) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions/" +
      encodeURIComponent(sessionId),
    {
      headers: {
        Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
      },
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "Stripe Checkout lookup failed (HTTP " + response.status + ")"
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Stripe Checkout lookup returned invalid JSON");
  }
}

async function enablePremium(userId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

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
    console.error(
      "Supabase premium update failed:",
      updateResponse.status,
      detail
    );
    throw new Error(
      "Supabase update failed (HTTP " + updateResponse.status + ")"
    );
  }

  console.log("Premium enabled for user:", userId, detail);
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

    if (
      verifyStripeSignature(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    ) {
      authenticated = true;

      if (
        incoming.type === "checkout.session.completed" &&
        incoming.data &&
        incoming.data.object
      ) {
        session = incoming.data.object;
      }

      console.log("Webhook authenticated by signature:", incoming.id);
    }

    if (!session && incoming.data && incoming.data.object) {
      const checkoutSessionId = incoming.data.object.id;

      if (checkoutSessionId) {
        const liveSession = await stripeGetCheckoutSession(
          checkoutSessionId
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
      console.error(
        "Webhook rejected: could not authenticate Stripe event.",
        incoming.id,
        incoming.type
      );
      return res.status(400).json({
        error: "Invalid Stripe webhook payload",
        event_type: incoming.type || null
      });
    }

    const userId = session.metadata && session.metadata.user_id;

    if (!userId) {
      console.error(
        "Missing user_id in Checkout Session metadata:",
        session.id
      );
      return res.status(400).json({
        error: "Missing user ID in Checkout Session metadata",
        session_id: session.id
      });
    }

    await enablePremium(userId);

    return res.status(200).json({
      received: true,
      type: incoming.type || "checkout.session.completed",
      session_id: session.id,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(500).json({
      error: error.message || "Webhook processing failed"
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
