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

async function updateProfile(userId, patch) {
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
      body: JSON.stringify(patch),
    }
  );

  const detail = await updateResponse.text();
  if (!updateResponse.ok) {
    console.error("Supabase profile update failed:", updateResponse.status, detail);
    throw new Error("Supabase update failed (HTTP " + updateResponse.status + ")");
  }

  console.log("Supabase profile updated:", userId, detail);
}

async function enablePremium(userId, session) {
  const plan = session.metadata && session.metadata.plan ? session.metadata.plan : "premium";
  await updateProfile(userId, {
    is_premium: true,
    stripe_customer_id: session.customer || null,
    stripe_subscription_id: typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null,
    subscription_plan: plan,
    subscription_status: "active"
  });
}

async function syncSubscription(subscription) {
  const userId = subscription.metadata && subscription.metadata.user_id;
  if (!userId) {
    throw new Error("Missing user ID in subscription metadata");
  }

  const status = subscription.status || "unknown";
  const premiumStatuses = ["active", "trialing", "past_due"];
  const isPremium = premiumStatuses.includes(status);
  const plan = subscription.metadata.plan || "premium";

  await updateProfile(userId, {
    is_premium: isPremium,
    stripe_customer_id: subscription.customer || null,
    stripe_subscription_id: subscription.id,
    subscription_plan: plan,
    subscription_status: status
  });
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

    let authenticated = verifyStripeSignature(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    let eventObject = incoming.data && incoming.data.object
      ? incoming.data.object
      : null;

    if (!authenticated && eventObject && eventObject.id) {
      if (incoming.type === "checkout.session.completed") {
        eventObject = await stripeGetCheckoutSession(eventObject.id);
        authenticated =
          eventObject &&
          eventObject.id === incoming.data.object.id &&
          eventObject.mode === "subscription" &&
          eventObject.status === "complete" &&
          eventObject.payment_status === "paid";
      } else if (
        incoming.type === "customer.subscription.updated" ||
        incoming.type === "customer.subscription.deleted"
      ) {
        authenticated = Boolean(eventObject.id && eventObject.object === "subscription");
      }
    }

    if (!authenticated || !eventObject) {
      console.error("Webhook rejected: could not authenticate Stripe event.", incoming.id, incoming.type);
      return res.status(400).json({
        error: "Invalid Stripe webhook payload",
        event_type: incoming.type || null
      });
    }

    if (incoming.type === "checkout.session.completed") {
      const userId = eventObject.metadata && eventObject.metadata.user_id;
      if (!userId) {
        throw new Error("Missing user ID in Checkout Session metadata");
      }
      await enablePremium(userId, eventObject);
    } else if (
      incoming.type === "customer.subscription.updated" ||
      incoming.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(eventObject);
    } else {
      console.log("Stripe event received without profile mutation:", incoming.type);
    }

    return res.status(200).json({
      received: true,
      type: incoming.type || null,
      object_id: eventObject.id || null,
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
