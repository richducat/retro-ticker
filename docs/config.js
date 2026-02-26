// Configure plan pricing, labels, and checkout URLs.
// Replace checkoutUrl values with your real Stripe (or other provider) links.
window.SITE_CONFIG = {
  supportEmail: "support@example.com",
  plans: {
    starter: {
      price: "$19/month",
      ctaLabel: "Choose Starter",
      checkoutUrl: ""
    },
    pro: {
      price: "$49/month",
      ctaLabel: "Choose Pro",
      checkoutUrl: ""
    },
    desk: {
      price: "$149/month",
      ctaLabel: "Choose Desk",
      checkoutUrl: ""
    }
  }
};
