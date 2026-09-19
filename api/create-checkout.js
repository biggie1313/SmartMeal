const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const accessToken = authHeader.slice(7);

    const userResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + accessToken,
      },
    });

    if (!userResponse.ok) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const user = await userResponse.json();

    const body = new URLSearchParams();
    body.set("mode", "subscription");
    body.set("line_items[0][price]", "price_1UF4ZOJIwwNxJZyF12UqLgFB");
    body.set("line_items[0][quantity]", "1");
    body.set("success_url", "https://smartmeal-commercial-mvp.vercel.app/?premium=success");
    body.set("cancel_url", "https://smartmeal-commercial-mvp.vercel.app/?premium=cancel");
    body.set("customer_email", user.email || "");
    body.set("metadata[user_id]", user.id);
    body.set("subscription_data[metadata][user_id]", user.id);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe Checkout error:", stripeData);
      return res.status(500).json({ error: "Unable to create checkout session" });
    }

    return res.status(200).json({ url: stripeData.url });
  } catch (error) {
    console.error("Checkout endpoint error:", error);
    return res.status(500).json({ error: "Checkout failed" });
  }
};

module.exports.config = {
  api: {
    bodyParser: true,
  },
};
