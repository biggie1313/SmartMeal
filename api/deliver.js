module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const sessionId = String(req.query?.session_id || "").trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Missing checkout session" });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("Missing STRIPE_SECRET_KEY");
    return res.status(500).json({ error: "Delivery is not configured yet" });
  }

  try {
    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions/" +
        encodeURIComponent(sessionId) +
        "?expand[]=line_items.data.price",
      {
        headers: {
          Authorization: "Bearer " + secret,
        },
      }
    );

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error("Stripe session lookup failed:", stripeResponse.status, session);
      return res.status(400).json({ error: "Could not verify checkout" });
    }

    if (session.payment_status !== "paid") {
      return res.status(403).json({ error: "Payment has not been completed" });
    }

    const lineItems = session.line_items?.data || [];
    const validProduct = lineItems.some(
      (item) => item.price?.product === "prod_VJEczHiT5FIqYJ"
    );

    if (!validProduct) {
      return res.status(403).json({ error: "This checkout is not for the requested product" });
    }

    const kit = [
      "TOOLPILOT — SMALL BUSINESS WEBSITE STARTER KIT",
      "",
      "Thank you for your purchase.",
      "",
      "1) BUSINESS BASICS",
      "Business name:",
      "Tagline:",
      "City / service area:",
      "Phone:",
      "Email:",
      "Website:",
      "Primary call to action:",
      "",
      "2) SERVICES",
      "Service 1:",
      "Service 2:",
      "Service 3:",
      "What makes the business different?",
      "",
      "3) ABOUT",
      "Write 3–5 sentences about the business, who it serves, experience, and what customers can expect.",
      "",
      "4) HOME PAGE COPY PROMPTS",
      "Headline: What is the clearest result you provide?",
      "Subheadline: Who do you help and what do you do?",
      "CTA: What should the visitor do next?",
      "",
      "5) LAUNCH CHECKLIST",
      "[ ] Business name and contact details checked",
      "[ ] Services and prices checked",
      "[ ] Phone and email links tested",
      "[ ] Mobile layout checked",
      "[ ] Images have permission to be used",
      "[ ] Privacy / legal requirements reviewed",
      "[ ] Domain and hosting settings reviewed",
      "[ ] Final customer approval received",
      "",
      "6) HANDOFF CHECKLIST",
      "[ ] Final files delivered",
      "[ ] Customer knows where the site is hosted",
      "[ ] Customer knows how to request changes",
      "[ ] Any third-party subscriptions are documented",
      "[ ] Credentials are transferred securely",
      "",
      "This kit is an informational template, not legal, tax, or business advice."
    ].join("\n");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="ToolPilot-Small-Business-Website-Starter-Kit.txt"'
    );
    return res.status(200).send(kit);
  } catch (error) {
    console.error("Delivery endpoint error:", error);
    return res.status(500).json({ error: "Unable to deliver the product" });
  }
};