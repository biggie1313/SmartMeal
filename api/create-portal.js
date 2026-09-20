const SUPABASE_URL = "https://aacgociyidfzaxweygqc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lVeSyyMPkrTby8OdR1gXjg_7khM4wGR";

async function getUser(accessToken) {
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: "Bearer " + accessToken,
    },
  });

  if (!response.ok) {
    throw new Error("Not signed in");
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const accessToken = authHeader.slice(7).trim();
    const user = await getUser(accessToken);

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const profileResponse = await fetch(
      SUPABASE_URL + "/rest/v1/profiles?select=stripe_customer_id,is_premium&user_id=eq." + encodeURIComponent(user.id),
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      }
    );

    const profiles = await profileResponse.json();

    if (!profileResponse.ok || !profiles[0]?.stripe_customer_id) {
      return res.status(400).json({
        error: "Subscription management is not available until the payment is fully confirmed."
      });
    }

    const body = new URLSearchParams();
    body.set("customer", profiles[0].stripe_customer_id);
    body.set("return_url", process.env.STRIPE_PORTAL_RETURN_URL || "https://smartmeal-commercial-mvp.vercel.app/");

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/billing_portal/sessions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok || !stripeData.url) {
      console.error("Stripe Customer Portal error:", stripeData);
      return res.status(500).json({ error: "Unable to open subscription management." });
    }

    return res.status(200).json({ url: stripeData.url });
  } catch (error) {
    console.error("Customer portal endpoint error:", error);
    return res.status(500).json({ error: error.message || "Unable to open subscription management." });
  }
};

module.exports.config = {
  api: {
    bodyParser: true,
  },
};